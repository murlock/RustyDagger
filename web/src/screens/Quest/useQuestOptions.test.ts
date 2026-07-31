import { describe, expect, it } from 'vitest'
import { setSeed } from '../../engine/dice'
import { ItHero } from '../../domain/itHero'
import * as MonsterTable from '../../domain/tables/monsterTable'
import * as C from '../../domain/constants'
import { QuestOptions, ATTACK, BRIBE, FLEE, CONTROL, BERZERK, IEATSU } from './useQuestOptions'

function hero(): ItHero {
  const h = new ItHero('Zog')
  h.setVals(10, 10, 10, 0, 0, 0)
  return h
}

describe('QuestOptions.fixList', () => {
  it('offers only Flee when the hero is Panicked', () => {
    const h = hero()
    h.getTemp().fixTrait('Panic')
    const opt = new QuestOptions(['bribe', 'attack'])
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).toEqual([FLEE])
  })

  it('first round: always offers Attack and Flee, plus goal options the hero can afford', () => {
    setSeed(1)
    const h = hero()
    h.addMoney(100)
    const opt = new QuestOptions(['bribe'])
    opt.fixList(h)
    const choices = opt.entries.map((e) => e.choice)
    expect(choices).toEqual(expect.arrayContaining([ATTACK, FLEE, BRIBE]))
  })

  it('first round: withholds a goal option the hero cannot afford', () => {
    setSeed(1)
    const h = hero() // no money
    const opt = new QuestOptions(['bribe'])
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).not.toContain(BRIBE)
  })

  it('first round: withholds Backstab/Swindle unless the hero has thief rank', () => {
    setSeed(1)
    const h = hero()
    const opt = new QuestOptions(['backstab'])
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).not.toContain(7)

    h.getTemp().fixCount(C.THIEF, 2)
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).toContain(7)
  })

  it('later rounds: drops down to Attack/Flee, plus Control/Berzerk if the hero has the guild skill', () => {
    setSeed(1)
    const h = hero()
    h.getTemp().fixCount(C.MAGIC, 3)
    h.getTemp().fixCount(C.FIGHT, 2)
    const monster = MonsterTable.find('Fields:Rodent', 1, 1, 1)!
    const opt = new QuestOptions(['control'])
    opt.fixList(h) // first round to initialize
    opt.nextRound(monster)
    opt.fixList(h)
    const choices = opt.entries.map((e) => e.choice)
    expect(choices).toEqual(expect.arrayContaining([ATTACK, FLEE, CONTROL, BERZERK]))
  })

  it('always offers Ieatsu when the hero has ieatsu rank, regardless of the monster goal', () => {
    setSeed(1)
    const h = hero()
    h.getTemp().fixCount(C.IEATSU, 1)
    const opt = new QuestOptions([])
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).toContain(IEATSU)
  })

  it('remove() permanently drops an option from future fixList() calls', () => {
    setSeed(1)
    const h = hero()
    h.addMoney(100)
    const opt = new QuestOptions(['bribe'])
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).toContain(BRIBE)

    opt.remove(BRIBE)
    opt.fixList(h)
    expect(opt.entries.map((e) => e.choice)).not.toContain(BRIBE)
  })

  it('redraw() refreshes the rank readout without changing the option set', () => {
    setSeed(1)
    const h = hero()
    h.getTemp().fixCount(C.MAGIC, 1)
    const opt = new QuestOptions(['control'])
    opt.fixList(h)
    const before = opt.entries.find((e) => e.choice === CONTROL)!.label
    expect(before).toContain('[1]')

    h.getTemp().fixCount(C.MAGIC, 5)
    opt.redraw(h)
    const after = opt.entries.find((e) => e.choice === CONTROL)!.label
    expect(after).toContain('[5]')
  })
})
