import { beforeEach, describe, expect, it } from 'vitest'
import { setSeed } from '../engine/dice'
import * as AT from './armsTrait'
import * as C from './constants'
import { ALIVE, DEAD } from './itAgent'
import { ItArms } from './itArms'
import { ItCount } from './itCount'
import { ItHero } from './itHero'

beforeEach(() => setSeed(1))

describe('ItHero leveling', () => {
  it('checkLevel wakes a non-dead hero to Alive even when it cannot level yet', () => {
    const hero = new ItHero('Test')
    hero.calcRaise()
    expect(hero.checkLevel()).toBeNull()
    expect(hero.getState()).toBe(ALIVE)
  })

  it('does not wake a dead hero', () => {
    const hero = new ItHero('Test')
    hero.setState(DEAD)
    hero.calcRaise()
    hero.checkLevel()
    expect(hero.getState()).toBe(DEAD)
  })

  it('levels up once experience meets the raise threshold, and resets exp/raise', () => {
    const hero = new ItHero('Test')
    hero.calcRaise() // level 0 -> raise ~= 33
    const raiseNeeded = hero.getRaise()
    hero.learn(raiseNeeded)
    const result = hero.checkLevel()
    expect(result).not.toBeNull()
    expect(result!.level).toBe(1)
    expect(hero.getLevel()).toBe(1)
    expect(hero.getExp()).toBe(0)
    expect(hero.getGuts()).toBe(2)
    expect(hero.getWits()).toBe(2)
    expect(hero.getCharm()).toBe(2)
  })
})

describe('ItHero.resolveDeath', () => {
  function makeHero(level: number): ItHero {
    const hero = new ItHero('Test')
    hero.getRank().fixCount(C.LEVEL, level)
    hero.setGuts(20)
    return hero
  }

  it('a Bottled Faery fully saves the hero: no death, no fatigue, item consumed', () => {
    const hero = makeHero(5)
    hero.getPack().append(new ItCount('Bottled Faery', 1))
    const before = hero.getFatigue()
    const result = hero.resolveDeath(null, false)
    expect(result.savedByFaery).toBe(true)
    expect(result.exiled).toBe(false)
    expect(hero.getPack().getCount('Bottled Faery')).toBe(0)
    expect(hero.getState()).toBe(ALIVE)
    expect(hero.getFatigue()).toBe(before)
  })

  it('without a faery: state becomes Dead, fatigue added, revived to Fields', () => {
    const hero = makeHero(5)
    const result = hero.resolveDeath(null, false)
    expect(result.savedByFaery).toBe(false)
    expect(result.exiled).toBe(false)
    expect(result.questsLost).toBeGreaterThan(0)
    expect(hero.getState()).toBe(ALIVE) // revived by the end of resolveDeath
    expect(hero.getPlace()).toBe(C.FIELDS)
  })

  it('running out of quests exits instead of reviving to the fields', () => {
    const hero = makeHero(5)
    hero.addFatigue(1000) // force getQuests() below 1
    const result = hero.resolveDeath(null, false)
    expect(result.exiled).toBe(true)
    // exiled path skips the cure/revive tail entirely
    expect(hero.getState()).toBe(DEAD)
  })

  it('losePack halves pack contents via loseHalf', () => {
    setSeed(42)
    const hero = makeHero(5)
    for (let i = 0; i < 20; i++) hero.getPack().append(new ItCount(`Item${i}`, 1))
    const before = hero.getPack().getCount()
    hero.resolveDeath(null, true)
    expect(hero.getPack().getCount()).toBeLessThan(before)
  })
})

describe('ItHero pack/store capacity', () => {
  it('packMax grows with Trader/Merchant traits', () => {
    const hero = new ItHero('Test')
    expect(hero.packMax()).toBe(60)
    hero.getTemp().fixTrait(C.TRADER)
    expect(hero.packMax()).toBe(80)
  })
})

describe('ItHero.copy', () => {
  it('preserves pack contents (regression: copy used to duplicate empty sublists ahead of the real ones)', () => {
    const hero = new ItHero('Orig')
    hero.getPack().append(new ItCount('Marks', 42))
    const copy = ItHero.fromHero(hero)
    expect(copy.getPack().getCount('Marks')).toBe(42)
    expect(copy.getQueue().map((it) => it.getName())).toEqual(hero.getQueue().map((it) => it.getName()))
  })
})

describe('ItHero.toSaveJSON / fromSaveJSON', () => {
  it('round-trips guts/wits/charm, pack contents, and nested arms through JSON', () => {
    const hero = new ItHero('Roundtrip')
    hero.setVals(12, 13, 14, 0, 0, 0)
    hero.getRank().fixCount(C.LEVEL, 5)
    hero.setPlace(C.FIELDS)
    hero.setState(DEAD)
    hero.getPack().append(new ItCount('Marks', 42))
    const sword = new ItArms('Sword', 3, 1, 0)
    sword.fixTrait(AT.RIGHT)
    hero.getGear().append(sword)

    const revived = ItHero.fromSaveJSON(JSON.parse(JSON.stringify(hero.toSaveJSON())))

    expect(revived.getGuts()).toBe(12)
    expect(revived.getWits()).toBe(13)
    expect(revived.getCharm()).toBe(14)
    expect(revived.getLevel()).toBe(5)
    expect(revived.getPlace()).toBe(C.FIELDS)
    expect(revived.getState()).toBe(DEAD)
    expect(revived.getPack().getCount('Marks')).toBe(42)
    const revivedSword = revived.getGear().findArms(AT.RIGHT)
    expect(revivedSword?.getName()).toBe('Sword')
    expect(revivedSword?.getAttack()).toBe(3)
    expect(revivedSword?.getDefend()).toBe(1)
  })
})
