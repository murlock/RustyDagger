<script setup lang="ts">
import { computed } from 'vue'
import { useHeroStore } from '../stores/hero'

// Replaces DCourt/Tools/StatusPic.java. StatusPic.paint() also swaps its
// third line for a Mound/Hills-specific hint (Cats Eyes/glowing item/Torch
// count, or Hill Folk/Rope count) based on `Tools.getRegion()`; those areas
// haven't been ported yet (Phase 5), so for now this always renders the
// default "weapon & armour" line. Revisit once arMound/arHills exist.
//
// StatusPic's click opens arStatus (the Hero Status Screen), which is also
// unported (Phase 5) - clicking here just emits, and it's up to the caller
// to route it once that screen exists.
const heroStore = useHeroStore()

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
  return `${base}${h.getWeapon()} & ${h.getArmour()}`
})

function onClick() {
  if (!heroStore.hero) return
  emit('open')
}
</script>

<template>
  <div v-if="heroStore.hero" class="status-bar" @click="onClick">
    <div class="status-bar__line">{{ firstLine }}</div>
    <div class="status-bar__line">{{ secondLine }}</div>
  </div>
</template>

<style scoped>
.status-bar {
  background: black;
  color: white;
  font-family: monospace;
  padding: 0.25em 0.5em;
  cursor: pointer;
}

.status-bar__line {
  white-space: pre;
}
</style>
