// Port of the pure combat math in DCourt/Screens/Quest/arBattle.java -
// battle()/agentAct()/actorControls()/actorSwindles()/spellEffects()/
// combatEvents(). Split out of arBattle.vue and computed once per round by
// whoever navigates to it (questActions.ts's startBattle()), not on the
// component's own mount - see questActions.ts's header comment for why
// (the same "state must survive an interstitial notice round-trip"
// lesson arForest/arHills's hidden-bits bug taught earlier this session).
import { contest, roll, twice } from '../../engine/dice'
import type { ItAgent } from '../../domain/itAgent'
import { DEAD } from '../../domain/itAgent'
import type { ItHero } from '../../domain/itHero'
import { ItMonster } from '../../domain/itMonster'
import * as AT from '../../domain/armsTrait'
import * as C from '../../domain/constants'
import * as GT from '../../domain/gearTypes'

const POWER_LABEL = ['Fly Swat', 'Weak Blow', 'Good Hit', 'Potent Hit', 'POWER HIT!']
const EFFECT_LABEL = ['DODGED!', 'Unharmed', 'Scratched', 'Injured!', 'Wounded!!', 'KILLED!!!']
const ABUF = '    ---'

export interface BattleRound {
  /** The round's move-by-move narrative (agentAct() output for both sides). */
  text: string
  /** Pre-round flavor (potion/troll/goat/worm effects) - shown as an interstitial notice if non-empty. */
  events: string
}

export function runBattleRound(hero: ItHero, mob: ItMonster, priorMsg: string | null): BattleRound {
  const state = { killStop: false }
  const text = battle(hero, mob, state)
  const events = combatEvents(mob, hero, priorMsg)
  return { text, events }
}

function battle(hero: ItAgent, mob: ItAgent, state: { killStop: boolean }): string {
  let hguts = hero.getGuts()
  let hspeed = hero.skill()
  let hhit = twice(3)
  let mguts = mob.getGuts()
  let mspeed = mob.skill()
  let mhit = twice(3)
  const ha = hero.getActions()
  const ma = mob.getActions()

  if (ha.isMatch(C.BACKSTAB)) {
    hguts *= 2
    hspeed *= 2
    mhit = 1
  } else if (ha.isMatch(C.BERZERK) || ha.isMatch(C.IEATSU)) {
    hguts *= 2
    hspeed *= 2
    hhit = 4
  } else if (ha.isMatch(C.CONTROL)) {
    hspeed = hero.getWits()
  } else if (ha.isMatch(C.SWINDLE)) {
    hspeed = hero.getCharm()
  }
  if (hero.hasTrait(C.REFLEX)) hspeed += 30
  if (hero.hasTrait(AT.BLIND)) {
    hspeed = Math.trunc(hspeed / 2)
    hhit = Math.trunc(hhit / 2)
  }

  if (ma.isMatch(C.BACKSTAB)) {
    mguts *= 2
    mspeed *= 2
    hhit = 1
  } else if (ma.isMatch(C.BERZERK) || ma.isMatch(C.IEATSU)) {
    mguts *= 2
    mspeed *= 2
    mhit = 4
  } else if (ma.isMatch(C.CONTROL)) {
    mspeed = mob.getWits()
  } else if (ma.isMatch(C.SWINDLE)) {
    mspeed = mob.getCharm()
  }
  if (mob.hasTrait(C.REFLEX)) mspeed += 30
  if (mob.hasTrait(AT.BLIND)) {
    mspeed = Math.trunc(mspeed / 2)
    mhit = Math.trunc(mhit / 2)
  }

  let heroFirst: boolean
  if (ma.isMatch(C.RUNAWAY) && !ha.isMatch(C.RUNAWAY)) {
    heroFirst = true
  } else if (!ha.isMatch(C.RUNAWAY) || ma.isMatch(C.RUNAWAY)) {
    heroFirst = contest(hspeed, mspeed)
  } else {
    heroFirst = false
  }

  let msg: string
  if (heroFirst) {
    msg = agentAct(hero, mob, hguts, hhit, hspeed, mspeed, state)
    if (!state.killStop) msg += agentAct(mob, hero, mguts, mhit, mspeed, hspeed, state)
  } else {
    msg = agentAct(mob, hero, mguts, mhit, mspeed, hspeed, state)
    if (!state.killStop) msg += agentAct(hero, mob, hguts, hhit, hspeed, mspeed, state)
  }
  return msg
}

function agentAct(
  at: ItAgent,
  df: ItAgent,
  guts: number,
  hit: number,
  as: number,
  dsIn: number,
  state: { killStop: boolean },
): string {
  let ds = dsIn
  const act = at.getActions()
  if (act.isMatch(C.CONTROL)) return actorControls(at, df, 2 * at.getWits(), state)
  if (act.isMatch(C.SWINDLE)) return actorSwindles(at, df, 2 * at.getCharm(), state)
  if (act.isMatch(C.BACKSTAB)) {
    at.reduceThief(1)
    if (df.hasTrait(C.ALERT)) ds += 30
  }
  if (act.isMatch(C.BERZERK)) {
    at.reduceFight(1)
    if (df.hasTrait(C.FENCER)) ds += 30
  }
  if (act.isMatch(C.IEATSU)) {
    at.reduceIeatsu(1)
    if (df.hasTrait(C.FENCER)) ds += 30
  }

  const weapon = at.getGear().findArms(AT.RIGHT)
  if (weapon && weapon.hasTrait(AT.BLAST)) at.getActions().addCount(AT.BLAST, 1)

  let dmg: number
  let stk: number
  let useBlast = false
  if (roll(ds) > as) {
    dmg = 0
    stk = 0
  } else {
    dmg = Math.trunc((guts * (2 + hit)) / 10) + at.getAttack() - df.getDefend()
    const blastVal = 25 * at.getActions().getCount(AT.BLAST)
    useBlast = blastVal > dmg
    if (useBlast) dmg = blastVal
    else at.getActions().drop(AT.BLAST)
    const remaining = df.getGuts() - df.getWounds()
    if (dmg < 1) stk = 1
    else stk = dmg >= remaining ? 5 : 2 + Math.trunc((3 * dmg) / remaining)
  }

  if (stk > 1) df.addWounds(dmg)
  if (stk === 5) {
    state.killStop = true
    df.setState(DEAD)
  }

  if (weapon) {
    if (weapon.hasTrait(AT.BLIND)) at.getActions().addCount(AT.BLIND, 1)
    if (weapon.hasTrait(AT.PANIC)) at.getActions().addCount(AT.PANIC, 1)
    if (!useBlast && weapon.hasTrait(AT.DISEASE)) at.getActions().addCount(AT.DISEASE, Math.trunc((dmg + 3) / 5))
  }

  const verb = act.isMatch(C.ATTACK) ? POWER_LABEL[hit] : act.getName()
  return `${at.getName()}:${verb}\n${ABUF}${df.getName()} ${EFFECT_LABEL[stk]}${spellEffects(at, df)}\n`
}

function actorControls(at: ItAgent, df: ItAgent, as: number, state: { killStop: boolean }): string {
  at.reduceMagic(1)
  let msg = `${at.getName()} tries Hypnosis!\n`
  let ds = df.getWits()
  if (df.hasTrait(C.STUBBORN)) ds += 30
  if (contest(as, ds)) {
    msg += `${ABUF}${df.getName()} is Mesmerized!\n`
    at.setState(C.CONTROL)
    state.killStop = true
  } else {
    msg += `    ---But the ${df.getName()} Resists!\n`
  }
  return msg
}

function actorSwindles(at: ItAgent, df: ItAgent, as: number, state: { killStop: boolean }): string {
  at.reduceThief(1)
  let msg = `${at.getName()} starts 'Trading'!\n`
  let ds = df.getCharm()
  if (df.hasTrait(C.CLEVER)) ds += 30
  if (contest(as, ds)) {
    msg += `${ABUF}${df.getName()} falls for It!\n`
    at.setState(C.SWINDLE)
    state.killStop = true
  } else {
    msg += `    ---But the ${df.getName()} is too Cunning!\n`
  }
  return msg
}

function spellEffects(at: ItAgent, df: ItAgent): string {
  let msg = ''
  const acts = at.getActions()
  for (let ix = 0; ix < acts.getCount(); ix++) {
    const it = acts.select(ix)!
    if (it.isMatch(AT.BLIND) && contest(at.getWits() * it.getCount(), df.getWits())) {
      msg += ' *BLIND*'
      df.getTemp().fixTrait(AT.BLIND)
    }
    if (it.isMatch(AT.PANIC) && contest(at.getWits() * it.getCount(), df.getWits())) {
      msg += ' +PANIC+'
      if (df instanceof ItMonster) df.setPassive()
      df.getTemp().fixTrait(AT.PANIC)
    }
    if (it.isMatch(AT.DISEASE) && it.getCount() > 0) {
      msg += ' ^Sick^'
      if (df.hasTrait(C.HARDY)) df.ail(Math.trunc(it.getCount() / 2))
      else df.ail(it.getCount())
    }
    if (it.isMatch(AT.BLAST)) msg += ' >KABOOM<'
  }
  return msg
}

function combatEvents(mob: ItMonster, hero: ItHero, priorMsg: string | null): string {
  const ma = mob.getActions()
  let msg = priorMsg ?? ''
  const ginseng = ma.getCount(GT.GINSENG)
  if (ginseng > 0) msg += `\tThe ${mob.getName()} gains energy by eating ${ginseng} ${GT.GINSENG}\n`
  if (ma.getCount(GT.SELTZER) > 0) msg += `\tThe ${mob.getName()} washes dust from its eyes by using ${GT.SELTZER}\n`

  let apples = ma.getCount(GT.APPLE)
  let salves = ma.getCount(GT.SALVE)
  if (apples > 0 || salves > 0) {
    let msg2 = `\tThe ${mob.getName()} swallows`
    if (apples > 0) msg2 += ` ${apples} ${GT.APPLE}`
    if (apples > 0 && salves > 0) msg2 += ' and'
    if (salves > 0) msg2 += ` ${salves} ${GT.SALVE}`
    msg += `${msg2} healing its wounds.\n`
    while (--apples >= 0) {
      mob.doRevive()
      mob.subPackCount(GT.APPLE, 1)
    }
    while (--salves >= 0) {
      mob.doHeal()
      mob.subPackCount(GT.SALVE, 1)
    }
  }

  let trolls = ma.getCount(GT.TROLL)
  if (trolls > 0) {
    msg += `\tThe ${mob.getName()} regenerates!\n`
    while (--trolls >= 0) {
      mob.doRevive()
      mob.subPackCount(GT.TROLL, 1)
    }
  }

  if (ma.isMatch(C.GOAT)) msg += mob.goatSkill(hero)
  if (ma.isMatch(C.WORM)) msg += mob.wormSkill(hero)
  return msg
}
