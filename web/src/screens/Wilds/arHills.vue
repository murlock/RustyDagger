<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arHills.java (extends WildsScreen). Reached
// from arForest's Mountain Trail hotspot.
//
// Deliberate deviations (see arField.vue's header comment for the same
// reasoning):
// - Quest and Abandoned Mines both run their real testAdvance() checks
//   (exhaustion, and - since arHills.needsRope() is unconditionally true
//   here - Rope) via useWildsScreen/findClimb(); only the final "a monster
//   appears" step (`pickQuest`/`cavern()`'s `new arQuest(...)`) shows a
//   "not available yet" notice (arQuest/arBattle is #35, done last).
// - Jewel Store/Magic Shop/Abandoned Mines are hidden until found via the
//   real doSearch() minigame, exactly like Java's `getPic(ix).hide()` +
//   `markFound()`.
// - The hidden-location bitmask (`hidden` below) lives at module scope,
//   keyed per hero, not component-local state - see arHills.state.ts's
//   comment for why.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, select } from '../../engine/dice'
import * as C from '../../domain/constants'
import Hotspot from '../../components/Hotspot.vue'
import { useWildsScreen, TOO_TIRED, NEED_ROPE } from '../Template/useWildsScreen'
import { hiddenBits, setHiddenBits } from './arHills.state'
import ArForest from './arForest.vue'
import ArGemShop from '../Areas/Hills/arGemShop.vue'
import ArMagicShop from '../Areas/Hills/arMagicShop.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

heroStore.hero!.setPlace(C.HILLS)

const levelUpMessage = ref<string | null>(null)
onMounted(() => {
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

const FOUND_TEXT = [
  'The Jewel Exchange atop a misty peak!\n',
  "Djinni's Magic Shop floating on a cloud!\n",
  'A dangerous shaft leading to the Abandoned Mines!\n',
]
// Reads heroStore.hero directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const hidden = computed({
  get: () => hiddenBits(heroStore.hero?.getName() ?? ''),
  set: (val: number) => setHiddenBits(heroStore.hero?.getName() ?? '', val),
})
const showJewelStore = computed(() => (hidden.value & 1) === 0)
const showMagicShop = computed(() => (hidden.value & 2) === 0)
const showMines = computed(() => (hidden.value & 4) === 0)

function markFound(pick: number): string {
  hidden.value &= 65535 ^ (1 << pick)
  if (pick < 0 || pick >= FOUND_TEXT.length) return '???'
  return `While hiking over rocky ridges you discover...\n\n${FOUND_TEXT[pick]}`
}

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}
function noticeHome(message: string, homeComponent: typeof ArForest) {
  nav.goto(homeComponent)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}
function questNotAvailable() {
  notice('\tYou press onward, alert for danger... but adventuring encounters are not available yet.\n')
}

const wilds = useWildsScreen({
  getHideBits: () => hidden.value,
  markFound,
  needsRope: () => true,
  getPower: () => 3,
  pickQuest: questNotAvailable,
})

const FOREST_LINES = [
  "You spy an old sign that reads: 'Danger!'",
  'You find a human skull with an arrow embedded in it...',
  'You pass a pond that is obviously poisonous.',
  'You find animal droppings. There are chainmail links in it...',
  'You find a horse skeleton. Something big was eating it...',
  'Vultures circle above you...',
  'You hear distance howling, or is it screaming?',
  'You pass a homestead that has been burned to the ground...',
]

function goToForest() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  if (!contest(h.getWits(), 40)) {
    questNotAvailable()
    return
  }
  const msg = `\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t${select(FOREST_LINES)}\n\n\tYou Enter the Forest...\n${h.gainWits(2)}`
  h.travelWork(1)
  heroStore.save()
  noticeHome(msg, ArForest)
}

function cavern() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  const climbed = wilds.findClimb() // may consume a Rope as a side effect of checking, like testAdvance()
  heroStore.save()
  if (!climbed) {
    notice(NEED_ROPE)
    return
  }
  questNotAvailable()
}

function exitGame() {
  nav.goto(ArExit, { loc: C.HILLS }, { showStatus: false })
}
</script>

<template>
  <div class="hills">
    <h2 class="hills__title">High Crags of the Fenris Mountains</h2>
    <p v-if="levelUpMessage" class="hills__banner">{{ levelUpMessage }}</p>
    <div class="hills__spots">
      <Hotspot v-if="showJewelStore" src="/Images/hllJewels.jpg" text="Jewel Store" type="caption" @click="nav.goto(ArGemShop)" />
      <Hotspot v-if="showMagicShop" src="/Images/hllMagics.jpg" text="Magic Shop" type="caption" @click="nav.goto(ArMagicShop)" />
      <Hotspot v-if="showMines" src="/Images/hllMines.jpg" text="Abandoned Mines" type="caption" @click="cavern" />
      <Hotspot src="/Images/hllQuest.jpg" text="Quest" type="caption" @click="wilds.goQuesting()" />
      <Hotspot src="/Images/hllCamp.jpg" text="Exit Game" type="caption" @click="exitGame" />
      <Hotspot src="/Images/hllForest.jpg" text="Forest Trail" type="caption" @click="goToForest" />
    </div>
  </div>
</template>

<style scoped>
.hills {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #a0a0a0;
  color: white;
}

.hills__title {
  text-align: center;
}

.hills__banner {
  white-space: pre-line;
  background: #ffffff33;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: #202020;
}

.hills__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
