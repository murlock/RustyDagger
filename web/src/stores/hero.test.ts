import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import * as C from '../domain/constants'
import { DEAD } from '../domain/itAgent'
import { loadHero } from '../engine/heroStorage'
import { useHeroStore } from './hero'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('hero store', () => {
  it('createHero then save persists a loadable hero', () => {
    const store = useHeroStore()
    store.createHero('Zog')
    store.save()
    const loaded = loadHero('Zog')
    expect(loaded).not.toBeNull()
    expect(loaded!.getName()).toBe('Zog')
  })

  it('load populates state.hero from storage', () => {
    const first = useHeroStore()
    first.createHero('Perig')
    first.hero!.getRank().fixCount(C.LEVEL, 4)
    first.save()

    const store = useHeroStore()
    expect(store.load('Perig')).toBe(true)
    expect(store.hero!.getLevel()).toBe(4)
  })

  it('load returns false and leaves hero null for an unknown name', () => {
    const store = useHeroStore()
    expect(store.load('Nobody')).toBe(false)
    expect(store.hero).toBeNull()
  })

  it('checkLevel levels up the hero and persists the result', () => {
    const store = useHeroStore()
    const hero = store.createHero('Levelup')
    hero.calcRaise()
    hero.learn(hero.getRaise())

    const result = store.checkLevel()

    expect(result).not.toBeNull()
    expect(result!.level).toBe(1)
    expect(loadHero('Levelup')!.getLevel()).toBe(1)
  })

  it('resolveDeath kills, then revives, the hero and persists the result', () => {
    const store = useHeroStore()
    const hero = store.createHero('Doomed')
    hero.getRank().fixCount(C.LEVEL, 5)
    hero.setGuts(20)

    const result = store.resolveDeath(null, false)

    expect(result).not.toBeNull()
    expect(result!.questsLost).toBeGreaterThan(0)
    expect(loadHero('Doomed')!.getPlace()).toBe(C.FIELDS)
  })

  it('resolveDeath is a no-op without a current hero', () => {
    const store = useHeroStore()
    expect(store.resolveDeath(null, false)).toBeNull()
  })

  it('advanceDay recomputes combat stats and persists', () => {
    const store = useHeroStore()
    store.createHero('Fresh')
    store.advanceDay(true)
    expect(loadHero('Fresh')).not.toBeNull()
  })

  it('needsBuild is false at low level and true once past level 5 with no looks', () => {
    const store = useHeroStore()
    store.createHero('Builder')
    expect(store.needsBuild()).toBe(false)
    store.hero!.getRank().fixCount(C.LEVEL, 6)
    expect(store.needsBuild()).toBe(true)
  })

  it('isDead/isAlive/isCreate reflect the hero state', () => {
    const store = useHeroStore()
    store.createHero('Stateful')
    store.hero!.setState(DEAD)
    expect(store.isDead()).toBe(true)
    expect(store.isAlive()).toBe(false)
  })
})
