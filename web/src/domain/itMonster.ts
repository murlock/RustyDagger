// Port of DCourt/Items/List/itMonster.java. Portrait is kept as a plain
// filename string instead of an AWT widget.

import { contest, percent, roll, spread } from '../engine/dice'
import * as AT from './armsTrait'
import * as C from './constants'
import * as GT from './gearTypes'
import * as GearTable from './tables/gearTable'
import { Item } from './item'
import { ItAgent, ALIVE } from './itAgent'
import { ItArms } from './itArms'
import type { ItHero } from './itHero'
import { ItList } from './itList'
import { ItCount } from './itCount'
import { ItPercent } from './itPercent'
import { ItRandom } from './itRandom'
import { ItToken } from './itToken'
import { ItText, type TextSource } from './itText'

export const PASSIVE = 'passive'
export const DEFENSIVE = 'defensive'
export const HOSTILE = 'hostile'
export const AGGRESSIVE = 'aggressive'
const TIMID = 'timid'

interface CatalogCountItem {
  kind: string
  name: string
  count?: number
}

export interface MonsterCatalogEntry {
  key: string
  name: string
  guts: number
  wits: number
  charm: number
  baseAttack: number
  baseDefend: number
  baseSkill: number
  picture: string | null
  passion: string | null
  adjust: boolean
  pack: CatalogCountItem[]
  temp: CatalogCountItem[]
  gear: { slots: CatalogCountItem[]; traits: string[] }
  opts: string[]
  text: TextSource | null
}

function fromCatalogItem(entry: CatalogCountItem): Item {
  switch (entry.kind) {
    case 'count':
      return new ItCount(entry.name, entry.count ?? 0)
    case 'percent':
      return new ItPercent(entry.name, entry.count ?? 0)
    case 'random':
      return new ItRandom(entry.name, entry.count ?? 0)
    default:
      return new ItToken(entry.name)
  }
}

export class ItMonster extends ItAgent {
  private picture: string | null = null
  private text: ItText | null = null
  private optsList = new ItList('opts')
  private baseA = 0
  private baseD = 0
  private baseS = 0
  private stance = 2

  static fromCatalog(entry: MonsterCatalogEntry, heroLevel: number, heroPower: number, weight: number): ItMonster {
    const monster = new ItMonster(entry.name)
    monster.setVals(entry.guts, entry.wits, entry.charm, 0, 0, 0)
    monster.baseA = entry.baseAttack
    monster.baseD = entry.baseDefend
    monster.baseS = entry.baseSkill
    monster.picture = entry.picture
    if (entry.passion) monster.getValues().appendValue('passion', entry.passion)
    if (entry.adjust) monster.getValues().appendId('adjust')
    for (const it of entry.pack) monster.getPack().append(fromCatalogItem(it))
    for (const it of entry.temp) monster.getTemp().append(fromCatalogItem(it))
    for (const it of entry.gear.slots) monster.getGear().append(fromCatalogItem(it))
    for (const trait of entry.gear.traits) monster.getGear().appendId(trait)
    monster.optsList = new ItList('opts', entry.opts)
    monster.text = entry.text ? new ItText(entry.text) : null
    monster.balance(weight, heroLevel, heroPower)
    return monster
  }

  copy(): Item {
    throw new Error('ItMonster.copy() is not supported — build a fresh instance from the catalog instead')
  }

  private alterGuts(ratio: number): void {
    this.setGuts(Math.trunc(this.getGuts() * ratio))
  }
  private alterWits(ratio: number): void {
    this.setWits(Math.trunc(this.getWits() * ratio))
  }
  private alterCharm(ratio: number): void {
    this.setCharm(Math.trunc(this.getCharm() * ratio))
  }

  private balance(weight: number, heroLevel: number, heroPower: number): void {
    if (this.isMatch(C.DRAGON) && this.hasTrait(C.DRAGON)) {
      this.getOptions().appendId('trade')
      this.stance--
    }
    this.calcPrimary(weight, heroLevel, heroPower)
    this.calcCombat()
    this.calcSecondary(weight)
    this.buildPack()
    this.buildGear(this.getGear().select(0)!)
    this.buildGear(this.getGear().select(1)!)
  }

  private calcPrimary(weight: number, heroLevel: number, heroPower: number): void {
    const id = this.text?.getIdentity()
    if (id != null) this.setName(id)
    const ratio = 0.9 + heroLevel * 0.1
    this.alterGuts(ratio)
    this.alterWits(ratio)
    this.alterCharm(ratio)
    this.setGuts(spread(this.getGuts()))
    this.setWits(spread(this.getWits()))
    this.setCharm(spread(this.getCharm()))
    if (this.hasTrait('adjust')) {
      // Java computes getPower()/heroPower as *integer* division first, then
      // casts to float for the outer division — replicated with Math.trunc
      // on the inner division before the float divide below.
      const powerRatio = Math.trunc(this.getPower() / heroPower)
      const ratio2 = (1.0 + weight * 0.1) / powerRatio
      if (ratio2 > 1.0) {
        this.alterGuts(ratio2)
        this.alterWits(ratio2)
        this.alterCharm(ratio2)
        this.baseA = Math.trunc(this.baseA * ratio2)
        this.baseD = Math.trunc(this.baseD * ratio2)
        this.baseS = Math.trunc(this.baseS * ratio2)
      }
    }
  }

  private calcSecondary(weight: number): void {
    let num = this.tempCount(C.ACTIONS)
    if (num === 0) {
      num = 1
      this.fixTemp(C.ACTIONS, 1)
    }
    this.fixStatus(C.ACTIONS, num)
    this.fixStatus(
      C.FAME,
      Math.trunc((this.getGuts() + this.getWits() + this.getCharm()) / 30) +
        Math.trunc((this.thief() + this.magic() + this.fight() + weight) / 4),
    )
    this.fixStatus(C.EXP, Math.trunc(((1 + this.getAttack() + this.getDefend()) * (100 + this.getSkill())) / 100))
    const passion = this.getValues().getValue('passion')
    if (passion === AGGRESSIVE) this.stance = 4
    else if (passion === HOSTILE) this.stance = 3
    else if (passion === DEFENSIVE) this.stance = 2
    else if (passion === TIMID) this.stance = 1
    else if (passion === PASSIVE) this.stance = 0
    else {
      this.stance = 2
      console.error(`Unknown [passion=${passion}] for [${this.getName()}]`)
    }
  }

  private buildPack(): void {
    const pack = this.getPack()
    const from = [...pack.getQueue()]
    pack.clrQueue()
    for (const it of from) {
      if (!GearTable.find(it)) continue
      if (isNote(it)) {
        pack.append(it)
        continue
      }
      const make = GearTable.shopItem(it)
      if (!make) continue
      if (!(make instanceof ItArms)) {
        const num = (it as ItCount).makeCount()
        if (num >= 1) {
          make.setCount(num)
          pack.append(make)
        }
      } else if (percent(it.getCount()) && (!make.getName().startsWith('Silver') || percent(10))) {
        make.tweak()
        pack.append(make)
      }
    }
  }

  private buildGear(slot: Item): void {
    const num = (slot as ItCount).makeCount()
    if (num < 1) return
    const make = GearTable.shopItem(slot)
    if (!make || !(make instanceof ItArms)) return
    make.tweak()
    if (this.getGear().hasTrait(AT.CURSE) && percent(25)) make.fixTrait(AT.CURSED)
    if (this.getGear().hasTrait(AT.BLESS)) make.fixTrait(AT.BLESS)
    this.getPack().append(make)
  }

  testGear(): void {
    for (let ix = 0; ix < this.getPack().getCount(); ix++) {
      GearTable.find(this.getPack().select(ix)!)
    }
    this.testItem(this.getGear().select(0), 'weapon')
    this.testItem(this.getGear().select(1), 'armour')
  }

  private testItem(it: Item | null, type: string): void {
    if (!it) {
      console.error(`ERR: No ${type} for ${this.getName()}`)
    } else if (!(it instanceof ItCount)) {
      console.error(`ERR: Bad ${type} for ${this.getName()}`)
    } else if (it.getCount() > 0) {
      GearTable.find(it)
    }
  }

  resetActions(): void {
    const acts = this.getActions()
    const temp = this.getTemp()
    if (this.hasTrait(AT.BLIND)) temp.zero(C.ACTIONS)
    else temp.fixCount(C.ACTIONS, this.statusCount(C.ACTIONS))
    acts.clrQueue()
    acts.setName(C.ATTACK)
    this.setState(ALIVE)
  }

  getText(): string {
    return this.text?.getText() ?? ''
  }

  getPictureFile(): string | null {
    return this.picture
  }

  getOptions(): ItList {
    return this.optsList
  }

  baseExp(): number {
    return this.statusCount('exp')
  }
  baseFame(): number {
    return this.statusCount(C.FAME)
  }

  getWeapon(): string {
    return this.getGear().select(0)?.getName() ?? ''
  }
  getArmour(): string {
    return this.getGear().select(1)?.getName() ?? ''
  }

  protected gearAttack(): number {
    return this.baseA
  }
  protected gearDefend(): number {
    return this.baseD
  }
  protected gearSkill(): number {
    return this.baseS
  }

  getStance(): number {
    return this.stance
  }
  incStance(): void {
    this.stance++
  }
  setPassive(): void {
    this.stance = 0
  }
  isAggresive(): boolean {
    return this.stance >= 4
  }
  isHostile(): boolean {
    return this.stance === 3
  }
  isDefensive(): boolean {
    return this.stance === 2
  }
  isPassive(): boolean {
    return this.stance <= 1
  }

  chooseActions(enemy: ItHero, first: boolean): void {
    const pm0 = this.packMagic()
    const ph = this.packHeal()
    const sk0 = this.guildSkill()
    const acts = this.getActions()
    const temp = this.getTemp()
    acts.setName(C.ATTACK)
    if (this.actions() < 1) {
      this.useSkills(first)
      return
    }
    if ((this.hasTrait(AT.BLIND) || this.hasTrait(AT.PANIC)) && this.subPackCount(GT.SELTZER, 1) === 1) {
      acts.addCount(GT.SELTZER, 1)
      temp.clrTrait(AT.BLIND)
      temp.clrTrait(AT.PANIC)
      this.useAction()
    }
    const num = this.getWounds()
    const val = this.actions()
    if (num > val * 20 && ph > val && this.subPackCount(GT.GINSENG, 1) === 1) {
      acts.addCount(GT.GINSENG, 1)
      temp.addCount(C.ACTIONS, 2)
    }
    const num2 = num - this.actionHeal(GT.TROLL, num, 30)
    const num3 = num2 - this.actionHeal(GT.APPLE, num2, 30)
    this.actionHeal(GT.SALVE, num3, 15)
    if (temp.getCount(C.GOAT) > 0) {
      acts.setName(C.GOAT)
      temp.subCount(C.GOAT, 1)
    } else if (temp.getCount(C.WORM) > 0) {
      acts.setName(C.WORM)
      temp.subCount(C.WORM, 1)
    } else {
      const danger = this.getPower()
      const danger2 = Math.trunc(((enemy.getPower() - danger) * 4) / danger)
      const num4 = this.actions() + this.packCount(GT.GINSENG) * 2
      let pm = pm0 > num4 ? num4 : pm0
      let sk = sk0
      if (sk > 0) sk += danger2
      if (contest(pm, first ? sk - this.fight() : sk - this.thief())) this.useMagic()
      else this.useSkills(first)
    }
  }

  private useMagic(): void {
    let bd = this.packCount(GT.BLIND_DUST)
    let pn = this.packCount(GT.PANIC_DUST)
    let bt = this.packCount(GT.BLAST_DUST)
    const acts = this.getActions()
    const temp = this.getTemp()
    acts.setName(C.SPELLS)
    while (bd + pn > this.actions() && this.subPackCount(GT.GINSENG, 1) === 1) {
      acts.addCount(GT.GINSENG, 1)
      temp.addCount(C.ACTIONS, 2)
    }
    while (bd + pn + bt > 0 && this.actions() > 0) {
      if (contest(bd, pn + bt)) {
        this.subPackCount(GT.BLIND_DUST, 1)
        acts.addCount(AT.BLIND, 1)
        bd--
      } else if (contest(pn, bt)) {
        this.subPackCount(GT.PANIC_DUST, 1)
        acts.addCount(AT.PANIC, 1)
        pn--
      } else {
        this.subPackCount(GT.BLAST_DUST, 1)
        acts.addCount(AT.BLAST, 1)
        bt--
      }
      this.useAction()
    }
  }

  private useSkills(first: boolean): void {
    const wr = this.fight()
    const mg = this.magic()
    const tf = this.thief()
    const sm = this.ieatsu()
    const acts = this.getActions()
    if (roll(3) >= this.stance) {
      acts.setName(C.RUNAWAY)
    } else if (first) {
      if (tf + mg + sm >= 1) {
        if (contest(mg, tf + sm)) acts.setName(C.CONTROL)
        else if (contest(sm, tf)) acts.setName(C.IEATSU)
        else acts.setName(roll(2) === 0 ? C.SWINDLE : C.BACKSTAB)
      }
    } else if (mg + wr >= 1) {
      if (contest(mg, wr)) acts.setName(C.CONTROL)
      else acts.setName(C.BERZERK)
    }
  }

  private actionHeal(id: string, wounds: number, val: number): number {
    let num = Math.trunc((wounds + Math.trunc(val / 2)) / val)
    const has = this.packCount(id)
    if (num > has) num = has
    const has2 = this.actions()
    if (num > has2) num = has2
    this.useAction(num)
    this.getActions().addCount(id, num)
    return num * val
  }

  goatSkill(hero: ItHero): string {
    this.getActions().setName(C.ATTACK)
    if (!contest(2 * this.getGuts(), hero.getGuts())) return ''
    const val = hero.packCount('Rope')
    if (val === 0) return ''
    let num = 1 + roll(4) + roll(4)
    if (num > val) num = val
    hero.subPackCount('Rope', num)
    return `\tThe ${this.getName()} steals and devours ${num} pieces of rope!  Baa-a-a-a!\n`
  }

  wormSkill(hero: ItHero): string {
    this.getActions().setName(C.ATTACK)
    if (!contest(2 * this.getGuts(), hero.getGuts())) return ''
    let it = hero.findGearTrait(AT.GLOWS)
    if (!it) it = hero.findGearTrait(AT.FLAME)
    if (!it) return ''
    hero.dropGear(it)
    it.decay(3)
    this.getPack().insert(it)
    return `\tThe ${this.getName()} rips the ${it.getName()} from your body and swallows it whole!\n`
  }
}

function isNote(it: Item): boolean {
  return it.toJSON().type === 'note'
}
