<script setup lang="ts">
import { useNavigationStore } from './stores/navigation'

const nav = useNavigationStore()
</script>

<template>
  <div id="game-root">
    <component :is="nav.currentComponent" v-if="nav.currentComponent" />
    <p v-else>Dragon Court — scaffold ready.</p>
  </div>
</template>
