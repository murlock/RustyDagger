<script setup lang="ts">
// Port of DCourt/Screens/Wilds/arMound.java (extends WildsScreen). Reached
// from arField's Goblin Mound hotspot (now live - see arField.vue's
// enterMound()) once the hero has quests to spend.
//
// Deliberate deviations:
// - needsLight(loc) is unconditionally true in Java regardless of loc -
//   every quest hotspot here (Warrens/Treasury/Throne Room) requires a
//   light source, ported the same way via useWildsScreen's needsLight.
// - enterVortex()'s CGI call (`Loader.cgiBuffer(Loader.MESSAGE, null)`,
//   fetching a server "message of the day" shown via arNotice right after
//   the quest resolves) is dropped - there's no server to fetch it from,
//   and unlike Tools.getBest() elsewhere there's no local substitute that
//   preserves its meaning (it's a multiplayer broadcast, not a per-hero
//   value). The quest itself (`Vortex:Guard`, a real, fully local
//   encounter) isn't gated on that CGI call in any way Java's own code
//   shows, so it stays live - only the dead-end flavor-text step is cut,
//   same "drop the network call, keep the gameplay" precedent as every
//   other Tools.getBest()/CGI substitution in this codebase.
// - As with arCastle.vue, `Screen.findBeast(key)` (Java's single-arg,
//   unscaled catalog lookup) is ported through this codebase's own
//   established 4-arg `MonsterTable.find(key, heroLevel, heroPower,
//   weight)` (real per-encounter balancing, added when the quest engine
//   was built, #35) rather than literally - every other Wilds screen's
//   pickQuest() already does this same substitution.
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
import ArField from './arField.vue'
import ArGoblin from '../Areas/Mound/arGoblin.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

heroStore.hero!.setPlace(C.MOUND)

const levelUpMessage = ref<string | null>(null)
onMounted(() => {
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

const showWarrens = computed(() => (heroStore.hero?.packCount('Map to Warrens') ?? 0) > 0)
const showTreasury = computed(() => (heroStore.hero?.packCount('Map to Treasury') ?? 0) > 0)
const showThroneRoom = computed(() => (heroStore.hero?.packCount('Map to Throne Room') ?? 0) > 0)
const showVortex = computed(() => (heroStore.hero?.packCount('Map to Vortex') ?? 0) > 0)

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}
function noticeHome(message: string, homeComponent: typeof ArField) {
  nav.goto(homeComponent)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}

// arMound.java's own weight[]/beasts[] (per loc: 0=Warrens, 1=Treasury,
// 2=Throne Room) and pickQuest() - getWhere()/getPower() are flat
// ("Mound"/3) regardless of loc.
const WEIGHTS = [
  [5, 7, 3, 8, 4],
  [5, 5, 5, 7, 3],
  [5, 5, 5, 4, 2],
]
const BEASTS = [
  ['Worm', 'Thief', 'Mage', 'Gang', 'Rager'],
  ['Worm', 'Thief', 'Mage', 'Guard', 'Vault'],
  ['Worm', 'Thief', 'Mage', 'Queen', 'Champ'],
]

function startQuest(key: string, weight: number, title: string) {
  const hero = heroStore.hero!
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), weight)
  if (!mob) return
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  hero.addFatigue(1)
  hero.resetActions()
  mob.resetActions()
  mob.chooseActions(hero, true)
  const gate = nav.current
  const session = createQuestSession(mob, weight, title, opt, gate)
  heroStore.save()
  nav.goto(ArQuest, { session }, { home: gate })
}

function pickQuest(loc: number) {
  const key = selectQuestKey('Mound', BEASTS[loc], WEIGHTS[loc])
  startQuest(key, 3, 'Goblin Mound Quest')
}

const wilds = useWildsScreen({
  needsLight: () => true,
  getPower: () => 3,
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

// arMound.java's own enterFields() - bespoke tired-check + wits-vs-50
// travel contest, not part of WildsScreen's shared testAdvance/doSearch (so
// it doesn't run needsLight, unlike the Warrens/Treasury/Throne Room
// quests above). A failed roll ambushes into loc 0's (Warrens) beast pool.
// Unlike arForest/arHills' inter-region travel (`travelWork(1)`), this one
// spends a flat point of fatigue (`h.addFatigue(1)`, matching Java exactly).
function enterFields() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  if (!contest(h.getWits(), 50)) {
    pickQuest(0)
    return
  }
  const msg = `\tYou trudge along the dusty trail and occasion to wonder why you haven't seen any other travellers.\n\n\t${select(FIELDS_LINES)}\n\n\tYou Enter the Fields...\n${h.gainWits(1)}`
  h.addFatigue(1)
  heroStore.save()
  noticeHome(msg, ArField)
}

// arMound.java's own enterVortex() - also bespoke, only a tired-check (no
// testAdvance/needsLight at all, unlike the quest hotspots above).
function enterVortex() {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    notice(TOO_TIRED)
    return
  }
  startQuest('Vortex:Guard', 4, 'Vortex Mouth')
}

function openGoblin() {
  nav.goto(ArGoblin)
}
</script>

<template>
  <div class="mound">
    <h2 class="mound__title">The Bowels of the Goblin Mound</h2>
    <p v-if="levelUpMessage" class="mound__banner">{{ levelUpMessage }}</p>
    <div class="mound__spots">
      <Hotspot v-if="showWarrens" src="/Images/mndWarrens.jpg" text="Warrens" type="caption" @click="wilds.goQuesting(0)" />
      <Hotspot v-if="showTreasury" src="/Images/mndTreasury.jpg" text="Treasury" type="caption" @click="wilds.goQuesting(1)" />
      <Hotspot v-if="showThroneRoom" src="/Images/mndThrone.jpg" text="Throne Room" type="caption" @click="wilds.goQuesting(2)" />
      <Hotspot v-if="showVortex" src="/Images/mndVortex.jpg" text="Dark Vortex" type="caption" @click="enterVortex" />
      <Hotspot src="/Images/mndFields.jpg" text="To Fields" type="caption" @click="enterFields" />
      <Hotspot src="/Images/Tavern.jpg" text="Gobble Inn" type="caption" @click="openGoblin" />
    </div>
  </div>
</template>

<style scoped>
.mound {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #c06030;
  color: white;
}

.mound__title {
  text-align: center;
}

.mound__banner {
  white-space: pre-line;
  background: #ffffff33;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: #202020;
}

.mound__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
