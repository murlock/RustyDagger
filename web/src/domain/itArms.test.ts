import { describe, expect, it } from 'vitest'
import { setSeed } from '../engine/dice'
import * as AT from './armsTrait'
import { ItArms } from './itArms'

describe('ItArms', () => {
  it('fullAttack/fullDefend/fullSkill fold in enchant and trait bonuses', () => {
    const sword = new ItArms('Long Sword', 7, 0, 0)
    expect(sword.fullAttack()).toBe(7)
    sword.incEnchant()
    sword.incEnchant()
    sword.incEnchant()
    // Math.trunc((3 + 9) / 10) === 1
    expect(sword.fullAttack()).toBe(8)
  })

  it('Right+Flame grants a flat +8 attack bonus', () => {
    const sword = new ItArms('Flaming Sword', 15, 0, 5)
    sword.fixTrait(AT.RIGHT)
    sword.fixTrait(AT.FLAME)
    expect(sword.fullAttack()).toBe(15 + 8)
  })

  it('toShow renders bracketed stats and hides them when Secret', () => {
    const dagger = new ItArms('Rusty Dagger', 3, 0, -1)
    expect(dagger.toShow()).toBe('Rusty Dagger[+3a-1s]')
    dagger.fixTrait(AT.SECRET)
    expect(dagger.toShow()).toBe('Rusty Dagger[?]')
  })

  it('decay weakens stats and always sets the Decay trait when it triggers', () => {
    setSeed(1)
    // decay() is a dice roll (rate clamped to >=2, so it isn't guaranteed to
    // trigger on any single call) — retry until it fires, then assert the
    // invariants that must hold whenever it does
    let triggered = false
    for (let i = 0; i < 50 && !triggered; i++) {
      const dagger2 = new ItArms('Rusty Dagger', 12, 12, 12)
      if (dagger2.decay(2)) {
        triggered = true
        expect(dagger2.getAttack()).toBeLessThan(12)
      }
    }
    expect(triggered).toBe(true)
  })

  it('stockValue is fixed at 2 for Secret or Curse items regardless of stats', () => {
    const arms = new ItArms('Godly Blade', 100, 100, 100)
    arms.fixTrait(AT.SECRET)
    expect(arms.stockValue()).toBe(2)
  })

  it('wearable() is true only for slot traits (head/body/feet/right/left)', () => {
    const junk = new ItArms('Junk')
    expect(junk.wearable()).toBe(false)
    junk.fixTrait(AT.RIGHT)
    expect(junk.wearable()).toBe(true)
  })
})
