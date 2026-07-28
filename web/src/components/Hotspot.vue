<script setup lang="ts">
import { computed } from 'vue'

/**
 * Generic clickable image region, replacing DCourt/Components/Portrait.java.
 * `caption` mirrors Portrait's SUBTEXT (a label below the image) and
 * `overlay` mirrors SUPERTEXT (white text superimposed on the image, as
 * StatusPic-style screens used it); omit `text` entirely for NOTEXT.
 */
const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    text?: string
    type?: 'caption' | 'overlay'
    x?: number
    y?: number
    width?: number
    height?: number
    disabled?: boolean
  }>(),
  {
    alt: '',
    text: undefined,
    type: 'caption',
    x: undefined,
    y: undefined,
    width: undefined,
    height: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const positionStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.x !== undefined) style.left = `${props.x}px`
  if (props.y !== undefined) style.top = `${props.y}px`
  if (props.x !== undefined || props.y !== undefined) style.position = 'absolute'
  return style
})

// Applied to the <img> itself, not the wrapper: the wrapper's own height is
// auto (shrink-to-fit) whenever x/y/width/height are omitted, and CSS
// `height: 100%` on the icon against an auto-height parent is a circular
// dependency that resolves to 0 - the icon silently disappears. Explicit
// pixel dimensions here sidestep that entirely; the CSS default below
// (width 100%, height auto) handles the no-dimensions case instead.
const iconStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.width !== undefined) style.width = `${props.width}px`
  if (props.height !== undefined) style.height = `${props.height}px`
  return style
})

function onClick() {
  if (props.disabled) return
  emit('click')
}
</script>

<template>
  <div
    class="hotspot"
    :class="{ 'hotspot--disabled': disabled }"
    :style="positionStyle"
    @click="onClick"
  >
    <img class="hotspot__icon" :src="src" :alt="alt || text || ''" :style="iconStyle" />
    <span v-if="text && type === 'overlay'" class="hotspot__caption hotspot__caption--overlay">{{
      text
    }}</span>
    <span v-if="text && type === 'caption'" class="hotspot__caption hotspot__caption--below">{{
      text
    }}</span>
  </div>
</template>

<style scoped>
.hotspot {
  display: inline-block;
  position: relative;
  cursor: pointer;
  line-height: 0;
}

.hotspot--disabled {
  cursor: default;
  opacity: 0.5;
  pointer-events: none;
}

.hotspot__icon {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid currentColor;
  object-fit: cover;
}

.hotspot__caption {
  line-height: 1.2;
}

.hotspot__caption--below {
  display: block;
  margin-top: 0.25em;
  text-align: center;
  white-space: normal;
}

.hotspot__caption--overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  padding: 0.25em;
  white-space: normal;
}
</style>
