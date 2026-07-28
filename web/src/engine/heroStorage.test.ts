import { beforeEach, describe, expect, it } from 'vitest'
import * as C from '../domain/constants'
import { ItCount } from '../domain/itCount'
import { ItHero } from '../domain/itHero'
import { loadHero, listHeroes, saveHero } from './heroStorage'

beforeEach(() => localStorage.clear())

describe('heroStorage', () => {
  it('round-trips a saved hero, including stats and pack contents', () => {
    const hero = new ItHero('Grondar')
    hero.setVals(10, 11, 12, 0, 0, 0)
    hero.getRank().fixCount(C.LEVEL, 3)
    hero.getPack().append(new ItCount('Marks', 7))

    saveHero(hero)
    const loaded = loadHero('Grondar')

    expect(loaded).not.toBeNull()
    expect(loaded!.getGuts()).toBe(10)
    expect(loaded!.getLevel()).toBe(3)
    expect(loaded!.getPack().getCount('Marks')).toBe(7)
  })

  it('returns null for a hero name that was never saved', () => {
    expect(loadHero('Nobody')).toBeNull()
  })

  it('listHeroes reflects saved keys and ignores unrelated localStorage entries', () => {
    localStorage.setItem('unrelated', 'x')
    saveHero(new ItHero('Alice'))
    saveHero(new ItHero('Bob'))
    expect(listHeroes().sort()).toEqual(['Alice', 'Bob'])
  })
})
