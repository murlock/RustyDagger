// Port of DCourt/Items/List/itAgent.java.
// Portrait/UI concerns (getPicture, Portrait overlay text) are left to the
// UI layer in a later phase; picture is kept only as a plain filename.

import * as AT from './armsTrait'
import * as C from './constants'
import * as GT from './gearTypes'
import { Item } from './item'
import type { ItArms } from './itArms'
import { ItList } from './itList'

export const ALIVE = 'Alive'
export const DEAD = 'Dead'
export const CREATE = 'Create'
export const CONTROL_STATE = 'Control'
export const SWINDLE_STATE = 'Swindle'

const STATE = 'state'

export abstract class ItAgent extends ItList {
  private guts = 0
  private wits = 0
  private charm = 0
  private attack = 0
  private defend = 0
  private skillStat = 0
  protected pictureFile: string | null = null

  private packList!: ItList
  private gearList!: ItList
  private statList!: ItList
  private tempList!: ItList
  private rankList!: ItList
  private valuesList!: ItList
  private actsList!: ItList

  constructor(name: string) {
    super(name)
    this.fixLists()
  }

  abstract getWeapon(): string
  abstract getArmour(): string
  protected abstract gearAttack(): number
  protected abstract gearDefend(): number
  protected abstract gearSkill(): number

  setVals(g: number, w: number, c: number, a: number, d: number, s: number): void {
    this.guts = g
    this.wits = w
    this.charm = c
    this.attack = a
    this.defend = d
    this.skillStat = s
  }

  setGuts(n: number): void {
    this.guts = n
  }
  setWits(n: number): void {
    this.wits = n
  }
  setCharm(n: number): void {
    this.charm = n
  }
  setAttack(n: number): void {
    this.attack = n
  }
  setDefend(n: number): void {
    this.defend = n
  }
  setSkill(n: number): void {
    this.skillStat = n
  }
  addGuts(n: number): void {
    this.guts += n
  }
  addWits(n: number): void {
    this.wits += n
  }
  addCharm(n: number): void {
    this.charm += n
  }
  addAttack(n: number): void {
    this.attack += n
  }
  addDefend(n: number): void {
    this.defend += n
  }
  addSkill(n: number): void {
    this.skillStat += n
  }
  getGuts(): number {
    return this.guts
  }
  getWits(): number {
    return this.wits
  }
  getCharm(): number {
    return this.charm
  }
  getAttack(): number {
    return this.attack
  }
  getDefend(): number {
    return this.defend
  }
  getSkill(): number {
    return this.skillStat
  }

  // fixLists() re-links the named sublists after the queue changes (e.g.
  // after loading from JSON); pack/gear/etc are always non-null after this
  fixLists(): void {
    this.pictureFile = this.findValueString('pic')
    this.packList = this.fixList('pack')
    this.gearList = this.fixList('gear')
    this.statList = this.fixList('stat')
    this.tempList = this.fixList('temp')
    this.rankList = this.fixList('rank')
    this.valuesList = this.fixList('values')
    this.actsList = new ItList('acts')
  }

  private findValueString(name: string): string | null {
    const it = this.find(name)
    return it ? it.getValue() : null
  }

  getPack(): ItList {
    return this.packList
  }
  getGear(): ItList {
    return this.gearList
  }
  getStatus(): ItList {
    return this.statList
  }
  getTemp(): ItList {
    return this.tempList
  }
  getActions(): ItList {
    return this.actsList
  }
  getRank(): ItList {
    return this.rankList
  }
  getValues(): ItList {
    return this.valuesList
  }

  getState(): string | null {
    return this.getValues().getValue(STATE)
  }
  setState(val: string): void {
    this.getValues().fixValue(STATE, val)
  }
  isAlive(): boolean {
    return this.getState() === ALIVE
  }
  isDead(): boolean {
    return this.getState() === DEAD
  }
  isCreate(): boolean {
    return this.getState() === CREATE
  }
  isControl(): boolean {
    return this.getState() === CONTROL_STATE
  }
  isSwindle(): boolean {
    return this.getState() === SWINDLE_STATE
  }

  rankCount(id: string): number {
    return this.rankList.getCount(id)
  }
  fixRank(id: string, num: number): void {
    this.rankList.fixCount(id, num)
  }
  addRank(id: string, num: number): number {
    return this.rankList.addCount(id, num)
  }
  subRank(id: string, num: number): number {
    return this.rankList.subCount(id, num)
  }

  tempCount(id: string): number {
    return this.tempList.getCount(id)
  }
  fixTemp(id: string, num: number): void {
    this.tempList.fixCount(id, num)
  }
  addTemp(id: string, num: number): number {
    return this.tempList.addCount(id, num)
  }
  subTemp(id: string, num: number): number {
    return this.tempList.subCount(id, num)
  }
  fixTempTrait(id: string): void {
    this.tempList.fixTrait(id)
  }
  clrTempTrait(id: string): void {
    this.tempList.clrTrait(id)
  }

  statusCount(id: string): number {
    return this.statList.getCount(id)
  }
  fixStatus(id: string, num: number): void {
    this.statList.fixCount(id, num)
  }
  addStatus(id: string, num: number): number {
    return this.statList.addCount(id, num)
  }
  subStatus(id: string, num: number): number {
    return this.statList.subCount(id, num)
  }
  fixStatTrait(id: string): void {
    this.statList.fixTrait(id)
  }
  clrStatTrait(id: string): void {
    this.statList.clrTrait(id)
  }

  findGearTrait(id: string): ItArms | null {
    return this.gearList.findArms(id)
  }
  dropGear(it: Item): void {
    this.gearList.drop(it)
  }

  packCount(itemOrId?: Item | string): number {
    return this.packList.getCount(itemOrId)
  }
  fixPack(id: string, num: number): void {
    this.packList.fixCount(id, num)
  }
  addPackCount(id: string, num: number): number {
    return this.packList.addCount(id, num)
  }
  subPackCount(id: string, num: number): number {
    return this.packList.subCount(id, num)
  }
  addPack(it: Item): void {
    this.packList.append(it)
  }
  putPack(it: Item): void {
    this.packList.insert(it)
  }
  subPack(it: Item): void {
    this.packList.drop(it)
  }
  selectPack(ix: number): Item | null {
    return this.packList.select(ix)
  }
  firstPack(id: string): number {
    return this.packList.firstOf(id)
  }
  indexPack(it: Item): number {
    return this.packList.indexOf(it)
  }

  hasTrait(attribute: string): boolean {
    return this.tempList.hasTrait(attribute) || this.statList.hasTrait(attribute)
  }

  getPower(): number {
    return (
      this.getAttack() * 4 +
      this.getDefend() * 4 +
      this.getSkill() +
      this.getGuts() * 2 +
      this.getWits() +
      this.getCharm() +
      this.scale(this.fight(), 12) +
      this.scale(this.magic(), 16) +
      this.scale(this.thief(), 8)
    )
  }

  scale(guild: number, base: number): number {
    let num = 0
    for (let i = guild; i > 0; i--) num += Math.trunc(base / 2)
    return num
  }

  calcCombat(): void {
    let num = Math.trunc((this.getWits() * 2 + this.getCharm() + 2) / 3) + this.gearSkill() + this.magicRank()
    if (num < 1) num = 1
    if (this.hasTrait(C.AGILE)) num += Math.trunc((num + 9) / 10)
    this.setSkill(num)

    let num2 = this.gearAttack() + this.fightRank()
    if (this.hasTrait(C.STRONG)) num2 += Math.trunc((num2 + 9) / 10)
    this.setAttack(num2)

    let num3 = this.gearDefend() + this.thiefRank()
    if (this.hasTrait(C.STURDY)) num3 += Math.trunc((num3 + 9) / 10)
    this.setDefend(num3)
  }

  runWits(): number {
    const val = Math.trunc((this.getWits() * (10 + this.thiefRank())) / 10)
    return this.hasTrait(C.SWIFT) ? val + 30 : val
  }

  bribeCharm(): number {
    return this.hasTrait(C.SINCERE) ? this.getCharm() + 30 : this.getCharm()
  }
  tradeCharm(): number {
    return this.hasTrait(C.TRICKY) ? this.getCharm() + 30 : this.getCharm()
  }
  feedCharm(): number {
    return this.hasTrait(C.EMPATHIC) ? this.getCharm() + 50 : this.getCharm()
  }
  seduceCharm(): number {
    return this.hasTrait(C.SEXY) ? this.getCharm() + 50 : this.getCharm()
  }

  getMoney(): number {
    return this.packList.getCount('Marks')
  }
  addMoney(num: number): number {
    return this.packList.addCount('Marks', num)
  }
  subMoney(num: number): number {
    return this.packList.subCount('Marks', num)
  }

  getWounds(): number {
    return this.tempList.getCount(C.WOUNDS)
  }
  subWounds(num: number): number {
    return this.tempList.subCount(C.WOUNDS, num)
  }
  addWounds(num: number): number {
    return this.tempList.addCount(C.WOUNDS, num)
  }

  disease(): number {
    return this.tempList.getCount(AT.DISEASE)
  }
  ail(num: number): number {
    return this.tempList.addCount(AT.DISEASE, num)
  }

  skill(): number {
    const num = this.getSkill() - this.disease()
    return num < 1 ? 1 : num
  }

  getLevel(): number {
    return this.rankList.getCount(C.LEVEL)
  }

  fight(): number {
    return this.tempList.getCount(C.FIGHT)
  }
  reduceFight(num: number): void {
    this.tempList.subCount(C.FIGHT, num)
  }
  magic(): number {
    return this.tempList.getCount(C.MAGIC)
  }
  reduceMagic(num: number): void {
    this.tempList.subCount(C.MAGIC, num)
  }
  thief(): number {
    return this.tempList.getCount(C.THIEF)
  }
  reduceThief(num: number): void {
    this.tempList.subCount(C.THIEF, num)
  }
  ieatsu(): number {
    return this.tempList.getCount(C.IEATSU)
  }
  reduceIeatsu(num: number): void {
    this.tempList.subCount(C.IEATSU, num)
  }

  fightRank(): number {
    return this.rankList.getCount(C.FIGHT)
  }
  magicRank(): number {
    return this.rankList.getCount(C.MAGIC)
  }
  thiefRank(): number {
    return this.rankList.getCount(C.THIEF)
  }
  ieatsuRank(): number {
    return this.rankList.getCount(C.IEATSU)
  }
  guildRank(): number {
    return this.fightRank() + this.magicRank() + this.thiefRank() + this.ieatsuRank()
  }
  guildSkill(): number {
    return this.fight() + this.magic() + this.thief() + this.ieatsu()
  }

  actions(): number {
    return this.tempList.getCount(C.ACTIONS)
  }
  useAction(num = 1): boolean {
    return this.tempList.subCount(C.ACTIONS, num) === num
  }

  packHeal(): number {
    return this.packList.getCount(GT.APPLE) + this.packList.getCount(GT.TROLL) + this.packList.getCount(GT.SALVE)
  }
  packMagic(): number {
    return (
      this.packList.getCount(GT.BLIND_DUST) + this.packList.getCount(GT.PANIC_DUST) + this.packList.getCount(GT.BLAST_DUST)
    )
  }

  doRefresh(): void {
    this.getTemp().subCount(C.FATIGUE, 1)
  }
  doHaste(): void {
    this.getTemp().addCount(C.ACTIONS, 2)
  }
  doCookie(): void {
    this.getTemp().zero(C.FATIGUE)
  }
  doCure(): void {
    this.getTemp().zero(AT.DISEASE)
    this.getTemp().clrTrait(AT.BLIND)
    this.getTemp().clrTrait(AT.PANIC)
  }
  doFood(): void {
    this.subWounds(this.hasTrait(C.MEDIC) ? 3 : 2)
  }
  doHeal(): void {
    this.subWounds(this.hasTrait(C.MEDIC) ? 25 : 15)
  }
  doRevive(): void {
    this.subWounds(this.hasTrait(C.MEDIC) ? 50 : 30)
    this.doCure()
  }
  doPanic(): void {
    this.getActions().addCount(AT.PANIC, 1)
    this.getActions().setName(C.SPELLS)
  }
  doBlind(): void {
    this.getActions().addCount(AT.BLIND, 1)
    this.getActions().setName(C.SPELLS)
  }
  doBlast(): void {
    this.getActions().addCount(AT.BLAST, 1)
    this.getActions().setName(C.SPELLS)
  }
}
