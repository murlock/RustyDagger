<script setup lang="ts">
// Port of DCourt/Screens/Areas/Town/arArmour.java, on the Smith template.
// Reached from arTown's Armour hotspot.
//
// Deviation: the greeting's "<X> is my hero." fallback used
// `Tools.getBest()` (a server-reported field) - dropped with the rest of
// the multiplayer session state, same substitution as arWeapon.vue.
import { useHeroStore } from '../../../stores/hero'
import { select } from '../../../engine/dice'
import { ItArms } from '../../../domain/itArms'
import * as AT from '../../../domain/armsTrait'
import * as ArmsTable from '../../../domain/tables/armsTable'
import Smith from '../../Template/Smith.vue'

const MAXFIX_POWER = 60

const heroStore = useHeroStore()

const GREETINGS = [
  null,
  "What's your sign?",
  'Hiya Sonny!',
  'Watcha Got?',
  'Hey there, sexy',
  'Rub me feet, willya?',
  'Armour is good...',
  "C'mon sexy, smile",
  "Cover ever'thing",
  'Back fer more?',
  'Need some shoes?',
]
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} is my hero.`

const STOCK_NAMES = [
  'Clothes',
  'Leather Jacket',
  'Brigandine',
  'Chain Suit',
  'Scale Suit',
  'Buckler',
  'Targe',
  'Shield',
  'Spike Shield',
  'Sandals',
  'Shoes',
  'Boots',
  'Leather Cap',
  'Pot Helm',
  'Chain Coif',
]

function stockValue(it: ItArms): number {
  let val = it.stockValue()
  if (it.hasTrait(AT.BODY)) val = Math.trunc(val * 1.3)
  return val < 2 ? 2 : val
}

// Port of arArmour.costSpecial(). A worn piece costs $1 just to buff off
// its Decay tarnish, plus - unless it's already at its catalog "max power"
// (MAXFIX_POWER) - a per-stat repair cost for whatever's been ground down
// below the base item's own attack/defend/skill.
function costSpecial(arm: ItArms): number {
  if (arm.hasTrait(AT.SECRET)) return 0
  const base = ArmsTable.get(arm.getName())
  let cost = arm.hasTrait(AT.DECAY) ? 1 : 0
  if (!base || base.getPower() >= MAXFIX_POWER) return cost
  const attackGap = base.getAttack() - arm.getAttack()
  if (attackGap > 0) cost += attackGap * attackGap * 5
  const defendGap = base.getDefend() - arm.getDefend()
  if (defendGap > 0) cost += defendGap * defendGap * 4
  const skillGap = base.getSkill() - arm.getSkill()
  if (skillGap > 0) cost += skillGap * skillGap * 2
  return cost
}

// Port of arArmour.doSpecial(). Decay always clears once paid for; the
// attack/defend/skill restore only runs when the fee covered more than
// the flat $1 Decay-buff (cost >= 2) - matching Java's own gate.
function polish(arm: ItArms, cost: number): void {
  arm.clrTrait(AT.DECAY)
  if (cost < 2) return
  const base = ArmsTable.get(arm.getName())
  if (!base) return
  if (base.getAttack() > arm.getAttack()) arm.setAttack(base.getAttack())
  if (base.getDefend() > arm.getDefend()) arm.setDefend(base.getDefend())
  if (base.getSkill() > arm.getSkill()) arm.setSkill(base.getSkill())
}
</script>

<template>
  <Smith
    name="Aileen Suitor's Armour Shoppe"
    face="/Images/Faces/Aileen.jpg"
    :greeting="greeting"
    :stock-names="STOCK_NAMES"
    :resale="50"
    :base="15"
    :stock-value="stockValue"
    :special="{ label: 'Polish', cost: costSpecial, perform: polish }"
  />
</template>
