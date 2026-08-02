// Run with `npm test` (node's built-in test runner, no extra dependency -
// matches this server's "small" scope). Uses a throwaway sqlite file per
// run (DRAGON_COURT_DB) so it never touches real dev data, and a dynamic
// import so that env var is set before db.js opens the database (a static
// top-level `import` would be hoisted above any code that sets it).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

process.env.DRAGON_COURT_DB = path.join(mkdtempSync(path.join(tmpdir(), 'dcourt-')), 'test.sqlite')
const { app } = await import('./app.js')

const server = app.listen(0)
const base = `http://127.0.0.1:${server.address().port}`

function postJson(url, body, method = 'POST') {
  return fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

test('hero registry: PUT then GET round-trips a save', async () => {
  const save = { type: 'hero', name: 'Zoggy', guts: 4, wits: 4, charm: 4, items: [] }
  const put = await postJson(`${base}/api/heroes/Zoggy`, { title: '', clan: null, level: 1, save }, 'PUT')
  assert.equal(put.status, 200)

  const got = await fetch(`${base}/api/heroes/Zoggy`)
  assert.equal(got.status, 200)
  assert.deepEqual((await got.json()).save, save)
})

test('hero registry: unknown hero 404s with "Unable to Load"', async () => {
  const res = await fetch(`${base}/api/heroes/Nobody`)
  assert.equal(res.status, 404)
  assert.match((await res.json()).error, /Unable to Load/)
})

test('mail: send requires an existing recipient', async () => {
  const res = await postJson(`${base}/api/mail`, {
    from: 'A',
    to: 'NoSuchHero',
    label: 'x',
    payload: { type: 'list', name: 'Mail', items: [] },
  })
  assert.equal(res.status, 404)
})

test('mail: send, list, and take round-trip; taking again 404s', async () => {
  await postJson(
    `${base}/api/heroes/Recip`,
    { title: '', clan: null, level: 1, save: { type: 'hero', name: 'Recip', guts: 4, wits: 4, charm: 4, items: [] } },
    'PUT',
  )
  const send = await postJson(`${base}/api/mail`, {
    from: 'Sender',
    to: 'Recip',
    label: 'A Package',
    payload: { type: 'list', name: 'Mail', items: [] },
  })
  assert.equal(send.status, 200)

  const list = await (await fetch(`${base}/api/mail/Recip`)).json()
  assert.equal(list.mail.length, 1)
  assert.equal(list.mail[0].label, 'A Package')

  const take = await fetch(`${base}/api/mail/Recip/take/${list.mail[0].id}`, { method: 'POST' })
  assert.equal(take.status, 200)
  assert.equal((await take.json()).sender, 'Sender')

  const listAfter = await (await fetch(`${base}/api/mail/Recip`)).json()
  assert.equal(listAfter.mail.length, 0)

  const takeAgain = await fetch(`${base}/api/mail/Recip/take/${list.mail[0].id}`, { method: 'POST' })
  assert.equal(takeAgain.status, 404)
})

test('clans: create, peek, dupe-name conflict, and only-leader-may-disband', async () => {
  const create = await postJson(`${base}/api/clans`, { name: 'Wolves', leader: 'Leadric' })
  assert.equal(create.status, 200)

  const dupe = await postJson(`${base}/api/clans`, { name: 'Wolves', leader: 'Someone' })
  assert.equal(dupe.status, 409)

  const peek = await (await fetch(`${base}/api/clans/Wolves`)).json()
  assert.equal(peek.leader, 'Leadric')

  const wrongLeader = await postJson(`${base}/api/clans/Wolves`, { leader: 'NotTheLeader' }, 'DELETE')
  assert.equal(wrongLeader.status, 403)

  const disband = await postJson(`${base}/api/clans/Wolves`, { leader: 'Leadric' }, 'DELETE')
  assert.equal(disband.status, 200)

  const peekAfter = await fetch(`${base}/api/clans/Wolves`)
  assert.equal(peekAfter.status, 404)
})

test('clans: peek on an unknown clan 404s with "No Clan Found"', async () => {
  const res = await fetch(`${base}/api/clans/Nonexistent`)
  assert.equal(res.status, 404)
  assert.match((await res.json()).error, /No Clan Found/)
})

after(() => {
  server.close()
})
