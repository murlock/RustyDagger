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

const hero = computed(() => heroStore.hero)

const emit = defineEmits<{
  open: []
}>()

const firstLine = computed(() => {
  const h = hero.value
  if (!h) return ''
  const wounds = h.getWounds()
  const guts = wounds > 0 ? `${h.getGuts() - wounds}/${h.getGuts()}` : `${h.getGuts()}`
  return `${h.getTitle()}${h.getName()}  Guts:${guts} Wits:${h.getWits()} Charm:${h.getCharm()}  Cash: $${h.getMoney()}`
})

const secondLine = computed(() => {
  const h = hero.value
  if (!h) return ''
  const base = `   Quests:${h.getQuests()}  Level:${h.getLevel()}  Exp:${h.getExp()}  `
  return `${base}${h.getWeapon()} & ${h.getArmour()}`
})

function onClick() {
  if (!hero.value) return
  emit('open')
}
</script>

<template>
  <div v-if="hero" class="status-bar" @click="onClick">
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
