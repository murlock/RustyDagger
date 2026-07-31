import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { setSeed } from '../../engine/dice'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import type { ItHero } from '../../domain/itHero'
import * as MonsterTable from '../../domain/tables/monsterTable'
import * as C from '../../domain/constants'
import * as AT from '../../domain/armsTrait'
import { QuestOptions } from './useQuestOptions'
import { createQuestSession, type QuestSession } from './questSession'
import ArQuest from './arQuest.vue'
import ArBattle from './arBattle.vue'
import ArNotice from '../Utility/arNotice.vue'

const PriorScreen = defineComponent({ render: () => h('div', 'prior') })

function session(hero: ItHero, key: string, weight = 1): QuestSession {
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), weight)!
  mob.resetActions()
  mob.chooseActions(hero, true)
  const nav = useNavigationStore()
  nav.goto(PriorScreen)
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  return createQuestSession(mob, weight, 'Test Quest', opt, nav.current)
}

async function mountQuest(s: QuestSession) {
  const wrapper = mount(ArQuest, { props: { session: s } })
  await nextTick() // onMounted's fixList() populates entries via a shallowRef, which flushes on the next tick
  return wrapper
}

function optionButton(wrapper: Awaited<ReturnType<typeof mountQuest>>, pattern: RegExp) {
  return wrapper.findAll('.quest__options button').find((b) => pattern.test(b.text()))
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

describe('arQuest', () => {
  it('renders the quest title, monster flavor text, and offers Attack/Flee plus its own options', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Rodent')
    const wrapper = await mountQuest(s)

    expect(wrapper.text()).toContain('Test Quest')
    expect(wrapper.text().length).toBeGreaterThan('Test Quest'.length) // flavor text rendered
    expect(wrapper.findAll('.quest__options button').length).toBeGreaterThanOrEqual(2) // at least attack + flee
  })

  it('choosing Attack navigates to arBattle with narrative text', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Rodent')
    const nav = useNavigationStore()
    const wrapper = await mountQuest(s)

    const attack = optionButton(wrapper, /Slay|Attack|Assault|Kill|Smash/)!
    await attack.trigger('click')

    expect(nav.currentComponent).toBe(ArBattle)
    expect((nav.currentProps as { text: string }).text.length).toBeGreaterThan(0)
    // arBattle.java's constructor calls hideStatusBar() - unlike arQuest.
    expect(nav.showStatusBar).toBe(false)
  })

  it('a successful Bribe (rich, high-charm hero) resolves to a notice homed on the gate', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 100000, 0, 0, 0) // overwhelming charm guarantees the bribeCharm contest
    hero.resetActions()
    hero.addMoney(1_000_000)
    const s = session(hero, 'Fields:Soldier') // hostile, opts include bribe
    const nav = useNavigationStore()
    const wrapper = await mountQuest(s)

    const bribe = optionButton(wrapper, /Bribe|Pay for Passage|Give it Money/)!
    await bribe.trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(PriorScreen)
    expect((nav.currentProps as { message: string }).message).toContain('averted conflict')
  })

  it('a declined Bribe against a hostile monster stays in the quest and removes the option', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 0, 0, 0, 0) // no charm, contest will fail
    hero.resetActions()
    hero.addMoney(1_000_000) // affords the bribe attempt itself
    const s = session(hero, 'Fields:Soldier')
    const nav = useNavigationStore()
    const wrapper = await mountQuest(s)

    const bribe = optionButton(wrapper, /Bribe|Pay for Passage|Give it Money/)!
    await bribe.trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    // Continue from that notice returns to arQuest (same session), where Bribe is now gone.
    nav.goHome()
    const wrapper2 = await mountQuest(s)
    expect(optionButton(wrapper2, /Bribe|Pay for Passage|Give it Money/)).toBeUndefined()
  })

  it('auto-fires a pending Magic Assault (from a Panic/Blind/Blast scroll used mid-battle) on mount, skipping the option list', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Rodent')
    // Simulates arStatus's doPanic()/doBlind()/doBlast() queuing a
    // "Magic Assault" action mid-battle (see itAgent.ts) - arQuest's
    // init()-equivalent should resolve this immediately rather than
    // showing the option list, matching Java's
    // `if (Screen.getActions().isMatch(SPELLS)) applyChoice(16);`.
    hero.getActions().addCount(AT.PANIC, 1)
    hero.getActions().setName(C.SPELLS)
    const nav = useNavigationStore()

    mount(ArQuest, { props: { session: s } })
    await nextTick()

    expect(nav.currentComponent).toBe(ArBattle)
  })

  it('Flee from a defensive monster leaves the encounter', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Wizard') // defensive
    const nav = useNavigationStore()
    const wrapper = await mountQuest(s)

    const flee = optionButton(wrapper, /Flee|Run|Evade/)!
    await flee.trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(PriorScreen)
  })
})
