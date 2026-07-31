// Port of DCourt/Screens/Quest/Options.java. A plain class (not a Vue
// composable in the useX() sense) since its state - the current option
// list and the monster's shrinking "goal" list - needs to be carried
// through arQuest.vue/arBattle.vue's nav.goto() round-trips as part of the
// same battle-session prop the way `mob` itself is (see questSession.ts's
// header comment on why component-local state can't survive that).
// `entries` is a `shallowRef` (not a plain array field) so arQuest.vue's
// template re-renders when fixList()/remove() replace it - a plain class
// field mutated from outside Vue's reactivity system wouldn't trigger a
// re-render at all, since neither the QuestOptions instance nor the
// session object wrapping it is itself a Vue reactive() proxy.
import { shallowRef, triggerRef } from 'vue'
import { roll } from '../../engine/dice'
import type { ItHero } from '../../domain/itHero'
import type { ItMonster } from '../../domain/itMonster'
import * as GT from '../../domain/gearTypes'

export const BRIBE = 0
export const FEED = 1
export const RIDDLE = 2
export const TRADE = 3
export const HELP = 4
export const SEDUCE = 5
export const CONTROL = 6
export const BACKSTAB = 7
export const BERZERK = 8
export const SWINDLE = 9
export const IEATSU = 10
export const ATTACK = 11
export const FLEE = 12
export const FISH = 13
export const BUSHIDO = 14
export const CAPTURE = 15

const OPT_ARRAY = [
  'bribe', 'feed', 'riddle', 'trade', 'help', 'seduce', 'control', 'backstab',
  'berzerk', 'swindle', 'ieatsu', 'attack', 'flee', 'fish', 'bushido', 'capture',
]

const OPT_STRING: string[][] = [
  ['Bribe with Marks', 'Pay for Passage', 'Give it Money'],
  ['Feed This Creature', 'Tempt With Food', 'Throw Some Grub'],
  ['Try to Answer', 'Hazard a Guess', 'Riddle Me This'],
  ['Bargain', 'Barter', 'Swap Goods', 'Trade'],
  ['Aid the Poor Booger', 'Help Out', 'Lend a Hand'],
  ['Seduce the Beast', 'Use Sex Appeal', 'Flirt Lewdly'],
  ['  M:Hypnotize'],
  ['  T:Backstab'],
  ['  F:Berzerk'],
  ['  T:Swindle'],
  ['  S:Ieatsu'],
  ['Slay This Brute', 'Attack Yon Beastie', 'Assault The Monster', 'Kill The Critter', 'Smash The Devil'],
  ['Flee For Safety', 'Run For Your Life', 'Evade With Haste', 'Run Away! Run Away!'],
  ['Feed This Creature', 'Tempt With Food', 'Throw Some Grub'],
  ['Present Your Token', 'Display A Token', 'Hand Over Token'],
  ['Grab The Sucker', 'Bottle This Thing', 'Take it Captive'],
]

// The five guild-skill options carry a live "[N]" rank readout in their
// label - keyed by the same hero accessor Java's redraw() switch used.
const RANK_READOUT: Partial<Record<number, (h: ItHero) => number>> = {
  [CONTROL]: (h) => h.magic(),
  [BACKSTAB]: (h) => h.thief(),
  [SWINDLE]: (h) => h.thief(),
  [BERZERK]: (h) => h.fight(),
  [IEATSU]: (h) => h.ieatsu(),
}

export interface QuestOption {
  choice: number
  label: string
}

export class QuestOptions {
  private goal: string[]
  private firstRound = true
  private entriesRef = shallowRef<QuestOption[]>([])

  constructor(goalOpts: string[]) {
    this.goal = [...goalOpts]
  }

  get entries(): QuestOption[] {
    return this.entriesRef.value
  }

  private append(choice: number, hero: ItHero, into: QuestOption[]): void {
    const variants = OPT_STRING[choice]
    let label = variants[roll(variants.length)]
    const readout = RANK_READOUT[choice]
    if (readout) label += `[${readout(hero)}]`
    const ix = into.findIndex((o) => o.choice === choice)
    if (ix >= 0) into.splice(ix, 1)
    into.push({ choice, label })
  }

  /** Rebuilds the offered option list for the current round. */
  fixList(hero: ItHero): void {
    const list: QuestOption[] = []
    if (hero.hasTrait('Panic')) {
      this.append(FLEE, hero, list)
    } else if (!this.firstRound) {
      this.append(ATTACK, hero, list)
      this.append(FLEE, hero, list)
      if (this.goal.includes('control') && hero.magic() > 0) this.append(CONTROL, hero, list)
      if (hero.fight() > 0) this.append(BERZERK, hero, list)
    } else {
      this.append(ATTACK, hero, list)
      this.append(FLEE, hero, list)
      for (const name of this.goal) {
        const choice = OPT_ARRAY.indexOf(name)
        if (choice < 0) continue
        if ((choice === BRIBE || choice === TRADE) && hero.getMoney() < 1) continue
        if (choice === FEED && hero.packCount(GT.FOOD) < 1) continue
        if (choice === FISH && hero.packCount(GT.FISH) < 1) continue
        if (
          choice === BUSHIDO &&
          !(hero.packCount(GT.TOKEN) >= 1 && hero.getQuests() >= 10 && hero.guildRank() < hero.getLevel())
        ) {
          continue
        }
        if (choice === BACKSTAB || choice === SWINDLE) {
          if (hero.thief() > 0) this.append(choice, hero, list)
        } else if (choice !== CONTROL) {
          this.append(choice, hero, list)
        } else if (hero.magic() > 0) {
          this.append(choice, hero, list)
        }
      }
      if (hero.ieatsu() > 0) this.append(IEATSU, hero, list)
    }
    this.entriesRef.value = list
  }

  /** Permanently drops `choice` from what this monster will ever offer again this encounter. */
  remove(choice: number): void {
    const name = OPT_ARRAY[choice]
    this.goal = this.goal.filter((g) => g !== name)
  }

  /** Refreshes the "[N]" rank readouts in place, without rebuilding the option set (Options.redraw()). */
  redraw(hero: ItHero): void {
    for (const entry of this.entries) {
      const readout = RANK_READOUT[entry.choice]
      if (!readout) continue
      const base = OPT_STRING[entry.choice][0]
      entry.label = `${base}[${readout(hero)}]`
    }
    // entries' contents were mutated in place above, not reassigned - a
    // shallowRef only reacts to `.value` replacement, so force it here
    // (mirrors hero.ts's save()/triggerRef(hero) for the same reason).
    triggerRef(this.entriesRef)
  }

  nextRound(mob: ItMonster): void {
    this.firstRound = false
    if (mob.isHostile() || mob.isDefensive()) mob.incStance()
  }
}
