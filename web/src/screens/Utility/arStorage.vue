<script setup lang="ts">
// Port of DCourt/Screens/Utility/arStorage.java (extends Transfer.java) - a
// hero's persistent item storage, reached from arTavern's "Storage" button.
// Unlike arTrader/Trade.vue, this isn't an Indoors screen (no face/greeting
// portrait) - Transfer.java's own layout (two side-by-side lists plus a
// Transfer button) is standalone, so this is too.
import { computed } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { useTransfer } from '../Template/useTransfer'

const props = defineProps<{ title: string }>()

const heroStore = useHeroStore()
const nav = useNavigationStore()

const hero = heroStore.hero!
const transfer = useTransfer({ limit: hero.storeMax(), purse: hero.getPack(), stash: hero.getStore() })

const packCount = computed(() => heroStore.hero?.getPack().getCount() ?? 0)
const packMax = computed(() => heroStore.hero?.packMax() ?? 0)
const storeCount = computed(() => heroStore.hero?.getStore().getCount() ?? 0)
const storeMax = computed(() => heroStore.hero?.storeMax() ?? 0)

function exit() {
  nav.goHome()
}
</script>

<template>
  <div class="storage">
    <div class="storage__header">
      <h2>Storage at {{ props.title }}</h2>
      <button type="button" @click="exit">Exit</button>
    </div>

    <div v-if="transfer.selected.value" class="storage__transfer">
      <input
        v-if="transfer.maxQuantity.value > 1"
        type="range"
        min="1"
        :max="transfer.maxQuantity.value"
        v-model.number="transfer.quantity.value"
      />
      <button type="button" @click="transfer.transfer()">Transfer {{ transfer.quantity.value }}</button>
    </div>

    <div class="storage__lists">
      <div class="storage__column">
        <p class="storage__label">Backpack {{ packCount }}/{{ packMax }}</p>
        <ul class="storage__list">
          <li
            v-for="row in transfer.purseRows.value"
            :key="row.item.getName()"
            :class="{ selected: transfer.selectedSide.value === 'purse' && transfer.selectedName.value === row.item.getName() }"
            @click="transfer.select('purse', row.item)"
          >
            {{ row.label }}
          </li>
        </ul>
      </div>

      <div class="storage__column">
        <p class="storage__label">Storage {{ storeCount }}/{{ storeMax }}</p>
        <ul class="storage__list">
          <li
            v-for="row in transfer.stashRows.value"
            :key="row.item.getName()"
            :class="{ selected: transfer.selectedSide.value === 'stash' && transfer.selectedName.value === row.item.getName() }"
            @click="transfer.select('stash', row.item)"
          >
            {{ row.label }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #000080;
  color: white;
}

.storage__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.storage__header button {
  font: inherit;
  cursor: pointer;
}

.storage__transfer {
  display: flex;
  align-items: center;
  gap: 0.75em;
  margin: 1em 0;
}

.storage__transfer button {
  font: inherit;
  cursor: pointer;
}

.storage__lists {
  display: flex;
  gap: 1.5em;
}

.storage__column {
  flex: 1;
}

.storage__label {
  font-weight: bold;
}

.storage__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16em;
  overflow-y: auto;
  border: 1px solid white;
}

.storage__list li {
  padding: 0.35em 0.6em;
  cursor: pointer;
}

.storage__list li.selected {
  background: cyan;
  color: black;
}
</style>
