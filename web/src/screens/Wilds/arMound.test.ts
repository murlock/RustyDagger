import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArMound from './arMound.vue'
import ArField from './arField.vue'
import ArGoblin from '../Areas/Mound/arGoblin.vue'
import ArNotice from '../Utility/arNotice.vue'
import ArQuest from '../Quest/arQuest.vue'
import type { QuestSession } from '../Quest/questSession'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot').find((s) => s.text().includes(text))!
}

describe('arMound', () => {
  it('sets the hero place to mound', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    mount(ArMound)
    expect(hero.getPlace()).toBe(C.MOUND)
  })

  it('Warrens, Treasury, Throne Room, and Dark Vortex all start hidden without their maps', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const wrapper = mount(ArMound)

    for (const name of ['Warrens', 'Treasury', 'Throne Room', 'Dark Vortex']) {
      expect(wrapper.text()).not.toContain(name)
    }
    expect(wrapper.text()).toContain('To Fields')
    expect(wrapper.text()).toContain('Gobble Inn')
  })

  it('Warrens appears once the hero holds a Map to Warrens', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addPackCount('Map to Warrens', 1)
    const wrapper = mount(ArMound)
    expect(wrapper.text()).toContain('Warrens')
  })

  it('Warrens needs a light source before launching a quest', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addPackCount('Map to Warrens', 1)
    hero.setWits(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'Warrens').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('TORCHES')
  })

  it('Warrens launches a real quest once the hero carries a light source', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addPackCount('Map to Warrens', 1)
    hero.addPackCount('Torch', 1)
    hero.setWits(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'Warrens').trigger('click')

    expect(nav.currentComponent).toBe(ArQuest)
    expect((nav.currentProps as { session: QuestSession }).session.title).toBe('Goblin Mound Quest')
  })

  it('To Fields shows the exhaustion notice with no quests left', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addFatigue(hero.getBaseQuests())
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'To Fields').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('far too exhausted')
  })

  it('To Fields travels there (notice homed on arField) when the travel roll succeeds', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.setWits(100000)
    const fatigueBefore = hero.getFatigue()
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'To Fields').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('Enter the Fields')
    expect(nav.current?.home?.component).toBe(ArField)
    expect(hero.getFatigue()).toBe(fatigueBefore + 1) // addFatigue(1), not travelWork(1)
  })

  it('To Fields ambushes into a real Warrens-pool encounter when the travel roll fails', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.setWits(0)
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'To Fields').trigger('click')

    expect(nav.currentComponent).toBe(ArQuest)
    expect((nav.currentProps as { session: QuestSession }).session.title).toBe('Goblin Mound Quest')
  })

  it('Dark Vortex is unavailable with no quests left', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addPackCount('Map to Vortex', 1)
    hero.addFatigue(hero.getBaseQuests())
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'Dark Vortex').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('far too exhausted')
  })

  it('Dark Vortex launches a real quest with no light source needed', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addPackCount('Map to Vortex', 1)
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'Dark Vortex').trigger('click')

    expect(nav.currentComponent).toBe(ArQuest)
    expect((nav.currentProps as { session: QuestSession }).session.title).toBe('Vortex Mouth')
  })

  it('Gobble Inn opens arGoblin', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArMound)

    await spot(wrapper, 'Gobble Inn').trigger('click')
    expect(nav.currentComponent).toBe(ArGoblin)
  })
})
