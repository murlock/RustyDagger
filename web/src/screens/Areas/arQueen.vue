<script setup lang="ts">
// Port of DCourt/Screens/Areas/arQueen.java (extends Indoors). Reached from
// arCastle's Royal Court hotspot (direct entry with social standing, or a
// quest-gated entry otherwise - see arCastle.vue's goQueen()).
//
// Deliberate deviations:
// - Invest ($100k)'s entire reward mechanism runs through arPackage.send()
//   (a CGI mail-to-self call - the "gain" is attached to a mailed letter,
//   not applied to the hero directly) - now that arPackage/arPostal exist
//   (Phase 5 #14/#27), this is wired up for real: the mailed letter lands
//   in the hero's own arPostal postbox and has to be collected there like
//   any other mail, same as Java.
// - The four minigames (Dice/Mingle/Boast/Game) are plain functions in
//   queenGames.ts, not their own components - see that file's header
//   comment.
import { computed, onMounted, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { fourTest, roll, select } from '../../engine/dice'
import { sendPackage } from '../../engine/mailer'
import { syncHero } from '../../engine/heroStorage'
import { today } from '../../engine/today'
import { ItList } from '../../domain/itList'
import { ItNote } from '../../domain/itNote'
import { ItCount } from '../../domain/itCount'
import { MadLib } from '../../domain/madlib'
import * as C from '../../domain/constants'
import * as GameStrings from '../../domain/gameStrings'
import { diceOutcome, mingleOutcome, boastOutcome, gameOutcome } from './Queen/queenGames'
import ArCastle from '../Wilds/arCastle.vue'
import ArTown from './arTown.vue'
import ArNotice from '../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const PETITION_COST = 5000
const INVEST_COST = 100000

const INVEST_MSG = '$TB$You enter into business with one $lordname$ , a $MAN$ of good repute.  $HE$ is investing in $jobname$.  If all goes well, you should see a return of $reward$ marks for your investment.  The risks are $risk$ and so are the rewards.$CR$$TB$The $lordrank$ will contact you upon the morrow with word of the results.$CR$'
const FEEL_BAD = '$CR$$TB$(You have a bad feeling about this)$CR$'
const FEEL_GOOD = '$CR$$TB$(You have a good feeling about this)$CR$'
const INVEST_FEEL = [FEEL_BAD, FEEL_BAD, '', FEEL_GOOD, FEEL_GOOD]
const INVEST_NOTE = '$today$$CR$My Good $rank$ $name$,$CR$I write to inform you of events concerning our mutual venture.'
const INVEST_TEXT = [
  '$today$$CR$This letter is to inform you that the $lordname$ was beaten senseless and robbed utterly while engaged in business. $CR$Sincerely,$CR$$official$',
  'Things went very poorly. I am deeply ashamed to report substantial losses. Pray accept this small sum as my sole apology.$CR$Deepest Regrets, $CR$$lordname$ ',
  'There were several setbacks to the venture we have planned.  I am able to return your original investment, but no more. $CR$Regretfully, $CR$$lordname$',
  'Business has progressed exactly as expected. Your share of the proceeds accompany this letter. $CR$Ever yours, $CR$$lordname$',
  'As the purse accompanying this missive indicates, things went extremely well. You will find an extra $bonus$ marks above the amount I promised you. $CR$Thank you for your trust.$CR$$lordname$',
]
const INVEST_JOBS = [
  ['the Oat Harvest', 'the Wheat Harvest', 'the Barley Harvest'],
  ['the Grape Harvest', 'Hog Futures', 'Wool Futures'],
  ['a Cargo of Wine', 'a Cargo of Beer', 'a Cargo of Dried Meat'],
  ['the Leather Works', 'the Iron Works', 'the Lumber Yard'],
  ['a Flower Shop', 'a Pastry Shop', 'a Fine Theatre'],
  ['a Cargo of Weapons', 'a Cargo of Farm Tools', 'A Cargo of Glassware'],
  ['a Cargo of Artwork', 'a Cargo of Fine Wines', 'a Cargo of Jewelry'],
  ['bribes to the Chief Counselor', 'bribes to the Guard Captain', 'bribes to the Guild Master'],
]
const INVEST_RISK = ['marginal', 'minimal', 'small', 'moderate', 'large', 'substantial', 'massive', 'incredible']
const OFFICIAL_TITLE = ['Captain ', 'Doctor ', 'Mayor ', 'Abbot ', 'Lieutenant ', 'Officer ', 'Father ', 'Brother ', 'Sherrif', 'Alderman', 'Sultan', 'Major']

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
const canInvest = computed(
  () => (heroStore.hero?.getQuests() ?? 0) >= 5 && (heroStore.hero?.getMoney() ?? 0) >= INVEST_COST,
)

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

// Port of arQueen.invest(): a fictional business partner's rank/risk/outcome
// roll, whose payout (if any) arrives as mail rather than being applied to
// the hero directly - matching Java's own `arPackage.send(name, hero.getName(), mail)`.
async function invest() {
  if (!canInvest.value) return
  const hero = heroStore.hero!
  const rank = hero.getSocial() + roll(4) - 1
  if (rank < 0 || rank > 11) return
  const risk = Math.trunc((rank + roll(rank + 2)) / 3)
  const index = fourTest(hero.getWits(), 20 + risk * 40)
  const reward = Math.trunc((INVEST_COST * (23 + risk * 3)) / 20)
  let gain = 0
  const msg = new MadLib(INVEST_MSG + INVEST_FEEL[index])
  let note: MadLib
  switch (index) {
    case 0:
      note = new MadLib(INVEST_TEXT[0])
      note.replace('$official$', `${select(OFFICIAL_TITLE)} ${select(GameStrings.Names)}`)
      break
    case 1:
      note = new MadLib(INVEST_NOTE + INVEST_TEXT[1])
      gain = Math.trunc(INVEST_COST / 2)
      break
    case 2:
      note = new MadLib(INVEST_NOTE + INVEST_TEXT[2])
      msg.append(hero.gainExp(risk * 5 + rank))
      msg.append(hero.gainWits(5))
      gain = INVEST_COST
      break
    case 3:
      note = new MadLib(INVEST_NOTE + INVEST_TEXT[3])
      msg.append(hero.gainExp(risk * 10 + rank))
      msg.append(hero.gainWits(10))
      gain = reward
      break
    default:
      note = new MadLib(INVEST_NOTE + INVEST_TEXT[4])
      gain = Math.trunc((reward * 3) / 2)
      msg.replace('$bonus$', String(gain - reward))
      msg.append(hero.gainExp(risk * 15 + rank))
      msg.append(hero.gainWits(15))
      break
  }
  const name = `${C.rankTitle[rank]}${select(GameStrings.Names)}`
  const sex = roll(2)
  note.replace('$lordname$', name)
  note.replace('$rank$', hero.getRankTitle())
  note.replace('$name$', hero.getName())
  note.replace('$today$', today())
  msg.replace('$lordname$', name)
  msg.replace('$lordrank$', C.rankName[sex][rank])
  msg.replace('$jobname$', select(INVEST_JOBS[risk]))
  msg.replace('$cost$', String(INVEST_COST))
  msg.replace('$risk$', INVEST_RISK[risk])
  msg.replace('$reward$', String(reward))
  msg.genderize(sex === 0)

  const mail = new ItList(C.MAIL)
  mail.append(ItNote.create('Letter', name, null, note.getText()))
  if (gain > 0) mail.append(new ItCount('Marks', gain))

  hero.subMoney(INVEST_COST)
  hero.addFatigue(5)
  heroStore.save()
  const result = await sendPackage(name, hero.getName(), `Letter from ${name}`, mail)
  if (result != null) {
    hero.addMoney(INVEST_COST)
    hero.subFatigue(5)
    heroStore.save()
    notice(GameStrings.MAIL_CANCEL + result)
    return
  }
  syncHero(hero)
  notice(msg.getText())
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

        <button type="button" :disabled="!canInvest" @click="invest">Invest $100k</button>
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
