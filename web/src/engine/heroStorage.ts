// Replaces DCourt/Tools/FileLoader.java's file-per-hero persistence with
// localStorage, keyed by hero name (see CONVERSION_PLAN.md's persistence
// decision). No server round trip, so there's no cgi()/session/error-code
// handling to port - Player.java's err 1-3 states were network failure modes
// that don't apply to a synchronous local read/write.

import { ItHero, type HeroJSON } from '../domain/itHero'
import { syncHero as cgiSyncHero } from './cgiClient'

const PREFIX = 'hero:'

export function saveHero(hero: ItHero): void {
  localStorage.setItem(PREFIX + hero.getName(), JSON.stringify(hero.toSaveJSON()))
}

export function loadHero(name: string): ItHero | null {
  const raw = localStorage.getItem(PREFIX + name)
  if (raw == null) return null
  const hero = ItHero.fromSaveJSON(JSON.parse(raw) as HeroJSON)
  // attack/defend/skill/raise aren't part of the saved JSON (see itHero.ts's
  // HeroJSON comment) - fromSaveJSON() leaves them at their class-field
  // defaults (0), so every freshly-loaded hero needs these recomputed once
  // before use. Without this, getRaise() reads back as 0 and checkLevel()'s
  // `exp < raise` check (0 < 0) is false, spuriously granting a level-up on
  // the very next visit to a screen that checks it.
  hero.calcCombat()
  hero.calcRaise()
  return hero
}

// Pushes a mirror copy to the shared server registry (see server/'s README
// and cgiClient.ts) so other browsers/devices can find this hero via
// arPeer/arClanHall. Deliberately *not* called from saveHero() above/every
// heroStore.save() - that path fires on nearly every single mutation
// throughout the game (matching Player.java's own save-on-every-action
// habit), and firing a network request that often would be both wasteful
// and would spam a real fetch() from hundreds of unrelated existing tests
// that never mock it. Called explicitly instead, at natural session
// boundaries (arEntry.vue's enter(), arCreate.vue's beginPlay()) and
// wherever a screen already talks to the server for its own reasons
// (arClanHall/arPackage), where the extra round trip is free context.
// Fire-and-forget: a sync failure shouldn't block local play, so callers
// don't await this.
export function syncHero(hero: ItHero): void {
  void cgiSyncHero(hero.getName(), hero.getTitle(), hero.getClan(), hero.getLevel(), hero.toSaveJSON())
}

export function listHeroes(): string[] {
  const names: string[] = []
  for (let ix = 0; ix < localStorage.length; ix++) {
    const key = localStorage.key(ix)
    if (key?.startsWith(PREFIX)) names.push(key.slice(PREFIX.length))
  }
  return names
}
