<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arCastle.java (extends WildsScreen). Reached
// from arTown's Castle Gate hotspot (see arTown.vue's enterCastle()).
//
// Deliberate deviations:
// - Royal Court, Clan Hall, and Post Office are all now live - the small
//   local CGI-equivalent server in `server/` unblocked arClanHall/arPostal
//   (Phase 5 #26/#27), same as it did for arPeer/arPackage elsewhere in
//   this codebase.
// - goQuesting(loc)'s `loc < 2` branch is a decompiler mistranslation of
//   `super.goQuesting(loc)` (WildsScreen's standard testAdvance/doSearch/
//   pickQuest flow) - see useWildsScreen's wilds.goQuesting(1)/
//   goQuesting(0), wired to the Dunjeons hotspot and Royal Court's
//   quest-gate respectively.
// - goQuesting(loc)'s loc>=2 branch (the Docks' Ocean/Brasil/Shang travel
//   chain) is reconstructed rather than ported literally - see enterDocks()
//   below for why.
// - arCastle.java never calls Screen.setPlace() (unlike arForest/arHills/
//   arMound), so this port doesn't either.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { contest, percent, select } from '../../engine/dice'
import Hotspot from '../../components/Hotspot.vue'
import { useWildsScreen } from '../Template/useWildsScreen'
import * as MonsterTable from '../../domain/tables/monsterTable'
import { selectQuestKey } from '../Quest/questHelpers'
import { QuestOptions } from '../Quest/useQuestOptions'
import { createQuestSession } from '../Quest/questSession'
import ArQuest from '../Quest/arQuest.vue'
import ArTown from '../Areas/arTown.vue'
import ArQueen from '../Areas/arQueen.vue'
import ArNotice from '../Utility/arNotice.vue'
import ArClanHall from '../Areas/Castle/arClanHall.vue'
import ArPostal from '../Areas/Castle/arPostal.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const levelUpMessage = ref<string | null>(null)
onMounted(() => {
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

// heroStore.hero read directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const showDunjeons = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 8)
const showDocks = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 10)

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

// arCastle.java's own place[]/power[]/weight[]/beasts[] and pickQuest().
const PLACE = ['Castle', 'Dunjeon', 'Ocean', 'Brasil', 'Shang']
const POWER = [4, 2, 3, 4, 5]
const WEIGHTS = [
  [1],
  [7, 6, 5, 4, 3, 2],
  [5, 3, 2],
  [6, 5, 4, 3, 2],
  [6, 7, 2, 6, 5, 3, 2],
]
const BEASTS = [
  ['Guard'],
  ['Rodent', 'Snot', 'Rager', 'Gang', 'Troll', 'Mage'],
  ['Traders', 'Serpent', 'Mermaid'],
  ['Harpy', 'Fighter', 'Golem', 'Medusa', 'Hero'],
  ['Gunner', 'Peasant', 'Ninja', 'Plague', 'Shogun', 'Panda', 'Samurai'],
]

// pickQuest(0)'s Java override sets `next = new arQueen(this)` - a win at
// the Royal Court's quest gate routes to arQueen, not back to arCastle
// (every other loc's gate is arCastle itself, `Screen next = this`).
function pickQuest(loc: number) {
  const hero = heroStore.hero!
  const key = selectQuestKey(PLACE[loc], BEASTS[loc], WEIGHTS[loc])
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), POWER[loc])
  if (!mob) return
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  hero.addFatigue(1)
  hero.resetActions()
  mob.resetActions()
  mob.chooseActions(hero, true)
  if (loc === 0) nav.goto(ArQueen)
  const gate = nav.current
  const session = createQuestSession(mob, POWER[loc], `${PLACE[loc]} Quest`, opt, gate)
  heroStore.save()
  nav.goto(ArQuest, { session }, { home: gate })
}

const wilds = useWildsScreen({
  needsLight: (loc) => loc === 1,
  getPower: (loc) => POWER[loc],
  pickQuest,
})

// arCastle.java's own goQueen(): direct entry with social standing, else
// a quest-gated entry via the standard testAdvance/doSearch/pickQuest(0)
// flow above (getPower(0)=4, beasts[0]=["Guard"], title "Castle Quest").
function goQueen() {
  if ((heroStore.hero?.getSocial() ?? 0) > 0) {
    nav.goto(ArQueen)
    return
  }
  wilds.goQuesting(0)
}

const DOCKS_FAILURE =
  '\tYou plot a course with confidence.  But after days of fruitless searching you must return for additional provisions.\n\n\t'
const DOCKS_SUCCESS =
  '\tYou plot a course with confidence.  After hours of searching you encounter oceanic inhabitants.\n\n\t'
const DOCKS_BRASIL =
  ' \tYou plot a course with confidence.  After days of travel you arrive on the shores of Hie Brasil.\n\n\t'
const DOCKS_SHANG =
  '\tYou plot a course with confidence.  After a week of travel you arrive on the shores of Shangala.\n\n\t'
const OCEANS = [
  'You spy an bouy marking low waters...',
  'You find a barrel floating on the waves...',
  'You pass a stretch of choking seaweed.',
  'You catch an odd fish with bulging eyeballs...',
  'A dolphin swims circles around your ship...',
  'Seagulls circle above you...',
  'You hear distance groans from some sea beast...',
  'You find planks from a ship that broke apart...',
]

// arCastle.java's decompiled goQuesting(loc>=2) recurses into
// goQuesting(4)/goQuesting(2)/goQuesting(3) for its three destinations,
// which would silently re-run testAdvance() and re-roll the "find ocean"
// contest a second time - and DOCKS_SUCCESS/DOCKS_BRASIL/DOCKS_SHANG are
// defined but never referenced anywhere in the decompiled method, despite
// mapping 1:1 to the three destinations by name. Both point at a
// decompiler-mangled `notice(arrival flavor) -> pickQuest(finalLoc)` chain
// (the same "flavor notice, then the quest" shape used everywhere else in
// this codebase, e.g. arHills.vue's goToForest()) that got collapsed into
// a bare recursive call. Reconstructed here as: resolve the destination
// once, show its arrival flavor text, then go straight to that quest.
function enterDocks(loc: number) {
  if (!wilds.testAdvance(loc)) return
  const hero = heroStore.hero!
  if (!contest(hero.getWits(), 100)) {
    hero.addFatigue(1)
    heroStore.save()
    notice(DOCKS_FAILURE + select(OCEANS))
    return
  }
  let finalLoc = 2
  let arriveMsg = DOCKS_SUCCESS
  if (hero.packCount('Rutter for Shangala') > 0 && percent(70)) {
    finalLoc = 4
    arriveMsg = DOCKS_SHANG
  } else if (hero.packCount('Rutter for Hie Brasil') <= 0 || !percent(70)) {
    finalLoc = 2
    arriveMsg = DOCKS_SUCCESS
  } else {
    finalLoc = 3
    arriveMsg = DOCKS_BRASIL
  }
  pickQuest(finalLoc)
  const questEntry = nav.current
  nav.goto(ArNotice, { message: arriveMsg }, { home: questEntry, showStatus: false })
}
</script>

<template>
  <div class="castle">
    <h2 class="castle__title">The Central Courtyard of Dragon Keep</h2>
    <p v-if="levelUpMessage" class="castle__banner">{{ levelUpMessage }}</p>
    <div class="castle__spots">
      <Hotspot src="/Images/cstTown.jpg" text="Town Gate" type="caption" @click="nav.goto(ArTown)" />
      <Hotspot src="/Images/toCastle.jpg" text="Royal Court" type="caption" @click="goQueen" />
      <Hotspot v-if="showDunjeons" src="/Images/cstDunjeon.jpg" text="Dunjeons" type="caption" @click="wilds.goQuesting(1)" />
      <Hotspot src="/Images/Tower.jpg" text="Clan Hall" type="caption" @click="nav.goto(ArClanHall)" />
      <Hotspot src="/Images/cstPostal.jpg" text="Post Office" type="caption" @click="nav.goto(ArPostal)" />
      <Hotspot v-if="showDocks" src="/Images/cstDocks.jpg" text="Docks" type="caption" @click="enterDocks(2)" />
    </div>
  </div>
</template>

<style scoped>
.castle {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #ff80ff;
  color: #800080;
}

.castle__title {
  text-align: center;
}

.castle__banner {
  white-space: pre-line;
  background: #ffffff55;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: #202020;
}

.castle__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
