import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useHeroStore } from './stores/hero'
import { useNavigationStore } from './stores/navigation'
import * as MonsterTable from './domain/tables/monsterTable'
import { QuestOptions } from './screens/Quest/useQuestOptions'
import { createQuestSession } from './screens/Quest/questSession'
import App from './App.vue'
import ArStatus from './screens/Utility/arStatus.vue'
import ArQuest from './screens/Quest/arQuest.vue'

const PlainScreen = defineComponent({ render: () => h('div', 'plain') })

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('App', () => {
  // Screen.action()'s default statusPic handler is `new arStatus(this)`
  // (battle=false); arQuest.java overrides it to always pass battle=true.
  // App.vue's openStatus() centralizes that same distinction.
  it('opens arStatus in battle mode when the status bar is clicked from arQuest', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const mob = MonsterTable.find('Fields:Rodent', hero.getLevel(), hero.getPower(), 1)!
    const session = createQuestSession(mob, 1, 'Fields Quest', new QuestOptions([]), null)
    nav.goto(ArQuest, { session }, { showStatus: true })

    const wrapper = mount(App)
    await wrapper.get('.status-bar').trigger('click')

    expect(nav.currentComponent).toBe(ArStatus)
    expect((nav.currentProps as { battle: boolean }).battle).toBe(true)
  })

  it('opens arStatus in normal mode when the status bar is clicked from any other screen', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(PlainScreen, {}, { showStatus: true })

    const wrapper = mount(App)
    await wrapper.get('.status-bar').trigger('click')

    expect(nav.currentComponent).toBe(ArStatus)
    expect((nav.currentProps as { battle: boolean }).battle).toBe(false)
  })
})
