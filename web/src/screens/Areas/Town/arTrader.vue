<script setup lang="ts">
// Port of DCourt/Screens/Areas/Town/arTrader.java, riding on a trimmed-down
// port of DCourt/Screens/Template/Shop.java's buy path (Shop.buyItem/
// shopValues). Only buying is implemented - Shop.java also supports
// switching to a Sell tab against the hero's pack (packValue/sellItem) and
// a per-shop "special" button, both skipped here since arTrader is the
// only shop in the Phase 4 walking skeleton; port the rest of Shop.java
// into a shared composable once Phase 5 adds more shops that need it.
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import { select } from '../../../engine/dice'
import * as GearTable from '../../../domain/tables/gearTable'
import * as GT from '../../../domain/gearTypes'
import Indoors from '../../Template/Indoors.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()

const STOCK_NAMES = [
  GT.FOOD,
  GT.FISH,
  'Torch',
  'Rope',
  'Pen & Paper',
  'Sleeping Bag',
  'Cooking Gear',
  'Camp Tent',
  'Identify Scroll',
  GT.SALVE,
  GT.SELTZER,
  GT.PANIC_DUST,
  GT.BLIND_DUST,
  GT.BLAST_DUST,
  'Castle Permit',
]

const GREETINGS = [
  'Hello Again',
  'How are you?',
  'Nice weather today',
  "How's the family?",
  'You look healthy',
  'Need something special?',
  'Aileen scares me',
  'The tavern is noisy',
  'Need some help?',
  'Want a kiss?',
]
const greeting = select(GREETINGS)

const stock = STOCK_NAMES.filter((name) => GearTable.find(name)).map((name) => ({
  name,
  cost: GearTable.getCost(name),
}))

// Read heroStore.hero directly rather than through an intermediate
// computed - see StatusBar.vue's comment on why that pattern silently
// breaks reactivity for a shallowRef mutated in place.
function owned(name: string): number {
  return heroStore.hero?.packCount(name) ?? 0
}

function buy(item: { name: string; cost: number }) {
  const h = heroStore.hero
  if (!h) return
  let num = Math.floor(h.getMoney() / item.cost)
  if (num > 1) num = 1
  const room = h.holdMax() - h.packCount(item.name) - h.getStore().getCount(item.name)
  if (num > room) num = room
  if (num < 1) return
  h.subMoney(item.cost * num)
  h.addPackCount(item.name, num)
  heroStore.save()
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors
    name="Sally Trader's Curious Goods"
    face="/Images/Faces/Sally.jpg"
    :greeting="greeting"
    @exit="exit"
  >
    <table class="stock">
      <thead>
        <tr>
          <th>Item</th>
          <th>Cost</th>
          <th>Have</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in stock" :key="item.name">
          <td>{{ item.name }}</td>
          <td>${{ item.cost }}</td>
          <td>{{ owned(item.name) }}</td>
          <td>
            <button
              type="button"
              :disabled="!heroStore.hero || heroStore.hero.getMoney() < item.cost"
              @click="buy(item)"
            >
              Buy
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </Indoors>
</template>

<style scoped>
.stock {
  width: 100%;
  border-collapse: collapse;
}

.stock th,
.stock td {
  text-align: left;
  padding: 0.35em 0.6em;
  border-bottom: 1px solid #0a5c1e22;
}

.stock button {
  font: inherit;
  cursor: pointer;
}

.stock button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
