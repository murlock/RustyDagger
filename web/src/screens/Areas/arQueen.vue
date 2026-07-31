<script setup lang="ts">
// Port of DCourt/Screens/Areas/arQueen.java (extends Indoors). Reached from
// arCastle's Royal Court hotspot (direct entry with social standing, or a
// quest-gated entry otherwise - see arCastle.vue's goQueen()).
//
// Deliberate deviations:
// - Invest ($100k) renders disabled: its entire reward mechanism runs
//   through `arPackage.send()` (a CGI mail-to-self call - the "gain" is
//   attached to a mailed letter, not applied to the hero directly) and,
//   to ever be collected, the already-deferred arPostal (#27). Unlike
//   Petition (fully local: favor accumulation, a rank check, no network
//   call anywhere in the path), there's no local-only subset of Invest
//   left to offer - same "entirely multiplayer-dependent" call as
//   arClanHall/arPostal (#26/#27).
// - The four minigames (Dice/Mingle/Boast/Game) are plain functions in
//   queenGames.ts, not their own components - see that file's header
//   comment.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { select } from '../../engine/dice'
import * as C from '../../domain/constants'
import { diceOutcome, mingleOutcome, boastOutcome, gameOutcome } from './Queen/queenGames'
import ArCastle from '../Wilds/arCastle.vue'
import ArTown from './arTown.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const PETITION_COST = 5000

const GREETINGS = [
  null,
  'What a clever little man.',
  "I'm getting bored.",
  'Tell me a story.',
  'Where have you been?',
  'Give me a good reason.',
  'OFF WITH HIS HEAD!',
  'Show me something special.',
  'You are boring me.',
  'Why should I listen?',
  'Give me a good jape.',
]
const greeting = select(GREETINGS) ?? `Have you seen ${heroStore.hero?.getName() ?? ''}?`

const levelUpMessage = ref<string | null>(null)
onMounted(() => {
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

// heroStore.hero read directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const rankProgress = computed(() => {
  const h = heroStore.hero
  if (!h) return null
  const rank = h.getSocial()
  if (rank >= 9) return null
  const sex = h.getGender()
  return `${C.rankName[sex][rank]} to ${C.rankName[sex][rank + 1]}`
})

const hasQuests = computed(() => (heroStore.hero?.getQuests() ?? 0) >= 1)
const canDice = computed(() => hasQuests.value && (heroStore.hero?.getMoney() ?? 0) >= 1000)
const showPetition = computed(() => (heroStore.hero?.getSocial() ?? 0) < 9)
const canPetition = computed(
  () => (heroStore.hero?.getQuests() ?? 0) >= 3 && (heroStore.hero?.getMoney() ?? 0) >= PETITION_COST,
)

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}
function noticeHomeCastle(message: string) {
  nav.goto(ArCastle)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}
function noticeHomeTown(message: string) {
  nav.goto(ArTown)
  const home = nav.current
  nav.goto(ArNotice, { message }, { home, showStatus: false })
}
function noticeThenDeathNotice(outcomeMessage: string, deathTale: string) {
  const death = heroStore.resolveDeath(deathTale, false)
  nav.goto(ArNotice, { message: death?.message ?? '' }, { showStatus: false })
  const deathEntry = nav.current
  nav.goto(ArNotice, { message: outcomeMessage }, { home: deathEntry, showStatus: false })
}

function playDice() {
  if (!canDice.value) return
  const hero = heroStore.hero!
  const message = diceOutcome(hero)
  heroStore.save()
  notice(message)
}
function playMingle() {
  if (!hasQuests.value) return
  const hero = heroStore.hero!
  const message = mingleOutcome(hero)
  heroStore.save()
  notice(message)
}
function playBoast() {
  if (!hasQuests.value) return
  const hero = heroStore.hero!
  const { message, toCastle } = boastOutcome(hero)
  heroStore.save()
  if (toCastle) noticeHomeCastle(message)
  else notice(message)
}
function playGame() {
  if (!hasQuests.value) return
  const hero = heroStore.hero!
  const { message, deathTale } = gameOutcome(hero)
  if (deathTale) {
    noticeThenDeathNotice(message, deathTale)
    return
  }
  heroStore.save()
  notice(message)
}

// Port of arQueen.petition(). Total rejection (index 0) routes home to
// arTown instead of back here - every other outcome (including success)
// keeps arQueen as home, matching Java's own `next` assignment per index.
function petition() {
  if (!canPetition.value) return
  const hero = heroStore.hero!
  const rank = hero.getSocial()
  const cost = C.rankCost[rank]
  const sex = hero.getGender()
  hero.addFatigue(3)
  hero.subMoney(PETITION_COST)
  hero.addFavor(PETITION_COST)
  const favorRatio = hero.hasTrait(C.POPULAR) ? Math.trunc(hero.getFavor() / 700) : Math.trunc(hero.getFavor() / 1000)
  let index = Math.trunc((favorRatio * 4) / cost)
  if (index > 4) index = 4
  const newRankName = C.rankName[sex][rank + 1]
  let message: string
  if (index === 4) {
    hero.getStatus().zero(C.FAVOR)
    hero.addRank(C.SOCIAL, 1)
    hero.addStatus(C.FAME, hero.getSocial() * 100)
  }
  switch (index) {
    case 0:
      message = `\tThe queen laughs coldly at your ambitions. \n\t"The rank of ${newRankName} is at such far remove that you may find the stars to be a closer companion.  Do not even dare to speak to me again until you have a gift worthy of my attentions." \n\tShe signals her guards who drag you out and throw you from the castle. \n`
      break
    case 1:
      message = `\tThe queen stares at you as if you were a stain on the carpet. \n\t"The rank of ${newRankName} is far from your grasp at this moment.  Go forth, do good works to curry favor with this court." \n\tShe turns her gaze away from you in a clear gesture of dismissal. \n`
      break
    case 2:
      message = `\tHer majesty smiles shyly. \n\t"You have made great inroads with this court.  Many nobles find you a pleasing companion and speak favorably of you.  The rank of ${newRankName} is not an impossible dream, but still requires more work." \n\tThe queen acknowledges your parting bow, and turns to whisper giggling comments to her ladies in waiting. \n`
      break
    case 3:
      message = `\tThe queen smiles on you benignly. \n\t"The rank of ${newRankName} is not far from your grasp.  If you could gain the greatest approval of my counselors and nobles, I could be persuaded to grant you a new title." \n\tThe queen turns her attention to matters of state, but you suspect your case is on her mind. \n`
      break
    default:
      message = `\t\t*** Social Standing Raised *** \n\tProclamations are sent accross the land: \n \n\t"Her majesty Queen Beth is pleased to declare that one of her most faithful and loyal of subjects, the honorable ${newRankName} ${hero.getName()} ;  has earned her deepest gratitude and the respect of the Dragon Court as a whole. \n \n\t"In Recognition of his long standing good works, we are delighted to declare that ${hero.getName()} shall henceforth be known as: \n \n\t\t\t\t" ${newRankName} ${hero.getName()} "!!`
      break
  }
  heroStore.save()
  if (index === 0) noticeHomeTown(message)
  else notice(message)
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <div class="queen">
    <div class="queen__bar">
      <h2 class="queen__title">Queen Beth reigns over Dragon Court</h2>
      <button class="queen__exit" type="button" @click="exit">Exit</button>
    </div>
    <div class="queen__body">
      <figure class="queen__portrait">
        <img src="/Images/Faces/Ruler.jpg" alt="Queen Beth reigns over Dragon Court" />
        <figcaption>{{ greeting }}</figcaption>
      </figure>
      <div class="queen__content">
        <p v-if="levelUpMessage" class="queen__banner">{{ levelUpMessage }}</p>
        <p v-if="rankProgress" class="queen__progress">{{ rankProgress }}</p>

        <div class="queen__games">
          <button type="button" :disabled="!canDice" @click="playDice">Dice</button>
          <button type="button" :disabled="!hasQuests" @click="playMingle">Mingle</button>
          <button type="button" :disabled="!hasQuests" @click="playBoast">Boast</button>
          <button type="button" :disabled="!hasQuests" @click="playGame">Game</button>
        </div>

        <button type="button" :disabled="true" title="Invest requires the deferred mail system (arPostal)">
          Invest $100k
        </button>
        <button v-if="showPetition" type="button" :disabled="!canPetition" @click="petition">
          Petition $5000
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queen {
  background: #ffe0e0;
  color: #800000;
  min-height: 100vh;
  box-sizing: border-box;
}

.queen__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75em 1em;
  border-bottom: 1px solid #80000033;
}

.queen__title {
  margin: 0;
  font-size: 1.1em;
}

.queen__exit {
  font: inherit;
  cursor: pointer;
  border: 1px solid #800000;
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 0.3em 0.8em;
}

.queen__body {
  display: flex;
  gap: 1.5em;
  padding: 1em;
  flex-wrap: wrap;
}

.queen__portrait {
  margin: 0;
  width: 180px;
  flex: 0 0 auto;
  text-align: center;
}

.queen__portrait img {
  width: 100%;
  border-radius: 6px;
  display: block;
}

.queen__portrait figcaption {
  margin-top: 0.5em;
  font-style: italic;
}

.queen__content {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-width: 20em;
}

.queen__banner {
  white-space: pre-line;
  background: #ffffff55;
  border-radius: 6px;
  padding: 0.75em 1em;
}

.queen__progress {
  font-style: italic;
}

.queen__games {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5em;
}

.queen__content button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.queen__content button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
