<script setup lang="ts">
// Port of DCourt/Screens/Command/arBuild.java ("Hero Description"). Reached
// from arEntry when heroStore.needsBuild() fires (past level 5, no looks
// recorded yet) - see arEntry.vue's enter(). Both buttons return to the
// screen arEntry was already navigating to; "Fix These Settings Permanently"
// additionally commits the chosen looks first, "I'll get to this later"
// leaves looks empty so needsBuild() prompts again on the next login.
//
// Deliberate deviation: Java's Tools.detokenize() escaped '{', '|', '}' in
// these free-text fields because the legacy save format used those as field
// delimiters (`{type|field}`). Phase 2 replaced that format with JSON, so
// there's no delimiter scheme left to protect against - dropped rather than
// ported as dead sanitization.
import { onMounted, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import * as GS from '../../domain/gameStrings'
import { roll, select } from '../../engine/dice'

const nav = useNavigationStore()
const heroStore = useHeroStore()

// Index into C.SEXS (Male/Female/Both/None); titleChoice is restricted to
// just the first two (Male/Female), matching arBuild.java's 2-checkbox
// Title group vs. the other three groups' 4 checkboxes.
const genderChoice = ref(0)
const dressChoice = ref(0)
const behaveChoice = ref(0)
const titleChoice = ref(0)

const race = ref('')
const build = ref('')
const sign = ref('')
const skin = ref('')
const eyes = ref('')
const hair = ref('')
const habit = ref('')
const marks = ref('')
const phrase = ref('')

function randomize() {
  race.value = select(GS.races)
  build.value = select(GS.builds)
  sign.value = select(GS.signs)
  skin.value = select(GS.colors)
  eyes.value = select(GS.colors)
  hair.value = select(GS.colors)
  habit.value = select(GS.habits)
  marks.value = select(GS.features)
  phrase.value = select(GS.phrases)
  titleChoice.value = roll(2)
  genderChoice.value = titleChoice.value
  dressChoice.value = titleChoice.value
  behaveChoice.value = titleChoice.value
}

onMounted(randomize)

function fixLooks() {
  const hero = heroStore.hero
  if (!hero) return
  const looks = hero.getLooks()
  looks.appendValue(C.GENDER, C.SEXS[genderChoice.value])
  looks.appendValue(C.DRESS, C.SEXS[dressChoice.value])
  looks.appendValue(C.BEHAVE, C.SEXS[behaveChoice.value])
  looks.appendValue(C.TITLE, C.SEXS[titleChoice.value])
  looks.appendValue(C.RACE, race.value)
  looks.appendValue(C.BUILD, build.value)
  looks.appendValue(C.SIGN, sign.value)
  looks.appendValue(C.SKIN, skin.value)
  looks.appendValue(C.EYES, eyes.value)
  looks.appendValue(C.HAIR, hair.value)
  looks.appendValue(C.HABIT, habit.value)
  looks.appendValue(C.MARKS, marks.value)
  looks.appendValue(C.PHRASE, phrase.value)
  heroStore.save()
  nav.goHome()
}

function skip() {
  nav.goHome()
}
</script>

<template>
  <div class="build">
    <div class="build__header">
      <h2 v-if="heroStore.hero">
        Description of {{ C.rankName[titleChoice][heroStore.hero.getSocial()] }}
        {{ heroStore.hero.getName() }}
      </h2>
      <button type="button" @click="randomize">Random</button>
    </div>

    <div class="build__groups">
      <fieldset>
        <legend>{{ C.GENDER }}</legend>
        <label v-for="(s, i) in C.SEXS" :key="s">
          <input v-model.number="genderChoice" type="radio" :value="i" />{{ s }}
        </label>
      </fieldset>
      <fieldset>
        <legend>{{ C.DRESS }}</legend>
        <label v-for="(s, i) in C.SEXS" :key="s">
          <input v-model.number="dressChoice" type="radio" :value="i" />{{ s }}
        </label>
      </fieldset>
      <fieldset>
        <legend>Behavior</legend>
        <label v-for="(s, i) in C.SEXS" :key="s">
          <input v-model.number="behaveChoice" type="radio" :value="i" />{{ s }}
        </label>
      </fieldset>
      <fieldset>
        <legend>{{ C.TITLE }}</legend>
        <label v-for="(s, i) in C.SEXS.slice(0, 2)" :key="s">
          <input v-model.number="titleChoice" type="radio" :value="i" />{{ s }}
        </label>
      </fieldset>
    </div>

    <div class="build__fields">
      <label>{{ C.RACE }} <input v-model="race" maxlength="15" /></label>
      <label>{{ C.BUILD }} <input v-model="build" maxlength="15" /></label>
      <label>{{ C.SIGN }} <input v-model="sign" maxlength="15" /></label>
      <label>{{ C.SKIN }} <input v-model="skin" maxlength="15" /></label>
      <label>{{ C.EYES }} <input v-model="eyes" maxlength="15" /></label>
      <label>{{ C.HAIR }} <input v-model="hair" maxlength="15" /></label>
      <label class="build__wide">Nervous Habit <input v-model="habit" maxlength="40" /></label>
      <label class="build__wide">Distinguishing Marks <input v-model="marks" maxlength="60" /></label>
      <label class="build__wide">Clever Catch-phrase <input v-model="phrase" maxlength="60" /></label>
    </div>

    <div class="build__actions">
      <button type="button" @click="fixLooks">Fix These Settings Permanently</button>
      <button type="button" @click="skip">I'll get to this later</button>
    </div>
  </div>
</template>

<style scoped>
.build {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #0000cc;
  color: white;
}

.build__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.build__groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1em;
  margin: 1em 0;
}

.build__groups fieldset {
  border: 1px solid #ffffff55;
  border-radius: 6px;
}

.build__groups label {
  display: block;
}

.build__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75em;
  margin: 1em 0;
}

.build__fields label {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.build__wide {
  grid-column: 1 / -1;
}

.build__fields input,
.build__groups input {
  font: inherit;
}

.build__actions {
  display: flex;
  gap: 1em;
  justify-content: center;
  margin-top: 1.5em;
}
</style>
