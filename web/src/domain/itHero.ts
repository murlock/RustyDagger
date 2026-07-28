// Port of DCourt/Items/List/itHero.java.
//
// Deliberately dropped vs. the Java version:
// - pass/sessionID/best/leader fields and rankString() — remnants of the
//   removed multiplayer server (see README: "Multiplayer was removed").
// - Screen navigation: tryToLevel(Screen)/killedScreen(Screen,...) directly
//   built and pushed UI Screens and called Screen.saveHero(). Split into
//   checkLevel()/resolveDeath() below, which perform the same stat math and
//   return a plain result — choosing/pushing a screen and saving are left to
//   the UI/store layer (later phases), so domain logic doesn't depend on UI.
// - getPicture()/picture()/getPortrait() (AWT Portrait widget) — dropped in
//   favor of the plain `statusOverlayText()` string.

import { roll } from '../engine/dice'
import * as AT from './armsTrait'
import * as C from './constants'
import { Item, type ItemJSON } from './item'
import { ItAgent, ALIVE, DEAD, CREATE } from './itAgent'
import { itemFromJSON } from './itemFactory'
import { ItList } from './itList'
import { MadLib } from './madlib'
import type { ItNote } from './itNote'

const PLACE = 'place'
const STORE = 'store'
const LOOKS = 'looks'
const DUMP = 'dump'

const clanMsg =
  '\tWith the unsealing of the grant, you become a staunch member of the [ $clan$ ], able to call upon them for power and assistance.  Mystical energies course through your being, making betrayal an impossible concept.\n'
const flameMsg =
  '\tThis grant would be a betrayal of your clan. It bursts into flames, singeing your hands and blinding you.\n'

export interface LevelUpResult {
  level: number
  message: string
}

export interface DeathResult {
  message: string
  savedByFaery: boolean
  /** ran out of quests — caller should route to the exit flow, not the healer/fields flow */
  exiled: boolean
  questsLost: number
}

// Hero save format for browser storage (replaces Player/FileLoader's
// name-keyed flat files). Not part of the shared ItemJSON union in item.ts —
// a hero is always the root of a save, never nested inside another list, and
// it needs guts/wits/charm alongside the queue, which plain ItList.toJSON()
// doesn't carry (those are private fields on ItAgent, not queue entries).
// attack/defend/skill and raise are recomputed by calcCombat()/calcRaise()
// rather than saved, so they're left out here too.
export interface HeroJSON {
  type: 'hero'
  name: string
  guts: number
  wits: number
  charm: number
  items: ItemJSON[]
}

export class ItHero extends ItAgent {
  private lastPlay: string | null = null
  private raise = 0
  // `declare` (not `!`) is load-bearing: fixLists() below assigns these
  // during the super() constructor chain (ItAgent's constructor calls
  // this.fixLists(), dispatching here), and with this project's
  // useDefineForClassFields tsconfig, an un-initialized `!` field declared
  // on ItHero itself would re-define the property to undefined right after
  // that super() call returns, silently clobbering fixLists()'s assignment.
  // `declare` opts these two out of that per-field [[Define]] entirely.
  private declare storeList: ItList
  private declare looksList: ItList
  private dumpList = new ItList(DUMP)

  static fromHero(other: ItHero): ItHero {
    const copy = new ItHero(other.getName())
    copy.setVals(other.getGuts(), other.getWits(), other.getCharm(), other.getAttack(), other.getDefend(), other.getSkill())
    // The constructor already populated copy's queue with fresh empty
    // pack/gear/stat/... sublists (via fixLists()); clear those before
    // copying other's, or fixLists() below would find the empty originals
    // first and the copied data would be orphaned duplicates in the queue.
    copy.clrQueue()
    for (let ix = 0; ix < other.getCount(); ix++) copy.append(other.select(ix)!.copy())
    copy.fixLists()
    return copy
  }

  copy(): Item {
    return ItHero.fromHero(this)
  }

  static fromSaveJSON(json: HeroJSON): ItHero {
    const hero = new ItHero(json.name)
    hero.setVals(json.guts, json.wits, json.charm, 0, 0, 0)
    hero.clrQueue() // see fromHero's comment above — avoid duplicate empty sublists
    for (const item of json.items) hero.append(itemFromJSON(item))
    hero.fixLists()
    return hero
  }

  toSaveJSON(): HeroJSON {
    return {
      type: 'hero',
      name: this.getName(),
      guts: this.getGuts(),
      wits: this.getWits(),
      charm: this.getCharm(),
      items: this.getQueue().map((it) => it.toJSON()),
    }
  }

  fixLists(): void {
    super.fixLists()
    this.lastPlay = this.getValue('Date')
    this.storeList = this.fixList(STORE)
    this.looksList = this.fixList(LOOKS)
    this.dumpList = new ItList(DUMP)
  }

  getStore(): ItList {
    return this.storeList
  }
  getDump(): ItList {
    return this.dumpList
  }
  getLooks(): ItList {
    return this.looksList
  }

  storeCount(id: string): number {
    return this.storeList.getCount(id)
  }
  fixStore(id: string, num: number): void {
    this.storeList.fixCount(id, num)
  }
  addStore(id: string, num: number): number {
    return this.storeList.addCount(id, num)
  }
  subStore(id: string, num: number): number {
    return this.storeList.subCount(id, num)
  }

  calcRaise(): void {
    this.raise = Math.trunc(50 * Math.pow(1.5, this.getLevel() - 1))
  }
  getRaise(): number {
    return this.raise
  }

  getPlace(): string | null {
    return this.getValues().getValue(PLACE)
  }
  setPlace(val: string): void {
    this.getValues().fixValue(PLACE, val)
  }

  clearDump(): void {
    this.dumpList.clrQueue()
  }
  doFaceless(): void {
    this.looksList.clrQueue()
  }
  doAging(): void {
    this.getStatus().addCount(C.AGE, 1)
  }
  doYouth(): void {
    if (this.getAge() >= 9) this.getStatus().subCount(C.AGE, 1)
  }
  doExhaust(): void {
    this.getTemp().fixCount(C.FATIGUE, this.getBaseQuests())
  }

  setLastPlay(today: string): void {
    this.fixValue('Date', today)
    this.lastPlay = today
  }

  /**
   * Recomputes combat stats and (once per day, outside playtest mode)
   * advances daily state. `today`/`isPlaytest` replace the Java version's
   * reads of the global Tools/Player singletons.
   */
  advanceDay(today: string, isPlaytest: boolean): void {
    this.calcCombat()
    this.calcRaise()
    if (!isPlaytest && (!this.isNewday(today) || this.getState() === CREATE)) return
    this.advance()
  }

  private advance(): void {
    const temp = this.getTemp()
    const stat = this.getStatus()
    temp.clrQueue()
    this.setState(ALIVE)
    temp.fixCount(C.FIGHT, this.fightRank())
    if (this.hasTrait(C.BERZERK)) temp.addCount(C.FIGHT, Math.trunc((this.getLevel() + 7) / 8))
    temp.fixCount(C.MAGIC, this.magicRank())
    if (this.hasTrait(C.MYSTIC)) temp.addCount(C.MAGIC, Math.trunc((this.getLevel() + 7) / 8))
    temp.fixCount(C.THIEF, this.thiefRank())
    if (this.hasTrait(C.TRADER)) temp.addCount(C.THIEF, Math.trunc((this.getLevel() + 7) / 8))
    temp.fixCount(C.IEATSU, this.ieatsuRank())
    if (stat.getCount(C.AGE) < 15) stat.fixCount(C.AGE, 15)
    if (!this.hasTrait(C.UNAGING)) {
      stat.addCount(C.AGE, 1)
    } else {
      if (stat.getCount(C.AGE) > 33) stat.subCount(C.AGE, 1)
      if (stat.getCount(C.AGE) < 33) stat.addCount(C.AGE, 1)
    }
    const fame = this.getFame()
    const rank = this.getSocial()
    stat.fixCount(C.FAME, fame - Math.trunc(fame / 10) + rank * 10)
    stat.addCount(C.STIPEND, rank * rank * 50)
  }

  protected gearAttack(): number {
    return this.getGear().fullAttack()
  }
  protected gearDefend(): number {
    return this.getGear().fullDefend()
  }
  protected gearSkill(): number {
    return this.getGear().fullSkill()
  }

  getWeapon(): string {
    const it = this.getGear().findArms(AT.RIGHT)
    return this.hasTrait(AT.BLIND) ? C.BLIND_STR : it == null ? 'Fists' : it.getName()
  }

  getArmour(): string {
    const it = this.getGear().findArms(AT.BODY)
    return this.hasTrait(AT.PANIC) ? C.PANIC_STR : it == null ? C.SKIN : it.getName()
  }

  gainExp(exp: number): string {
    if (exp < 1) return ''
    this.learn(exp)
    return `\nThis encounter has left you wiser +${exp}xp\n`
  }

  gainGuts(weight: number): string {
    if (roll(this.getGuts()) >= weight) return ''
    this.addGuts(1)
    return '\n*** You grow Stronger  +1 Guts! ***\n'
  }
  gainWits(weight: number): string {
    if (roll(this.getWits()) >= weight) return ''
    this.addWits(1)
    return '\n*** You grow Smarter  +1 Wits! ***\n'
  }
  gainCharm(weight: number): string {
    if (roll(this.getCharm()) >= weight) return ''
    this.addCharm(1)
    return '\n*** You grow Happier  +1 Charm! ***\n'
  }

  learn(num: number): number {
    return this.getStatus().addCount(C.EXP, num)
  }
  getExp(): number {
    return this.getStatus().getCount(C.EXP)
  }

  getBaseQuests(): number {
    return this.hasTrait(C.QUICK) ? 27 + 4 * this.getLevel() : 27 + 3 * this.getLevel()
  }
  getQuests(): number {
    return this.getBaseQuests() - this.getFatigue() - this.getOverload()
  }
  getFatigue(): number {
    return this.getTemp().getCount(C.FATIGUE)
  }
  getOverload(): number {
    const max = this.packMax()
    const size = this.getPack().getCount()
    return size > max ? size - max : 0
  }
  addFatigue(num: number): number {
    return this.getTemp().addCount(C.FATIGUE, num)
  }
  subFatigue(num: number): number {
    return this.getTemp().subCount(C.FATIGUE, num)
  }

  getSocial(): number {
    return this.getRank().getCount(C.SOCIAL)
  }
  getTitle(): string {
    return C.rankTitle[this.getSocial()]
  }
  getRankTitle(): string {
    return C.rankName[this.getGender()][this.getSocial()]
  }
  getFullTitle(): string {
    return `${this.getRankTitle()} ${this.getName()}`
  }
  getGender(): number {
    return this.looksList.getValue(C.TITLE) === C.FEMALE ? 1 : 0
  }
  getFame(): number {
    return this.getStatus().getCount(C.FAME)
  }
  getAge(): number {
    return this.getStatus().getCount(C.AGE)
  }
  isNewday(today: string): boolean {
    return this.lastPlay != null && this.lastPlay !== today
  }
  getFavor(): number {
    return this.getStatus().getCount(C.FAVOR)
  }
  addFavor(add: number): void {
    if (this.getFavor() + add >= 0) this.getStatus().addCount(C.FAVOR, add)
  }
  subFavor(sub: number): void {
    if (sub > this.getFavor()) this.getStatus().zero(C.FAVOR)
    else this.getStatus().subCount(C.FAVOR, sub)
  }

  searchWork(val: number): void {
    this.addFatigue(this.hasTrait(C.RANGER) ? roll(1 + val) : val)
  }
  travelWork(val: number): void {
    this.addFatigue(this.hasTrait(C.GYPSY) ? roll(1 + val) : val)
  }

  actCount(): number {
    return this.getTemp().getCount(C.ACTIONS)
  }
  act(num = 1): boolean {
    return this.getTemp().subCount(C.ACTIONS, num) === num
  }

  resetActions(): void {
    if (this.hasTrait(AT.BLIND)) {
      this.getTemp().zero(C.ACTIONS)
    } else {
      this.getTemp().fixCount(
        C.ACTIONS,
        1 + Math.trunc(this.fightRank() / 4) + Math.trunc(this.thiefRank() / 5) + Math.trunc(this.magicRank() / 6),
      )
    }
    this.getActions().clrQueue()
    this.getActions().setName(C.ATTACK)
    this.setState(ALIVE)
  }

  packMax(): number {
    return 60 + (this.hasTrait(C.TRADER) ? 20 : 0) + (this.hasTrait(C.MERCHANT) ? 20 : 0)
  }
  storeMax(): number {
    return 100 + (this.hasTrait(C.HOTEL) ? 50 : 0)
  }
  holdMax(): number {
    return 100 + (this.hasTrait(C.TRADER) ? 50 : 0) + (this.hasTrait(C.MERCHANT) ? 100 : 0)
  }

  heroHas(it: Item): number {
    return this.packCount(it) + this.getStore().getCount(it)
  }

  getClan(): string | null {
    const clan = this.getRank().getValue(C.CLAN)
    return clan != null && clan.length >= 1 ? clan : null
  }
  setClan(clan: string | null): void {
    this.getRank().drop(C.CLAN)
    if (clan != null) this.getRank().appendValue(C.CLAN, clan)
  }

  statusOverlayText(): string {
    let msg = ''
    if (this.hasTrait(AT.BLIND)) msg += '*BLIND*\n'
    if (this.hasTrait(AT.PANIC)) msg += '+PANIC+\n'
    return msg
  }

  doGrant(it: ItNote): string {
    const newClan = it.getFrom()
    const oldClan = this.getClan()
    this.getPack().drop(it)
    if (oldClan == null || oldClan.length <= 0 || C.NONE.toLowerCase() === oldClan.toLowerCase()) {
      const msg = new MadLib(clanMsg)
      msg.replace('$clan$', newClan ?? '')
      msg.append(this.gainGuts(5))
      msg.append(this.gainWits(5))
      msg.append(this.gainCharm(5))
      this.setClan(newClan)
      return msg.getText()
    }
    this.getTemp().fixTrait(AT.BLIND)
    this.addWounds(Math.trunc((this.getGuts() - this.getWounds()) / 2))
    const msg2 = new MadLib(flameMsg)
    msg2.append(this.gainExp(this.getLevel()))
    return msg2.getText()
  }

  /** Combines the original tryToLevel's "wake from Create" side effect with
   * the level-up check itself — both ran unconditionally together. */
  checkLevel(): LevelUpResult | null {
    if (!this.isDead()) this.setState(ALIVE)
    if (this.getExp() < this.getRaise()) return null
    this.getRank().addCount(C.LEVEL, 1)
    this.getStatus().subCount(C.EXP, this.getRaise())
    this.calcRaise()
    this.addGuts(2)
    this.addWits(2)
    this.addCharm(2)
    this.getStatus().addCount(C.FAME, this.getLevel())
    return {
      level: this.getLevel(),
      message:
        'CONGRATUALATIONS!!!!\nYour hours and minutes of sweat and suffering have finally been rewarded by an epiphany of understanding.\n\n' +
        `+++ You Have Gained A Level - Level ${this.getLevel()}+++\n` +
        '*** You Have Grown Stronger  +2 Guts ***\n' +
        '*** You Have Grown Smarter  +2 Wits ***\n' +
        '*** You Have Grown Happier  +2 Charm ***\n' +
        '+++ You Have Grown Tougher  +3 Quests +++\n',
    }
  }

  resolveDeath(tale: string | null, losePack: boolean): DeathResult {
    const cost = Math.trunc(this.getBaseQuests() / 4)
    let msg = tale
    if (this.getPack().getCount('Bottled Faery') > 0) {
      const message =
        msg == null
          ? '\tYou are wounded mortally and fall to the ground.  Before the creature can act, a Bottled Faery breaks free from your pack and transports you the monastery.  It clucks at you briefly in admonishment, then flies away leaving a trail of sparkly dust.\n'
          : `${msg}\n\tA Bottled Faery breaks free from your pack and transports you to the healers!`
      this.subPackCount('Bottled Faery', 1)
      return this.finishRevival(message, true, cost)
    }
    if (msg == null) {
      msg =
        '\tYou are wounded mortally and fall to the ground.  The creature roots through your pack and leaves you for dead.  A friendly woodsman finds you before the last of your blood has fallen.  He drags you to the healers where your life is sustained by a thread.\n'
    }
    this.setState(DEAD)
    this.addFatigue(cost)
    this.getStatus().fixCount(C.FAME, Math.trunc((this.getStatus().getCount(C.FAME) * 9) / 10))
    if (losePack) {
      msg += '\n\t*** Half your equipment is lost. ***\n'
      this.getPack().loseHalf()
    }
    if (this.getQuests() < 1) {
      return { message: msg, savedByFaery: false, exiled: true, questsLost: 0 }
    }
    return this.finishRevival(`${msg}\n\t\t*** You lose ${cost} quests. ***\n`, false, cost)
  }

  private finishRevival(message: string, savedByFaery: boolean, cost: number): DeathResult {
    this.getTemp().fixCount(C.WOUNDS, this.getGuts() - Math.trunc(this.getGuts() / this.getLevel()))
    this.doCure()
    this.setState(ALIVE)
    this.setPlace(C.FIELDS)
    return { message, savedByFaery, exiled: false, questsLost: savedByFaery ? 0 : cost }
  }
}
