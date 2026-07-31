import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { loadHero } from '../../engine/heroStorage'
import * as C from '../../domain/constants'
import { DEAD } from '../../domain/itAgent'
import ArExit from './arExit.vue'
import ArFinish from './arFinish.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arExit', () => {
  it('sets the hero place and shows that place\'s sleep text', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArExit, { props: { loc: C.FLOOR } })

    expect(heroStore.hero!.getPlace()).toBe(C.FLOOR)
    expect(wrapper.text()).toContain('unsoiled section of floor')
  })

  it('adds camp-gear flavor text when the hero is carrying the matching item', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Cooking Gear', 1)
    const wrapper = mount(ArExit, { props: { loc: C.FIELDS } })

    expect(wrapper.text()).toContain('hearty dinner')
  })

  it('shows the death message and exhausts the hero instead of sleep text when dead', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setState(DEAD)
    const wrapper = mount(ArExit, { props: { loc: C.FOREST } })

    expect(wrapper.text()).toContain('you have been killed')
    expect(wrapper.text()).toContain(C.FOREST)
    expect(hero.getFatigue()).toBe(hero.getBaseQuests())
  })

  it('shows how many quests remain today', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArExit, { props: { loc: C.TOWN } })

    expect(wrapper.text()).toContain('Quests Remain for Today')
  })

  it('Continue saves the hero and advances to arFinish', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArExit, { props: { loc: C.TOWN } })

    await wrapper.get('button').trigger('click')

    expect(nav.currentComponent).toBe(ArFinish)
    expect(loadHero('Zog')).not.toBeNull()
  })
})
