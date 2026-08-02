<script setup lang="ts">
// Port of DCourt/Screens/Utility/arScribe.java ("Compose A Note") - reached
// from arStatus.vue's Use action on stationery (Pen & Paper/Gobble Inn
// Postcard, GearTypes.EFF_SCRIBE). No CGI dependency at all - unlike its
// Utility siblings (#14-16), this only ever touches the hero's own pack, so
// nothing blocked it from being ported; it was simply still unbuilt.
//
// Deliberate fix: Java's addNoteToPack() calls `Screen.subPack(this.spend, 1)`
// on Done - but the stationery was *already* consumed once by arStatus's
// generic performEffect() auto-consume when "Use" was first clicked (every
// EFF_* case in tryEffect() gets its source item subtracted there, and
// EFF_SCRIBE is no exception). Clicking Done would therefore spend a second
// unit of stationery for one note - a genuine decompiler-era double-consume
// bug, same family as the arGuild join-gate/arqMingle bugs already found and
// fixed elsewhere in this codebase (see CONVERSION_PLAN.md). Fixed by not
// re-subtracting here; performEffect's single subtraction is the only cost.
import { ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { ItNote } from '../../domain/itNote'
import { today } from '../../engine/today'

const props = defineProps<{ spend: string }>()

const heroStore = useHeroStore()
const nav = useNavigationStore()

const text = ref('')

function cancel() {
  nav.goHome()
}

function done() {
  const hero = heroStore.hero!
  const label = props.spend === 'Pen & Paper' ? 'Letter' : 'Postcard'
  hero.addPack(ItNote.create(label, hero.getName(), today(), text.value))
  heroStore.save()
  nav.goHome()
}
</script>

<template>
  <div class="scribe">
    <div class="scribe__bar">
      <h2>Compose A Note</h2>
      <div class="scribe__actions">
        <button type="button" @click="cancel">Cancel</button>
        <button type="button" @click="done">Done</button>
      </div>
    </div>
    <textarea v-model="text" class="scribe__text" maxlength="2000"></textarea>
  </div>
</template>

<style scoped>
.scribe {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #800000;
  color: black;
}

.scribe__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scribe__actions {
  display: flex;
  gap: 0.5em;
}

.scribe__actions button {
  font: inherit;
  cursor: pointer;
}

.scribe__text {
  width: 100%;
  height: 60vh;
  box-sizing: border-box;
  margin-top: 1em;
  font: inherit;
  padding: 0.5em;
}
</style>
