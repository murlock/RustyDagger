// Small local stand-in for the original game's CGI backend (DCcgi17.exe,
// see DCourt/Tools/Loader.java's FINDHERO/SENDMAIL/LISTMAIL/TAKEMAIL/
// PEEKCLAN/MAKECLAN/KILLCLAN actions - note that in the shipped jar, Loader.cgi()
// itself was already a stub that just printed the request and returned "",
// so none of this ever actually ran there either). Backs arPeer/arPackage/
// arPostal/arClanHall - see CONVERSION_PLAN.md's Phase 5 #14-16/#26-27
// entries for why those were deferred until this existed.
//
// No auth (matches arEntry's own "no password field" decision) - any client
// can PUT/act as any hero name. Fine for local/single-machine dev use, not a
// real multiplayer trust boundary.
//
// Exports the app without listening, so index.test.js can mount it on an
// ephemeral port instead of colliding with a real dev server on :8787.
import express from 'express'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { db } from './db.js'

export const app = express()
app.use(express.json({ limit: '1mb' }))

// --- Hero registry (arPeer's cross-hero lookup) -----------------------

app.put('/api/heroes/:name', (req, res) => {
  const name = req.params.name
  const { title, clan, level, save } = req.body ?? {}
  if (typeof name !== 'string' || name.length < 1 || save == null) {
    return res.status(400).json({ error: 'Malformed hero sync payload' })
  }
  db.prepare(
    `INSERT INTO heroes (name, title, clan, level, save_json, updated_at)
     VALUES (@name, @title, @clan, @level, @save_json, @updated_at)
     ON CONFLICT(name) DO UPDATE SET
       title = excluded.title, clan = excluded.clan, level = excluded.level,
       save_json = excluded.save_json, updated_at = excluded.updated_at`,
  ).run({
    name,
    title: title ?? '',
    clan: clan ?? null,
    level: Number(level) || 0,
    save_json: JSON.stringify(save),
    updated_at: new Date().toISOString(),
  })
  res.json({ ok: true })
})

app.get('/api/heroes/:name', (req, res) => {
  const row = db.prepare('SELECT save_json FROM heroes WHERE name = ? COLLATE NOCASE').get(req.params.name)
  if (!row) return res.status(404).json({ error: `Unable to Load <${req.params.name}>` })
  res.json({ save: JSON.parse(row.save_json) })
})

// --- Mail (arPackage's SENDMAIL, arPostal's LISTMAIL/TAKEMAIL) --------

app.post('/api/mail', (req, res) => {
  const { from, to, label, payload } = req.body ?? {}
  if (typeof from !== 'string' || typeof to !== 'string' || typeof label !== 'string' || payload == null) {
    return res.status(400).json({ error: 'Malformed mail payload' })
  }
  const recipient = db.prepare('SELECT name FROM heroes WHERE name = ? COLLATE NOCASE').get(to)
  if (!recipient) return res.status(404).json({ error: `Unable to Load <${to}>` })
  db.prepare(
    'INSERT INTO mail (recipient, sender, label, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(recipient.name, from, label, JSON.stringify(payload), new Date().toISOString())
  res.json({ ok: true })
})

app.get('/api/mail/:name', (req, res) => {
  const rows = db
    .prepare('SELECT id, sender, label FROM mail WHERE recipient = ? COLLATE NOCASE ORDER BY id')
    .all(req.params.name)
  res.json({ mail: rows })
})

app.post('/api/mail/:name/take/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM mail WHERE id = ? AND recipient = ? COLLATE NOCASE')
    .get(req.params.id, req.params.name)
  if (!row) return res.status(404).json({ error: 'Package not found' })
  db.prepare('DELETE FROM mail WHERE id = ?').run(row.id)
  res.json({ sender: row.sender, label: row.label, payload: JSON.parse(row.payload_json) })
})

// --- Clans (arClanHall's PEEKCLAN/MAKECLAN/KILLCLAN) -------------------

app.get('/api/clans/:name', (req, res) => {
  const clan = db.prepare('SELECT * FROM clans WHERE name = ? COLLATE NOCASE').get(req.params.name)
  if (!clan) return res.status(404).json({ error: 'No Clan Found' })
  // "members"/"power" are computed off the hero registry rather than a
  // literal port of the original server's (never client-visible) formula -
  // sum of member levels is a reasonable stand-in for "Power".
  const stats = db
    .prepare('SELECT COUNT(*) as members, COALESCE(SUM(level), 0) as power FROM heroes WHERE clan = ? COLLATE NOCASE')
    .get(clan.name)
  res.json({ leader: clan.leader, members: stats.members, power: stats.power, ability: 'None' })
})

app.post('/api/clans', (req, res) => {
  const { name, leader } = req.body ?? {}
  if (typeof name !== 'string' || name.length < 1 || typeof leader !== 'string') {
    return res.status(400).json({ error: 'Malformed clan payload' })
  }
  const existing = db.prepare('SELECT name FROM clans WHERE name = ? COLLATE NOCASE').get(name)
  if (existing) return res.status(409).json({ error: 'Clan already exists' })
  db.prepare('INSERT INTO clans (name, leader, created_at) VALUES (?, ?, ?)').run(name, leader, new Date().toISOString())
  res.json({ ok: true })
})

app.delete('/api/clans/:name', (req, res) => {
  const { leader } = req.body ?? {}
  const clan = db.prepare('SELECT * FROM clans WHERE name = ? COLLATE NOCASE').get(req.params.name)
  if (!clan) return res.status(404).json({ error: 'No Clan Found' })
  if (typeof leader !== 'string' || leader.toLowerCase() !== clan.leader.toLowerCase()) {
    return res.status(403).json({ error: 'Only the clan leader may disband it' })
  }
  db.prepare('DELETE FROM clans WHERE name = ? COLLATE NOCASE').run(req.params.name)
  res.json({ ok: true })
})

// --- Static web build (production container only) ----------------------
// `web/dist` is copied to `public/` at image build time (see Dockerfile).
// In dev the Vite server serves the client directly, so this directory
// doesn't exist and these routes are simply never registered.
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
if (existsSync(path.join(publicDir, 'index.html'))) {
  app.use(express.static(publicDir))
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}
