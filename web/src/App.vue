<script setup lang="ts">
import { onMounted } from 'vue'
import StatusBar from './components/StatusBar.vue'
import { useNavigationStore } from './stores/navigation'
import ArEntry from './screens/Command/arEntry.vue'

const nav = useNavigationStore()

// arLoading.java's staged "Loading . . ." animation was cosmetic AWT
// flavor (see CONVERSION_PLAN.md's "modernize, don't recreate pixel-perfect"
// decision) - jump straight to arEntry rather than porting it.
onMounted(() => {
  if (!nav.currentComponent) nav.goto(ArEntry, {}, { home: null, showStatus: false })
})

// arStatus (the Hero Status Screen StatusBar opens) isn't ported yet
// (Phase 5) - nothing to navigate to until then.
function openStatus() {}
</script>

<template>
  <div id="game-root">
    <component :is="nav.currentComponent" v-if="nav.currentComponent" v-bind="nav.currentProps" />
    <StatusBar v-if="nav.showStatusBar" @open="openStatus" />
  </div>
</template>
