// Port of the shared logic in DCourt/Screens/Template/Shop.java. A
// composable rather than a base class - Vue has no screen inheritance (see
// Indoors.vue's note). Trade.vue wraps this for the Buy/Sell shops that
// exist so far (arTrader, arGemShop, arMagicShop); useSmith.ts layers
// weapon/armour shops' identity-based buy/sell on top of this same engine
// (see its header comment) - a bare Shop.vue for arGoblin is still deferred
// until a concrete consumer exists to verify that shape too.
import { computed, ref, shallowRef } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { Item } from '../../domain/item'
import { ItArms } from '../../domain/itArms'
import { ItList } from '../../domain/itList'
import * as GearTable from '../../domain/tables/gearTable'
import * as C from '../../domain/constants'
import ArDetail from '../Utility/arDetail.vue'

export interface ShopConfig {
  stockNames: string[]
  resale: number
  base: number
  discardStock: (it: Item) => boolean
  discardPack: (it: Item) => boolean
  /**
   * Shop.getBuyList() - names of goods this shop will also buy beyond its
   * own stock catalog (e.g. arGemShop buys any Loot-type treasure, not
   * just the gems it stocks). Undefined (the arTrader/Trade default,
   * matching every shop in this codebase until arGemShop/arMagicShop)
   * behaves like Java's buyList staying null: nothing extra is kept on
   * that basis.
   */
  buyNames?: string[]
  /**
   * arMagicShop.stockValue() doubles the gear-table price. The decompiled
   * source reads as `stockValue(it) * 2` calling itself (an infinite
   * recursion that would crash on the shop's very first render) - read as
   * a decompiler mistranslation of `super.stockValue(it) * 2`, which is
   * what this multiplies. Default 1 (every other shop). Ignored if
   * `stockValue` below is given.
   */
  stockValueMultiplier?: number
  /**
   * Shop.stockValue(Item) override. Defaults to
   * `GearTable.getCost(it) * stockValueMultiplier` (every Trade shop so
   * far - flat table lookup). Smith shops (useSmith.ts) always supply
   * this - Smith.stockValue() is abstract in Java, and every concrete
   * Smith prices off `itArms.stockValue()` (a trait/enchantment-driven
   * formula), not the flat GearTable lookup, which has no entries for
   * weapon/armour names at all.
   */
  stockValue?: (it: Item) => number
}

export interface ShopRow {
  item: Item
  label: string
}

function createSellList(stockNames: string[]): ItList {
  const list = new ItList('Sell')
  for (const name of stockNames) {
    if (GearTable.find(name)) list.append(GearTable.shopItem(name))
  }
  return list
}

export function useShop(config: ShopConfig) {
  const heroStore = useHeroStore()
  const nav = useNavigationStore()

  // Captured once, like Shop.java's `int heroCharm = Screen.getHero().getCharm()`
  // field initializer - packValue() uses the hero's charm as of shop entry.
  const heroCharm = heroStore.hero?.getCharm() ?? 0

  const sellList = createSellList(config.stockNames)

  const mode = ref<0 | 1>(0)
  // Holds the actual Item, not its name (unlike Java's index-into-FTextList
  // shopFind()/table.getSelect(), which this composable can't reproduce
  // directly, but matches the reference-identity pattern arStatus.vue's
  // `pick` shallowRef already established) - required for Smith shops
  // (useSmith.ts), where the pack can hold several itArms instances sharing
  // the same name (buy the same weapon twice) that a name-keyed selection
  // couldn't tell apart; harmless for Trade's itCount-based shops, which
  // never have more than one instance per name to begin with.
  const selected = shallowRef<Item | null>(null)

  function isStock() {
    return mode.value === 0
  }
  function isPack() {
    return mode.value === 1
  }

  function setMode(val: 0 | 1) {
    mode.value = val
    selected.value = null
  }

  function modeList(): ItList | null {
    if (isStock()) return sellList
    return heroStore.hero?.getPack() ?? null
  }

  function stockValue(it: Item): number {
    if (config.stockValue) return config.stockValue(it)
    return GearTable.getCost(it) * (config.stockValueMultiplier ?? 1)
  }

  function packValue(it: Item): number {
    const cost = stockValue(it)
    const merchant = heroStore.hero?.hasTrait(C.MERCHANT) ?? false
    const cost2 = merchant ? Math.floor((cost * config.resale) / 95) : Math.floor((cost * config.resale) / 100)
    return cost2 - Math.floor((cost2 * config.base) / (2 * config.base + heroCharm))
  }

  // Port of Shop.discardItem(). Pack-mode: discard by default unless it's
  // not a Marks token, has stock value, and the subclass doesn't already
  // exclude it - in which case it's still shown if it's in the shop's own
  // catalog (sellList) or in the shop's buyNames (goods bought beyond the
  // catalog). See ShopConfig.buyNames's comment - undefined behaves like
  // Java's buyList staying null (arTrader, still the common case).
  function discardItem(it: Item): boolean {
    if (isStock()) return config.discardStock(it)
    if (it.isMatch('Marks')) return true
    if (stockValue(it) < 1) return true
    if (config.discardPack(it)) return true
    if (!config.buyNames) return false
    const name = it.getName()
    return sellList.find(name) == null && !config.buyNames.includes(name)
  }

  function shopName(it: Item): string {
    const base =
      it instanceof ItArms ? it.toShow() : `${it.getName()}(${heroStore.hero?.packCount(it) ?? 0})`
    const price = isPack() ? packValue(it) : stockValue(it)
    return `${base} $${price}`
  }

  const rows = computed<ShopRow[]>(() => {
    const list = modeList()
    if (!list) return []
    const out: ShopRow[] = []
    for (let ix = 0; ix < list.getCount(); ix++) {
      const it = list.select(ix)
      if (it && !discardItem(it)) out.push({ item: it, label: shopName(it) })
    }
    return out
  })

  function selectItem(item: Item | null) {
    selected.value = item
  }

  function buyItem(num: number) {
    const h = heroStore.hero
    const it = selected.value
    if (!h || !it) return
    const cost = stockValue(it)
    let n = Math.floor(h.getMoney() / cost)
    if (n > num) n = num
    const room = h.holdMax() - h.heroHas(it)
    if (n > room) n = room
    if (n <= 0) return
    h.subMoney(cost * n)
    h.addPackCount(it.getName(), n)
    heroStore.save()
  }

  function sellItem(num: number) {
    const h = heroStore.hero
    const it = selected.value
    if (!h || !it) return
    const cost = packValue(it)
    const sold = h.subPackCount(it.getName(), num)
    if (sold <= 0) return
    h.addMoney(cost * sold)
    if (h.packCount(it.getName()) <= 0) selected.value = null
    heroStore.save()
  }

  function transact(num: number) {
    heroStore.hero?.clearDump()
    if (isPack()) sellItem(num)
    else buyItem(num)
  }

  function openInfo() {
    const it = selected.value
    if (it) nav.goto(ArDetail, { item: it }, { showStatus: false })
  }

  return {
    mode,
    isStock,
    isPack,
    setMode,
    rows,
    selected,
    selectItem,
    stockValue,
    packValue,
    transact,
    openInfo,
  }
}
