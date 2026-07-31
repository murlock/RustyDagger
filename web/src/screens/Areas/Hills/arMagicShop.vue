<script setup lang="ts">
// Port of DCourt/Screens/Areas/Hills/arMagicShop.java, on the Trade
// template. Reached from arHills' Magic Shop hotspot.
//
// Deviation: the greeting's "<X> Is Dreeeamy*" fallback used
// `Tools.getBest()` (a server-reported field) - dropped with the rest of
// the multiplayer session state, same substitution as arGemShop.vue.
import { useHeroStore } from '../../../stores/hero'
import { select } from '../../../engine/dice'
import * as GT from '../../../domain/gearTypes'
import * as GearTable from '../../../domain/tables/gearTable'
import Trade from '../../Template/Trade.vue'

const heroStore = useHeroStore()

const GREETINGS = [
  null,
  'Greetings Master',
  'You Wish is My Command',
  'How May I Serve Thee?',
  'Do Not Anger Me',
  'Seek and Ye Shall Find',
  'Try Blinding Trolls',
  'Seltzer Cleans Dust',
  'Never Ask A Girls Age',
]
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} Is Dreeeamy*`

const STOCK_NAMES = [
  'Identify Scroll',
  'Glow Scroll',
  GT.SALVE,
  GT.SELTZER,
  GT.PANIC_DUST,
  'Gold Apple',
  GT.BLIND_DUST,
  'Bless Scroll',
  'Luck Scroll',
  'Enchant Scroll',
  'Flame Scroll',
  'Faceless Potion',
]

const buyNames = [...GearTable.findList(GT.TYPE_POTION), ...GearTable.findList(GT.TYPE_SCROLL)].map((r) => r.name)
</script>

<template>
  <Trade
    name="Djinni's Ethereal Magic Shop"
    face="/Images/Faces/Djinni.jpg"
    :greeting="greeting"
    :stock-names="STOCK_NAMES"
    :resale="55"
    :base="22"
    :buy-names="buyNames"
    :stock-value-multiplier="2"
  />
</template>
