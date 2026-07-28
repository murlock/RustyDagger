<script setup lang="ts">
// Port of DCourt/Screens/Areas/arTown.java. Only the Trade Shop hotspot is
// live for the Phase 4 walking skeleton - Tavern/Weapons/Armour/Castle
// Gate/Leave Town route to screens that don't exist until Phase 5, so they
// render disabled rather than navigating to nothing.
import { computed, onMounted, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import Hotspot from '../../components/Hotspot.vue'
import ArTrader from './Town/arTrader.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()

const levelUpMessage = ref<string | null>(null)

onMounted(() => {
  // arTown.init()'s Screen.getHero().tryToLevel(this) - re-checked on every
  // visit to Town, not just right after combat.
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

// heroStore.hero read directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const showCastleGate = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 6)

function openTrader() {
  nav.goto(ArTrader)
}
</script>

<template>
  <div class="town">
    <h2 class="town__title">Welcome to Salamander Township</h2>
    <p v-if="levelUpMessage" class="town__banner">{{ levelUpMessage }}</p>
    <div class="town__spots">
      <Hotspot src="/Images/Tavern.jpg" text="Tavern" type="caption" disabled />
      <Hotspot src="/Images/Weapon.jpg" text="Weapons" type="caption" disabled />
      <Hotspot src="/Images/twnArmour.jpg" text="Armour" type="caption" disabled />
      <Hotspot
        v-if="showCastleGate"
        src="/Images/toCastle.jpg"
        text="Castle Gate"
        type="caption"
        disabled
      />
      <Hotspot src="/Images/twnTrader.jpg" text="Trade Shop" type="caption" @click="openTrader" />
      <Hotspot src="/Images/toFields.jpg" text="Leave Town" type="caption" disabled />
    </div>
  </div>
</template>

<style scoped>
.town {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #003333;
  color: #ff5533;
}

.town__title {
  text-align: center;
}

.town__banner {
  white-space: pre-line;
  background: #ffffff22;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: white;
}

.town__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
