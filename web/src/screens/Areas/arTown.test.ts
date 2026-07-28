import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import ArTown from './arTown.vue'
import ArTrader from './Town/arTrader.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arTown', () => {
  it('hides the Castle Gate hotspot below level 6', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    expect(wrapper.text()).not.toContain('Castle Gate')
  })

  it('shows the Castle Gate hotspot at level 6+', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 6)
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    const wrapper = mount(ArTown)
    expect(wrapper.text()).toContain('Castle Gate')
  })

  it('navigates to arTrader when the Trade Shop hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    await wrapper.get('.hotspot:not(.hotspot--disabled)').trigger('click')
    expect(nav.currentComponent).toBe(ArTrader)
  })

  it('shows a level-up banner when checkLevel() fires on mount', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.learn(hero.getRaise())

    const wrapper = mount(ArTown)
    await nextTick() // onMounted's checkLevel() result lands via a ref, one tick after mount
    expect(wrapper.text()).toContain('Level')
    expect(hero.getLevel()).toBe(1)
  })
})
