<script setup lang="ts">
// Port of DCourt/Screens/Utility/arDetail.java (extends arNotice). Builds a
// one-shot detail text for an Item - itArms gets full armament stats
// (identifying a Secret weapon/armour if the hero has the matching Smith/
// Armor trait, as a side effect, exactly like the Java constructor did),
// itCount gets its GearTable type blurb, itNote gets sender/date/body, and
// anything else falls back to "No Information".
import { computed } from 'vue'
import { Item } from '../../domain/item'
import { ItArms } from '../../domain/itArms'
import { ItCount } from '../../domain/itCount'
import { ItNote } from '../../domain/itNote'
import * as ArmsTrait from '../../domain/armsTrait'
import * as C from '../../domain/constants'
import * as GearTable from '../../domain/tables/gearTable'
import { useHeroStore } from '../../stores/hero'
import ArNotice from './arNotice.vue'

const props = defineProps<{ item: Item }>()

const heroStore = useHeroStore()

const typeString = [
  'Junk\n\tDitch it\n',
  'Map\n\tAllows Access to Region\n',
  'Camp Gear\n\tImproves Outdoor Camping\n',
  'Gear\n\tCommon Adventure Supplies\n',
  'Treasure\n\tSell it for money',
  'Treasure\n\tMay be used by Mages\n',
  'Magic\n\tAffect Hero + Monsters\n',
  'Magic\n\tAffects Armaments\n',
  'Special\n\tAdvanced Adventuring Supplies\n',
  'Money\n\tThis is what you spend in shops',
]

function enchantStrength(power: number, spell: number): string {
  if (spell < power / 2) return ' Weak\n'
  return spell < power ? ' Good\n' : ' Strong\n'
}

function armsDetail(a: ItArms): string {
  const hero = heroStore.hero
  if (a.hasTrait(ArmsTrait.SECRET) && hero) {
    if (hero.hasTrait(C.SMITH) && (a.hasTrait(ArmsTrait.RIGHT) || a.hasTrait(ArmsTrait.LEFT))) {
      a.clrTrait(ArmsTrait.SECRET)
    }
    if (
      hero.hasTrait(C.ARMOR) &&
      (a.hasTrait(ArmsTrait.HEAD) || a.hasTrait(ArmsTrait.BODY) || a.hasTrait(ArmsTrait.FEET))
    ) {
      a.clrTrait(ArmsTrait.SECRET)
    }
  }
  let msg = `${a.toShow()}\n\n\tArmament\n\tLoc:`
  let none = true
  for (let ix = 0; ix < ArmsTrait.END_WEAR_TRAIT; ix++) {
    if (a.hasTrait(ArmsTrait.traitLabel[ix])) {
      msg += ` ${ArmsTrait.traitLabel[ix]}`
      none = false
    }
  }
  if (none) msg += ' NONE'

  if (a.hasTrait(ArmsTrait.SECRET)) {
    return `${msg}\n\n\tNot Identified\n`
  }

  let msg2 = `${msg}\n`
  const attack = a.getAttack()
  if (attack !== 0) msg2 += `\t${attack < 1 ? '' : '+'}${attack} Attack\n`
  const defend = a.getDefend()
  if (defend !== 0) msg2 += `\t${defend < 1 ? '' : '+'}${defend} Defense\n`
  const skill = a.getSkill()
  if (skill !== 0) msg2 += `\t${skill < 1 ? '' : '+'}${skill} Skill\n`

  let msg3 = `${msg2}\n\tOther:`
  let none2 = true
  for (let ix = ArmsTrait.VISIBLE_TRAIT; ix < ArmsTrait.traitLabel.length; ix++) {
    const trait = ArmsTrait.traitLabel[ix]
    if (a.hasTrait(trait)) {
      msg3 += `\n\t\t${trait}`
      if (ix === ArmsTrait.ENCHANT_TRAIT) {
        msg3 += enchantStrength(a.getPower(), a.getCount(ArmsTrait.ENCHANT))
      }
      none2 = false
    }
  }
  if (none2) msg3 += '\n\t\tNONE\n'
  return msg3
}

function countDetail(it: ItCount): string {
  return `${it.getName()}[${it.getCount()}]\n\n\t${typeString[GearTable.getType(it)]}`
}

function noteDetail(it: ItNote): string {
  return `${it.getName()}: ${it.getFrom()}\nSent: ${it.getDate()}\n====================\n${it.getBody()}`
}

function detail(it: Item): string {
  if (it instanceof ItArms) return armsDetail(it)
  if (it instanceof ItCount) return countDetail(it)
  if (it instanceof ItNote) return noteDetail(it)
  return 'No Information'
}

const message = computed(() => detail(props.item))
</script>

<template>
  <ArNotice :message="message" />
</template>
