import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import { loadHero } from '../../../engine/heroStorage'
import ArTown from '../arTown.vue'
import ArTrader from './arTrader.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function stockRow(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.stock tbody tr').find((tr) => tr.text().startsWith(name))!
}

describe('arTrader', () => {
  it('lists the stock with GearTable prices', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTrader)

    const food = stockRow(wrapper, 'Food')
    expect(food.text()).toContain('$2')
  })

  it('disables Buy for anything the hero cannot afford', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(3)
    const wrapper = mount(ArTrader)

    expect(stockRow(wrapper, 'Food').get('button').attributes('disabled')).toBeUndefined()
    expect(stockRow(wrapper, 'Rope').get('button').attributes('disabled')).toBeDefined()
  })

  it('buying deducts money, updates Have, and persists the purchase', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(10)
    const wrapper = mount(ArTrader)

    await stockRow(wrapper, 'Food').get('button').trigger('click')

    expect(hero.getMoney()).toBe(8)
    expect(stockRow(wrapper, 'Food').findAll('td')[2].text()).toBe('1')
    expect(loadHero('Zog')!.packCount('Food')).toBe(1)
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArTrader)

    const wrapper = mount(ArTrader)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})
