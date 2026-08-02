<script setup lang="ts">
// Port of DCourt/Screens/Areas/Castle/arPostal.java ("Sloeth Dreyfus Postal
// Express", extends Indoors) - reached from arCastle's Post Office hotspot.
//
// Deliberate deviations:
// - The greeting's "<X>? Oh yeah." fallback used `Tools.getBest()` (a
//   server-reported field) - dropped with the rest of the multiplayer
//   session state, same substitution as every other Indoors screen.
// - Java's takePackage() removes the selected row from the postbox
//   (`postbox.delItem(index)`) *before* checking whether TAKEMAIL actually
//   succeeded, so a network failure leaves the client showing one fewer
//   item than the server still holds. Fixed here: the row only disappears
//   from `mailList` once `takeMail()` reports success, keeping client/server
//   state consistent (same "don't desync on a failed round trip" care
//   arPackage.vue's send() already takes).
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { select } from '../../../engine/dice'
import { listMail, takeMail } from '../../../engine/cgiClient'
import { itemFromJSON } from '../../../domain/itemFactory'
import type { ItList } from '../../../domain/itList'
import Indoors from '../../Template/Indoors.vue'
import ArPackage from '../../Utility/arPackage.vue'
import ArNotice from '../../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const TITLE = 'Sloeth Dreyfus Postal Express'
const GREETINGS = [null, 'In a minute..', 'Okay, alright already.', 'Fill in this form.', 'This form is wrong', "I'm on my break", 'Geez, again?', '*Sigh* Oh I suppose.', 'Right now? Yeah, yeah.']
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''}? Oh yeah.`

const mailList = shallowRef<{ id: number; sender: string; label: string }[]>([])
const selectedIndex = ref<number | null>(null)
const busy = ref(false)

async function loadMailList() {
  const result = await listMail(heroStore.hero!.getName())
  mailList.value = result.ok ? result.data.mail : []
}
onMounted(loadMailList)

const takeEnabled = computed(() => selectedIndex.value != null && (heroStore.hero?.getMoney() ?? 0) >= 100 && !busy.value)

function pickRow(ix: number) {
  selectedIndex.value = selectedIndex.value === ix ? null : ix
}

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

function sendMailScreen() {
  nav.goto(ArPackage, { title: TITLE })
}

async function takePackage() {
  const ix = selectedIndex.value
  if (ix == null) return
  const row = mailList.value[ix]
  const hero = heroStore.hero!
  busy.value = true
  const result = await takeMail(hero.getName(), row.id)
  busy.value = false
  if (!result.ok) {
    notice(`A transmission error has occurred:\n${result.error}\nSorry About That.`)
    return
  }
  mailList.value = mailList.value.filter((_, i) => i !== ix)
  selectedIndex.value = null

  let msg = `\tA mail daemon pushes out a dilapidated package, makes a futile attempt to polish it up, then scurries into the depths of the mail room.\n\nThe label reads:\n\t${row.label}\nThe package contains:\n`
  const list = itemFromJSON(result.data.payload) as ItList
  for (let i = 0; i < list.getCount(); i++) {
    const it = list.select(i)
    if (it && it.getName() && it.getName()!.length >= 1) {
      msg += `\t${it.toShow()}\n`
      hero.addPack(it)
    }
  }
  hero.subMoney(100)
  heroStore.save()
  notice(msg)
}

function exit() {
  nav.goHome()
}
</script>

<template>
  <Indoors :name="TITLE" face="/Images/Faces/Sloeth.jpg" :greeting="greeting" @exit="exit">
    <div class="postal__actions">
      <button type="button" :disabled="!takeEnabled" @click="takePackage">Take Mail $100</button>
      <button type="button" @click="sendMailScreen">Send Mail &lt;x$100&gt;</button>
    </div>
    <ul class="postal__box">
      <li v-if="mailList.length === 0" class="postal__empty">-- empty --</li>
      <li
        v-for="(row, ix) in mailList"
        :key="row.id"
        :class="{ selected: selectedIndex === ix }"
        @click="pickRow(ix)"
      >
        {{ row.label }}
      </li>
    </ul>
  </Indoors>
</template>

<style scoped>
.postal__actions {
  display: flex;
  gap: 0.75em;
  margin-bottom: 1em;
}

.postal__actions button {
  font: inherit;
  cursor: pointer;
}

.postal__actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.postal__box {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16em;
  overflow-y: auto;
  border: 1px solid currentColor;
}

.postal__box li {
  padding: 0.35em 0.6em;
  cursor: pointer;
}

.postal__empty {
  cursor: default;
  opacity: 0.6;
  font-style: italic;
}

.postal__box li.selected {
  background: #0a5c1e;
  color: white;
}
</style>
