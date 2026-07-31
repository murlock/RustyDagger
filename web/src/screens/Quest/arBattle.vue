<script setup lang="ts">
// Port of DCourt/Screens/Quest/arBattle.java - shows one already-computed
// round of combat narrative (see battleRound.ts/questActions.ts's
// gotoBattleRound() for why the round itself is computed by the caller,
// not here) and, on Continue, hands off to battleActionResult() to decide
// what happens next (another round, a win/loss, a control/swindle
// resolution, ...).
import { useHeroStore } from '../../stores/hero'
import { useQuestActions } from './questActions'
import type { QuestSession } from './questSession'

const props = defineProps<{ session: QuestSession; text: string }>()

const heroStore = useHeroStore()
const { battleActionResult } = useQuestActions(props.session)

function onContinue() {
  heroStore.hero!.clearDump()
  battleActionResult()
}
</script>

<template>
  <div class="battle">
    <div class="battle__portraits">
      <img class="battle__portrait" :src="`/Images/${session.mob.getPictureFile() ?? ''}`" alt="" />
      <img class="battle__portrait" src="/Images/Faces/Hero.jpg" alt="" />
    </div>
    <p class="battle__text">{{ text }}</p>
    <button type="button" @click="onContinue">Continue</button>
  </div>
</template>

<style scoped>
.battle {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #c00000;
  color: white;
}

.battle__portraits {
  display: flex;
  gap: 1.5em;
  justify-content: center;
}

.battle__portrait {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 6px;
}

.battle__text {
  white-space: pre-line;
  max-width: 40em;
  margin: 1.5em auto;
}

.battle button {
  display: block;
  margin: 0 auto;
  font: inherit;
  cursor: pointer;
}
</style>
