<script setup lang="ts">
// Port of DCourt/Screens/Command/arEntry.java's EnterGame() flow. Dropped
// vs. the Java version, matching CONVERSION_PLAN.md's Phase 4 scope:
// - the password field (no server auth with localStorage; testNames() already
//   only checked name length, matched below by canEnter)
// - the Lists/Credits buttons (ranking was multiplayer, credits is flavor)
// - heroAwakens()'s day-tick flavor text (disease/injure/exhaustion/decay/
//   stipend messages via arNotice) and the PlaceTable-driven arrival screen -
//   arNotice and the area screens it can route to aren't ported yet (Phase 5)
import { computed, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import { heroHasDied } from '../../domain/gameStrings'
import ArCreate from './arCreate.vue'
import ArBuild from './arBuild.vue'
import ArTown from '../Areas/arTown.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()

const name = ref('')
const notice = ref<string | null>(null)

const canEnter = computed(() => name.value.trim().length >= 4)

function enter() {
  if (!canEnter.value) return
  const heroName = name.value.trim()
  notice.value = null

  if (!heroStore.load(heroName)) {
    nav.goto(ArCreate, { name: heroName }, { showStatus: false })
    return
  }
  if (heroStore.isDead()) {
    notice.value = heroHasDied
    return
  }
  // Only Town exists so far, so every successful load lands there - see
  // arCreate.vue's matching deviation note.
  heroStore.hero!.setPlace(C.TOWN)
  heroStore.save()
  // Player.needsBuild(): a hero past level 5 with no recorded looks gets
  // interposed with arBuild before landing in Town - mirrors
  // arEntry.java's `player.needsBuild() ? new arBuild(next2) : next2`,
  // where next2 (here, Town) becomes arBuild's home without ever rendering.
  if (heroStore.needsBuild()) {
    nav.goto(ArTown)
    const townEntry = nav.current
    nav.goto(ArBuild, {}, { home: townEntry, showStatus: false })
    return
  }
  nav.goto(ArTown)
}
</script>

<template>
  <div class="entry">
    <h1 class="entry__title">Dragon Court</h1>
    <p class="entry__subtitle">Home of the Dragon Guard</p>

    <p v-if="notice" class="entry__notice">{{ notice }}</p>

    <div class="entry__form">
      <label for="hero-name">Hero Name</label>
      <input
        id="hero-name"
        v-model="name"
        type="text"
        maxlength="15"
        @keyup.enter="enter"
      />
      <button type="button" :disabled="!canEnter" @click="enter">Enter</button>
    </div>
  </div>
</template>

<style scoped>
.entry {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 2em 1em;
  background: #006400;
  color: white;
  text-align: center;
}

.entry__title {
  color: #ff4000;
  margin-bottom: 0;
}

.entry__subtitle {
  color: #32c8c8;
  margin-top: 0.25em;
}

.entry__notice {
  white-space: pre-line;
  max-width: 24em;
  margin: 1.5em auto;
  background: #ffffff22;
  border-radius: 6px;
  padding: 1em;
}

.entry__form {
  display: inline-flex;
  flex-direction: column;
  gap: 0.75em;
  margin-top: 2em;
  align-items: center;
}

.entry__form input {
  font: inherit;
  padding: 0.4em 0.6em;
  border-radius: 4px;
  border: none;
}

.entry__form button {
  font: inherit;
  cursor: pointer;
  padding: 0.4em 1.2em;
}

.entry__form button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
