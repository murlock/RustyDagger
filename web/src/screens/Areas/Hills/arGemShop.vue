<script setup lang="ts">
// Port of DCourt/Screens/Areas/Hills/arGemShop.java, on the Trade template.
// Reached from arHills' Jewel Store hotspot.
//
// Deviations:
// - The greeting's "<X> heh, heh" fallback used `Tools.getBest()` (a
//   server-reported field) - dropped with the rest of the multiplayer
//   session state, same substitution as arTavern.vue/arHealer.vue.
// - "Peer $250" (Shop.getSpecial()/doSpecial(), -> arPeer) routes to
//   ArPeer (spend=1, USEMONEY - matching arGemShop.java's own
//   `new arPeer(this, 1, null)`) now that arPeer (Utility #15) is ported.
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { select } from '../../../engine/dice'
import * as GT from '../../../domain/gearTypes'
import * as GearTable from '../../../domain/tables/gearTable'
import Trade from '../../Template/Trade.vue'
import ArPeer from '../../Utility/arPeer.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

function peer() {
  nav.goto(ArPeer, { spend: 1 }, { showStatus: false })
}

const GREETINGS = [null, 'Unhh...', 'Hunh...', 'Hargh..', 'Eh?', 'Enh..', 'Hmm?', 'Hrmm...', 'Heh, Heh..', 'Skrechk! Phtoo!']
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} heh, heh`
const buyNames = GearTable.findList(GT.TYPE_LOOT).map((r) => r.name)
</script>

<template>
  <Trade
    name="Gakthrak Cunning's Priceless Gems"
    face="/Images/Faces/Gakthrak.jpg"
    :greeting="greeting"
    :stock-names="['Quartz', 'Opal', 'Garnet', 'Emerald', 'Ruby', 'Turquoise']"
    :resale="70"
    :base="30"
    :buy-names="buyNames"
  >
    <template #special>
      <button type="button" @click="peer">Peer $250</button>
    </template>
  </Trade>
</template>
