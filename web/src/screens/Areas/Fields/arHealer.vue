<script setup lang="ts">
// Port of DCourt/Screens/Areas/Fields/arHealer.java. Reached from arField's
// Healers Tower hotspot. Doesn't extend Indoors in Java (plain Screen with
// its own portrait+greeting layout) but the shape is identical, so this
// reuses Indoors.vue anyway (a visual-composition choice, not hierarchy
// fidelity - unlike Trade.vue, where Java's Shop really does extend
// Indoors).
//
// Deviation: the greeting's "Be brave like <X>" fallback used
// `Tools.getPlayer().getBest()` (a server-reported field) - dropped with
// the rest of the multiplayer session state (see itHero.ts's header
// comment), same substitution as arTavern.vue's greeting.
import { computed } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { select } from '../../../engine/dice'
import * as AT from '../../../domain/armsTrait'
import * as C from '../../../domain/constants'
import Indoors from '../../Template/Indoors.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()

const TITLE = "Elden Bishop's Temple of Brotherly Sharing"

const GREETINGS = [
  null,
  'How may I aid thee?',
  'Please let me help',
  'Care for a massage?',
  'Let me heal thy aches',
  'Thou art distressed',
  'Thou art disturbed',
  'Share with the poor',
  'Can you spare some marks?',
  'Tithe for thy soul',
  'Alms for the poor?',
]

const greeting = select(GREETINGS) ?? `Be brave like ${heroStore.hero?.getName() ?? ''}`

const labels = ['Minor Healing', 'Half Healing', 'Full Healing', 'Tithe', 'Cure Disease']

const costs = computed(() => {
  const h = heroStore.hero
  if (!h) return [0, 0, 0, 0, 0]
  const wounds = h.getWounds()
  const mercy = h.getLevel() === 1
  const level = Math.max(1, h.getLevel() - h.getSocial() - 1)
  const cash = h.getMoney()
  const disease = h.disease()
  return [
    mercy ? 0 : Math.floor(wounds / 4) * level,
    mercy ? 0 : Math.floor(wounds / 2) * level,
    wounds < 1 ? 0 : mercy ? 1 : wounds * level,
    Math.floor((cash + 9) / 10),
    disease > 0 || h.hasTrait(AT.BLIND) || h.hasTrait(AT.PANIC) ? (mercy ? 1 : 10 * level) : 0,
  ]
})

function canAfford(ix: number): boolean {
  const h = heroStore.hero
  if (!h) return false
  const cost = costs.value[ix]
  return cost !== 0 && h.getMoney() >= cost
}

function choose(ix: number) {
  const h = heroStore.hero
  if (!h || !canAfford(ix)) return
  const wounds = h.getWounds()
  const level = Math.max(1, h.getLevel() - h.getSocial() - 1)
  const cost = costs.value[ix]
  h.subMoney(cost)
  switch (ix) {
    case 0:
      h.subWounds(Math.floor(wounds / 4))
      break
    case 1:
      h.subWounds(Math.floor(wounds / 2))
      break
    case 2:
      h.subWounds(wounds)
      break
    case 3:
      if (level + 14 <= h.getAge()) {
        h.learn(Math.floor(cost / (level * level)))
        const raise = h.getRaise()
        if (h.getExp() > raise) h.getStatus().fixCount(C.EXP, raise)
      }
      break
    case 4:
      h.doCure()
      break
  }
  heroStore.save()
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors :name="TITLE" face="/Images/Faces/Elden.jpg" :greeting="greeting" @exit="exit">
    <div class="healer__options">
      <button
        v-for="(label, ix) in labels"
        :key="label"
        type="button"
        :disabled="!canAfford(ix)"
        @click="choose(ix)"
      >
        {{ label }} ${{ costs[ix] }}
      </button>
    </div>
  </Indoors>
</template>

<style scoped>
.healer__options {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-width: 16em;
}

.healer__options button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.healer__options button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
