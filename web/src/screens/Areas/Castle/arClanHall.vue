<script setup lang="ts">
// Port of DCourt/Screens/Areas/Castle/arClanHall.java ("Servile Krymps Clan
// Gathering", extends Indoors) - reached from arCastle's Clan Hall hotspot.
// The last of the multiplayer-shaped Utility/Castle screens (#14-16/#26/#27)
// to get ported, now that the small local CGI-equivalent server (`server/`)
// backs PEEKCLAN/MAKECLAN/KILLCLAN and mail.
//
// Deliberate fix: petitions are delivered as mail and land in the hero's
// pack as an `ItNote` named "Petition" (see petitionClan() below, matching
// `arClanHall.java`'s own `mail.append(new itNote("Petition", ...))`) - but
// Java's `findNextPetition()` only ever accepts a hit that's
// `instanceof itValue`, which an `itNote` never is. That makes the
// Grant/Deny petition UI permanently show "No Petitions Outstanding" even
// with real petitions sitting in pack - dead code in the original, same
// family as the arGuild join-gate and arqMingle double-roll bugs already
// found and fixed elsewhere in this codebase. Fixed by checking
// `instanceof ItNote` instead, and reading the petitioner's name from
// `getFrom()` (ItNote's sender field) everywhere Java read
// `itValue.getValue()`.
//
// Other deviations:
// - `heroStatus` (CLANLESS/MEMBER/LEADER) is resolved once, from the hero's
//   *own* clan membership, and then held fixed for the rest of the screen's
//   life - matching Java's own createTools()-time computation, which never
//   re-runs even though `findClanInfo()` (browsing other clan names) does.
//   Async here (the CGI call is a real fetch, not Java's synchronous stub)
//   means there's a brief "Working..." gate before the action radios exist.
// - `disbandClan()` never actually cleared `hero.getClan()` in the original
//   (it re-set it to the same value it already had, then never nulled it
//   after KILLCLAN succeeded) - obviously not intended for a "destroy my
//   clan" action, fixed here to null it on success, matching quitClan()'s
//   own `h.setClan(null)`.
// - `showPetitions` (Java's `init()` field) is dropped - grepping the whole
//   class, nothing ever reads it back; dead state, like arStatus's `attack`
//   field.
// - The `{1}`/`{5}`/`{75}`/`{15}` quest-cost prefixes baked into Java's
//   button label strings (`"{1}Petition To Join $1000"`) are dropped -
//   plain `Button` (not the icon-rendering `FButton`) would have shown
//   those braces to the player literally; cleaner without them, matching
//   this project's "modernize the UI" latitude rather than a fidelity gap.
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { syncHero } from '../../../engine/heroStorage'
import { peekClan, makeClan, killClan } from '../../../engine/cgiClient'
import { sendPackage } from '../../../engine/mailer'
import { today } from '../../../engine/today'
import { select } from '../../../engine/dice'
import { ItList } from '../../../domain/itList'
import { ItNote } from '../../../domain/itNote'
import { nameMatches } from '../../../domain/item'
import { MadLib } from '../../../domain/madlib'
import * as C from '../../../domain/constants'
import * as GameStrings from '../../../domain/gameStrings'
import Indoors from '../../Template/Indoors.vue'
import ArPeer from '../../Utility/arPeer.vue'
import ArNotice from '../../Utility/arNotice.vue'

const heroStore = useHeroStore()
const nav = useNavigationStore()

const JOIN_QUESTS = 1
const JOIN_COSTS = 1000
const QUIT_QUESTS = 5
const QUIT_COSTS = 5000
const DISBAND_QUESTS = 15
const DISBAND_COSTS = 50000
const CREATE_QUESTS = 75
const CREATE_COSTS = 250000

const GREETINGS = [null, 'Yes, your Lordship?', 'What are your wishes?', 'How may I assist you?', 'May I help you, sir?', 'Leadership is a Burden', 'Think carefully my lord', 'Deliberation is a Virtue', 'Be Wary of Usurpers']
const greeting = select(GREETINGS) ?? `${heroStore.hero?.getName() ?? ''} was just here`

const LEAVE_CLAN_MSG = '\tIt is with bitter regret (and an empty purse) that you turn your back on the men who have been your comrades since adolescence.\n\n\t*** STATUS = CLANLESS ***\n'
const PETITION_MSG = "$TB$Your petition has been sent to $leader$, current leader of the $clan$ clan.  He will need time to consider your plea, and will hopefully respond by sending you a Grant to Join."
const CREATE_MSG = '$TB$You labor tirelessly for the inauguration. You find a celebration hall and send out hundreds of invitations.  You hire musicians, actors, jugglers, magicians, and Moorish dancers.  You employ Orcish bouncers, Elvin chefs, Human waiters,  and Dwarven janitors.$CR$$TB$Finally, the great day comes.  Nobles from accross the kingdom are in attendance when $ruler$ makes the grand announcement: $TB$"On This Day, Clan $clan$ is Born!"$CR$'
const DISBAND_MSG = '$TB$With quiet dignity, you settle the affairs of Clan $clan$. All outstanding bills are paid.  The clan hall is closed to business. A sad note is sent to $ruler$ begging out of future court functions. $CR$$TB$The final day arrives.  Without fanfare, you pack your bags and move out of the castle.$CR$$TB$$leader$ lives here no longer...'
const GRANT_MSG = "\tYou compose an elegant message accepting $name$'s petition.  The hero will recieve your message upon the morrow, and should merge with the $clan$ Clan soon after."
const REINSTATE_MSG = '$TB$Servile Krymp pales with horror!$CR$$TB$"Your Lordship," he whimpers, "There has been a terrible mistake."  He cowers before you and cringes from your every move. "We will rectify this error instantly.  Please don\'t tell $ruler$.$CR$$CR$$TB$$leader$ has been reinstated as leader of Clan $clan$.'
const DENY_HEAD = 'You draft the following missive:\n\n'
const DENY_MSG = "$today$\n\tMy Dear $name$\n\tHaving duly considered your proposal, I have come to the conclusion that you are not currently a suitable candidate for the $clan$ Clan.\n\tThere is nodoby else.  It's not you, it's us. Let's just be good friends.\n\tSincerely,\n\t$leader$"

type Action = 'join' | 'quit' | 'create' | 'member'

const heroStatus = ref<1 | 2 | 3 | null>(null)
const clanStatus = ref<0 | 1 | 2>(0)
const current = shallowRef<string | null>(null)
const leader = ref(C.NONE)
const members = ref(0)
const power = ref(0)
const ability = ref(C.NONE)
const clanNameInput = ref('')
const selectedAction = shallowRef<Action | null>(null)
const confirmChecked = ref(false)
const busy = ref(false)

const petitionIndex = ref(-1)
const petition = shallowRef<ItNote | null>(null)

const social = computed(() => heroStore.hero?.getSocial() ?? 0)

function notice(message: string) {
  nav.goto(ArNotice, { message }, { showStatus: false })
}

function findNextPetition() {
  const hero = heroStore.hero!
  const it = hero.getPack().selectNth('Petition', petitionIndex.value + 1)
  if (it != null && it instanceof ItNote) {
    petitionIndex.value++
    petition.value = it
  } else if (petitionIndex.value < 0) {
    petition.value = null
  } else {
    const it2 = hero.getPack().selectNth('Petition', 0)
    if (it2 instanceof ItNote) {
      petitionIndex.value = 0
      petition.value = it2
      return
    }
    petition.value = null
  }
}

async function findClanInfo(clanName: string | null) {
  clanStatus.value = 0
  current.value = clanName == null ? null : clanName.trim()
  members.value = 0
  power.value = 0
  ability.value = C.NONE
  leader.value = C.NONE
  if (current.value == null || current.value.length < 1 || nameMatches(current.value, C.NONE)) return
  const result = await peekClan(current.value)
  if (!result.ok) {
    clanStatus.value = 2
    return
  }
  clanStatus.value = 1
  leader.value = result.data.leader || C.NONE
  members.value = result.data.members
  power.value = result.data.power
  ability.value = result.data.ability
  const hero = heroStore.hero!
  if (heroStatus.value === 1 && nameMatches(leader.value, hero.getName())) {
    hero.setClan(current.value)
    heroStore.save()
    syncHero(hero)
    const sent = new MadLib(REINSTATE_MSG)
    sent.replace('$leader$', leader.value)
    sent.replace('$clan$', current.value)
    sent.replace('$ruler$', 'Queen Beth')
    notice(sent.getText())
  }
}

function onClanTextChange() {
  confirmChecked.value = false
  findClanInfo(clanNameInput.value)
}

function selectAction(a: Action) {
  selectedAction.value = a
  confirmChecked.value = false
}

const enactInfo = computed(() => {
  const hero = heroStore.hero!
  if (selectedAction.value === 'join' && clanStatus.value === 1) {
    return {
      label: `Petition To Join $${JOIN_COSTS}`,
      confirmLabel: 'Make It So - JOIN',
      enabled: confirmChecked.value && hero.getQuests() >= JOIN_QUESTS && hero.getMoney() >= JOIN_COSTS,
      run: petitionClan,
    }
  }
  if (selectedAction.value === 'quit' && heroStatus.value === 3) {
    return {
      label: `Destroy My Clan $${DISBAND_COSTS}`,
      confirmLabel: 'Make It So - DISBAND',
      enabled: confirmChecked.value && hero.getQuests() >= DISBAND_QUESTS && hero.getMoney() >= DISBAND_COSTS,
      run: disbandClan,
    }
  }
  if (selectedAction.value === 'quit' && heroStatus.value === 2) {
    return {
      label: `Quit My Clan $${QUIT_COSTS}`,
      confirmLabel: 'Make It So - QUIT',
      enabled: confirmChecked.value && hero.getQuests() >= QUIT_QUESTS && hero.getMoney() >= QUIT_COSTS,
      run: quitClan,
    }
  }
  if (selectedAction.value === 'create' && clanStatus.value === 2) {
    return {
      label: 'Create A Clan $250k',
      confirmLabel: 'Make It So - CREATE',
      enabled: confirmChecked.value && hero.getQuests() >= CREATE_QUESTS && hero.getMoney() >= CREATE_COSTS,
      run: createClan,
    }
  }
  return null
})

async function quitClan() {
  const hero = heroStore.hero!
  if (hero.getClan() == null || hero.getQuests() < QUIT_QUESTS || hero.getMoney() < QUIT_COSTS) return
  hero.setClan(null)
  hero.subMoney(QUIT_COSTS)
  hero.addFatigue(5)
  heroStore.save()
  hero.gainExp(hero.getLevel())
  hero.gainWits(25)
  hero.gainCharm(25)
  heroStore.save()
  syncHero(hero)
  const home = nav.current?.home ?? null
  nav.goto(ArNotice, { message: LEAVE_CLAN_MSG }, { home, showStatus: false })
}

async function createClan() {
  const hero = heroStore.hero!
  const name = current.value
  if (name == null || hero.getQuests() < CREATE_QUESTS || hero.getMoney() < CREATE_COSTS) return
  hero.setClan(name)
  hero.subMoney(CREATE_COSTS)
  hero.addFatigue(CREATE_QUESTS)
  heroStore.save()
  busy.value = true
  const result = await makeClan(name, hero.getName())
  busy.value = false
  if (!result.ok) {
    hero.subFatigue(CREATE_QUESTS)
    hero.addMoney(CREATE_COSTS)
    hero.setClan(null)
    heroStore.save()
    notice(GameStrings.SAVE_CANCEL)
    return
  }
  hero.gainExp(hero.getLevel() * hero.getLevel() * 10)
  hero.gainWits(500)
  hero.gainCharm(500)
  heroStore.save()
  syncHero(hero)
  const sent = new MadLib(CREATE_MSG)
  sent.replace('$leader$', leader.value)
  sent.replace('$clan$', name)
  sent.replace('$ruler$', 'Queen Beth')
  const home = nav.current?.home ?? null
  nav.goto(ArNotice, { message: sent.getText() }, { home, showStatus: false })
}

async function disbandClan() {
  const hero = heroStore.hero!
  const name = current.value
  if (name == null || hero.getQuests() < DISBAND_QUESTS || hero.getMoney() < DISBAND_COSTS) return
  hero.subMoney(DISBAND_COSTS)
  hero.addFatigue(DISBAND_QUESTS)
  heroStore.save()
  busy.value = true
  const result = await killClan(name, hero.getName())
  busy.value = false
  if (!result.ok) {
    hero.subFatigue(DISBAND_QUESTS)
    hero.addMoney(DISBAND_COSTS)
    heroStore.save()
    notice(GameStrings.SAVE_CANCEL)
    return
  }
  hero.setClan(null)
  hero.gainExp(hero.getLevel() * hero.getLevel() + 10)
  hero.gainWits(100)
  hero.gainCharm(100)
  heroStore.save()
  syncHero(hero)
  const sent = new MadLib(DISBAND_MSG)
  sent.replace('$leader$', leader.value)
  sent.replace('$clan$', name)
  sent.replace('$ruler$', 'Queen Beth')
  const home = nav.current?.home ?? null
  nav.goto(ArNotice, { message: sent.getText() }, { home, showStatus: false })
}

async function petitionClan() {
  const hero = heroStore.hero!
  const name = current.value
  if (name == null || clanStatus.value !== 1 || hero.getQuests() < JOIN_QUESTS || hero.getMoney() < JOIN_COSTS) return
  hero.subMoney(JOIN_COSTS)
  hero.addFatigue(1)
  heroStore.save()
  const mail = new ItList(C.MAIL)
  mail.append(ItNote.create('Petition', hero.getName(), null, 'Sire,\nI wish to join thy guild.\nThankee'))
  const source = `${hero.getTitle()}${hero.getName()}`
  busy.value = true
  const result = await sendPackage(source, leader.value, `Petition from ${source}`, mail)
  busy.value = false
  if (result != null) {
    hero.addMoney(JOIN_COSTS)
    hero.subFatigue(1)
    heroStore.save()
    notice(GameStrings.MAIL_CANCEL + result)
    return
  }
  const sent = new MadLib(PETITION_MSG)
  sent.replace('$leader$', leader.value)
  sent.replace('$clan$', name)
  const home = nav.current?.home ?? null
  nav.goto(ArNotice, { message: sent.getText() }, { home, showStatus: false })
}

function peerPetition() {
  const p = petition.value
  if (!p) return
  nav.goto(ArPeer, { spend: 4, who: p.getFrom() })
}

async function grantPetition() {
  const hero = heroStore.hero!
  const p = petition.value
  if (!p) return
  hero.subPack(p)
  heroStore.save()
  const mail = new ItList(C.MAIL)
  mail.append(ItNote.create('Grant', hero.getClan() ?? C.NONE, null, 'Greetings,\nIt is my pleasure to welcome you to our guild.\nGuildmaster'))
  const source = `${hero.getTitle()}${hero.getName()}`
  busy.value = true
  const result = await sendPackage(source, p.getFrom() ?? '', 'Grant', mail)
  busy.value = false
  if (result != null) {
    hero.putPack(p)
    heroStore.save()
    notice(GameStrings.MAIL_CANCEL + result)
    return
  }
  const sent = new MadLib(GRANT_MSG)
  sent.replace('$name$', p.getFrom() ?? '')
  sent.replace('$clan$', hero.getClan() ?? C.NONE)
  petition.value = null
  findNextPetition()
  notice(sent.getText())
}

async function denyPetition() {
  const hero = heroStore.hero!
  const p = petition.value
  if (!p) return
  hero.subPack(p)
  heroStore.save()
  const msg = new MadLib(DENY_MSG)
  msg.replace('$today$', today())
  msg.replace('$name$', p.getFrom() ?? '')
  msg.replace('$clan$', hero.getClan() ?? C.NONE)
  msg.replace('$leader$', `${hero.getTitle()}${hero.getName()}`)
  const mail = new ItList(C.MAIL)
  mail.append(ItNote.create('Denial', hero.getName(), null, msg.getText()))
  const source = `${hero.getTitle()}${hero.getName()}`
  busy.value = true
  const result = await sendPackage(source, p.getFrom() ?? '', 'Denial', mail)
  busy.value = false
  if (result == null) {
    petition.value = null
    findNextPetition()
    notice(DENY_HEAD + msg.getText())
    return
  }
  hero.putPack(p)
  heroStore.save()
  notice(GameStrings.MAIL_CANCEL + result)
}

function exit() {
  nav.goHome()
}

onMounted(async () => {
  const hero = heroStore.hero!
  clanNameInput.value = hero.getClan() ?? C.NONE
  await findClanInfo(hero.getClan())
  heroStatus.value = current.value == null ? 1 : nameMatches(leader.value, hero.getName()) ? 3 : 2
  selectedAction.value = heroStatus.value === 1 ? 'join' : heroStatus.value === 2 ? 'quit' : 'member'
  findNextPetition()
})
</script>

<template>
  <Indoors name="Servile Krymps Clan Gathering" face="/Images/Faces/Servile.jpg" :greeting="greeting" @exit="exit">
    <div v-if="heroStatus == null" class="clan__loading">Working...</div>
    <template v-else>
      <div v-if="heroStatus !== 3" class="clan__lookup">
        <label>
          Clan Name
          <input v-model="clanNameInput" type="text" maxlength="40" @change="onClanTextChange" @keyup.enter="onClanTextChange" />
        </label>
      </div>

      <p v-if="clanStatus === 0" class="clan__hint">Enter a Clan Name</p>
      <p v-else-if="clanStatus === 2" class="clan__hint">No Clan Found</p>
      <div v-else class="clan__info">
        <p v-if="heroStatus !== 1">Clan: {{ current }}</p>
        <p>Leader: {{ leader }}</p>
        <p>Men: {{ members }}&#160;&#160;Power: {{ power }}</p>
        <p>Abilities: {{ ability }}</p>
      </div>

      <div class="clan__actions">
        <label v-if="heroStatus === 1">
          <input type="radio" name="clan-action" :checked="selectedAction === 'join'" @change="selectAction('join')" /> Join
        </label>
        <label v-if="heroStatus === 1">
          <input type="radio" name="clan-action" :checked="selectedAction === 'create'" @change="selectAction('create')" /> Create
          <span v-if="social < 2" class="clan__warn">(Must be a Baron)</span>
        </label>
        <label v-if="heroStatus === 2">
          <input type="radio" name="clan-action" :checked="selectedAction === 'quit'" @change="selectAction('quit')" /> Quit
        </label>
        <label v-if="heroStatus === 2">
          <input type="radio" name="clan-action" :checked="selectedAction === 'join'" @change="selectAction('join')" /> Join
        </label>
        <label v-if="heroStatus === 3">
          <input type="radio" name="clan-action" :checked="selectedAction === 'member'" @change="selectAction('member')" /> Members
        </label>
        <label v-if="heroStatus === 3">
          <input type="radio" name="clan-action" :checked="selectedAction === 'quit'" @change="selectAction('quit')" /> Quit
        </label>
      </div>

      <div v-if="enactInfo" class="clan__enact">
        <label><input type="checkbox" v-model="confirmChecked" /> {{ enactInfo.confirmLabel }}</label>
        <button type="button" :disabled="!enactInfo.enabled || busy" @click="enactInfo.run()">{{ enactInfo.label }}</button>
      </div>

      <div v-if="selectedAction === 'member'" class="clan__petitions">
        <p v-if="!petition">No Petitions Outstanding</p>
        <p v-else>Petition from {{ petition.getFrom() }}</p>
        <div class="clan__petition-actions">
          <button type="button" :disabled="!petition" @click="peerPetition">Peer</button>
          <button type="button" @click="findNextPetition">Next</button>
          <button type="button" :disabled="!petition || busy" @click="grantPetition">Grant</button>
          <button type="button" :disabled="!petition || busy" @click="denyPetition">Deny</button>
        </div>
      </div>
    </template>
  </Indoors>
</template>

<style scoped>
.clan__lookup input {
  font: inherit;
  padding: 0.3em 0.5em;
  margin-left: 0.5em;
}

.clan__hint {
  font-style: italic;
  opacity: 0.75;
}

.clan__info p {
  margin: 0.2em 0;
}

.clan__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  margin: 1em 0;
}

.clan__warn {
  color: #a00000;
  font-size: 0.85em;
}

.clan__enact {
  display: flex;
  align-items: center;
  gap: 1em;
  margin: 1em 0;
}

.clan__enact button,
.clan__petition-actions button {
  font: inherit;
  cursor: pointer;
}

.clan__enact button:disabled,
.clan__petition-actions button:disabled {
  cursor: default;
  opacity: 0.5;
}

.clan__petitions {
  border-top: 1px solid #96960033;
  padding-top: 1em;
  margin-top: 1em;
}

.clan__petition-actions {
  display: flex;
  gap: 0.5em;
  margin-top: 0.5em;
}
</style>
