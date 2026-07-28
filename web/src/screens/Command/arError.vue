<script setup lang="ts">
// Port of DCourt/Screens/Command/arError.java. Java's version dismissed on
// any click anywhere on the screen (action() ignored clicks that didn't
// target the screen itself); modernized to an explicit Continue button.
import { useNavigationStore } from '../../stores/navigation'

defineProps<{ message: string }>()

const nav = useNavigationStore()

function dismiss() {
  nav.goHome()
}
</script>

<template>
  <div class="error">
    <h2>ERROR - Dragon Court Error has occurred</h2>
    <p class="error__message">{{ message }}</p>
    <button type="button" @click="dismiss">Continue</button>
  </div>
</template>

<style scoped>
.error {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: red;
  color: white;
  text-align: center;
}

.error__message {
  white-space: pre-line;
  margin: 1.5em auto;
  max-width: 30em;
}
</style>
