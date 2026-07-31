<script setup lang="ts">
import { computed } from 'vue'
import { useHeroStore } from '../stores/hero'
import { useNavigationStore } from '../stores/navigation'
import * as C from '../domain/constants'
import * as AT from '../domain/armsTrait'
import ArMound from '../screens/Wilds/arMound.vue'
import ArHills from '../screens/Wilds/arHills.vue'

// Replaces DCourt/Tools/StatusPic.java. StatusPic.paint() also swaps its
// third line for a region-specific hint instead of the default "weapon &
// armour" line, based on `Tools.getRegion()` (here: `nav.currentComponent`)
// - Cats Eyes/a glowing gear item/Torch count while in the Mound (matches
// useWildsScreen's own findLight() priority order: Cats Eyes trait, then a
// GLOWS-trait gear item, then Torches - only the last of those is a raw
// count here since Java only ever shows a *count* for the fallback case),
// or Hill Folk/Rope count while in the Hills.
//
// StatusPic's click opens arStatus (the Hero Status Screen) - clicking here
// just emits `open`, and App.vue routes it to arStatus.vue.
const heroStore = useHeroStore()
const nav = useNavigationStore()

const emit = defineEmits<{
  open: []
}>()

// Deliberately not `const hero = computed(() => heroStore.hero)` with
// firstLine/secondLine reading `hero.value` - heroStore.hero is a
// shallowRef whose ItHero is mutated in place rather than replaced, so an
// intermediate computed like that always recomputes to the *same* object
// reference and Vue's computed short-circuit optimization then never
// re-triggers anything downstream, no matter how many times the store's
// save() calls triggerRef(). Reading heroStore.hero directly inside each
// computed instead makes that computed a direct dependent of the ref, which
// triggerRef does correctly invalidate.
const firstLine = computed(() => {
  const h = heroStore.hero
  if (!h) return ''
  const wounds = h.getWounds()
  const guts = wounds > 0 ? `${h.getGuts() - wounds}/${h.getGuts()}` : `${h.getGuts()}`
  return `${h.getTitle()}${h.getName()}  Guts:${guts} Wits:${h.getWits()} Charm:${h.getCharm()}  Cash: $${h.getMoney()}`
})

const secondLine = computed(() => {
  const h = heroStore.hero
  if (!h) return ''
  const base = `   Quests:${h.getQuests()}  Level:${h.getLevel()}  Exp:${h.getExp()}  `
  if (nav.currentComponent === ArMound) {
    if (h.hasTrait(C.CATSEYES)) return `${base}Cats Eyes`
    const glowing = h.findGearTrait(AT.GLOWS)
    if (glowing) return `${base}glowing ${glowing.getName()}`
    return `${base}Torch (${h.packCount('Torch')})`
  }
  if (nav.currentComponent === ArHills) {
    if (h.hasTrait(C.HILLFOLK)) return `${base}Hill Folk`
    return `${base}Rope (${h.packCount('Rope')})`
  }
  return `${base}${h.getWeapon()} & ${h.getArmour()}`
})

function onClick() {
  if (!heroStore.hero) return
  emit('open')
}

// Testing aid, not a port of anything in the Java original: the real game
// only refills Fatigue/Quests on a real day rollover, which is awkward to
// wait out while playtesting. itHero.advanceDay(today, isPlaytest) already
// has an `isPlaytest` escape hatch that skips the date check - this just
// wires a button to it so it's reachable without needing Vue DevTools
// (which isn't always available, e.g. under a production build).
function resetQuests() {
  heroStore.advanceDay(true)
}
</script>

<template>
  <div v-if="heroStore.hero" class="status-bar">
    <div class="status-bar__info" @click="onClick">
      <div class="status-bar__line">{{ firstLine }}</div>
      <div class="status-bar__line">{{ secondLine }}</div>
    </div>
    <button
      type="button"
      class="status-bar__reset"
      title="Testing aid: refills Fatigue/Quests without waiting for a new day"
      @click.stop="resetQuests"
    >
      ↻ Quests
    </button>
  </div>
</template>

<style scoped>
.status-bar {
  /* Was static (in normal document flow, after the screen content), so on
     any screen taller than one viewport it sat below the fold and needed
     scrolling to see at all. Fixed to the viewport bottom instead - see
     App.vue's matching `padding-bottom` reservation so this never overlaps
     the last bit of screen content. */
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  box-sizing: border-box;
  background: black;
  color: white;
  font-family: monospace;
  padding: 0.25em 0.5em;
  display: flex;
  align-items: center;
  gap: 0.75em;
}

.status-bar__info {
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}

.status-bar__line {
  white-space: pre;
}

.status-bar__reset {
  flex: 0 0 auto;
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
  background: #222;
  color: white;
  border: 1px solid #666;
  border-radius: 4px;
  padding: 0.2em 0.5em;
}

.status-bar__reset:hover {
  background: #333;
}
</style>
