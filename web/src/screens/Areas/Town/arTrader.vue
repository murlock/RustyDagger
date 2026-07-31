<script setup lang="ts">
// Port of DCourt/Screens/Areas/Town/arTrader.java, on the Trade template
// (web/src/screens/Template/Trade.vue). Phase 4's version only implemented
// the buy path directly against Indoors.vue and skipped Sell - now that the
// Trade/Shop templates exist, this restores the Sell tab arTrader.java
// actually has (setShopValues(80, 15) -> RESALE=80, BASE=15).
import { select } from '../../../engine/dice'
import * as GT from '../../../domain/gearTypes'
import Trade from '../../Template/Trade.vue'

const STOCK_NAMES = [
  GT.FOOD,
  GT.FISH,
  'Torch',
  'Rope',
  'Pen & Paper',
  'Sleeping Bag',
  'Cooking Gear',
  'Camp Tent',
  'Identify Scroll',
  GT.SALVE,
  GT.SELTZER,
  GT.PANIC_DUST,
  GT.BLIND_DUST,
  GT.BLAST_DUST,
  'Castle Permit',
]

const GREETINGS = [
  'Hello Again',
  'How are you?',
  'Nice weather today',
  "How's the family?",
  'You look healthy',
  'Need something special?',
  'Aileen scares me',
  'The tavern is noisy',
  'Need some help?',
  'Want a kiss?',
]
const greeting = select(GREETINGS)
</script>

<template>
  <Trade
    name="Sally Trader's Curious Goods"
    face="/Images/Faces/Sally.jpg"
    :greeting="greeting"
    :stock-names="STOCK_NAMES"
    :resale="80"
    :base="15"
  />
</template>
