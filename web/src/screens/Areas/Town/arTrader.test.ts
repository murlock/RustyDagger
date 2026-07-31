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

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.trade__list li').find((li) => li.text().startsWith(name))!
}

describe('arTrader', () => {
  it('lists the stock with GearTable prices', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTrader)

    expect(row(wrapper, 'Food').text()).toContain('$2')
  })

  it('buying deducts money, updates the pack count shown, and persists', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(10)
    const wrapper = mount(ArTrader)

    await row(wrapper, 'Food').trigger('click')
    await wrapper.findAll('.trade__actions button')[1].trigger('click') // "1"

    expect(hero.getMoney()).toBe(8)
    expect(row(wrapper, 'Food').text()).toContain('Food(1)')
    expect(loadHero('Zog')!.packCount('Food')).toBe(1)
  })

  it('buying is capped by what the hero can afford', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(3)
    const wrapper = mount(ArTrader)

    await row(wrapper, 'Rope').trigger('click')
    await wrapper.findAll('.trade__actions button')[2].trigger('click') // "10"

    expect(hero.getMoney()).toBe(3)
  })

  it('switching to Sell lists pack contents and selling refunds money', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Food', 5)
    const wrapper = mount(ArTrader)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    await row(wrapper, 'Food').trigger('click')
    await wrapper.findAll('.trade__actions button')[1].trigger('click') // "1"

    expect(hero.packCount('Food')).toBe(4)
    expect(hero.getMoney()).toBeGreaterThan(0)
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
