// Port of DCourt/Screens/Template/WildsScreen.java's advance/search logic.
// A composable rather than a base class (see useShop.ts/useTransfer.ts's
// precedent - Vue has no screen inheritance).
//
// pickQuest()/selectQuest()/Screen.findBeast() aren't ported here: every
// Java WildsScreen subclass's pickQuest() ends in `new arQuest(...)`, and
// arQuest/arBattle (the quest/combat engine) is Phase 5 task #35,
// deliberately done last - there's no consumer to verify selectQuest's
// monster-picking logic against yet. Each concrete screen's `pickQuest`
// callback is a real navigation action the caller supplies; today that's
// always a "quest encounters aren't available yet" notice (see arField.vue),
// but testAdvance()/doSearch() - the exhaustion/rope/light gating and the
// hidden-location search minigame - are fully real and don't depend on it.
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, roll } from '../../engine/dice'
import * as AT from '../../domain/armsTrait'
import * as C from '../../domain/constants'
import ArNotice from '../Utility/arNotice.vue'

export const TOO_TIRED =
  '\tYou find yourself far too exhausted to continue adventuring.  Please return tommorow for further exploration.\n'
export const NEED_ROPE =
  '\tYou cannot advance any further up these cliffs and crags without an additional supply of ROPE.\n'
export const NEED_LIGHT =
  '\tYou can advance no further through these dark and dingy caverns without TORCHES or some other source of light.\n'

export interface WildsConfig {
  /** Bitmask of not-yet-found hidden locations at this screen; 0 (default) means nothing to search for. */
  getHideBits?: () => number
  /** Reveals hidden location `find` and returns its discovery flavor text. */
  markFound?: (find: number) => string
  needsRope?: (loc: number) => boolean
  needsLight?: (loc: number) => boolean
  getPower: (loc: number) => number
  /** What happens once advancing/searching are both resolved with nothing blocking or found - always a real navigation action. */
  pickQuest: (loc: number) => void
}

export function useWildsScreen(config: WildsConfig) {
  const heroStore = useHeroStore()
  const nav = useNavigationStore()

  function notice(message: string) {
    nav.goto(ArNotice, { message }, { showStatus: false })
  }

  function findClimb(): boolean {
    const h = heroStore.hero!
    return h.hasTrait(C.HILLFOLK) || h.subPackCount('Rope', 1) === 1
  }

  function findLight(): boolean {
    const h = heroStore.hero!
    return (
      h.hasTrait(C.CATSEYES) ||
      h.findGearTrait(AT.GLOWS) != null ||
      h.findGearTrait(AT.FLAME) != null ||
      h.subPackCount('Torch', 1) > 0
    )
  }

  function canAdvance(loc: number): string | null {
    const h = heroStore.hero!
    if (h.getQuests() < 1) return TOO_TIRED
    if ((config.needsRope?.(loc) ?? false) && !findClimb()) return NEED_ROPE
    if (!(config.needsLight?.(loc) ?? false) || findLight()) return null
    return NEED_LIGHT
  }

  function testAdvance(loc: number): boolean {
    const blocked = canAdvance(loc)
    heroStore.save() // findClimb()/findLight() may have consumed Rope/Torch as a side effect of checking
    if (blocked == null) return true
    notice(blocked)
    return false
  }

  function doSearch(loc: number): boolean {
    const h = heroStore.hero!
    const bits = config.getHideBits?.() ?? 0
    if (bits === 0 || !contest(h.getWits(), config.getPower(loc) * 20)) return false
    let count = 0
    for (let ix = bits; ix !== 0; ix >>= 1) if ((ix & 1) !== 0) count++
    let num = roll(count)
    let ix2 = 1
    let pick = -1
    while (num >= 0) {
      if ((bits & ix2) !== 0) num--
      pick++
      ix2 <<= 1
    }
    h.searchWork(1)
    notice((config.markFound?.(pick) ?? '') + h.gainWits(config.getPower(loc) + 2))
    heroStore.save()
    return true
  }

  function goQuesting(loc = 0) {
    if (testAdvance(loc) && !doSearch(loc)) config.pickQuest(loc)
  }

  return { testAdvance, doSearch, goQuesting, findClimb, findLight }
}
