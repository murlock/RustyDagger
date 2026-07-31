<script setup lang="ts">
// Port of DCourt/Screens/Areas/Mound/arGoblin.java (extends Shop directly,
// not Trade or Smith). Reached from arMound's Inn hotspot (#16).
//
// No new template component: `Shop.java`'s Buy/Sell toggle
// (`box[0]`/`box[1]`) is created by the base class but never actually
// shown here - `hideTools(which)` only reveals it when `which == 0`, and
// arGoblin's own `updateTools()` only ever calls `hideTools(1)` (Shop tab)
// or `hideTools(2)` (Inn tab), never `hideTools(0)` - so Shop.mode never
// leaves its default (stock/buy), and Sell is unreachable dead code in the
// original too. That leaves nothing Trade.vue/Smith.vue's shape actually
// fits (they both center on a live Buy/Sell toggle) - `useShop.ts`'s buy-
// mode machinery (rows/selection/pricing/buyItem) already covers arGoblin
// on its own, so this just consumes that composable directly rather than
// introducing a single-consumer wrapper template.
//
// Deliberate deviations:
// - The greeting's "<X> aint nuzzin" fallback used `Tools.getBest()` (a
//   server-reported field) - dropped with the rest of the multiplayer
//   session state, same substitution as every other Indoors screen.
// - Java's `cost[2]` (Rent Smelly Cot) is a *mutable static array field*,
//   overwritten once in the constructor from the hero's level/HOTEL trait
//   at construction time. That's a real per-JVM-session gotcha in the
//   original (every `new arGoblin()` mutates a value shared with any other
//   live instance) with no upside - ported as a plain `computed` derived
//   fresh from the current hero instead, which is simpler and behaves
//   identically for the single-hero-at-a-time case this SPA actually has.
import { computed, ref } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { roll, select } from '../../../engine/dice'
import * as C from '../../../domain/constants'
import * as GT from '../../../domain/gearTypes'
import { GOSSIP } from '../../../domain/gameStrings'
import { grumors } from '../../../domain/rumors'
import { ItArms } from '../../../domain/itArms'
import { useShop } from '../../Template/useShop'
import Indoors from '../../Template/Indoors.vue'
import ArExit from '../../Command/arExit.vue'
import ArNotice from '../../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const GREETINGS = [
  null,
  'Sorry, I sneezded on it',
  "Zat's funny! tee-hee-hee!",
  'Need some shirtzez?',
  'I can loanzez money...',
  'You need zomething?',
  'I price thingzez nice',
  'Insuranze for your woezez?',
  'Whatz your problemzez?',
]
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} aint nuzzin`

const STOCK_NAMES = ['Gobble Inn Postcard', 'Gobble Inn T-Shirt', 'Identify Scroll', GT.SALVE, GT.SELTZER, 'Map to Warrens', GT.INSURANCE, 'Map to Treasury']

const MONGER = [
  'An old goblin witch tells you:',
  'A frothing berzerker screams:',
  'A sly pickpocket sidles up to you:',
  'Smidgeon Crumb grunts at you:',
  'A beligerent worm herder prods you:',
  'A goblin mage deigns to inform you:',
  'Slouch the barmaid mumbles to you:',
]

// Sell mode is unreachable from this screen's UI (see the header comment) -
// discardPack matches Java's own definition anyway, both for
// correctness-on-paper and in case a future screen ever does flip
// useShop's mode to 1 here.
const shop = useShop({
  stockNames: STOCK_NAMES,
  resale: 0,
  base: 0,
  discardStock: () => false,
  discardPack: (it) => it instanceof ItArms,
})

const inBar = ref(true)

const cotCost = computed(() => {
  const h = heroStore.hero
  if (!h) return 0
  const base = 75 + 25 * h.getLevel()
  return h.hasTrait(C.HOTEL) ? Math.trunc(base / 10) : base
})
const INN_LABELS = ['Sleep on Floor', 'Buy a Drink', 'Rent Smelly Cot']
const innCosts = computed(() => [0, 10, cotCost.value])

function innEnabled(ix: number): boolean {
  return (heroStore.hero?.getMoney() ?? 0) >= innCosts.value[ix]
}

function rumors(): string {
  const h = heroStore.hero!
  if (h.getQuests() < 1) {
    return `${GOSSIP}\nYou are so tired that you nearly pass out trying to swallow your drink.\n`
  }
  const val = roll(h.getCharm())
  if (val === 0) {
    h.getPack().clrQueue()
    h.addFatigue(1)
    return `${GOSSIP}\n\tSomeone slips you a mickey. You awake with a headache in the dark and stinking alley.\n\n*** You Have Missed One Quest ***\n\n*** Your Backpack is Empty! ***\n`
  }
  if (val === 1 || val === 2) {
    h.addFatigue(1)
    return `${GOSSIP}\n\tYou drink heavily and pass outfor a couple hours.\n\n*** You Have Missed One Quest ***\n`
  }
  if (val >= 3 && val <= 9) {
    return `${GOSSIP}\tNoone seems interested in you...\n`
  }
  return `${GOSSIP}\n\t${select(MONGER)}\n\n\t${select(grumors)}\n${h.gainCharm(2)}`
}

function chooseInn(ix: number) {
  const h = heroStore.hero
  if (!h || !innEnabled(ix)) return
  h.subMoney(innCosts.value[ix])
  if (ix === 1) {
    heroStore.save()
    nav.goto(ArNotice, { message: rumors() }, { showStatus: false })
    return
  }
  heroStore.save()
  nav.goto(ArExit, { loc: ix === 0 ? C.MOUND : C.COT }, { showStatus: false })
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors name="Smidgeon Crumb at the Gobble Inn" face="/Images/Faces/Smidgeon.jpg" :greeting="greeting" @exit="exit">
    <div class="goblin__tabs">
      <label>
        <input type="radio" :checked="inBar" @change="inBar = true" />
        Inn
      </label>
      <label>
        <input type="radio" :checked="!inBar" @change="inBar = false" />
        Shop
      </label>
    </div>

    <div v-if="inBar" class="goblin__inn">
      <button
        v-for="(label, ix) in INN_LABELS"
        :key="label"
        type="button"
        :disabled="!innEnabled(ix)"
        @click="chooseInn(ix)"
      >
        {{ label }}{{ innCosts[ix] > 0 ? ` $${innCosts[ix]}` : '' }}
      </button>
    </div>

    <template v-else>
      <ul class="goblin__list">
        <li
          v-for="row in shop.rows.value"
          :key="row.item.getName()"
          :class="{ selected: shop.selected.value === row.item }"
          @click="shop.selectItem(row.item)"
        >
          {{ row.label }}
        </li>
      </ul>

      <div class="goblin__actions">
        <button type="button" :disabled="!shop.selected.value" @click="shop.openInfo()">Info</button>
        <button type="button" :disabled="!shop.selected.value" @click="shop.transact(1)">
          Buy<template v-if="shop.selected.value"> ${{ shop.stockValue(shop.selected.value) }}</template>
        </button>
      </div>
    </template>

    <p class="goblin__money" v-if="heroStore.hero">Cash on hand: ${{ heroStore.hero.getMoney() }}</p>
  </Indoors>
</template>

<style scoped>
.goblin__tabs {
  display: flex;
  gap: 1.5em;
  margin-bottom: 0.75em;
}

.goblin__inn {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-width: 16em;
}

.goblin__inn button,
.goblin__actions button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.goblin__inn button:disabled,
.goblin__actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.goblin__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16em;
  overflow-y: auto;
  border: 1px solid #0a5c1e33;
  border-radius: 4px;
}

.goblin__list li {
  padding: 0.35em 0.6em;
  cursor: pointer;
  border-bottom: 1px solid #0a5c1e22;
}

.goblin__list li.selected {
  background: #0a5c1e22;
}

.goblin__actions {
  display: flex;
  gap: 0.5em;
  margin-top: 0.75em;
}

.goblin__money {
  margin-top: 0.75em;
  font-weight: bold;
}
</style>
