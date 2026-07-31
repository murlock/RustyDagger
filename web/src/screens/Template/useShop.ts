// Port of the shared logic in DCourt/Screens/Template/Shop.java. A
// composable rather than a base class - Vue has no screen inheritance (see
// Indoors.vue's note). Trade.vue wraps this for the Buy/Sell shops that
// exist so far (arTrader, and later arGemShop/arMagicShop); Smith.vue and a
// bare Shop.vue for arGoblin are deferred until a concrete consumer exists
// to verify the shape against (see CONVERSION_PLAN.md Phase 5 notes).
import { computed, ref } from 'vue'
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
  const selectedName = ref<string | null>(null)

  function isStock() {
    return mode.value === 0
  }
  function isPack() {
    return mode.value === 1
  }

  function setMode(val: 0 | 1) {
    mode.value = val
    selectedName.value = null
  }

  function modeList(): ItList | null {
    if (isStock()) return sellList
    return heroStore.hero?.getPack() ?? null
  }

  function stockValue(it: Item): number {
    return GearTable.getCost(it)
  }

  function packValue(it: Item): number {
    const cost = stockValue(it)
    const merchant = heroStore.hero?.hasTrait(C.MERCHANT) ?? false
    const cost2 = merchant ? Math.floor((cost * config.resale) / 95) : Math.floor((cost * config.resale) / 100)
    return cost2 - Math.floor((cost2 * config.base) / (2 * config.base + heroCharm))
  }

  // Shop.discardItem, specialized to the buyList===null case (no shop in
  // this port overrides getBuyList()) - which collapses Java's
  // `sellList.find==null && buyList!=null && buyList.find==null` to just
  // "sellable if not a Marks token, has value, and the subclass allows it".
  function discardItem(it: Item): boolean {
    if (isStock()) return config.discardStock(it)
    if (it.isMatch('Marks')) return true
    if (stockValue(it) < 1) return true
    return config.discardPack(it)
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

  const selected = computed<Item | null>(() => {
    if (selectedName.value == null) return null
    return rows.value.find((r) => r.item.getName() === selectedName.value)?.item ?? null
  })

  function selectByName(name: string | null) {
    selectedName.value = name
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
    if (h.packCount(it.getName()) <= 0) selectedName.value = null
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
    selectedName,
    selectByName,
    selected,
    stockValue,
    packValue,
    transact,
    openInfo,
  }
}
