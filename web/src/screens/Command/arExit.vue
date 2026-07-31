<script setup lang="ts">
// Port of DCourt/Screens/Command/arExit.java ("Sleep and Save", extends
// arNotice) - the day-end flow reached via Screen.tryToExit(from, loc,
// cost) (arTavern's Floor/Room/Suite buttons; later the Wilds screens'
// camp actions, #18-22). Was deferred in Phase 5 pending PlaceTable (now
// backed by data/places.json since Phase 1) and arNotice (#13, now done).
//
// Deliberate deviations:
// - Java's down(x,y) (click anywhere to dismiss) becomes an explicit
//   Continue button, matching arNotice.vue's precedent - but arExit's
//   dismiss action is different (save + advance to arFinish, not
//   goHome()), so this is a standalone screen rather than wrapping
//   ArNotice.vue (same reasoning as Indoors.vue: no Vue screen
//   inheritance, so "extends arNotice" doesn't carry over as a component
//   relationship).
// - saveHero()'s CGI failure path (Player.errorScreen()) is dropped:
//   heroStore.save() is a synchronous localStorage write with no failure
//   mode, unlike the original's server round-trip. saveScore() (multiplayer
//   ranking upload) is dropped too, matching arRanking.vue's local-
//   leaderboard reinterpretation - there's no server score to save.
import { computed } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import * as PlaceTable from '../../domain/tables/placeTable'
import { MadLib } from '../../domain/madlib'
import ArFinish from './arFinish.vue'

const props = defineProps<{ loc: string }>()

const heroStore = useHeroStore()
const nav = useNavigationStore()

// Runs once, like the Java constructor's unconditional Screen.setPlace(loc)
// (before the isDead() branch below even checks anything).
heroStore.hero!.setPlace(props.loc)

const deadMsg =
  '$TB$Whoops! you have been killed!!!$CR$$TB$The creature steals half your gear...$CR$$CR$You fall to the ground in the $place$. You will lie there unmourned until tomorrow when the spirits of the $place$ will awaken you.$CR$$CR$$TB$$TB$Please Return Tomorrow$CR$$TB$$TB$For Further Adventures$CR$'

function deadMessage(): string {
  const h = heroStore.hero!
  const mad = new MadLib(deadMsg)
  mad.replace('$place$', h.getPlace() ?? '')
  h.doExhaust()
  return mad.getText()
}

function questsRemain(): string {
  const q = heroStore.hero!.getQuests()
  return q > 0 ? `\n\n\t${q} Quests Remain for Today...\n` : '\n\n\tReturn Tomorrow for Further Quests...\n'
}

const message = computed(() => {
  const h = heroStore.hero
  if (!h) return ''
  if (heroStore.isDead()) return deadMessage()
  const place = PlaceTable.get(props.loc)
  let msg = place.sleep
  if (place.use.includes('c') && h.packCount('Cooking Gear') > 0) msg += '\tYou cook up a hearty dinner.\n'
  if (place.use.includes('t') && h.packCount('Camp Tent') > 0) msg += '\tYou prepare a tent for shelter.\n'
  if (place.use.includes('b') && h.packCount('Sleeping Bag') > 0) msg += '\tYou roll up in a sleeping bag.\n'
  return msg + questsRemain()
})

function saveAdvance() {
  heroStore.save()
  nav.goto(ArFinish, {}, { showStatus: false })
}
</script>

<template>
  <div class="exit">
    <p class="exit__message">{{ message }}</p>
    <button type="button" @click="saveAdvance">Continue</button>
  </div>
</template>

<style scoped>
.exit {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: black;
  color: white;
  text-align: center;
}

.exit__message {
  white-space: pre-line;
  margin: 1.5em auto;
  max-width: 30em;
  text-align: left;
}

.exit button {
  font: inherit;
  cursor: pointer;
}
</style>
