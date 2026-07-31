<script setup lang="ts">
// Port of DCourt/Screens/Areas/Town/arWeapon.java, on the Smith template.
// Reached from arTown's Weapons hotspot.
//
// Deviation: the greeting's "<X> is strong..." fallback used
// `Tools.getBest()` (a server-reported field) - dropped with the rest of
// the multiplayer session state, same substitution as arGemShop.vue.
import { useHeroStore } from '../../../stores/hero'
import { select } from '../../../engine/dice'
import { ItArms } from '../../../domain/itArms'
import * as AT from '../../../domain/armsTrait'
import Smith from '../../Template/Smith.vue'

const heroStore = useHeroStore()

const GREETINGS = [
  null,
  'Welcome to my Shop',
  'Greetings Friend',
  'Buy something sharp',
  "You think Aileen's cute?",
  'Elf Bows are fast',
  'Gonna sell something?',
  'See you at the Tavern',
  'How are you today?',
  'My joints are aching',
  'Want to arm wrestle?',
]
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} is strong...`

const STOCK_NAMES = [
  'Knife',
  'Hatchet',
  'Short Sword',
  'Long Sword',
  'Spear',
  'Broad Sword',
  'Battle Axe',
  'Pike',
  'Sling',
  'Short Bow',
  'Long Bow',
  'Spike Helm',
  'Main Gauche',
]

function stockValue(it: ItArms): number {
  let val = it.stockValue()
  if (it.hasTrait(AT.RIGHT)) val = Math.trunc(val * 1.3)
  return val < 2 ? 2 : val
}
</script>

<template>
  <Smith
    name="Bill Smith's Weapon Shoppe"
    face="/Images/Faces/Bill.jpg"
    :greeting="greeting"
    :stock-names="STOCK_NAMES"
    :resale="60"
    :base="10"
    :stock-value="stockValue"
    :special="{
      label: 'Identify',
      cost: (arm: ItArms) => (arm.hasTrait(AT.SECRET) ? 40 : 0),
      perform: (arm: ItArms) => arm.clrTrait(AT.SECRET),
    }"
  />
</template>
