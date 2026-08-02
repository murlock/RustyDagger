// Thin fetch wrapper for the server in `server/` - the local stand-in for
// DCourt/Tools/Loader.java's CGI actions (FINDHERO/SENDMAIL/LISTMAIL/
// TAKEMAIL/PEEKCLAN/MAKECLAN/KILLCLAN). See CONVERSION_PLAN.md's Phase 5
// #14-16/#26-27 entries for why arPeer/arPackage/arPostal/arClanHall needed
// this to exist first.
//
// Every call here can fail (server down, name not found, ...) - callers get
// back a plain result object rather than a thrown exception, mirroring
// Buffer.isError()'s "check before use" pattern rather than Java's
// exception-swallowing Loader.operate() (which itself just logged and
// returned ""). vite.config.ts proxies `/api` to the server in dev.
import type { HeroJSON } from '../domain/itHero'
import type { ItemJSON } from '../domain/item'

export type CgiResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function call<T>(input: RequestInfo, init?: RequestInit): Promise<CgiResult<T>> {
  try {
    const res = await fetch(input, init)
    const body = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: body?.error ?? `Request failed (${res.status})` }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, error: 'A transmission error has occurred' }
  }
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

/** Mirrors Loader.SAVEHERO - pushes this hero's save into the shared registry so other heroes can find it. */
export function syncHero(name: string, title: string, clan: string | null, level: number, save: HeroJSON): Promise<CgiResult<{ ok: true }>> {
  return call(`/api/heroes/${encodeURIComponent(name)}`, { ...json({ title, clan, level, save }), method: 'PUT' })
}

/** Mirrors Loader.READHERO/FINDHERO - loads another hero's save for arPeer's "Examine Hero". */
export function loadHeroRemote(name: string): Promise<CgiResult<{ save: HeroJSON }>> {
  return call(`/api/heroes/${encodeURIComponent(name)}`)
}

/** Mirrors Loader.SENDMAIL - arPackage.send()/petitionClan()/grantPetition()/denyPetition(). */
export function sendMail(from: string, to: string, label: string, payload: ItemJSON): Promise<CgiResult<{ ok: true }>> {
  return call('/api/mail', json({ from, to, label, payload }))
}

/** Mirrors Loader.LISTMAIL - arPostal's postbox list. */
export function listMail(name: string): Promise<CgiResult<{ mail: { id: number; sender: string; label: string }[] }>> {
  return call(`/api/mail/${encodeURIComponent(name)}`)
}

/** Mirrors Loader.TAKEMAIL - arPostal's Take Mail. */
export function takeMail(name: string, id: number): Promise<CgiResult<{ sender: string; label: string; payload: ItemJSON }>> {
  return call(`/api/mail/${encodeURIComponent(name)}/take/${id}`, { method: 'POST' })
}

/** Mirrors Loader.PEEKCLAN - arClanHall's findClanInfo(). */
export function peekClan(name: string): Promise<CgiResult<{ leader: string; members: number; power: number; ability: string }>> {
  return call(`/api/clans/${encodeURIComponent(name)}`)
}

/** Mirrors Loader.MAKECLAN - arClanHall's createClan(). */
export function makeClan(name: string, leader: string): Promise<CgiResult<{ ok: true }>> {
  return call('/api/clans', json({ name, leader }))
}

/** Mirrors Loader.KILLCLAN - arClanHall's disbandClan(). */
export function killClan(name: string, leader: string): Promise<CgiResult<{ ok: true }>> {
  return call(`/api/clans/${encodeURIComponent(name)}`, { ...json({ leader }), method: 'DELETE' })
}
