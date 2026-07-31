<script setup lang="ts">
// Port of DCourt/Screens/Areas/Forest/arGuild.java (extends Indoors).
// Reached from arForest's The Guild hotspot (hidden until found via
// arForest's search minigame).
//
// Deliberate deviations:
// - The greeting's "I've met <X>" fallback used `Tools.getBest()` (a
//   server-reported field) - dropped with the rest of the multiplayer
//   session state, same substitution as every other Indoors screen.
// - `updateTools()`'s Join Guild button gate reads
//   `cash >= this.cost[1]` (the Fighter Skill cost - `guild * 1000`, always
//   0 before joining since guildRank() can't be nonzero without already
//   being a member) instead of `this.cost[0]` (the real $4000 join cost) -
//   a copy-paste index bug in the decompiled source. It's harmless in
//   Java (the button just looks enabled while broke; the real
//   `h.getMoney() >= this.cost[i]` check inside `action()` still silently
//   no-ops the click), but a button that looks clickable and does nothing
//   reads as broken in a modernized UI with no AWT frame to hide behind.
//   Fixed to gate on the real cost (`cost[0]`) here.
import { computed } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { select } from '../../../engine/dice'
import * as C from '../../../domain/constants'
import Indoors from '../../Template/Indoors.vue'
import ArNotice from '../../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const GREETINGS = [
  null,
  'I am Fenton Magus',
  'Feel fear mortal',
  'Who violates these halls?',
  'Beware the Snot',
  'Elves are aloof',
  'Boar tastes like chicken',
  'Orcs are greedy',
  'Gryphons talk in riddles',
]
const greeting = select(GREETINGS) ?? `I've met ${heroStore.hero?.getName() ?? ''}`

const SOMEONE = [null, 'Silas Keep', 'Sally Trader', 'Bill Smith', 'Aileen Suitor', 'Elden Bishop', 'Fenton Magus', 'Gareth Shortlegs']

function joinMessage(): string {
  return `\tYou are ushered into luxurious chambers where the guild membership awaits you, dressed in black robes to maintain anonymity.  Incense wafts past and somewhere above a gong sounds.\n\tYou think you see ${select(SOMEONE)} mingled in the crowd, but you can't be entirely sure.\n\tA carpet is rolled back, revealing a blood soaked pentagram!  A goat is brought forward!! You are handed a condom!!!\n\tThen they take your money and give you a guild pass. While everyone gets drunk, you are sworn to secrecy. You must never reveal the secret sacred rituals of the Free Adventurers Guild.\n\t\t\t\t\tBottoms Up!!!\n`
}

const FIGHT_MSG =
  '\tYou enter a rigorous regimen. Each morning you are beaten senseless by a dozen guild members. You are only fed meat and sugar. You must stand motionless beneath a waterfall for eight hours. You are dragged over rocks by wild horses. You must run uphill with buckets of water at arms length.\n\tOne morning you snap. In a berzerker rage, you beat your trainers bloody.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Combat Skill >>>\n\n*** You Have Grown Dumber  -2 Wits ***\n\n*** You Have Grown Sadder  -2 Charm ***\n'
const MAGIC_MSG =
  ' \tYou enter the guild library where you are inducted into the secrets of the mystic arts. \tThe truth is simple. You must bribe demons and faeries with gemstones. The hardest part of your training is memorizing the names and desires of these thousand and eight furtive spirits.\n\tEventually you manage to recite about a hundred of these names without summoning anything really powerful and vindictive.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Magery Skill >>>\n\n*** You Have Grown Weaker  -2 Guts ***\n\n*** You Have Grown Sadder  -2 Charm ***\n'
const THIEF_MSG =
  "\tYou are taken into a hidden alcove where five shifty members teach you the secrets of 'trading'.\n\tFirst you are taught the arts of subterfuge and misdirection. Second you learn about sleight of hand and concealment.  Third you are given detailed instruction regarding running and hiding. Fourth you are shown the value of attacking from the shadows. Finally you learn that suckers must never be given an even break.\n\t\t\tYour Training is Complete\n\n<<< You Have Gained in Trading Skill >>>\n\n*** You Have Grown Weaker  -2 Guts ***\n\n*** You Have Grown Dumber  -2 Wits ***\n"

const title = computed(() => `The Free Adventurers Guild${(heroStore.hero?.getQuests() ?? 0) < 5 ? ' - Closed For Rituals' : ''}`)

const closed = computed(() => (heroStore.hero?.getQuests() ?? 0) < 5)
const member = computed(() => heroStore.hero?.hasTrait(C.GUILD) ?? false)
const guild = computed(() => heroStore.hero?.guildRank() ?? 0)
const avail = computed(() => !closed.value && member.value && guild.value < (heroStore.hero?.getLevel() ?? 0))

const costs = computed<[number, number, number, number]>(() => {
  const illuminati = heroStore.hero?.hasTrait(C.ILLUMINATI) ?? false
  const skillCost = guild.value * 1000
  const raw: [number, number, number, number] = [4000, skillCost, skillCost, skillCost]
  return illuminati ? (raw.map((c) => Math.trunc(c / 2)) as [number, number, number, number]) : raw
})

const labels = computed(() => [
  member.value ? 'Guild Member' : `Join Guild $${costs.value[0]}`,
  `Fighter Skill${guild.value === 0 ? ' Free' : ` $${costs.value[1]}`}`,
  `Magery Skill${guild.value === 0 ? ' Free' : ` $${costs.value[2]}`}`,
  `Trader Skill${guild.value === 0 ? ' Free' : ` $${costs.value[3]}`}`,
])

function enabled(ix: number): boolean {
  const cash = heroStore.hero?.getMoney() ?? 0
  if (ix === 0) return !closed.value && !member.value && cash >= costs.value[0]
  return avail.value && cash >= costs.value[ix]
}

function joinGuild(): string {
  const h = heroStore.hero!
  h.fixStatTrait(C.GUILD)
  h.addFatigue(5)
  return joinMessage()
}
function addFight(): string {
  const h = heroStore.hero!
  h.addWits(-2)
  h.addCharm(-2)
  h.addRank(C.FIGHT, 1)
  h.addTemp(C.FIGHT, 1)
  h.addFatigue(5)
  return FIGHT_MSG
}
function addMagic(): string {
  const h = heroStore.hero!
  h.addGuts(-2)
  h.addCharm(-2)
  h.addRank(C.MAGIC, 1)
  h.addTemp(C.MAGIC, 1)
  h.addFatigue(5)
  return MAGIC_MSG
}
function addThief(): string {
  const h = heroStore.hero!
  h.addGuts(-2)
  h.addWits(-2)
  h.addRank(C.THIEF, 1)
  h.addTemp(C.THIEF, 1)
  h.addFatigue(5)
  return THIEF_MSG
}

function choose(ix: number) {
  const h = heroStore.hero
  if (!h || !enabled(ix)) return
  h.subMoney(costs.value[ix])
  const message = [joinGuild, addFight, addMagic, addThief][ix]()
  heroStore.save()
  nav.goto(ArNotice, { message }, { showStatus: false })
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors :name="title" face="/Images/Faces/Fenton.jpg" :greeting="greeting" @exit="exit">
    <div v-if="member" class="guild__stats">
      <p>Guild Training</p>
      <p>Fighter: {{ heroStore.hero?.fight() }}/{{ heroStore.hero?.fightRank() }}</p>
      <p>Magery: {{ heroStore.hero?.magic() }}/{{ heroStore.hero?.magicRank() }}</p>
      <p>Trader: {{ heroStore.hero?.thief() }}/{{ heroStore.hero?.thiefRank() }}</p>
      <p>Total: {{ guild }}/{{ heroStore.hero?.getLevel() }}</p>
    </div>

    <div class="guild__options">
      <button v-for="(label, ix) in labels" :key="label" type="button" :disabled="!enabled(ix)" @click="choose(ix)">
        {{ label }}
      </button>
    </div>
  </Indoors>
</template>

<style scoped>
.guild__stats {
  margin-bottom: 0.75em;
}
.guild__stats p {
  margin: 0.15em 0;
}

.guild__options {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-width: 16em;
}

.guild__options button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.guild__options button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
