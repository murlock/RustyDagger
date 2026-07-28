<script setup lang="ts">
// Port of DCourt/Screens/Template/Indoors.java. A Vue component rather than
// a base class to subclass (Vue has no screen inheritance) - concrete
// indoor screens (arTrader today; Smith/Trade/etc in Phase 5) wrap their
// content in this shell via the default slot and forward `exit`.
defineProps<{
  name: string
  face: string
  greeting: string
}>()

const emit = defineEmits<{
  exit: []
}>()
</script>

<template>
  <div class="indoors">
    <div class="indoors__bar">
      <h2 class="indoors__title">{{ name }}</h2>
      <button class="indoors__exit" type="button" @click="emit('exit')">Exit</button>
    </div>
    <div class="indoors__body">
      <figure class="indoors__portrait">
        <img :src="face" :alt="name" />
        <figcaption>{{ greeting }}</figcaption>
      </figure>
      <div class="indoors__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.indoors {
  background: #eafff0;
  color: #0a5c1e;
  min-height: 100vh;
  box-sizing: border-box;
}

.indoors__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75em 1em;
  border-bottom: 1px solid #0a5c1e33;
}

.indoors__title {
  margin: 0;
  font-size: 1.1em;
}

.indoors__exit {
  font: inherit;
  cursor: pointer;
  border: 1px solid #0a5c1e;
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 0.3em 0.8em;
}

.indoors__body {
  display: flex;
  gap: 1.5em;
  padding: 1em;
  flex-wrap: wrap;
}

.indoors__portrait {
  margin: 0;
  width: 180px;
  flex: 0 0 auto;
  text-align: center;
}

.indoors__portrait img {
  width: 100%;
  border-radius: 6px;
  display: block;
}

.indoors__portrait figcaption {
  margin-top: 0.5em;
  font-style: italic;
}

.indoors__content {
  flex: 1 1 260px;
}
</style>
