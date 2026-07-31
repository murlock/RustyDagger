<script setup lang="ts">
import { onMounted } from 'vue'
import StatusBar from './components/StatusBar.vue'
import { useNavigationStore } from './stores/navigation'
import ArEntry from './screens/Command/arEntry.vue'
import ArStatus from './screens/Utility/arStatus.vue'
import ArQuest from './screens/Quest/arQuest.vue'

const nav = useNavigationStore()

// arLoading.java's staged "Loading . . ." animation was cosmetic AWT
// flavor (see CONVERSION_PLAN.md's "modernize, don't recreate pixel-perfect"
// decision) - jump straight to arEntry rather than porting it.
onMounted(() => {
  if (!nav.currentComponent) nav.goto(ArEntry, {}, { home: null, showStatus: false })
})

// Closes the Phase 3 gap: arStatus (the Hero Status Screen) is now ported.
// Screen.action()'s default statusPic handler is `new arStatus(this)`
// (battle=false) - this is that default, played out centrally here since
// every screen but one just wants it. arQuest.java is the one override
// (`new arStatus(this, true)`, always battle mode from inside an
// encounter) - arBattle.java doesn't need its own case since it already
// hides the status bar entirely (see StatusBar.vue's comment), so there's
// nothing to click there.
function openStatus() {
  const battle = nav.currentComponent === ArQuest
  nav.goto(ArStatus, { battle }, { showStatus: false })
}
</script>

<template>
  <div id="game-root" :class="{ 'game-root--status-visible': nav.showStatusBar }">
    <component :is="nav.currentComponent" v-if="nav.currentComponent" v-bind="nav.currentProps" />
    <StatusBar v-if="nav.showStatusBar" @open="openStatus" />
  </div>
</template>

<style scoped>
/* StatusBar.vue is `position: fixed` to the viewport bottom (always
   visible, no scrolling needed) - this reserves matching space so it
   never overlaps the last bit of whatever screen is showing. */
.game-root--status-visible {
  padding-bottom: 3em;
}
</style>
