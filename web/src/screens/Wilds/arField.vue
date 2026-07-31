<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arField.java (extends WildsScreen). Reached
// from arTown's "Leave Town" hotspot (now live) and arTavern-driven arExit
// via Continue -> arFinish -> Play Again -> back to Town -> here.
//
// Deliberate deviations:
// - Goblin Mound (-> arMound) renders disabled: entering arMound at all is
//   gated behind `new arQuest(...)` in Java (arField.enterMound()), so
//   there's no partial value to offer without the quest engine - and now
//   that the quest engine exists (#35), arMound itself (#21) still isn't
//   built (see its own backlog entry - a separate CGI/multiplayer
//   dependency on top of the quest gate).
// - The ambush branch of Forest Road's travel roll (a failed wits-vs-40
//   contest) drops the Java nuance where a below-level-6 hero got an
//   extra "hiking... when suddenly" notice before the encounter - it
//   just goes straight to pickQuest() now like a level-6+ hero always did.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, select } from '../../engine/dice'
import * as C from '../../domain/constants'
import Hotspot from '../../components/Hotspot.vue'
import { useWildsScreen, TOO_TIRED } from '../Template/useWildsScreen'
import * as MonsterTable from '../../domain/tables/monsterTable'
import { selectQuestKey } from '../Quest/questHelpers'
import { QuestOptions } from '../Quest/useQuestOptions'
import { createQuestSession } from '../Quest/questSession'
import ArQuest from '../Quest/arQuest.vue'
import ArTown from '../Areas/arTown.vue'
import ArHealer from '../Areas/Fields/arHealer.vue'
import ArForest from './arForest.vue'
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

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}
function noticeHome(message: string, homeComponent: typeof ArForest) {
  nav.goto(homeComponent)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}

// arField.java's own beasts[]/hiweight[]/loweight[] and pickQuest().
const BEASTS = ['Rodent', 'Goblin', 'Centaur', C.MERCHANT, 'Wizard', C.GYPSY, 'Soldier']
const HI_WEIGHT = [8, 6, 4, 5, 2, 5, 2]
const LO_WEIGHT = [12, 10, 6, 10, 2, 1, 0]

function pickQuest() {
  const hero = heroStore.hero!
  const weights = hero.getLevel() < 3 ? LO_WEIGHT : HI_WEIGHT
  const key = selectQuestKey('Fields', BEASTS, weights)
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), 1)
  if (!mob) return
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  hero.addFatigue(1)
  hero.resetActions()
  mob.resetActions()
  mob.chooseActions(hero, true)
  const gate = nav.current
  const session = createQuestSession(mob, 1, 'Fields Quest', opt, gate)
  heroStore.save()
  nav.goto(ArQuest, { session }, { home: gate, showStatus: false })
}

const wilds = useWildsScreen({
  getPower: () => 1,
  pickQuest,
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

function enterForest() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  if (!contest(h.getWits(), 40)) {
    pickQuest()
    return
  }
  const msg = `\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t${select(FOREST_LINES)}\n\n\tYou Enter the Forest...\n${h.gainWits(2)}`
  h.travelWork(1)
  heroStore.save()
  noticeHome(msg, ArForest)
}

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
      <Hotspot v-if="showForestRoad" src="/Images/fldForest.jpg" text="Forest Road" type="caption" @click="enterForest" />
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
