<script setup lang="ts">
// Synthetic placeholder screen - not a port of anything in DCourt. Stands
// in for destinations this conversion hasn't built (or, per
// CONVERSION_PLAN.md, has deliberately deferred - e.g. anything requiring
// the removed multiplayer server: arClanHall, arPostal, arPeer, arQueen's
// Invest). Gives real in-game feedback instead of a silently disabled
// hotspot/button - a disabled control gives no feedback at all on a touch
// device (no hover for a title tooltip) and isn't discoverable without
// reading source. No "ar" prefix, unlike every other screen component in
// this codebase - that prefix signals "this mirrors a DCourt.Screens class
// 1:1," which this deliberately doesn't.
import { useNavigationStore } from '../../stores/navigation'

defineProps<{
  feature: string
  reason?: string
}>()

const nav = useNavigationStore()

function dismiss() {
  nav.goHome()
}
</script>

<template>
  <div class="not-implemented">
    <p class="not-implemented__message">
      <strong>{{ feature }}</strong> is not implemented yet.
      <template v-if="reason"><br />{{ reason }}</template>
    </p>
    <button type="button" @click="dismiss">Continue</button>
  </div>
</template>

<style scoped>
.not-implemented {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #222;
  color: #ccc;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.not-implemented__message {
  white-space: pre-line;
  margin: 1.5em auto;
  max-width: 30em;
}

.not-implemented button {
  font: inherit;
  cursor: pointer;
  background: #444;
  color: #ccc;
  border: 1px solid #666;
  border-radius: 4px;
  padding: 0.4em 1em;
}
</style>
