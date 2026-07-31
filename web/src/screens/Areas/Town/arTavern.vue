<script setup lang="ts">
// Port of DCourt/Screens/Areas/Town/arTavern.java (extends Indoors). Enables
// arTown's previously-disabled Tavern hotspot.
//
// Deliberate deviations:
// - The constructor's HOTEL-trait cost discount (`cost[i] = (cost[i]+9)/10`
//   for i in 1..4) is dropped: it mutates the shared static `cost` array
//   before createTools() unconditionally overwrites cost[1..4] with fresh
//   level-based values right after - the discount is clobbered before it's
//   ever read, so it has zero observable effect in the original either.
//   Not a "faithful quirk" worth preserving, just dead code.
// - The gossip minigame's "who's asking" fallback used `Tools.getBest()`
//   (Player.best, a server-reported field) when the random greeting picks
//   the null slot - dropped with the rest of the multiplayer session state
//   (see itHero.ts's header comment). Substituted with the hero's own name.
import { computed, ref } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { roll, select } from '../../../engine/dice'
import * as C from '../../../domain/constants'
import { GOSSIP } from '../../../domain/gameStrings'
import { rumors } from '../../../domain/rumors'
import Indoors from '../../Template/Indoors.vue'
import ArExit from '../../Command/arExit.vue'
import ArNotice from '../../Utility/arNotice.vue'
import ArStorage from '../../Utility/arStorage.vue'

const TITLE = 'Silas Keepers Bed & Breakfast'

const GREETINGS = [
  null,
  'This job is great',
  'I love to drink',
  "You're my best friend",
  "I'm so happy",
  'Hixxup! Excuse me',
  'Burrrp - Ahhhhh',
  '*Sniff* *Sniff* <Gulp>',
  'Beer is my friend',
  'Huh? You say something?',
  "I'm kinda sleepy",
]

const MONGER = [
  'One old woman tells you:',
  'A spirited forester tells you:',
  'An old drunken soldier tells you:',
  'Silas Keeper whispers to you:',
  'A beligerent fish monger prods you:',
  'A sly bard sing to you:',
  'Kara the barmaid sidles up to you:',
]

const nav = useNavigationStore()
const heroStore = useHeroStore()

const greeting = ref(select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} who?`)

const level = computed(() => heroStore.hero?.getLevel() ?? 0)
const costs = computed(() => [1, 4 + level.value, 20 + 5 * level.value, 75 + 25 * level.value, 50 * level.value])
const labels = ['Buy a Drink', 'Sleep on Floor', 'Rent a Room', 'Rent a Suite', 'Storage']

function canAfford(ix: number): boolean {
  const h = heroStore.hero
  if (!h) return false
  const cost = costs.value[ix]
  if (ix < 4) return h.getMoney() >= cost
  const store = h.storeCount('Marks')
  return h.getMoney() >= cost || store >= cost || h.getMoney() + store > cost
}

function rumorsMessage(): string {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    return `${GOSSIP}\nYou are so tired that you nearly pass out trying to swallow your drink.\n`
  }
  const charm = h.getCharm()
  let val = roll(charm)
  if (charm <= 10) val += 2
  else if (charm <= 20) val += 1
  switch (val) {
    case 0: {
      const lost = h.getMoney()
      h.subMoney(lost)
      h.addFatigue(1)
      return `${GOSSIP}\n\tSomeone slips you a mickey. You awake with a headache in the dark and stinking alley.\n\n*** You Have Missed One Quest ***\n\n*** ${lost} Marks Lost ***\n`
    }
    case 1:
      h.addFatigue(1)
      return `${GOSSIP}\n\tYou drink heavily and pass outfor a couple hours.\n\n*** You Have Missed One Quest ***\n`
    case 2:
    case 3:
    case 4:
      return `${GOSSIP}\nNoone seems interested in you...\n`
    default:
      return `${GOSSIP}\n\t${select(MONGER)}\n\n\t${select(rumors)}\n${h.gainCharm(1)}`
  }
}

function choose(ix: number) {
  const h = heroStore.hero
  if (!h || !canAfford(ix)) return
  const cost = costs.value[ix]
  if (ix < 4) {
    h.subMoney(cost)
  } else {
    const spend = h.subMoney(cost)
    if (spend < cost) h.subStore('Marks', cost - spend)
  }
  heroStore.save()
  switch (ix) {
    case 0:
      nav.goto(ArNotice, { message: rumorsMessage() }, { showStatus: false })
      break
    case 1:
      nav.goto(ArExit, { loc: C.FLOOR }, { showStatus: false })
      break
    case 2:
      nav.goto(ArExit, { loc: C.ROOM }, { showStatus: false })
      break
    case 3:
      nav.goto(ArExit, { loc: C.SUITE }, { showStatus: false })
      break
    case 4:
      nav.goto(ArStorage, { title: TITLE }, { showStatus: false })
      break
  }
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors :name="TITLE" face="/Images/Faces/Silas.jpg" :greeting="greeting" @exit="exit">
    <div class="tavern__options">
      <button
        v-for="(label, ix) in labels"
        :key="label"
        type="button"
        :disabled="!canAfford(ix)"
        @click="choose(ix)"
      >
        ${{ costs[ix] }} {{ label }}
      </button>
    </div>
  </Indoors>
</template>

<style scoped>
.tavern__options {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-width: 16em;
}

.tavern__options button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.tavern__options button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
