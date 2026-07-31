<script setup lang="ts">
// Port of DCourt/Screens/Quest/arQuest.java - the monster encounter screen:
// portrait + flavor text + a list of interaction options (bribe/feed/
// riddle/trade/help/seduce/attack/flee/control/backstab/berzerk/swindle/
// ieatsu/fish/bushido/capture). The actual outcome logic for each option
// lives in questActions.ts, not here - see its header comment for why
// (arBattle.vue needs to call back into that same logic after this
// component has already unmounted, which a component method can't survive).
//
// Deliberate deviation: init()'s auto-trigger of choice 16 (SPELLS) when
// the hero arrives with a pending "Magic Assault" action queued from
// arStatus's scroll-casting flow isn't ported - that flow only ever fires
// with `battle=true` passed to arStatus, which nothing in this codebase
// does yet (arStatus's own battle-mode integration was explicitly
// deferred when it was built - see its header comment). Revisit together
// if that ever changes.
import { onMounted } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useQuestActions } from './questActions'
import type { QuestSession } from './questSession'

const props = defineProps<{ session: QuestSession }>()

const heroStore = useHeroStore()
const { choose } = useQuestActions(props.session)

onMounted(() => {
  // Screen.init() -> arQuest.init() -> this.opt.fixList() - runs every
  // time this screen becomes active, including every return trip from a
  // battle round that didn't end the encounter.
  props.session.opt.fixList(heroStore.hero!)
})
</script>

<template>
  <div class="quest">
    <h2 class="quest__title">{{ session.title }}</h2>
    <div class="quest__body">
      <img
        v-if="session.mob.getPictureFile()"
        class="quest__portrait"
        :src="`/Images/${session.mob.getPictureFile()}`"
        alt=""
      />
      <div class="quest__stats">
        <p>
          Guts: {{ session.mob.getGuts() - session.mob.getWounds() }}<span v-if="session.mob.getWounds() > 0"
            >/{{ session.mob.getGuts() }}</span
          >
          &nbsp; {{ session.mob.getWeapon() }}
        </p>
        <p>Wits: {{ session.mob.getWits() }} &nbsp; {{ session.mob.getArmour() }}</p>
        <p class="quest__text">{{ session.mob.getText() }}</p>
      </div>
    </div>

    <div class="quest__options">
      <button v-for="opt in session.opt.entries" :key="opt.choice" type="button" @click="choose(opt.choice)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.quest {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #ffff00;
  color: black;
}

.quest__title {
  text-align: center;
}

.quest__body {
  display: flex;
  gap: 1.5em;
  align-items: flex-start;
}

.quest__portrait {
  width: 180px;
  height: auto;
  border-radius: 6px;
}

.quest__stats {
  flex: 1;
}

.quest__text {
  white-space: pre-line;
}

.quest__options {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  max-width: 20em;
  margin-top: 1em;
}

.quest__options button {
  font: inherit;
  cursor: pointer;
  text-align: left;
}
</style>
