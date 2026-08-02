<script setup lang="ts">
// Port of DCourt/Screens/Utility/arStatus.java ("Hero Status Screen") - the
// pack/gear inventory screen reached from StatusBar's click (closing the
// Phase 3 `@open` no-op gap, see App.vue).
//
// Deliberate deviations:
// - The `attack` field Java's constructor/performEffect() set
//   (`this.attack = this.fight && !hero.hasTrait("Panic")`) is dropped -
//   grepping arStatus.java, nothing in the class ever *reads* it back, so
//   it's dead state even in the original.
// - Peer button and EFF_FACELESS's follow-on both now route to ArPeer
//   (spend=2, USEMAGIC - Opal-gem-based, matching arPeer.java's own
//   `new arPeer(this, 2, hero.getName())` call sites here), now that arPeer
//   (Utility #15) is ported. EFF_FACELESS's notice chains into it exactly
//   like Java's `new arNotice(new arPeer(...), "...")` - see effectFaceless().
// - EFF_SCRIBE (Pen & Paper/Gobble Inn Postcard) now routes to ArScribe
//   (Utility #16, ported) - see effectScribe().
// - Enchant Scroll's death branch (a failed enchant can kill the hero) goes
//   through heroStore.resolveDeath() (the same domain call every other
//   death path uses) but surfaces the result via arNotice rather than a
//   dedicated healer screen - arField/the healer flow isn't ported yet
//   (Phase 5 #22), and no screen in this codebase routes death anywhere
//   else yet either, so there's nothing more specific to route to.
import { computed, shallowRef } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { Item } from '../../domain/item'
import { ItArms } from '../../domain/itArms'
import type { ItNote } from '../../domain/itNote'
import * as ArmsTrait from '../../domain/armsTrait'
import * as GearTable from '../../domain/tables/gearTable'
import * as GT from '../../domain/gearTypes'
import { contest } from '../../engine/dice'
import ArNotice from './arNotice.vue'
import ArDetail from './arDetail.vue'
import ArPeer from './arPeer.vue'
import ArScribe from './arScribe.vue'

const props = withDefaults(defineProps<{ battle?: boolean }>(), { battle: false })

const heroStore = useHeroStore()
const nav = useNavigationStore()

const STATE_WAIT = 0
const STATE_TARGET = 1

const SLOTS: { trait: string; loc: string }[] = [
  { trait: ArmsTrait.HEAD, loc: 'H:' },
  { trait: ArmsTrait.BODY, loc: 'B:' },
  { trait: ArmsTrait.FEET, loc: 'F:' },
  { trait: ArmsTrait.RIGHT, loc: 'R:' },
  { trait: ArmsTrait.LEFT, loc: 'L:' },
]

// shallowRef, not ref: pick/useItem hold references into the hero's own
// pack/gear lists, and a plain ref() wraps assigned class instances in a
// reactive Proxy - breaking the reference-equality (===, indexOf) checks
// this file does against those same lists' raw items. Same rationale as
// hero.ts's shallowRef<ItHero>.
const pick = shallowRef<Item | null>(null)
const state = shallowRef<typeof STATE_WAIT | typeof STATE_TARGET>(STATE_WAIT)
const useItem = shallowRef<Item | null>(null)

// Every computed below re-reads heroStore.hero directly rather than through
// a shared intermediate computed - see StatusBar.vue's comment for why an
// intermediate computed silently stops re-triggering against a shallowRef
// mutated in place.
const wounds = computed(() => heroStore.hero?.getWounds() ?? 0)
const fatigue = computed(() => {
  const h = heroStore.hero
  return h ? h.getFatigue() + h.getOverload() : 0
})
const disease = computed(() => heroStore.hero?.disease() ?? 0)
const overload = computed(() => heroStore.hero?.getOverload() ?? 0)
const packLoad = computed(() => heroStore.hero?.getPack().getCount() ?? 0)
const packMax = computed(() => heroStore.hero?.packMax() ?? 0)

const expPct = computed(() => {
  const h = heroStore.hero
  if (!h || h.getRaise() <= 0) return 0
  return Math.min(100, (h.getExp() / h.getRaise()) * 100)
})

const guildLine = computed(() => {
  const h = heroStore.hero
  if (!h || h.guildRank() < 1) return ''
  let msg = 'Guild = '
  if (h.fightRank() > 0) msg += `F:${h.fight()}/${h.fightRank()}  `
  if (h.magicRank() > 0) msg += `M:${h.magic()}/${h.magicRank()}  `
  if (h.thiefRank() > 0) msg += `T:${h.thief()}/${h.thiefRank()}  `
  if (h.ieatsuRank() > 0) msg += `S:${h.ieatsu()}/${h.ieatsuRank()}  `
  return msg
})

const gearSlots = computed(() => {
  const h = heroStore.hero
  if (!h) return []
  return SLOTS.map((s) => ({ loc: s.loc, item: h.findGearTrait(s.trait) }))
})

function nameItem(it: Item): string {
  const h = heroStore.hero
  if (!h || !GearTable.canMageUse(it.getName(), h.magicRank())) return it.toShow()
  return `${it.toShow()}{${GearTable.effectLabelFor(it)}}`
}

const packRows = computed(() => {
  const h = heroStore.hero
  if (!h) return []
  const out: { item: Item; label: string }[] = []
  for (let ix = 0; ix < h.getPack().getCount(); ix++) {
    const it = h.getPack().select(ix)
    if (it) out.push({ item: it, label: nameItem(it) })
  }
  return out
})

const dumpEmpty = computed(() => heroStore.hero?.getDump().isEmpty() ?? true)

const useLabel = computed(() => {
  const base = state.value === STATE_WAIT ? 'Use' : (useItem.value ? GearTable.effectLabelFor(useItem.value) : 'Use')
  return props.battle ? `${base} (${heroStore.hero?.actCount() ?? 0})` : base
})

// Mid-battle, using an item spends one of the hero's limited actions for
// the round (see resetActions()/chooseActions() in the quest engine) -
// once they're gone, the Use button (but not Info/Dump Slot/Oops/Exit)
// stops doing anything, same as Java's usePick() guard.
const outOfActions = computed(() => props.battle && (heroStore.hero?.actCount() ?? 0) < 1)

function clickPackRow(it: Item) {
  pick.value = it
}
function clickGear(it: ItArms) {
  pick.value = pick.value === it ? null : it
}

function detailItem(what: Item | null) {
  if (what) nav.goto(ArDetail, { item: what }, { showStatus: false })
}

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

function peer() {
  nav.goto(ArPeer, { spend: 2, who: heroStore.hero!.getName() }, { showStatus: false })
}

function setStateWait() {
  if (state.value !== STATE_WAIT) {
    state.value = STATE_WAIT
    useItem.value = null
  }
}
function setStateTarget() {
  if (state.value !== STATE_TARGET) {
    state.value = STATE_TARGET
    useItem.value = pick.value
    pick.value = null
  }
}

function tryScroll(what: ItArms): boolean {
  const h = heroStore.hero!
  if (contest(h.getWits(), what.getPower())) return true
  notice(
    `\tThe mass and material of the ${what.getName()} resists the power of your spell.  This scroll has been inneffective.\n`,
  )
  return false
}

function addArmsTrait(what: ItArms | null, trait: string) {
  if (what && tryScroll(what)) {
    what.fixTrait(trait)
    detailItem(what)
  }
}

function effectIdentify(what: ItArms | null) {
  if (!what || !tryScroll(what)) return
  if (what.hasTrait(ArmsTrait.SECRET)) what.clrTrait(ArmsTrait.SECRET)
  else what.revealCurse()
  detailItem(what)
}

function effectBless(what: ItArms | null) {
  if (!what || !tryScroll(what)) return
  if (what.isCursed()) {
    what.clrTrait(ArmsTrait.CURSED)
    what.clrTrait(ArmsTrait.CURSE)
    notice(`\tThe ${what.getName()} flashes and sparkles first red then blue as a terrible curse is lifted...\n`)
    return
  }
  what.fixTrait(ArmsTrait.BLESS)
  detailItem(what)
}

function effectEnchant(what: ItArms | null) {
  if (!what || !tryScroll(what)) return
  const h = heroStore.hero!
  what.incEnchant()
  const power = what.getPower()
  const dif = what.getEnchant() - power
  if (dif < 0) {
    detailItem(what)
    return
  }
  if (!contest(dif, power)) {
    notice(`\tThe ${what.getName()} pulses with a dangerous purple light.`)
    return
  }
  if (h.getGear().drop(what) == null) h.subPack(what)
  const msg = `\tThere is a hot, steamy explosion as your ${what.getName()} suddenly disintegrates into whirling, melting, whining and floating fragments!  The magical energies penetrate your body causing -${dif} wounds!\n`
  h.addWounds(dif)
  if (h.isDead()) {
    const death = heroStore.resolveDeath(`${msg}\n\tYou have been killed!\n`, false)
    notice(death?.message ?? msg)
  } else {
    notice(msg)
    heroStore.save()
  }
}

function effectFaceless() {
  heroStore.hero!.doFaceless()
  nav.goto(ArPeer, { spend: 2, who: heroStore.hero!.getName() }, { showStatus: false })
  const peerEntry = nav.current
  nav.goto(ArNotice, { message: '\tYou feel your features dissolve into an indistinct and shapeless form.' }, { home: peerEntry, showStatus: false })
}

function effectScribe(what: Item) {
  nav.goto(ArScribe, { spend: what.getName() }, { showStatus: false })
}

function effectGrant(it: Item) {
  const msg = heroStore.hero!.doGrant(it as ItNote)
  notice(msg)
}

function tryEffect(source: Item): boolean {
  const h = heroStore.hero!
  switch (GearTable.getEffect(source)) {
    case GT.EFF_IDENTIFY:
      effectIdentify(pick.value as ItArms | null)
      return true
    case GT.EFF_HEAL:
      h.doHeal()
      return true
    case GT.EFF_CURE:
      h.doCure()
      return true
    case GT.EFF_BLIND:
      h.doBlind()
      return true
    case GT.EFF_PANIC:
      h.doPanic()
      return true
    case GT.EFF_BLAST:
      h.doBlast()
      return true
    case GT.EFF_REVIVE:
      h.doRevive()
      return true
    case GT.EFF_HASTE:
      h.doHaste()
      return true
    case GT.EFF_REFRESH:
      h.doRefresh()
      return true
    case GT.EFF_COOKIE:
      h.doCookie()
      return true
    case GT.EFF_YOUTH:
      h.doYouth()
      return true
    case GT.EFF_AGING:
      h.doAging()
      return true
    case GT.EFF_FACELESS:
      effectFaceless()
      return true
    case GT.EFF_SCRIBE:
      effectScribe(pick.value!)
      return true
    case GT.EFF_GLOW:
      addArmsTrait(pick.value as ItArms | null, ArmsTrait.GLOWS)
      return true
    case GT.EFF_BLESS:
      effectBless(pick.value as ItArms | null)
      return true
    case GT.EFF_LUCK:
      addArmsTrait(pick.value as ItArms | null, ArmsTrait.LUCKY)
      return true
    case GT.EFF_FLAME:
      addArmsTrait(pick.value as ItArms | null, ArmsTrait.FLAME)
      return true
    case GT.EFF_ENCHANT:
      effectEnchant(pick.value as ItArms | null)
      return true
    case GT.EFF_GRANT:
      effectGrant(pick.value!)
      return true
    case GT.EFF_FOOD:
      h.doFood()
      return true
    default:
      return false
  }
}

function performEffect(source: Item) {
  const h = heroStore.hero!
  if (!tryEffect(source)) return
  if (props.battle) h.act()
  const used = useItem.value!
  if (used.getCount() === 1) {
    h.subPack(used)
    pick.value = null
  } else {
    h.subPackCount(used.getName(), 1)
  }
  heroStore.save()
}

function removeGear(what: ItArms | null): boolean {
  if (!what) return true
  if (what.isCursed()) {
    notice(`\tYou can't remove the ${what.getName()}!  The @&$#~ thing is Cursed %#$@!\n`)
    return false
  }
  const h = heroStore.hero!
  h.getGear().drop(what)
  h.putPack(what)
  return true
}

function wearGear() {
  const h = heroStore.hero!
  const what = pick.value as ItArms
  let slots = 0
  for (const s of SLOTS) {
    if (what.hasTrait(s.trait)) {
      if (removeGear(h.getGear().findArms(s.trait))) slots++
      else return
    }
  }
  if (slots >= 1) {
    what.revealCurse()
    h.subPack(what)
    h.getGear().append(what)
    pick.value = what
  }
}

function enactGear() {
  const h = heroStore.hero!
  if (h.getPack().indexOf(pick.value!) >= 0) wearGear()
  else if (h.getGear().indexOf(pick.value!) >= 0) removeGear(pick.value as ItArms)
  if (props.battle) h.act()
  h.calcCombat()
  heroStore.save()
}

function usePick() {
  const h = heroStore.hero
  if (!h || !pick.value || !GearTable.find(pick.value)) return
  if (outOfActions.value) return
  if (state.value === STATE_TARGET) {
    if (pick.value instanceof ItArms) performEffect(useItem.value!)
    setStateWait()
  } else if (pick.value instanceof ItArms) {
    enactGear()
  } else if (GearTable.isScroll(pick.value)) {
    setStateTarget()
  } else if (GearTable.canHeroUse(pick.value)) {
    useItem.value = pick.value
    performEffect(pick.value)
  }
}

function dumpItem() {
  const h = heroStore.hero
  if (!h || !pick.value) return
  const it = pick.value
  const packIx = h.getPack().indexOf(it)
  if (packIx >= 0) {
    h.subPack(it)
    h.getDump().insert(it)
    pick.value = h.getPack().select(packIx)
  } else if (h.getGear().indexOf(it) >= 0 && it instanceof ItArms && !it.hasTrait(ArmsTrait.CURSE) && h.getGear().drop(it)) {
    h.getDump().insert(it)
    pick.value = null
  }
  heroStore.save()
}

function backDump() {
  const h = heroStore.hero
  if (!h) return
  const it = h.getDump().select(0)
  if (it) {
    h.getDump().drop(it)
    h.putPack(it)
  }
  heroStore.save()
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <div v-if="heroStore.hero" class="status">
    <div class="status__header">
      <div class="status__col">
        <p class="status__name">{{ heroStore.hero.getTitle() }}{{ heroStore.hero.getName() }}</p>
        <p>Level: {{ heroStore.hero.getLevel() }}&nbsp;&nbsp;&nbsp;Rank: {{ heroStore.hero.getRankTitle() }}&nbsp;&nbsp;&nbsp;Age: {{ heroStore.hero.getAge() }}</p>
        <p>Guts: {{ heroStore.hero.getGuts() }}<span v-if="wounds > 0">[-{{ wounds }}]</span></p>
        <p>Wits: {{ heroStore.hero.getWits() }}</p>
        <p>Charm: {{ heroStore.hero.getCharm() }}</p>
        <p>Quests: {{ heroStore.hero.getBaseQuests() }}<span v-if="fatigue > 0">[-{{ fatigue }}]</span></p>
      </div>
      <div class="status__col">
        <p>Attack: {{ heroStore.hero.getAttack() }}</p>
        <p>Defend: {{ heroStore.hero.getDefend() }}</p>
        <p>Skill: {{ heroStore.hero.getSkill() }}<span v-if="disease > 0">[-{{ disease }}]sick</span></p>
        <p>Exp:</p>
        <div class="status__expbar"><div class="status__expfill" :style="{ width: expPct + '%' }" /></div>
      </div>
      <img class="status__portrait" src="/Images/Faces/Hero.jpg" alt="" @click="exit" />
    </div>

    <p class="status__guildline">{{ guildLine }}</p>
    <p class="status__load" :class="{ 'status__load--over': overload > 0 }">
      {{ overload > 0 ? 'OVER ' : '' }}Load: {{ packLoad }} ({{ packMax }})
    </p>

    <div class="status__body">
      <ul class="status__pack">
        <li
          v-for="row in packRows"
          :key="row.item.getName()"
          :class="{ selected: pick === row.item }"
          @click="clickPackRow(row.item)"
        >
          {{ row.label }}
        </li>
      </ul>

      <div class="status__gear">
        <p class="status__gear-title">Armament</p>
        <p
          v-for="slot in gearSlots"
          :key="slot.loc"
          :class="{ selected: slot.item && pick === slot.item, empty: !slot.item }"
          @click="slot.item && clickGear(slot.item)"
        >
          {{ slot.loc }}{{ slot.item ? slot.item.toShow() : '' }}
        </p>
      </div>
    </div>

    <div class="status__actions">
      <button type="button" :disabled="!pick || outOfActions" @click="usePick">{{ useLabel }}</button>
      <button type="button" :disabled="!pick" @click="detailItem(pick)">Info</button>
      <button type="button" @click="peer">Peer</button>
      <button type="button" :disabled="!pick" @click="dumpItem">Dump Slot</button>
      <button type="button" :disabled="dumpEmpty" @click="backDump">Oops</button>
      <button type="button" @click="exit">Exit</button>
    </div>
  </div>
</template>

<style scoped>
.status {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #c04000;
  color: white;
  font-family: monospace;
}

.status p {
  margin: 0.3em 0;
}

.status__header {
  display: flex;
  gap: 2em;
}

.status__col {
  flex: 1;
}

.status__name {
  font-weight: bold;
}

.status__expbar {
  width: 100%;
  height: 10px;
  background: white;
  border: 1px solid black;
  box-sizing: border-box;
}

.status__expfill {
  height: 100%;
  background: blue;
}

.status__portrait {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.status__guildline {
  margin-top: 1em;
  min-height: 1.2em;
}

.status__load {
  font-weight: bold;
}

.status__load--over {
  color: cyan;
}

.status__body {
  display: flex;
  gap: 1.5em;
  margin-top: 0.5em;
}

.status__pack {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 12em;
  overflow-y: auto;
  border: 1px solid white;
}

.status__pack li {
  padding: 0.25em 0.5em;
  cursor: pointer;
}

.status__pack li.selected {
  background: cyan;
  color: black;
}

.status__gear {
  flex: 1;
}

.status__gear-title {
  font-weight: bold;
}

.status__gear p {
  cursor: pointer;
  padding: 0.1em 0;
}

.status__gear p.selected {
  background: cyan;
  color: black;
}

.status__gear p.empty {
  cursor: default;
  color: #ffffffaa;
}

.status__actions {
  display: flex;
  gap: 0.5em;
  margin-top: 1em;
  flex-wrap: wrap;
}

.status__actions button {
  font: inherit;
  cursor: pointer;
}

.status__actions button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
