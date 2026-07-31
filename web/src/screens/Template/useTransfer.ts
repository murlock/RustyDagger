// Port of the shared logic in DCourt/Screens/Template/Transfer.java. A
// composable rather than a base class - Vue has no screen inheritance (see
// Indoors.vue's note, and useShop.ts's precedent for this same pattern).
// arStorage.vue is the first consumer; arPackage.java (mail-to-another-hero)
// is the other Java subclass, but its whole purpose is a multiplayer CGI
// mail transfer with nobody to receive it (see README's "Multiplayer was
// removed") - not a fit for any consumer here.
import { computed, shallowRef } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { Item } from '../../domain/item'
import { ItCount } from '../../domain/itCount'
import { ItList } from '../../domain/itList'

export interface TransferConfig {
  /** Max stash size for a *new* item slot; existing slots can always grow. 0 = unlimited. */
  limit: number
  purse: ItList
  stash: ItList
}

export interface TransferRow {
  item: Item
  label: string
}

type Side = 'purse' | 'stash'

export function useTransfer(config: TransferConfig) {
  const heroStore = useHeroStore()
  const selectedSide = shallowRef<Side | null>(null)
  const selectedName = shallowRef<string | null>(null)
  const quantity = shallowRef(1)

  function rowsFor(list: ItList): TransferRow[] {
    const out: TransferRow[] = []
    for (let ix = 0; ix < list.getCount(); ix++) {
      const it = list.select(ix)
      if (it) out.push({ item: it, label: it.toShow() })
    }
    return out
  }

  const purseRows = computed(() => rowsFor(config.purse))
  const stashRows = computed(() => rowsFor(config.stash))

  function listFor(side: Side): ItList {
    return side === 'purse' ? config.purse : config.stash
  }

  const selected = computed<Item | null>(() => {
    if (!selectedSide.value || selectedName.value == null) return null
    return listFor(selectedSide.value).find(selectedName.value)
  })

  const maxQuantity = computed(() => selected.value?.getCount() ?? 1)

  function clearSelection() {
    selectedSide.value = null
    selectedName.value = null
  }

  function moveToStash(it: Item, count: number) {
    if (it instanceof ItCount) {
      const id = it.getName()
      const isNewSlot = config.stash.firstOf(id) < 0
      if (isNewSlot && config.limit > 0 && config.stash.getCount() >= config.limit) return
      config.stash.addCount(id, config.purse.subCount(id, count))
    } else {
      if (config.limit > 0 && config.stash.getCount() >= config.limit) return
      config.purse.drop(it)
      config.stash.insert(it)
    }
  }

  function moveToPurse(it: Item, count: number) {
    if (it instanceof ItCount) {
      const id = it.getName()
      config.purse.addCount(id, config.stash.subCount(id, count))
    } else {
      config.stash.drop(it)
      config.purse.insert(it)
    }
  }

  // Java: selecting a stack of 1 transfers it immediately; selecting a
  // bigger stack only "prepares" the scrollbar (see prepareTransfer()) and
  // waits for an explicit Transfer click.
  function select(side: Side, it: Item) {
    if (it.getCount() <= 1) {
      if (side === 'purse') moveToStash(it, 1)
      else moveToPurse(it, 1)
      clearSelection()
      heroStore.save()
      return
    }
    selectedSide.value = side
    selectedName.value = it.getName()
    quantity.value = it.getCount()
  }

  function transfer() {
    const it = selected.value
    const side = selectedSide.value
    if (!it || !side || quantity.value < 1) return
    if (side === 'purse') moveToStash(it, quantity.value)
    else moveToPurse(it, quantity.value)
    clearSelection()
    heroStore.save()
  }

  return {
    purseRows,
    stashRows,
    selectedSide,
    selectedName,
    selected,
    quantity,
    maxQuantity,
    select,
    transfer,
  }
}
