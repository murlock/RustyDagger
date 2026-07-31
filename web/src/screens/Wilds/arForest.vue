<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arForest.java (extends WildsScreen). Reached
// from arField's Forest Road hotspot (now live) and arHills' Forest Trail
// hotspot.
//
// Deliberate deviations (see arField.vue's header comment for the same
// reasoning, applied here too):
// - Smithy (-> arDwfSmith, Smith template #7) and The Guild (-> arGuild,
//   #28) render disabled - both destinations are entirely unbuilt, so
//   there's no partial value in enabling them.
// - Quest! runs the real testAdvance()/doSearch() logic via
//   useWildsScreen, resolving into a real arQuest encounter.
// - fields()/hills() (inter-region travel, own bespoke methods in Java,
//   not part of WildsScreen's shared testAdvance/doSearch) keep their real
//   tired-check and wits-contest-vs-ambush logic; a failed roll routes
//   straight into pickQuest(), dropping the Java nuance where a below-
//   level-6 hero got an extra "hiking... when suddenly" notice first
//   (that notice's Continue led to the exact same encounter anyway).
// - The hidden-location bitmask (`hidden` below) lives at module scope,
//   keyed per hero, not component-local state - see arForest.state.ts's
//   comment for why, and the resulting "once found this session, stays
//   found" deviation from Java's `new arForest()` resetting it on every
//   fresh visit.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, select } from '../../engine/dice'
import * as C from '../../domain/constants'
import Hotspot from '../../components/Hotspot.vue'
import { useWildsScreen, TOO_TIRED } from '../Template/useWildsScreen'
import { hiddenBits, setHiddenBits } from './arForest.state'
import * as MonsterTable from '../../domain/tables/monsterTable'
import { selectQuestKey } from '../Quest/questHelpers'
import { QuestOptions } from '../Quest/useQuestOptions'
import { createQuestSession } from '../Quest/questSession'
import ArQuest from '../Quest/arQuest.vue'
import ArField from './arField.vue'
import ArHills from './arHills.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

heroStore.hero!.setPlace(C.FOREST)

const levelUpMessage = ref<string | null>(null)
onMounted(() => {
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

const FOUND_TEXT = [
  'The Forest Smithy, hidden in an enchanted grove!\n',
  'The Free Adventurers Guild in a maze of shrubbery!\n',
  'The secret path to the Fenris Mountains!\n',
]

// Reads heroStore.hero directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const hidden = computed({
  get: () => hiddenBits(heroStore.hero?.getName() ?? ''),
  set: (val: number) => setHiddenBits(heroStore.hero?.getName() ?? '', val),
})
const showSmithy = computed(() => (hidden.value & 1) === 0)
const showGuild = computed(() => (hidden.value & 2) === 0)
const showMountainTrail = computed(() => (hidden.value & 4) === 0)

function markFound(pick: number): string {
  hidden.value &= 65535 ^ (1 << pick)
  if (pick < 0 || pick >= FOUND_TEXT.length) return '???'
  return `While trudging through the woods you discover...\n\n${FOUND_TEXT[pick]}`
}

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}
function noticeHome(message: string, homeComponent: typeof ArField | typeof ArHills) {
  nav.goto(homeComponent)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}

// arForest.java's own beasts[]/weights[] and pickQuest().
const BEASTS = ['Boar', 'Orc', 'Elf', 'Gryphon', 'Snot', 'Unicorn']
const WEIGHTS = [10, 9, 8, 6, 4, 3]

function pickQuest() {
  const hero = heroStore.hero!
  const key = selectQuestKey('Forest', BEASTS, WEIGHTS)
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), 2)
  if (!mob) return
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  hero.addFatigue(1)
  hero.resetActions()
  mob.resetActions()
  mob.chooseActions(hero, true)
  const gate = nav.current
  const session = createQuestSession(mob, 2, 'Forest Quest', opt, gate)
  heroStore.save()
  nav.goto(ArQuest, { session }, { home: gate, showStatus: false })
}

const wilds = useWildsScreen({
  getHideBits: () => hidden.value,
  markFound,
  getPower: () => 2,
  pickQuest,
})

const FIELDS_LINES = [
  "You spy an old sign that reads: 'Town Ahead'",
  'You find a strand of flowers just coming into bloom.',
  'You pass a pond that is fresh and sweet.',
  'You see horse droppings and wagon tracks.',
  'You pass a herd of wild horses feeding quietly.',
  'Songbirds circle above you...',
  'You hear distant laughter, or is it applause?',
  'You pass a homestead that has been newly built...',
]
const HILLS_LINES = [
  "You spy an old sign that reads: 'Djini Crossing'",
  'You find a strand of scrubby flowers clinging to a crevice.',
  'You pass a trickling mountain stream.',
  'You see the paw prints of some large cat.',
  'You spy a herd of sheep in the distance.',
  'Flys circle around you...',
  'You hear distant water, or is it wind?',
  'You pass a cave that smells of bear...',
]

function goToFields() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  if (!contest(h.getWits(), 20)) {
    pickQuest()
    return
  }
  const msg = `\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t${select(FIELDS_LINES)}\n\n\tYou Enter the Fields...\n${h.gainWits(1)}`
  h.travelWork(1)
  heroStore.save()
  noticeHome(msg, ArField)
}

function goToHills() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  if (!contest(h.getWits(), 80)) {
    pickQuest()
    return
  }
  const msg = `\tYou march along a rising trail, admiring the spreading vista where mountain meets forest.\n\n\t${select(HILLS_LINES)}\n\n\tYou Enter the Mountains...\n${h.gainWits(3)}`
  h.travelWork(1)
  heroStore.save()
  noticeHome(msg, ArHills)
}

function exitGame() {
  nav.goto(ArExit, { loc: C.FOREST }, { showStatus: false })
}
</script>

<template>
  <div class="forest">
    <h2 class="forest__title">The Depths of the Arcane Forest</h2>
    <p v-if="levelUpMessage" class="forest__banner">{{ levelUpMessage }}</p>
    <div class="forest__spots">
      <Hotspot v-if="showSmithy" src="/Images/Weapon.jpg" text="Smithy" type="caption" disabled />
      <Hotspot v-if="showGuild" src="/Images/Tower.jpg" text="The Guild" type="caption" disabled />
      <Hotspot v-if="showMountainTrail" src="/Images/fstHills.jpg" text="Mountain Trail" type="caption" @click="goToHills" />
      <Hotspot src="/Images/toFields.jpg" text="To Fields" type="caption" @click="goToFields" />
      <Hotspot src="/Images/fstQuest.jpg" text="Quest!" type="caption" @click="wilds.goQuesting()" />
      <Hotspot src="/Images/fstCamp.jpg" text="Exit Game" type="caption" @click="exitGame" />
    </div>
  </div>
</template>

<style scoped>
.forest {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #008000;
  color: #80ff80;
}

.forest__title {
  text-align: center;
}

.forest__banner {
  white-space: pre-line;
  background: #ffffff33;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: white;
}

.forest__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
