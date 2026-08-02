<script setup lang="ts">
// Port of DCourt/Screens/Utility/arPackage.java ("<Place> Mail Room",
// extends Transfer) - reached from arPostal's Send Mail button. Stages
// pack items into a transient stash, then mails the whole stash to another
// hero for $100/item.
//
// Deliberate deviations:
// - Exiting without sending (the Exit button) merges any staged-but-unsent
//   stash back into the pack, matching Java's overridden goHome()
//   (`Screen.getPack().merge(getStash()); clrStash(); goHome();`). A
//   successful send's arNotice routes home to *this screen's own home*
//   (skipping arPackage entirely, matching `new arNotice(getHome(), ...)`),
//   so that merge-back never runs against items that were actually sent -
//   confirmed by re-reading Java's control flow, not a guess: arNotice's own
//   dismiss button navigates via its own `home` field, never back through
//   arPackage.goHome().
// - `send()`'s label/subject line shown in the recipient's arPostal postbox
//   is a server-side detail never visible in the decompiled client source -
//   "Package from <title><name>" is this port's own reasonable choice, not
//   a literal port of unseen server formatting.
import { computed, ref } from 'vue'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { useTransfer } from '../Template/useTransfer'
import { sendPackage } from '../../engine/mailer'
import { ItList } from '../../domain/itList'
import { nameMatches } from '../../domain/item'
import { MadLib } from '../../domain/madlib'
import * as GameStrings from '../../domain/gameStrings'
import { select } from '../../engine/dice'
import ArNotice from './arNotice.vue'

const props = defineProps<{ title: string }>()

const heroStore = useHeroStore()
const nav = useNavigationStore()

const stash = new ItList('stash')
const transfer = useTransfer({ limit: 0, purse: heroStore.hero!.getPack(), stash })

const destName = ref('')
const sending = ref(false)

const packCount = computed(() => heroStore.hero?.getPack().getCount() ?? 0)
// Reuses transfer.stashRows (properly reactive - see useTransfer.ts's
// `version` counter) rather than reading `stash.getCount()` directly, which
// has no tracked Vue dependency at all since `stash` is a plain ItList.
const stashCount = computed(() => transfer.stashRows.value.length)
const cost = computed(() => stashCount.value * 100)
const canSend = computed(() => !sending.value && stashCount.value > 0 && (heroStore.hero?.getMoney() ?? 0) >= cost.value)

const BREAK_SOUNDS = [
  '***KEERASH***',
  '***SMASHOLA***',
  '***BANG+CRACK+POP***',
  '+++SHLORP-bump+++',
  '***CRASH***...tinkle...',
  'HEE-HAW! HEE HAW!',
  '***KABADABOOM***',
  '...bzzzzzzzzzzzz...',
  'AIYEEEE!!!!',
]
const MAIL_SENT =
  '$TB$Okay Chief, got it covered.  When your friend comes to pick it up, we\'ll have it sitting right on top here.$CR$$CR$$TB$$TB$$crash$$CR$$CR$$TB$No problem, got it covered.$CR$'

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

function exit() {
  const hero = heroStore.hero!
  hero.getPack().mergeList(stash)
  heroStore.save()
  nav.goHome()
}

async function send() {
  const hero = heroStore.hero!
  const dest = destName.value.trim()
  if (dest.length < 4 || dest.length > 15) {
    notice(`\tThe name you have selected is malformed:\n<${dest}>\n\n\tHero names must be at least 4 letters and no more than 15 letters\n`)
    return
  }
  if (nameMatches(hero.getName(), dest)) {
    notice('\tWhat is the point of sending mail to yourself?\n\n\tIt poses a metaphysical conundrum, and lends the suggestion that you are insane.\n\n<<Why\'d I go and say a fool thing like that?>>\n')
    return
  }
  const amount = cost.value
  hero.subMoney(amount)
  heroStore.save()
  sending.value = true
  const source = `${hero.getTitle()}${hero.getName()}`
  const result = await sendPackage(source, dest, `Package from ${source}`, stash)
  sending.value = false
  if (result != null) {
    hero.addMoney(amount)
    heroStore.save()
    notice(GameStrings.MAIL_CANCEL + result)
    return
  }
  const sent = new MadLib(MAIL_SENT)
  sent.replace('$crash$', select(BREAK_SOUNDS))
  const home = nav.current?.home ?? null
  nav.goto(ArNotice, { message: sent.getText() }, { home, showStatus: false })
}
</script>

<template>
  <div class="package">
    <div class="package__header">
      <h2>{{ props.title }} Mail Room</h2>
      <button type="button" @click="exit">Exit</button>
    </div>

    <div v-if="transfer.selected.value" class="package__transfer">
      <input
        v-if="transfer.maxQuantity.value > 1"
        type="range"
        min="1"
        :max="transfer.maxQuantity.value"
        v-model.number="transfer.quantity.value"
      />
      <button type="button" @click="transfer.transfer()">Transfer {{ transfer.quantity.value }}</button>
    </div>

    <div class="package__lists">
      <div class="package__column">
        <p class="package__label">Backpack {{ packCount }}</p>
        <ul class="package__list">
          <li
            v-for="row in transfer.purseRows.value"
            :key="row.item.getName()"
            :class="{ selected: transfer.selectedSide.value === 'purse' && transfer.selectedName.value === row.item.getName() }"
            @click="transfer.select('purse', row.item)"
          >
            {{ row.label }}
          </li>
        </ul>
      </div>

      <div class="package__column">
        <p class="package__label">Mail Package {{ stashCount }}</p>
        <ul class="package__list">
          <li
            v-for="row in transfer.stashRows.value"
            :key="row.item.getName()"
            :class="{ selected: transfer.selectedSide.value === 'stash' && transfer.selectedName.value === row.item.getName() }"
            @click="transfer.select('stash', row.item)"
          >
            {{ row.label }}
          </li>
        </ul>
      </div>
    </div>

    <div class="package__send">
      <label>
        Send To:
        <input v-model="destName" type="text" maxlength="15" />
      </label>
      <button type="button" :disabled="!canSend" @click="send">Send ${{ cost }}</button>
    </div>
  </div>
</template>

<style scoped>
.package {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #000080;
  color: white;
}

.package__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.package__header button,
.package__transfer button,
.package__send button {
  font: inherit;
  cursor: pointer;
}

.package__send button:disabled {
  cursor: default;
  opacity: 0.5;
}

.package__transfer {
  display: flex;
  align-items: center;
  gap: 0.75em;
  margin: 1em 0;
}

.package__lists {
  display: flex;
  gap: 1.5em;
}

.package__column {
  flex: 1;
}

.package__label {
  font-weight: bold;
}

.package__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 14em;
  overflow-y: auto;
  border: 1px solid white;
}

.package__list li {
  padding: 0.35em 0.6em;
  cursor: pointer;
}

.package__list li.selected {
  background: cyan;
  color: black;
}

.package__send {
  display: flex;
  align-items: center;
  gap: 1em;
  margin-top: 1.5em;
}

.package__send input {
  font: inherit;
  padding: 0.3em 0.5em;
}
</style>
