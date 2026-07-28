<script setup lang="ts">
// Port of DCourt/Screens/Command/arFinish.java ("Time to Finally Rest") -
// the end-of-session summary, showing stat deltas since heroStore.load()
// captured its sessionStartCount() snapshot (Player.startValues()).
//
// Deliberate deviations:
// - "Reload/Refresh to Play Again" (the applet's only way to restart, since
//   reloading the page re-ran the whole applet from arEntry) becomes a real
//   "Play Again" button routing to ArEntry - there's no page-reload analog
//   worth preserving in an SPA.
// - Credits is rendered inline (creditText already exists in gameStrings.ts)
//   rather than routed through arNotice, which isn't ported yet (task #13)
//   and would be overkill for a single static block of text.
// - Lists routes to ArRanking, reinterpreted for single-player/no-server as
//   a same-device leaderboard (see arRanking.vue's header comment).
import { computed, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import { creditText } from '../../domain/gameStrings'
import ArEntry from './arEntry.vue'
import ArRanking from './arRanking.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()
const hero = heroStore.hero!

const showCredits = ref(false)

// arFinish.java's `which`: picks a portrait for how/where the hero settled
// in for the night, indexed by DCourt.Static.Constants.PLACE_ARRAY - not a
// domain-wide constant in the Java source either (declared local to the
// screen), so kept local here too.
const PORTRAITS = ['Final/Bed.jpg', 'Final/Floor.jpg', 'Final/Camp.jpg', 'Final/Dead.jpg']
const WHICH = [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2]

const portrait = computed(() => {
  if (heroStore.isDead()) return PORTRAITS[3]
  const ix = C.PLACE_ARRAY.indexOf(hero.getPlace() ?? '')
  return PORTRAITS[ix < 0 || ix >= WHICH.length ? 3 : WHICH[ix]]
})

function delta(id: string, current: number) {
  return current - heroStore.sessionStartCount(id)
}

function fmt(what: string, val: number): string {
  return `${val < 0 ? val : '+' + val} ${what}`
}

const guts = computed(() => delta(C.GUTS, hero.getGuts()))
const wits = computed(() => delta(C.WITS, hero.getWits()))
const charm = computed(() => delta(C.CHARM, hero.getCharm()))
const attack = computed(() => delta(C.ATTACK, hero.getAttack()))
const defend = computed(() => delta(C.DEFEND, hero.getDefend()))
const skill = computed(() => delta(C.SKILL, hero.getSkill()))
const level = computed(() => delta(C.LEVEL, hero.getLevel()))
const exp = computed(() => delta(C.EXP, hero.getExp()))
const fame = computed(() => delta(C.FAME, hero.getFame()))
const money = computed(() => delta(C.MONEY, hero.getMoney()))
const quests = computed(() => 3 * level.value)

const gainLines = computed(() => {
  const lines: string[] = []
  if (guts.value !== 0) lines.push(fmt(C.GUTS, guts.value))
  if (wits.value !== 0) lines.push(fmt(C.WITS, wits.value))
  if (charm.value !== 0) lines.push(fmt(C.CHARM, charm.value))
  if (attack.value !== 0) lines.push(fmt(C.ATTACK, attack.value))
  if (defend.value !== 0) lines.push(fmt(C.DEFEND, defend.value))
  if (skill.value !== 0) lines.push(fmt(C.SKILL, skill.value))
  if (quests.value !== 0) lines.push(fmt('Quests', quests.value))
  return lines
})

function openRanking() {
  nav.goto(ArRanking)
}
function playAgain() {
  nav.goto(ArEntry)
}
</script>

<template>
  <div class="finish">
    <div class="finish__header">
      <h2>Time to Finally Rest</h2>
      <div class="finish__actions">
        <button type="button" @click="openRanking">Lists</button>
        <button type="button" @click="showCredits = !showCredits">Credits</button>
      </div>
    </div>

    <p v-if="showCredits" class="finish__credits">{{ creditText }}</p>

    <div class="finish__body">
      <img class="finish__portrait" :src="`/Images/${portrait}`" alt="" />

      <div class="finish__gains">
        <h3>Today's Gains:</h3>
        <p v-for="line in gainLines" :key="line">{{ line }}</p>
        <p v-if="gainLines.length === 0">Spirit!</p>
      </div>
    </div>

    <p class="finish__stats-title">Statistics for {{ hero.getTitle() }}{{ hero.getName() }}</p>
    <p v-if="level > 0">Power burns within you: {{ fmt(C.LEVEL, level) }}</p>
    <p v-else>Difficult lessons learned: {{ fmt(C.EXP, exp) }}</p>
    <p>Your legend has {{ fame < 0 ? 'declined' : 'grown' }}: {{ fmt(C.FAME, fame) }}</p>
    <p>Wealth accumulates {{ money < 0 ? 'slowly' : 'rapidly' }}: {{ fmt(C.MONEY, money) }}</p>

    <button type="button" class="finish__again" @click="playAgain">Play Again</button>
  </div>
</template>

<style scoped>
.finish {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #ff8080;
  color: #402020;
}

.finish__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.finish__actions {
  display: flex;
  gap: 0.5em;
}

.finish__credits {
  white-space: pre-line;
  background: #ffffff55;
  border-radius: 6px;
  padding: 1em;
}

.finish__body {
  display: flex;
  gap: 1.5em;
  align-items: flex-start;
  margin: 1em 0;
}

.finish__portrait {
  width: 240px;
  height: auto;
  border-radius: 6px;
}

.finish__gains {
  flex: 1;
}

.finish__gains p {
  margin: 0.2em 0;
}

.finish__stats-title {
  font-weight: bold;
  margin-top: 1.5em;
}

.finish__again {
  margin-top: 1.5em;
}
</style>
