<script setup lang="ts">
// Port of DCourt/Screens/Areas/arTown.java. Every hotspot is now live:
// Trade Shop (Phase 4), Tavern (#25), Leave Town (#10/arField), Castle Gate
// (#18/arCastle), Weapons (#23/arWeapon), and Armour (#24/arArmour) - the
// latter two both on the Smith template (#7).
import { computed, onMounted, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import Hotspot from '../../components/Hotspot.vue'
import { TOO_TIRED } from '../Template/useWildsScreen'
import * as MonsterTable from '../../domain/tables/monsterTable'
import { QuestOptions } from '../Quest/useQuestOptions'
import { createQuestSession } from '../Quest/questSession'
import ArTrader from './Town/arTrader.vue'
import ArTavern from './Town/arTavern.vue'
import ArWeapon from './Town/arWeapon.vue'
import ArArmour from './Town/arArmour.vue'
import ArField from '../Wilds/arField.vue'
import ArCastle from '../Wilds/arCastle.vue'
import ArQuest from '../Quest/arQuest.vue'
import ArNotice from '../Utility/arNotice.vue'

const nav = useNavigationStore()
const heroStore = useHeroStore()

const levelUpMessage = ref<string | null>(null)

onMounted(() => {
  // arTown.init()'s Screen.getHero().tryToLevel(this) - re-checked on every
  // visit to Town, not just right after combat.
  const result = heroStore.checkLevel()
  if (result) levelUpMessage.value = result.message
})

// heroStore.hero read directly (not through an intermediate computed) -
// see StatusBar.vue's comment on why that pattern silently breaks
// reactivity for a shallowRef mutated in place.
const showCastleGate = computed(() => (heroStore.hero?.getLevel() ?? 0) >= 6)

function openTrader() {
  nav.goto(ArTrader)
}
function openTavern() {
  nav.goto(ArTavern)
}
function openWeapon() {
  nav.goto(ArWeapon)
}
function openArmour() {
  nav.goto(ArArmour)
}
function leaveTown() {
  nav.goto(ArField)
}

// Port of arTown.java's enterCastle(). The 5-arg arQuest constructor Java
// uses here (`new arQuest(this, new arCastle(), 3, "Castle Gate", ...)`)
// sets its `gate` field to the *second* screen argument unconditionally
// (see arQuest.java's constructor chain), not just on a win - so every
// resolution of this quest (win, bribe, flee, whatever) routes to arCastle,
// same as every other pickQuest() in this codebase's `gate` field.
function enterCastle() {
  const hero = heroStore.hero!
  if (hero.getSocial() > 0 || hero.packCount('Castle Permit') > 0) {
    nav.goto(ArCastle)
    return
  }
  if (hero.getQuests() < 1) {
    nav.goto(ArNotice, { message: TOO_TIRED }, { showStatus: false })
    return
  }
  const mob = MonsterTable.find('Town:Guard', hero.getLevel(), hero.getPower(), 3)
  if (!mob) return
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  hero.addFatigue(1)
  hero.resetActions()
  mob.resetActions()
  mob.chooseActions(hero, true)
  nav.goto(ArCastle)
  const gate = nav.current
  const session = createQuestSession(mob, 3, 'Castle Gate', opt, gate)
  heroStore.save()
  nav.goto(ArQuest, { session }, { home: gate })
}
</script>

<template>
  <div class="town">
    <h2 class="town__title">Welcome to Salamander Township</h2>
    <p v-if="levelUpMessage" class="town__banner">{{ levelUpMessage }}</p>
    <div class="town__spots">
      <Hotspot src="/Images/Tavern.jpg" text="Tavern" type="caption" @click="openTavern" />
      <Hotspot src="/Images/Weapon.jpg" text="Weapons" type="caption" @click="openWeapon" />
      <Hotspot src="/Images/twnArmour.jpg" text="Armour" type="caption" @click="openArmour" />
      <Hotspot
        v-if="showCastleGate"
        src="/Images/toCastle.jpg"
        text="Castle Gate"
        type="caption"
        @click="enterCastle"
      />
      <Hotspot src="/Images/twnTrader.jpg" text="Trade Shop" type="caption" @click="openTrader" />
      <Hotspot src="/Images/toFields.jpg" text="Leave Town" type="caption" @click="leaveTown" />
    </div>
  </div>
</template>

<style scoped>
.town {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1em;
  background: #003333;
  color: #ff5533;
}

.town__title {
  text-align: center;
}

.town__banner {
  white-space: pre-line;
  background: #ffffff22;
  border-radius: 6px;
  padding: 0.75em 1em;
  color: white;
}

.town__spots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 1.5em;
  max-width: 640px;
  margin: 1.5em auto 0;
}
</style>
