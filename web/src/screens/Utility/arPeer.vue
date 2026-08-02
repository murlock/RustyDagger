<script setup lang="ts">
// Port of DCourt/Screens/Utility/arPeer.java ("Examine Hero"). Reached from
// arGemShop's "Peer $250" special (spend=1, USEMONEY), arStatus's Peer
// button and EFF_FACELESS effect (spend=2, USEMAGIC/Opal), and arClanHall's
// member "Peer" on a petition (spend=4, CLANPEER - no seek UI, views the
// petitioner directly). Own hero is always free and resolved locally; any
// other name is fetched from the shared server registry (see cgiClient.ts) -
// this is the first screen in this codebase to actually need another
// hero's data, which is why arPeer waited on that server existing at all
// (CONVERSION_PLAN.md's Phase 5 #15 entry).
//
// Deliberate deviations:
// - Java's LoadVision() subtracts the seek cost (money/gems) *before*
//   attempting the remote load, and does not refund on failure - unlike
//   arPackage/arClanHall's own CGI call sites, which all refund on error.
//   Preserved as-is (not a bug fix): searching for someone plausibly costs
//   the fee whether or not the search succeeds, and Java is unambiguous
//   about the ordering here (no captured "oldMoney" to restore).
// - `USEPALANTIR = 3` is a dead constant in the original - declared but no
//   `new arPeer(from, 3, ...)` call exists anywhere in the decompiled
//   source tree. Not implemented here either; `spend` only meaningfully
//   takes 1/2/4 (or the DISABLED=0 fallback below).
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { ItHero } from '../../domain/itHero'
import { nameMatches } from '../../domain/item'
import * as ArmsTrait from '../../domain/armsTrait'
import * as C from '../../domain/constants'
import * as GearTable from '../../domain/tables/gearTable'
import { chance, select } from '../../engine/dice'
import { MadLib } from '../../domain/madlib'
import { loadHeroRemote } from '../../engine/cgiClient'

const props = defineProps<{ spend: number; who?: string | null }>()

const heroStore = useHeroStore()
const nav = useNavigationStore()

const SEEKMONEY = 250
const SEEKGEM = 'Opal'
const DISABLED = 0
const USEMONEY = 1
const USEMAGIC = 2
const CLANPEER = 4

// arPeer.java's constructor: a mage powerful enough to already use an Opal
// scroll-style effect directly doesn't need the paid gem-based seek here -
// forced to DISABLED, same as Java's `if (spend == 2 && canMageUse(Opal)) spend = 0`.
const effectiveSpend =
  props.spend === USEMAGIC && GearTable.canMageUse(SEEKGEM, heroStore.hero!.magicRank()) ? DISABLED : props.spend

const nameInput = ref(props.who ?? heroStore.hero!.getName())
const message = ref('Working...')
const target = shallowRef<ItHero | null>(null)

const costLabel = computed(() => {
  const hero = heroStore.hero!
  if (nameMatches(nameInput.value, hero.getName())) return 'Cost: Free'
  if (effectiveSpend === USEMONEY) return 'Cost: $250'
  if (effectiveSpend === USEMAGIC) return `Cost: 3/${hero.packCount(SEEKGEM)} ${SEEKGEM}`
  if (effectiveSpend === CLANPEER) return `${hero.getClan() ?? C.NONE} Clan Palantir`
  return 'Cost: ---'
})

const seekEnabled = computed(() => {
  const hero = heroStore.hero!
  return (
    nameMatches(nameInput.value, hero.getName()) ||
    (effectiveSpend === USEMONEY && hero.getMoney() > SEEKMONEY) ||
    (effectiveSpend === USEMAGIC && hero.packCount(SEEKGEM) > 3)
  )
})

const SEX_ACT = ['masculine', 'feminine', 'ambiguous', 'neutral']
const SEX_DRESS = [
  'trousers and dark colors',
  'long skirts and bright colors',
  'fluffy pants and a puffy shirt',
  'dark overcoat concealing all',
]
const SITUATION = [
  ' battling a centaur, bellowing forth ',
  ' fleeing a wyvern, shrieking in terror ',
  ' riding a gryphon above the clouds, exhorting ',
  ' searching the corpse of an elf, mumbling ',
  ' tracking a forest boar, muttering ',
  ' seducing a castle servant, whispering ',
  ' gambling amongst nobles, chuckling ',
  ' training at the guild, while crying ',
  ' sharing a beer in the tavern, while boasting ',
  ' tricking a goblin mage, then saying ',
  ' stroking a goblin queen, then moaning ',
]
const STRONG_ADJ = ['stern', 'brave', 'headstrong', 'alert', 'valiant', 'cunning', 'powerful']

const NO_DESCRIPTION =
  '$title$ $name$ = No Description\n\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$'
const DESCRIBE_SITUATION =
  '\t$title$ $name$ $clanmsg$ is a $build$ $race$ with $hair$ hair, $eyes$ eyes, and $skin$ skin. $dress$ $behave$ $intro$ the odd trait of $marks$. Rumor has it that $HE$ is a $sign$. \n\tAs you peer into the gem you espy $him$ $situation$ "$phrase$"\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$'
const DESCRIBE_HABIT =
  '\t$title$ $name$ $clanmsg$ is a $build$ $race$ with $hair$ hair, $eyes$ eyes, and $skin$ skin. $dress$ $behave$ $intro$ the odd trait of $marks$. Rumor has it that $HE$ is a $sign$. \n\tAs you peer into the gem you espy that $habit$.\n\tGuts: $guts$\tWits: $wits$\tCharm: $charm$\nWeapon: $weapon$\nArmor: $armor$'
const CLAN_MSG = 'of the $clan$ Clan'
const DRESS_MSG = '$He$ is dressed in a $sexact$ fashion; $sexdress$'
const BEHAVE1 = '$and$ $his$ behaviour is $also$ suspiciously $sexact$.'
const BEHAVE2 = '$His$ behaviour is suspiciously $sexact$.'
const INTRO1 = 'This $adject$ $rank$ is overall undistinguished, save for'
const INTRO2 = 'In addition, this $adject$ $rank$ has'

function buildDescription(who: ItHero): string {
  const lp = who.getLooks()
  let mad: MadLib
  if (lp == null || lp.getCount() < 1) {
    mad = new MadLib(NO_DESCRIPTION)
  } else {
    mad = new MadLib(lp.getValue(C.HABIT) == null || !chance(3) ? DESCRIBE_SITUATION : DESCRIBE_HABIT)
    if (who.getClan() == null) {
      mad.replace('$clanmsg$', '')
    } else {
      mad.replace('$clanmsg$', CLAN_MSG)
      mad.replace('$clan$', who.getClan()!)
    }
    mad.replace('$build$', lp.getValue(C.BUILD) ?? '')
    mad.replace('$race$', lp.getValue(C.RACE) ?? '')
    mad.replace('$hair$', lp.getValue(C.HAIR) ?? '')
    mad.replace('$eyes$', lp.getValue(C.EYES) ?? '')
    mad.replace('$skin$', lp.getValue(C.SKIN) ?? '')

    const titleVal = lp.getValue(C.TITLE)
    let gender = 0
    while (gender < 2 && titleVal != null && titleVal !== C.SEXS[gender]) gender++

    const dressVal = lp.getValue(C.DRESS)
    let dress = 0
    while (dress < 4 && dressVal != null && dressVal !== C.SEXS[dress]) dress++

    const behaveVal = lp.getValue(C.BEHAVE)
    let behave = 0
    while (behave < 4 && behaveVal != null && behaveVal !== C.SEXS[behave]) behave++

    if (gender !== dress) {
      mad.replace('$dress$', DRESS_MSG)
      mad.replace('$sexact$', SEX_ACT[dress])
      mad.replace('$sexdress$', SEX_DRESS[dress])
      if (gender === behave) {
        mad.replace('$behave$', '.')
      } else {
        mad.replace('$behave$', BEHAVE1)
        mad.replace('$and$', dress === behave ? 'and' : 'while')
        mad.replace('$also$', dress === behave ? 'also' : '')
        mad.replace('$sexact$', SEX_ACT[behave])
      }
    } else if (gender !== behave) {
      mad.replace('$dress$', '')
      mad.replace('$behave$', BEHAVE2)
      mad.replace('$sexact$', SEX_ACT[behave])
    } else {
      mad.replace('$dress$', '')
      mad.replace('$behave$', '')
    }
    mad.replace('$intro$', gender === dress ? INTRO1 : INTRO2)
    mad.replace('$marks$', lp.getValue(C.MARKS) ?? '')
    mad.replace('$sign$', lp.getValue(C.SIGN) ?? '')
    mad.replace('$situation$', select(SITUATION))
    mad.replace('$phrase$', lp.getValue(C.PHRASE) ?? '')
    mad.replace('$habit$', lp.getValue(C.HABIT) ?? '')
    mad.replace('$rank$', who.getRankTitle())
    mad.replace('$adject$', select(STRONG_ADJ))
    mad.genderize(gender === 0)
  }

  mad.replace('$title$', who.getTitle())
  mad.replace('$name$', who.getName())
  mad.replace('$guts$', who.getGuts())
  mad.replace('$wits$', who.getWits())
  mad.replace('$charm$', who.getCharm())
  const weapon = who.findGearTrait(ArmsTrait.RIGHT)
  mad.replace('$weapon$', weapon == null ? C.NONE : weapon.getName())
  const armor = who.findGearTrait(ArmsTrait.BODY)
  mad.replace('$armor$', armor == null ? C.NONE : armor.getName())

  let msg = `${mad.getText()}\nTraits: `
  let row = 1
  for (const trait of C.TraitList) {
    if (who.hasTrait(trait)) {
      msg += `${trait} `
      row++
      if (row % 6 === 0) msg += '\n\t'
    }
  }
  if (row === 1) msg += C.NONE
  return msg
}

async function loadVision(who: string) {
  const hero = heroStore.hero!
  if (who == null || who.length < 4) {
    message.value = `Illegal Name: <${who}>`
    target.value = null
    return
  }
  if (hero.isMatch(who)) {
    target.value = hero
    message.value = buildDescription(hero)
    return
  }
  if (effectiveSpend === USEMONEY) hero.subMoney(SEEKMONEY)
  if (effectiveSpend === USEMAGIC) hero.subPackCount(SEEKGEM, 3)
  heroStore.save()
  message.value = 'Working...'
  target.value = null
  const result = await loadHeroRemote(who)
  if (!result.ok) {
    message.value = `Unable to Load <${who}>`
    return
  }
  const loaded = ItHero.fromSaveJSON(result.data.save)
  target.value = loaded
  message.value = buildDescription(loaded)
}

onMounted(() => {
  loadVision(nameInput.value)
})
</script>

<template>
  <div class="peer">
    <div class="peer__bar">
      <h2>Examine Hero</h2>
      <span class="peer__cost">{{ costLabel }}</span>
      <button type="button" @click="nav.goHome()">Done</button>
    </div>
    <div v-if="effectiveSpend !== CLANPEER" class="peer__seek">
      <input v-model="nameInput" type="text" maxlength="15" @keyup.enter="seekEnabled && loadVision(nameInput)" />
      <button type="button" :disabled="!seekEnabled" @click="loadVision(nameInput)">Seek</button>
    </div>
    <p class="peer__message">{{ message }}</p>
  </div>
</template>

<style scoped>
.peer {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: blue;
  color: white;
}

.peer__bar {
  display: flex;
  align-items: center;
  gap: 1em;
  flex-wrap: wrap;
}

.peer__bar h2 {
  margin: 0;
  flex: 1 1 auto;
}

.peer__bar button {
  font: inherit;
  cursor: pointer;
}

.peer__seek {
  display: flex;
  gap: 0.5em;
  margin-top: 0.75em;
}

.peer__seek button {
  font: inherit;
  cursor: pointer;
}

.peer__seek button:disabled {
  cursor: default;
  opacity: 0.5;
}

.peer__message {
  white-space: pre-line;
  margin-top: 1.5em;
  color: black;
  background: white;
  border-radius: 6px;
  padding: 1em;
  max-width: 34em;
}
</style>
