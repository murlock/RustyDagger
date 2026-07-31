<script setup lang="ts">
// Port of DCourt/Screens/Utility/arNotice.java: a plain full-screen text
// panel that dismisses back to `home`. Java's down(x,y) dismissed on any
// click anywhere on the screen; modernized to an explicit Continue button,
// matching arError.vue's precedent. hideStatusBar() -> callers pass
// { showStatus: false } to nav.goto, same as arBuild.
import { useNavigationStore } from '../../stores/navigation'

defineProps<{ message: string }>()

const nav = useNavigationStore()

function dismiss() {
  nav.goHome()
}
</script>

<template>
  <div class="notice">
    <p class="notice__message">{{ message }}</p>
    <button type="button" @click="dismiss">Continue</button>
  </div>
</template>

<style scoped>
.notice {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: black;
  color: white;
  text-align: center;
}

.notice__message {
  white-space: pre-line;
  margin: 1.5em auto;
  max-width: 30em;
  text-align: left;
}

.notice button {
  font: inherit;
  cursor: pointer;
}
</style>
