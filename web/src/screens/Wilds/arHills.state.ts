// arHills' hidden-location bitmask (Jewel Store/Magic Shop/Abandoned
// Mines). See arForest.state.ts's comment - same reasoning, same
// module-singleton fix for the App.vue remount-on-notice bug, same
// per-hero keying (fixing a cross-hero leak the first draft of this fix
// had), same "once found this session, stays found" deviation from Java.
import { reactive } from 'vue'

const byHero = reactive<Record<string, number>>({})

export function hiddenBits(heroName: string): number {
  return byHero[heroName] ?? 7
}

export function setHiddenBits(heroName: string, bits: number): void {
  byHero[heroName] = bits
}
