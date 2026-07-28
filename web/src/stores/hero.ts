// Pinia counterpart to DCourt/Control/Player.java, minus the multiplayer
// fields already dropped in the domain layer (see itHero.ts's header comment)
// and the cgi/session error handling FileLoader's replacement no longer needs
// (see heroStorage.ts). Screen-picking (Player.tryToExit/errorScreen) stays
// out of this store, same reasoning as itHero's checkLevel/resolveDeath split
// - this layer returns results, the UI layer decides what to show.
//
// Setup-store + shallowRef (rather than an options-store state() + markRaw):
// ItHero has private fields, and Vue's deep-reactive UnwrapRef mapped type
// can't represent those - a class instance in options-store state fails to
// type-check as ItHero at all (surfaces under `vue-tsc -b`/`npm run build`,
// though not under a bare `vue-tsc --noEmit`), and markRaw doesn't fix it
// since that mismatch is in the state type itself, not runtime behavior.
// shallowRef sidesteps UnwrapRef entirely. Since it (like markRaw) leaves
// mutations of the hero's internals untracked, isDead/isAlive/isCreate/
// needsBuild below are plain functions, not Pinia `getters` (Vue `computed`,
// which would cache a stale result across such mutations).
import { defineStore } from 'pinia'
import { shallowRef, triggerRef } from 'vue'
import { today } from '../engine/today'
import { loadHero, saveHero } from '../engine/heroStorage'
import type { DeathResult, LevelUpResult } from '../domain/itHero'
import { ItHero } from '../domain/itHero'
import * as C from '../domain/constants'

export const useHeroStore = defineStore('hero', () => {
  const hero = shallowRef<ItHero | null>(null)
  const sessionStart = shallowRef<Record<string, number> | null>(null)

  function createHero(name: string): ItHero {
    hero.value = new ItHero(name)
    sessionStart.value = null
    return hero.value
  }

  function load(name: string): boolean {
    const loaded = loadHero(name)
    if (loaded == null) return false
    hero.value = loaded
    sessionStart.value = {
      [C.GUTS]: loaded.getGuts(),
      [C.WITS]: loaded.getWits(),
      [C.CHARM]: loaded.getCharm(),
      [C.ATTACK]: loaded.getAttack(),
      [C.DEFEND]: loaded.getDefend(),
      [C.SKILL]: loaded.getSkill(),
      [C.LEVEL]: loaded.getLevel(),
      [C.EXP]: loaded.getExp(),
      [C.FAME]: loaded.getFame(),
      [C.MONEY]: loaded.getMoney(),
    }
    return true
  }

  // Player.getStart().getCount(id) - 0 for any stat never captured above.
  function sessionStartCount(id: string): number {
    return sessionStart.value?.[id] ?? 0
  }

  // hero.value's internals (pack/gear/money/...) are mutated in place by
  // ItHero's own methods rather than replaced, so a plain shallowRef write
  // never happens - triggerRef forces dependents (StatusBar, shop screens)
  // to re-read after any such mutation. Centralized here since save() is
  // the one call every mutating action already funnels through.
  function save(): void {
    if (hero.value) saveHero(hero.value)
    triggerRef(hero)
  }

  function checkLevel(): LevelUpResult | null {
    if (!hero.value) return null
    const result = hero.value.checkLevel()
    save()
    return result
  }

  function resolveDeath(tale: string | null, losePack: boolean): DeathResult | null {
    if (!hero.value) return null
    const result = hero.value.resolveDeath(tale, losePack)
    save()
    return result
  }

  function advanceDay(isPlaytest = false): void {
    if (!hero.value) return
    hero.value.advanceDay(today(), isPlaytest)
    save()
  }

  function isDead(): boolean {
    return hero.value?.isDead() ?? false
  }
  function isAlive(): boolean {
    return hero.value?.isAlive() ?? false
  }
  function isCreate(): boolean {
    return hero.value?.isCreate() ?? false
  }
  // Player.needsBuild(): past the early levels, a hero with no looks
  // selected yet needs to go through the build screens.
  function needsBuild(): boolean {
    if (hero.value == null || hero.value.getLevel() <= 5) return false
    return hero.value.getLooks() == null || hero.value.getLooks().getCount() < 1
  }

  return {
    hero,
    createHero,
    load,
    save,
    checkLevel,
    resolveDeath,
    advanceDay,
    isDead,
    isAlive,
    isCreate,
    needsBuild,
    sessionStartCount,
  }
})
