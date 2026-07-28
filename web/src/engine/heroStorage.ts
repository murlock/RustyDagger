// Replaces DCourt/Tools/FileLoader.java's file-per-hero persistence with
// localStorage, keyed by hero name (see CONVERSION_PLAN.md's persistence
// decision). No server round trip, so there's no cgi()/session/error-code
// handling to port - Player.java's err 1-3 states were network failure modes
// that don't apply to a synchronous local read/write.

import { ItHero, type HeroJSON } from '../domain/itHero'

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

export function listHeroes(): string[] {
  const names: string[] = []
  for (let ix = 0; ix < localStorage.length; ix++) {
    const key = localStorage.key(ix)
    if (key?.startsWith(PREFIX)) names.push(key.slice(PREFIX.length))
  }
  return names
}
