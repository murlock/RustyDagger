<script setup lang="ts">
import StatusBar from './components/StatusBar.vue'
import { useNavigationStore } from './stores/navigation'

const nav = useNavigationStore()

// arStatus (the Hero Status Screen StatusBar opens) isn't ported yet
// (Phase 5) - nothing to navigate to until then.
function openStatus() {}
</script>

<template>
  <div id="game-root">
    <component :is="nav.currentComponent" v-if="nav.currentComponent" v-bind="nav.currentProps" />
    <p v-else>Dragon Court — scaffold ready.</p>
    <StatusBar v-if="nav.showStatusBar" @open="openStatus" />
  </div>
</template>
