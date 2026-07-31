// A single quest encounter's mutable state, carried by reference through
// every nav.goto() call between arQuest.vue and arBattle.vue as one prop.
//
// Why not component-local state or a module singleton: this session earlier
// discovered that App.vue's <component :is> swap unmounts/remounts a screen
// on every navigation, and a bare module singleton leaks between different
// heroes (see arForest.state.ts's comment). A per-encounter session object
// avoids both problems for free - it's created fresh by whichever Wilds
// screen starts the quest, carried explicitly through props the whole time
// (same pattern arDetail.vue already uses for a live Item reference), and
// simply discarded (nothing references it anymore) once the encounter
// resolves - no leak, no keying needed.
import { markRaw } from 'vue'
import type { ItMonster } from '../../domain/itMonster'
import type { ScreenEntry } from '../../stores/navigation'
import type { QuestOptions } from './useQuestOptions'

export interface QuestSession {
  mob: ItMonster
  /** Quest difficulty weight - Java's arQuest(from, weight, msg, beast) constructor arg. */
  weight: number
  /** Screen title, e.g. "Fields Quest". */
  title: string
  opt: QuestOptions
  /**
   * Where the whole encounter lands once it resolves - captured once, before
   * ever navigating to ArQuest, matching Java's `this.gate = getHome()`
   * (captured in the constructor, never reassigned - every subsequent
   * arQuest/arBattle round is a *different* Java Screen instance whose own
   * `home` would otherwise chain back through those intermediate rounds
   * instead of to the real pre-quest screen).
   */
  gate: ScreenEntry | null
}

/**
 * Always build a QuestSession through this factory, not a plain object
 * literal: `nav.goto()` stores its `props` in Pinia state, which deep-wraps
 * plain objects/arrays (and the class instances reachable from them) in a
 * reactive Proxy - a *different* Proxy identity than whatever was passed
 * in, and QuestOptions.entries already relies on its own explicit
 * shallowRef for reactivity (see useQuestOptions.ts), not on `reactive()`
 * wrapping. `markRaw` opts the whole session out of that wrapping, the
 * same way navigation.ts already does for `component`.
 */
export function createQuestSession(
  mob: ItMonster,
  weight: number,
  title: string,
  opt: QuestOptions,
  gate: ScreenEntry | null,
): QuestSession {
  return markRaw({ mob, weight, title, opt, gate })
}
