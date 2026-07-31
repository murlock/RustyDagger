// Port of DCourt/Screens/Template/Smith.java (extends Shop.java) on top of
// useShop.ts. Weapon/armour shops (arWeapon, arArmour, arDwfSmith) trade
// single unique itArms instances, each carrying its own randomized traits,
// rather than useShop's count-based buy/sell - Java's buyWeapon()/
// sellWeapon() use Screen.getPack().insert(it.copy())/Screen.subPack(it)
// (one specific instance moved), not addPackCount()/subPackCount() (a name
// keyed count bumped). This composable reuses useShop's list-building,
// pricing, and (now identity-based - see useShop.ts's `selected` comment)
// selection engine, and layers Smith's own transact()/getSpecial()/
// doSpecial()/costSpecial() on top.
//
// Deliberate deviation: `discardStock`/`discardPack` aren't configurable
// here, unlike Trade - Smith.java hardcodes both to arms-only
// (`!(it instanceof itArms)`), so every Smith-template shop keeps that
// fixed, matching Java's override rather than exposing it as a ShopConfig
// passthrough.
import { computed } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { ItArms } from '../../domain/itArms'
import { useShop, type ShopConfig } from './useShop'

export interface SmithSpecial {
  /** Shop.getSpecial() - the button's label prefix, e.g. "Identify" or "Polish". */
  label: string
  /**
   * Shop.costSpecial() - 0 means "nothing to do" (Java's own
   * updateTools()/doSpecial() gating: the button disables whenever cost is
   * 0, and every costSpecial() override in this codebase already returns 0
   * exactly when its own action would be a no-op, so `perform` never needs
   * to re-check that on its own).
   */
  cost: (selected: ItArms) => number
  /**
   * Shop.doSpecial()'s subclass-specific tail (arWeapon/arDwfSmith's
   * `a.clrTrait(SECRET)`, arArmour's decay-clear-and-stat-restore) - only
   * ever invoked once cost(selected) > 0 and affordable. The cost itself
   * is already deducted by the time this runs (every concrete doSpecial()
   * in Java calls `h.subMoney(cost)` as its own first step, so this
   * composable centralizes that one line here instead of repeating it in
   * every `perform`) and is also handed to `perform` as `cost` - arArmour's
   * stat-restore step only runs `if (cost >= 2)`, and that check has to see
   * the *pre-mutation* cost (recomputing `cost(selected)` after `perform`
   * has already cleared Decay would read a different, wrong value, since
   * costSpecial() itself factors in whether Decay is still present).
   */
  perform: (selected: ItArms, cost: number) => void
}

export interface SmithConfig extends Omit<ShopConfig, 'discardStock' | 'discardPack' | 'stockValue' | 'stockValueMultiplier'> {
  /**
   * Smith.stockValue(Item) - abstract in Java, always an itArms-specific
   * formula (a per-shop trait multiplier - RIGHT for arWeapon, LEFT for
   * arDwfSmith, BODY for arArmour - over `itArms.stockValue()`, floored at
   * 2). Only ever called with an ItArms (see the `it instanceof ItArms`
   * guard below, matching every Java override's own
   * `if (!(it instanceof itArms)) return 0;` leading line - discardItem()
   * still probes stockValue() on the raw pack before discardPack() has
   * excluded non-arms items, in both Java and useShop.ts).
   */
  stockValue: (it: ItArms) => number
  special?: SmithSpecial
}

export function useSmith(config: SmithConfig) {
  const heroStore = useHeroStore()
  const shop = useShop({
    ...config,
    discardStock: (it) => !(it instanceof ItArms),
    discardPack: (it) => !(it instanceof ItArms),
    stockValue: (it) => (it instanceof ItArms ? config.stockValue(it) : 0),
  })

  const selectedArms = computed<ItArms | null>(() => {
    const it = shop.selected.value
    return it instanceof ItArms ? it : null
  })

  function buyWeapon() {
    const h = heroStore.hero
    const it = selectedArms.value
    if (!h || !it) return
    const cost = shop.stockValue(it)
    if (cost > h.getMoney()) return
    h.subMoney(cost)
    h.putPack(it.copy())
    heroStore.save()
  }

  function sellWeapon() {
    const h = heroStore.hero
    const it = selectedArms.value
    if (!h || !it) return
    const cost = shop.packValue(it)
    h.subPack(it)
    h.addMoney(cost)
    shop.selectItem(null)
    heroStore.save()
  }

  function transact() {
    if (shop.isPack()) sellWeapon()
    else buyWeapon()
  }

  const specialCost = computed(() => {
    const it = selectedArms.value
    return it && config.special ? config.special.cost(it) : 0
  })

  function doSpecial() {
    const h = heroStore.hero
    const it = selectedArms.value
    if (!h || !it || !config.special) return
    const cost = specialCost.value
    if (cost <= 0 || h.getMoney() < cost) return
    h.subMoney(cost)
    config.special.perform(it, cost)
    heroStore.save()
  }

  return { ...shop, selectedArms, transact, specialCost, doSpecial }
}
