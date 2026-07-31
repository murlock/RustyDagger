<script setup lang="ts">
// Port of DCourt/Screens/Template/Smith.java (extends Shop.java) on top of
// useSmith.ts. Unlike Trade's 1/10/100/1000 quantity buttons, Smith always
// transacts a single weapon/armour instance - matching Java's buyWeapon()/
// sellWeapon() (Screen.getPack().insert(it.copy())/Screen.subPack(it), no
// quantity argument at all).
import { computed } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import type { ItArms } from '../../domain/itArms'
import { useSmith, type SmithSpecial } from './useSmith'
import Indoors from './Indoors.vue'

const props = defineProps<{
  name: string
  face: string
  greeting: string
  stockNames: string[]
  resale: number
  base: number
  /** Smith.stockValue(Item) - see useSmith.ts's SmithConfig.stockValue comment. */
  stockValue: (it: ItArms) => number
  /** Shop.getSpecial()/doSpecial()/costSpecial() - Identify (arWeapon/arDwfSmith) or Polish (arArmour). */
  special?: SmithSpecial
}>()

const nav = useNavigationStore()
const heroStore = useHeroStore()

const shop = useSmith({
  stockNames: props.stockNames,
  resale: props.resale,
  base: props.base,
  stockValue: props.stockValue,
  special: props.special,
})

function exit() {
  nav.goHome()
}

// Shop.updateTools()'s buy-mode gate - `enable(it != null && money >= cost)`
// (sell mode only ever requires a selection, matching Java's Sell branch).
const transactCost = computed(() => {
  const it = shop.selectedArms.value
  if (!it) return 0
  return shop.isPack() ? shop.packValue(it) : shop.stockValue(it)
})
const canTransact = computed(() => {
  if (!shop.selectedArms.value) return false
  if (shop.isPack()) return true
  return (heroStore.hero?.getMoney() ?? 0) >= transactCost.value
})
</script>

<template>
  <Indoors :name="name" :face="face" :greeting="greeting" @exit="exit">
    <div class="smith__tabs">
      <label>
        <input type="radio" :checked="shop.isStock()" @change="shop.setMode(0)" />
        Buy
      </label>
      <label>
        <input type="radio" :checked="shop.isPack()" @change="shop.setMode(1)" />
        Sell
      </label>
    </div>

    <ul class="smith__list">
      <li
        v-for="row in shop.rows.value"
        :key="row.item.getName()"
        :class="{ selected: shop.selected.value === row.item }"
        @click="shop.selectItem(row.item)"
      >
        {{ row.label }}
      </li>
    </ul>

    <div class="smith__actions">
      <button type="button" :disabled="!shop.selected.value" @click="shop.openInfo()">Info</button>
      <button type="button" :disabled="!canTransact" @click="shop.transact()">
        {{ shop.isPack() ? 'Sell' : 'Buy' }}
        <template v-if="shop.selectedArms.value">${{ transactCost }}</template>
      </button>
      <button
        v-if="special"
        type="button"
        :disabled="!shop.selectedArms.value || shop.specialCost.value <= 0 || (heroStore.hero?.getMoney() ?? 0) < shop.specialCost.value"
        @click="shop.doSpecial()"
      >
        {{ special.label }} ${{ shop.specialCost.value }}
      </button>
    </div>

    <p class="smith__money" v-if="heroStore.hero">Cash on hand: ${{ heroStore.hero.getMoney() }}</p>
  </Indoors>
</template>

<style scoped>
.smith__tabs {
  display: flex;
  gap: 1.5em;
  margin-bottom: 0.75em;
}

.smith__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16em;
  overflow-y: auto;
  border: 1px solid #0a5c1e33;
  border-radius: 4px;
}

.smith__list li {
  padding: 0.35em 0.6em;
  cursor: pointer;
  border-bottom: 1px solid #0a5c1e22;
}

.smith__list li.selected {
  background: #0a5c1e22;
}

.smith__actions {
  display: flex;
  gap: 0.5em;
  margin-top: 0.75em;
  flex-wrap: wrap;
}

.smith__actions button {
  font: inherit;
  cursor: pointer;
}

.smith__actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.smith__money {
  margin-top: 0.75em;
  font-weight: bold;
}
</style>
