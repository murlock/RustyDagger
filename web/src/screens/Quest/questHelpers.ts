// Small shared helpers used across the quest engine (arQuest.vue/arBattle.vue
// and their Wilds-screen callers), ported from DCourt/Screens/Screen.java's
// static helpers and DCourt/Screens/Template/WildsScreen.java's selectQuest().
import { percent, roll } from '../../engine/dice'
import type { ItList } from '../../domain/itList'

/** Port of Screen.packString(entry, list) - "\nYou Find:\n     3 Food\n..." style loot text. */
export function packString(entry: string, list: ItList): string {
  if (list.getCount() < 1) return ''
  let msg = `${entry}\n`
  for (let ix = 0; ix < list.getCount(); ix++) {
    msg += `     ${list.select(ix)!.toLoot()}\n`
  }
  return msg
}

/**
 * Port of WildsScreen.selectQuest(loc, names, weight) - picks a weighted
 * random monster catalog key for the region (`where`), with Java's 1%
 * flat chance of a "Faery" encounter regardless of region/weights.
 */
export function selectQuestKey(where: string, names: string[], weight: number[]): string {
  if (percent(1)) return 'Faery'
  const total = weight.reduce((sum, w) => sum + w, 0)
  let roll2 = roll(total)
  for (let ix = 0; ix < weight.length; ix++) {
    roll2 -= weight[ix]
    if (roll2 < 0) return `${where}:${names[ix]}`
  }
  return `${where}:${names[0]}`
}
