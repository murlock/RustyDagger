import { beforeEach, describe, expect, it } from 'vitest'
import { setSeed } from '../../engine/dice'
import { ItHero } from '../../domain/itHero'
import * as MonsterTable from '../../domain/tables/monsterTable'
import * as C from '../../domain/constants'
import { runBattleRound } from './battleRound'

function hero(): ItHero {
  const h = new ItHero('Zog')
  h.setVals(20, 20, 20, 0, 0, 0)
  h.calcCombat()
  h.resetActions()
  return h
}

beforeEach(() => setSeed(1))

describe('runBattleRound', () => {
  it('produces narrative text mentioning both combatants', () => {
    const h = hero()
    const mob = MonsterTable.find('Fields:Rodent', 1, h.getPower(), 1)!
    mob.resetActions()
    mob.chooseActions(h, true)

    const { text } = runBattleRound(h, mob, null)

    expect(text).toContain(h.getName())
    expect(text).toContain(mob.getName())
  })

  it('a devastating hero can eventually kill a weak monster in one exchange', () => {
    const h = hero()
    h.setAttack(10000)
    const mob = MonsterTable.find('Fields:Rodent', 1, h.getPower(), 1)!
    mob.resetActions()
    mob.chooseActions(h, true)

    const { text } = runBattleRound(h, mob, null)

    expect(mob.isDead()).toBe(true)
    expect(text).toContain('KILLED')
  })

  it('never kills both sides in the same round (killStop halts the second actor)', () => {
    const h = hero()
    h.setAttack(10000)
    h.setDefend(10000)
    const mob = MonsterTable.find('Fields:Rodent', 1, h.getPower(), 1)!
    mob.setAttack(10000)
    mob.resetActions()
    mob.chooseActions(h, true)

    runBattleRound(h, mob, null)

    // Whichever side struck first killed the other before it could act -
    // at most one of the two should have taken lethal damage this round.
    const deaths = [h.isDead(), mob.isDead()].filter(Boolean).length
    expect(deaths).toBeLessThanOrEqual(1)
  })

  it('prepends prior-round events text (e.g. a healing potion) to the events output', () => {
    const h = hero()
    const mob = MonsterTable.find('Fields:Rodent', 1, h.getPower(), 1)!
    mob.resetActions()
    mob.getActions().addCount(C.GOAT, 0) // no-op, just confirms getActions() access doesn't throw
    mob.chooseActions(h, true)

    const { events } = runBattleRound(h, mob, 'Earlier flavor text.\n')
    expect(events).toContain('Earlier flavor text.')
  })
})
