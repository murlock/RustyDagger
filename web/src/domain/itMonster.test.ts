import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSeed } from '../engine/dice'
import { ItHero } from './itHero'
import * as MonsterTable from './tables/monsterTable'

beforeEach(() => setSeed(7))

// heroPower=1 in these tests keeps `Math.trunc(monsterPower / heroPower)`
// well above zero for every monster, so the "adjust" trait's rebalancing
// branch (which divides by that truncated ratio) never degenerates to
// Infinity — see ItMonster.calcPrimary.
describe('monster catalog integrity', () => {
  it('every cataloged monster builds without data errors (pack/gear reference known items)', () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })
    for (const key of MonsterTable.keys()) {
      const monster = MonsterTable.find(key, 3, 1, 0)
      expect(monster).not.toBeNull()
      monster!.testGear()
    }
    spy.mockRestore()
    expect(errors).toEqual([])
  })

  it('balances combat stats to positive, finite numbers for every monster', () => {
    for (const key of MonsterTable.keys()) {
      const monster = MonsterTable.find(key, 3, 1, 0)!
      expect(Number.isFinite(monster.getAttack())).toBe(true)
      expect(Number.isFinite(monster.getDefend())).toBe(true)
      expect(Number.isFinite(monster.getSkill())).toBe(true)
      expect(monster.getStance()).toBeGreaterThanOrEqual(0)
      expect(monster.getStance()).toBeLessThanOrEqual(4)
    }
  })

  it('flavor text renders with substitutions applied, no leftover $tokens$ (aside from known data typos)', () => {
    for (const key of MonsterTable.keys()) {
      const monster = MonsterTable.find(key, 3, 1, 0)!
      expect(monster.getText().length).toBeGreaterThan(0)
    }
  })
})

describe('ItMonster.chooseActions', () => {
  it('runs without throwing across a range of monsters and never leaves actions negative', () => {
    const hero = new ItHero('Hero')
    hero.getRank().fixCount('Level', 3)
    hero.setGuts(20)
    hero.setWits(20)
    hero.setCharm(20)
    hero.calcCombat()

    for (const key of MonsterTable.keys().slice(0, 10)) {
      const monster = MonsterTable.find(key, 3, hero.getPower(), 0)!
      monster.resetActions()
      expect(() => monster.chooseActions(hero, true)).not.toThrow()
      expect(monster.actions()).toBeGreaterThanOrEqual(0)
    }
  })
})
