<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arField.java (extends WildsScreen). Reached
// from arTown's "Leave Town" hotspot (now live) and arTavern-driven arExit
// via Continue -> arFinish -> Play Again -> back to Town -> here.
//
// Deliberate deviations:
// - Forest Road (-> arForest) and Goblin Mound (-> arMound, itself only
//   reachable through arQuest) render disabled rather than navigating to
//   screens that don't exist yet (#19/#21), matching arTown's established
//   precedent for hotspots blocked on an entirely-unbuilt destination.
// - Quest! stays enabled and runs the real testAdvance()/doSearch() logic
//   (exhaustion/hidden-location-search) via useWildsScreen - only the
//   final "a monster appears" step (`pickQuest`, which Java always routes
//   into `new arQuest(...)`) is unbuilt (arQuest/arBattle is Phase 5 #35,
//   deliberately done last), so that step shows a plain notice instead.
//   Unlike Forest Road/Goblin Mound, real gameplay value (the blocking
//   checks, the hidden-find minigame) exists here independent of arQuest,
//   so disabling the whole hotspot would throw that away for no reason.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import * as C from '../../domain/constants'
import Hotspot from '../../components/Hotspot.vue'
import { useWildsScreen } from '../Template/useWildsScreen'
import ArTown from '../Areas/arTown.vue'
import ArHealer from '../Areas/Fields/arHealer.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

heroStore.hero!.setPlace(C.FIELDS)

const levelUpMessage = ref<string | null>(null)

onMounted(() => {
  // arField.init()'s questInit() -> Screen.getHero().tryToLevel(this)
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

const showForestRoad = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 4)
const showGoblinMound = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 8)

const wilds = useWildsScreen({
  getPower: () => 1,
  pickQuest: () =>
    nav.goto(
      ArNotice,
      { message: '\tYou press onward, alert for danger... but adventuring encounters are not available yet.\n' },
      { showStatus: false },
    ),
})

function openTown() {
  nav.goto(ArTown)
}
function openHealer() {
  nav.goto(ArHealer)
}
function exitGame() {
  nav.goto(ArExit, { loc: C.FIELDS }, { showStatus: false })
}
</script>

<template>
  <div class="field">
    <h2 class="field__title">The Fields near Salamander Township</h2>
    <p v-if="levelUpMessage" class="field__banner">{{ levelUpMessage }}</p>
    <div class="field__spots">
      <Hotspot src="/Images/fldTown.jpg" text="Town Road" type="caption" @click="openTown" />
      <Hotspot src="/Images/Tower.jpg" text="Healers Tower" type="caption" @click="openHealer" />
      <Hotspot src="/Images/fldQuest.jpg" text="Quest!" type="caption" @click="wilds.goQuesting()" />
      <Hotspot src="/Images/fldCamp.jpg" text="Exit Game" type="caption" @click="exitGame" />
      <Hotspot v-if="showForestRoad" src="/Images/fldForest.jpg" text="Forest Road" type="caption" disabled />
      <Hotspot v-if="showGoblinMound" src="/Images/fldMound.jpg" text="Goblin Mound" type="caption" disabled />
    </div>
  </div>
</template>

<style scoped>
.field {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #ff8080;
  color: #c04040;
}

.field__title {
  text-align: center;
}

.field__banner {
  white-space: pre-line;
  background: #ffffff55;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: #402020;
}

.field__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
