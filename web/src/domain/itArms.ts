// Port of DCourt/Items/List/itArms.java

import { roll, skew, twice } from '../engine/dice'
import * as ArmsTrait from './armsTrait'
import { Item, type ItemJSON } from './item'
import { ItList } from './itList'

export class ItArms extends ItList {
  // discriminator used by ItList.findArms/fullAttack/fullDefend/fullSkill to
  // distinguish an ItArms from a plain ItList without an `instanceof` (which
  // would need a circular runtime import between itList.ts and itArms.ts)
  readonly kind = 'arms' as const

  private attack = 0
  private defend = 0
  private skill = 0

  constructor(name: string, attack = 0, defend = 0, skill = 0) {
    super(name)
    this.attack = attack
    this.defend = defend
    this.skill = skill
  }

  static fromArms(other: ItArms): ItArms {
    const copy = new ItArms(other.getName(), other.getAttack(), other.getDefend(), other.getSkill())
    for (let ix = 0; ix < other.getCount(); ix++) copy.append(other.select(ix)!.copy())
    return copy
  }

  copy(): Item {
    return ItArms.fromArms(this)
  }

  getAttack(): number {
    return this.attack
  }
  getDefend(): number {
    return this.defend
  }
  getSkill(): number {
    return this.skill
  }
  setAttack(val: number): void {
    this.attack = val
  }
  setDefend(val: number): void {
    this.defend = val
  }
  setSkill(val: number): void {
    this.skill = val
  }
  addAttack(val: number): void {
    this.attack += val
  }
  addDefend(val: number): void {
    this.defend += val
  }
  addSkill(val: number): void {
    this.skill += val
  }
  subAttack(val: number): void {
    this.attack -= val
  }
  subDefend(val: number): void {
    this.defend -= val
  }
  subSkill(val: number): void {
    this.skill -= val
  }

  toLoot(): string {
    return this.toShow()
  }

  toShow(): string {
    const name = this.getName()
    if (this.hasTraitIx(ArmsTrait.SECRET)) return `${name}[?]`
    let msg = `${name}[`
    if (this.fullAttack() > 0) msg += '+'
    if (this.fullAttack() !== 0) msg += `${this.fullAttack()}a`
    if (this.fullDefend() > 0) msg += '+'
    if (this.fullDefend() !== 0) msg += `${this.fullDefend()}d`
    if (this.fullSkill() > 0) msg += '+'
    if (this.fullSkill() !== 0) msg += `${this.fullSkill()}s`
    if (this.hasTraitIx(ArmsTrait.DECAY)) msg += '@'
    if (this.hasTraitIx(ArmsTrait.CURSE)) msg += '*'
    return `${msg}]`
  }

  fullAttack(): number {
    let num = this.attack
    if (this.hasTraitIx(ArmsTrait.RIGHT) && this.hasTraitIx(ArmsTrait.FLAME)) num += 8
    return num + Math.floor((this.getEnchant() + 9) / 10)
  }

  fullDefend(): number {
    let num = this.defend
    if (this.hasTraitIx(ArmsTrait.BLESS)) num++
    return num + Math.floor((this.getEnchant() + 4) / 10)
  }

  fullSkill(): number {
    let num = this.skill
    if (this.hasTraitIx(ArmsTrait.RIGHT) && this.hasTraitIx(ArmsTrait.LUCKY)) num += 12
    if (this.hasTraitIx(ArmsTrait.GLOWS)) num += 2
    return num + this.getEnchant()
  }

  getPower(): number {
    const power = this.attack * 3 + this.defend * 2 + this.skill
    return power < 1 ? 1 : power
  }

  getEnchant(): number {
    return this.getCount(ArmsTrait.ENCHANT)
  }

  incEnchant(): void {
    this.addCount(ArmsTrait.ENCHANT, 1)
  }

  setEnchant(val: number): void {
    this.fixCount(ArmsTrait.ENCHANT, val)
  }

  isBright(): boolean {
    return this.hasTraitIx(ArmsTrait.GLOWS) || this.hasTraitIx(ArmsTrait.FLAME)
  }

  isCursed(): boolean {
    return this.hasTraitIx(ArmsTrait.CURSED) || this.hasTraitIx(ArmsTrait.CURSE)
  }

  revealCurse(): void {
    if (this.hasTraitIx(ArmsTrait.CURSED)) {
      this.clrTrait(ArmsTrait.CURSED)
      this.fixTrait(ArmsTrait.CURSE)
    }
  }

  wearable(): boolean {
    for (let ix = 0; ix < ArmsTrait.END_WEAR_TRAIT; ix++) {
      if (this.hasTraitIx(ArmsTrait.traitLabel[ix])) return true
    }
    return false
  }

  private hasTraitIx(label: string): boolean {
    return this.hasTrait(label)
  }

  decay(rate: number): boolean {
    this.clrTrait(ArmsTrait.DECAY)
    if (rate < 2) rate = 2
    if (roll(rate) > 0) return false
    this.fixTrait(ArmsTrait.DECAY)
    const a = this.attack
    this.subAttack(a <= 1 ? 1 - Math.floor(a / 12) : 1 + Math.floor(a / 12))
    const d = this.defend
    this.subDefend(d <= 1 ? 1 - Math.floor(d / 12) : 1 + Math.floor(d / 12))
    const s = this.skill
    this.subSkill(s <= 1 ? 1 - Math.floor(s / 12) : 1 + Math.floor(s / 12))
    if (roll(12) !== 0) return true
    this.clrTrait(ArmsTrait.traitLabel[ArmsTrait.VISIBLE_TRAIT + roll(ArmsTrait.ENCHANT_TRAIT - ArmsTrait.VISIBLE_TRAIT)])
    this.subCount(ArmsTrait.ENCHANT, Math.floor((this.getEnchant() + 4) / 5))
    return true
  }

  tweak(): void {
    let sum = this.getPower()
    const MEGATWEAK = 2048
    const value = 7 + twice(4) + skew(50)
    const a = this.attack
    this.setAttack(a < 0 ? Math.trunc((a * 10) / value) : Math.trunc((a * value) / 10))
    const d = this.defend
    this.setDefend(d < 0 ? Math.trunc((d * 10) / value) : Math.trunc((d * value) / 10))
    const s = this.skill
    this.setSkill(s < 0 ? Math.trunc((s * 10) / value) : Math.trunc((s * value) / 10))
    for (;;) {
      const value2 = roll(MEGATWEAK)
      if (value2 >= sum) break
      sum -= value2
      const trait = ArmsTrait.traitLabel[ArmsTrait.VISIBLE_TRAIT + roll(ArmsTrait.ENCHANT_TRAIT - ArmsTrait.VISIBLE_TRAIT)]
      if ((value2 & 1) === 0) this.clrTrait(trait)
      else this.fixTrait(trait)
    }
    if (this.isCursed()) {
      this.clrTrait(ArmsTrait.CURSE)
      this.fixTrait(ArmsTrait.CURSED)
    }
    if (this.isCursed() || this.stockValue() >= 70) {
      this.fixTrait(ArmsTrait.SECRET)
    }
  }

  stockValue(): number {
    if (this.hasTraitIx(ArmsTrait.SECRET) || this.hasTraitIx(ArmsTrait.CURSE)) return 2
    const num = this.attack + this.defend
    const value = (num > 0 ? 1 : -1) * num * num * 5
    const num2 = this.skill
    // integer division happens here in the original, before the trait sum is added
    let value2 = Math.trunc((value + (num2 > 0 ? 1 : -1) * num2 * num2 * 2) / 2)
    for (let ix = ArmsTrait.VALUED_TRAIT; ix < ArmsTrait.traitLabel.length; ix++) {
      const it = this.find(ArmsTrait.traitLabel[ix])
      if (it) value2 += it.getCount() * ArmsTrait.traitValue[ix]
    }
    return value2
  }

  toJSON(): ItemJSON {
    return {
      type: 'arms',
      name: this.getName(),
      attack: this.attack,
      defend: this.defend,
      skill: this.skill,
      items: this.getQueue().map((it) => it.toJSON()),
    }
  }
}
