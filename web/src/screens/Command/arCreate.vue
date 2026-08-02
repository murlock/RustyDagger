<script setup lang="ts">
// Port of DCourt/Screens/Command/arCreate.java. `who.getName()` in the Java
// version came from the Player that arEntry.EnterGame() already constructed
// around the typed name; here that name is simply passed down as a prop.
import { computed, reactive, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import { syncHero } from '../../engine/heroStorage'
import * as C from '../../domain/constants'
import { CREATE } from '../../domain/itAgent'
import ArTown from '../Areas/arTown.vue'

const props = defineProps<{ name: string }>()

const nav = useNavigationStore()
const heroStore = useHeroStore()

const BUILD_POOL = 20
const guts = ref(4)
const wits = ref(4)
const charm = ref(4)
const money = ref(1)

const TRAITS = [
  { key: 'noble', label: 'Noble', cost: 12 },
  { key: 'wizard', label: 'Wizard', cost: 9 },
  { key: 'warrior', label: 'Warrior', cost: 8 },
  { key: 'trader', label: C.TRADER, cost: 10 },
] as const
type TraitKey = (typeof TRAITS)[number]['key']
const traitState = reactive<Record<TraitKey, boolean>>({
  noble: false,
  wizard: false,
  warrior: false,
  trader: false,
})

const traitCost = computed(() => TRAITS.reduce((sum, t) => sum + (traitState[t.key] ? t.cost : 0), 0))
const build = computed(
  () =>
    BUILD_POOL -
    (guts.value - 4) -
    (wits.value - 4) -
    (charm.value - 4) -
    (money.value - 1) -
    traitCost.value,
)

function inc(target: 'guts' | 'wits' | 'charm' | 'money') {
  if (build.value <= 0) return
  if (target === 'guts') guts.value++
  else if (target === 'wits') wits.value++
  else if (target === 'charm') charm.value++
  else money.value++
}
function dec(target: 'guts' | 'wits' | 'charm' | 'money') {
  const min = target === 'money' ? 1 : 4
  if (target === 'guts' && guts.value > min) guts.value--
  else if (target === 'wits' && wits.value > min) wits.value--
  else if (target === 'charm' && charm.value > min) charm.value--
  else if (target === 'money' && money.value > min) money.value--
}

function toggleTrait(key: TraitKey, event: Event) {
  traitState[key] = !traitState[key]
  if (traitState[key] && build.value < 0) {
    traitState[key] = false
    // The revert above happens within this same synchronous handler, so
    // Vue's next patch sees traitState[key] go false -> true -> false and
    // never perceives a net change to diff against the checkbox's :checked
    // prop - it skips the DOM write, leaving the box visibly checked even
    // though traitState (and the build-points math) is correctly back to
    // false. Sync the native property directly rather than relying on Vue.
    ;(event.target as HTMLInputElement).checked = false
  }
}

function back() {
  nav.goHome()
}

function beginPlay() {
  if (build.value !== 0) return
  const hero = heroStore.createHero(props.name)
  hero.setGuts(guts.value)
  hero.setWits(wits.value)
  hero.setCharm(charm.value)
  hero.getPack().clrQueue()
  hero.fixPack(C.MONEY, money.value * 25)
  hero.getRank().clrQueue()
  hero.fixRank(C.LEVEL, 1)
  hero.fixRank(C.SOCIAL, traitState.noble ? 1 : 0)
  hero.getStatus().clrQueue()
  hero.fixStatus(C.AGE, 16)
  hero.calcCombat()
  hero.calcRaise()
  hero.setState(CREATE)
  // Java sends a fresh hero to Constants.FIELDS; the walking skeleton (see
  // CONVERSION_PLAN.md Phase 4) lands new heroes straight in Town instead,
  // since Town is the hub being built out first and Fields isn't ported yet.
  hero.setPlace(C.TOWN)
  if (traitState.trader) {
    hero.addRank(C.THIEF, 1)
    hero.fixTemp(C.THIEF, hero.thiefRank())
  }
  if (traitState.wizard) {
    hero.addRank(C.MAGIC, 1)
    hero.fixTemp(C.MAGIC, hero.magicRank())
  }
  if (traitState.warrior) {
    hero.addRank(C.FIGHT, 1)
    hero.fixTemp(C.FIGHT, hero.fightRank())
  }
  if (traitState.wizard || traitState.warrior || traitState.trader) hero.fixStatTrait(C.GUILD)
  heroStore.save()
  syncHero(hero)
  nav.goto(ArTown)
}
</script>

<template>
  <div class="create">
    <h2>{{ traitState.noble ? 'Knight ' : '' }}{{ name }}</h2>

    <div class="create__stats">
      <div v-for="row in ['guts', 'wits', 'charm', 'money'] as const" :key="row" class="create__row">
        <span class="create__label">{{ row === 'money' ? 'Money' : row }}</span>
        <button type="button" @click="dec(row)">-</button>
        <span class="create__value">{{
          row === 'guts' ? guts : row === 'wits' ? wits : row === 'charm' ? charm : `$${money * 25}`
        }}</span>
        <button type="button" @click="inc(row)">+</button>
      </div>
    </div>

    <div class="create__traits">
      <label v-for="t in TRAITS" :key="t.key">
        <input type="checkbox" :checked="traitState[t.key]" @change="toggleTrait(t.key, $event)" />
        {{ t.label }} ({{ t.cost }}p)
      </label>
    </div>

    <p class="create__build">Build Points: {{ build }}</p>

    <div class="create__actions">
      <button type="button" @click="back">Back</button>
      <button type="button" :disabled="build !== 0" @click="beginPlay">Enter</button>
    </div>
  </div>
</template>

<style scoped>
.create {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #001a66;
  color: white;
  text-align: center;
}

.create__stats {
  display: inline-flex;
  flex-direction: column;
  gap: 0.5em;
  margin: 1em 0;
}

.create__row {
  display: grid;
  grid-template-columns: 5em 2em 4em 2em;
  align-items: center;
  gap: 0.5em;
}

.create__label {
  text-transform: capitalize;
  text-align: right;
}

.create__value {
  color: #ff8000;
  font-weight: bold;
}

.create__traits {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  justify-content: center;
  margin: 1em 0;
}

.create__build {
  font-weight: bold;
}

.create__actions {
  display: flex;
  gap: 1em;
  justify-content: center;
}
</style>
