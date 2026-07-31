<script setup lang="ts">
// Port of DCourt/Screens/Template/Trade.java (extends Shop.java) on top of
// useShop.ts. Adds the 1/10/100/1000 quantity buttons and restricts both
// the stock and pack lists to non-weapon/armour goods - itArms items go
// through the Smith template instead (deferred, see useShop.ts's note).
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import { ItArms } from '../../domain/itArms'
import { useShop } from './useShop'
import Indoors from './Indoors.vue'

const props = defineProps<{
  name: string
  face: string
  greeting: string
  stockNames: string[]
  resale: number
  base: number
  /** Shop.getBuyList() - see useShop.ts's ShopConfig.buyNames comment. */
  buyNames?: string[]
  /** See useShop.ts's ShopConfig.stockValueMultiplier comment. */
  stockValueMultiplier?: number
}>()

const nav = useNavigationStore()
const heroStore = useHeroStore()

const shop = useShop({
  stockNames: props.stockNames,
  resale: props.resale,
  base: props.base,
  discardStock: (it) => it instanceof ItArms,
  discardPack: (it) => it instanceof ItArms,
  buyNames: props.buyNames,
  stockValueMultiplier: props.stockValueMultiplier,
})

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors :name="name" :face="face" :greeting="greeting" @exit="exit">
    <div class="trade__tabs">
      <label>
        <input type="radio" :checked="shop.isStock()" @change="shop.setMode(0)" />
        Buy
      </label>
      <label>
        <input type="radio" :checked="shop.isPack()" @change="shop.setMode(1)" />
        Sell
      </label>
    </div>

    <ul class="trade__list">
      <li
        v-for="row in shop.rows.value"
        :key="row.item.getName()"
        :class="{ selected: shop.selected.value === row.item }"
        @click="shop.selectItem(row.item)"
      >
        {{ row.label }}
      </li>
    </ul>

    <div class="trade__actions">
      <button type="button" :disabled="!shop.selected.value" @click="shop.openInfo()">Info</button>
      <button type="button" :disabled="!shop.selected.value" @click="shop.transact(1)">1</button>
      <button type="button" :disabled="!shop.selected.value" @click="shop.transact(10)">10</button>
      <button type="button" :disabled="!shop.selected.value" @click="shop.transact(100)">100</button>
      <button type="button" :disabled="!shop.selected.value" @click="shop.transact(1000)">1K</button>
    </div>

    <p class="trade__money" v-if="heroStore.hero">Cash on hand: ${{ heroStore.hero.getMoney() }}</p>

    <!-- Shop.getSpecial()'s extra button (e.g. arGemShop's "Peer") - most
         shops don't have one, so this is an opt-in slot rather than a prop
         every consumer has to pass null through. -->
    <slot name="special" />
  </Indoors>
</template>

<style scoped>
.trade__tabs {
  display: flex;
  gap: 1.5em;
  margin-bottom: 0.75em;
}

.trade__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16em;
  overflow-y: auto;
  border: 1px solid #0a5c1e33;
  border-radius: 4px;
}

.trade__list li {
  padding: 0.35em 0.6em;
  cursor: pointer;
  border-bottom: 1px solid #0a5c1e22;
}

.trade__list li.selected {
  background: #0a5c1e22;
}

.trade__actions {
  display: flex;
  gap: 0.5em;
  margin-top: 0.75em;
}

.trade__actions button {
  font: inherit;
  cursor: pointer;
}

.trade__actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.trade__money {
  margin-top: 0.75em;
  font-weight: bold;
}
</style>
