<script setup lang="ts">
// Port of DCourt/Screens/Areas/Forest/arDwfSmith.java, on the Smith
// template. Reached from arForest's Smithy hotspot (hidden until found via
// arForest's search minigame).
//
// Deviation: the greeting's "You're no <X>" fallback used `Tools.getBest()`
// (a server-reported field) - dropped with the rest of the multiplayer
// session state, same substitution as arWeapon.vue/arArmour.vue.
import { useHeroStore } from '../../../stores/hero'
import { select } from '../../../engine/dice'
import { ItArms } from '../../../domain/itArms'
import * as AT from '../../../domain/armsTrait'
import Smith from '../../Template/Smith.vue'

const heroStore = useHeroStore()

const GREETINGS = [
  null,
  'What the hell you want?',
  'Think as you\'re tough?',
  'Sod off ye bugger!',
  'What now!',
  'Well, piss on me',
  "Fargin' hell!",
  'Acch! What is it?',
  'Shades! Go away!',
  'This is me finest work',
  'A dandy bit this is',
  "Here's a pretty piece",
  'This is art, laddy',
  'Mithril is crap!',
  'I spit on Mithril',
  'Elf Bows? Bah!',
  'Gak! I hate Elf Bows!',
  "REPAIR!? Smeg off!",
  'FIX IT!? Yure Nuts!',
  "POLISH!? I'm no serf!",
]
const greeting = select(GREETINGS) ?? `You're no ${heroStore.hero?.getName() ?? ''}`

const STOCK_NAMES = [
  'Steel Sword',
  'Bill Hook',
  'Sword Breaker',
  'Shakrum',
  'Recurve Bow',
  'Half Plate',
  'Full Plate',
  'Steel Buckler',
  'Roman Helm',
  'Doc Martins',
  'Mercury Sandals',
]

function stockValue(it: ItArms): number {
  let val = it.stockValue()
  if (it.hasTrait(AT.LEFT)) val = Math.trunc(val * 1.3)
  return val < 2 ? 2 : val
}
</script>

<template>
  <Smith
    name="Gareth Shortleg's Forest Smithy"
    face="/Images/Faces/Gareth.jpg"
    :greeting="greeting"
    :stock-names="STOCK_NAMES"
    :resale="50"
    :base="20"
    :stock-value="stockValue"
    :special="{
      label: 'Identify',
      cost: (arm: ItArms) => (arm.hasTrait(AT.SECRET) ? 60 : 0),
      perform: (arm: ItArms) => arm.clrTrait(AT.SECRET),
    }"
  />
</template>
