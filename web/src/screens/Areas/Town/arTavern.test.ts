import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setSeed } from '../../../engine/dice'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import * as C from '../../../domain/constants'
import ArTavern from './arTavern.vue'
import ArTown from '../arTown.vue'
import ArExit from '../../Command/arExit.vue'
import ArStorage from '../../Utility/arStorage.vue'
import ArNotice from '../../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.tavern__options button').find((b) => b.text().includes(label))!
}

describe('arTavern', () => {
  it('shows level-scaled costs for each option', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 2)
    const wrapper = mount(ArTavern)

    expect(button(wrapper, 'Buy a Drink').text()).toContain('$1')
    expect(button(wrapper, 'Sleep on Floor').text()).toContain('$6') // 4 + level
    expect(button(wrapper, 'Rent a Room').text()).toContain('$30') // 20 + 5*level
    expect(button(wrapper, 'Rent a Suite').text()).toContain('$125') // 75 + 25*level
  })

  it('options are disabled when the hero cannot afford them', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTavern)

    expect(button(wrapper, 'Rent a Suite').attributes('disabled')).toBeDefined()
  })

  it('Sleep on Floor deducts the cost and routes to arExit', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const nav = useNavigationStore()
    const wrapper = mount(ArTavern)

    await button(wrapper, 'Sleep on Floor').trigger('click')

    expect(hero.getMoney()).toBe(96)
    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.FLOOR })
  })

  it('Storage falls back to stored Marks when cash falls short, and routes to arStorage', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 1) // so the $50 storage cost isn't $0 (bare createHero() defaults to level 0)
    hero.addMoney(20)
    hero.addStore('Marks', 100)
    const nav = useNavigationStore()
    const wrapper = mount(ArTavern)

    await button(wrapper, 'Storage').trigger('click')

    expect(hero.getMoney()).toBe(0)
    expect(hero.storeCount('Marks')).toBe(100 - 30) // level-1 storage cost ($50) minus the $20 cash covered
    expect(nav.currentComponent).toBe(ArStorage)
  })

  it('Buy a Drink deducts $1 and shows a gossip notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(10)
    const nav = useNavigationStore()
    const wrapper = mount(ArTavern)

    await button(wrapper, 'Buy a Drink').trigger('click')

    expect(hero.getMoney()).toBeLessThanOrEqual(9)
    expect(nav.currentComponent).toBe(ArNotice)
  })

  it('Exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArTavern)

    const wrapper = mount(ArTavern)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})
