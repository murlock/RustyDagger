import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import * as C from '../../domain/constants'
import ArField from './arField.vue'
import ArTown from '../Areas/arTown.vue'
import ArHealer from '../Areas/Fields/arHealer.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot').find((s) => s.text().includes(text))!
}

describe('arField', () => {
  it('sets the hero place to fields', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    mount(ArField)
    expect(hero.getPlace()).toBe(C.FIELDS)
  })

  it('hides Forest Road below level 4 and Goblin Mound below level 8', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArField)
    expect(wrapper.text()).not.toContain('Forest Road')
    expect(wrapper.text()).not.toContain('Goblin Mound')
  })

  it('shows Forest Road at level 4+ and Goblin Mound at level 8+, both disabled', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 8)
    hero.calcRaise()
    const wrapper = mount(ArField)
    expect(spot(wrapper, 'Forest Road').classes()).toContain('hotspot--disabled')
    expect(spot(wrapper, 'Goblin Mound').classes()).toContain('hotspot--disabled')
  })

  it('Town Road returns to arTown', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArField)

    await spot(wrapper, 'Town Road').trigger('click')
    expect(nav.currentComponent).toBe(ArTown)
  })

  it('Healers Tower opens arHealer', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArField)

    await spot(wrapper, 'Healers Tower').trigger('click')
    expect(nav.currentComponent).toBe(ArHealer)
  })

  it('Exit Game routes to arExit with the fields location', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArField)

    await spot(wrapper, 'Exit Game').trigger('click')
    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.FIELDS })
  })

  it('Quest! shows the exhaustion notice when the hero has no quests left', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.addFatigue(hero.getBaseQuests())
    const nav = useNavigationStore()
    const wrapper = mount(ArField)

    await spot(wrapper, 'Quest!').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('far too exhausted')
  })

  it('Quest! shows a quest-not-available notice when the hero can adventure', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArField)

    await spot(wrapper, 'Quest!').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('not available yet')
  })
})
