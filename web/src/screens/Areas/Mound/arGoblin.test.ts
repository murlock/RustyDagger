import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import * as C from '../../../domain/constants'
import ArGoblin from './arGoblin.vue'
import ArExit from '../../Command/arExit.vue'
import ArNotice from '../../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function innButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.goblin__inn button').find((b) => b.text().startsWith(label))!
}

describe('arGoblin', () => {
  it('shows the Inn tab by default with its three lodging/drink options', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArGoblin)

    expect(wrapper.text()).toContain('Sleep on Floor')
    expect(wrapper.text()).toContain('Buy a Drink $10')
    expect(wrapper.text()).toContain('Rent Smelly Cot $75')
  })

  it('Sleep on Floor is always free and routes to arExit at the Mound', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArGoblin)

    await innButton(wrapper, 'Sleep on Floor').trigger('click')

    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.MOUND })
  })

  it('Rent Smelly Cot costs 75 + 25 * level, halved with the Hotel trait', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 2)
    hero.calcRaise()
    const wrapper = mount(ArGoblin)
    expect(wrapper.text()).toContain('Rent Smelly Cot $125') // 75 + 25*2

    hero.fixStatTrait(C.HOTEL)
    const wrapper2 = mount(ArGoblin)
    expect(wrapper2.text()).toContain('Rent Smelly Cot $12') // trunc(125 / 10)
  })

  it('Rent Smelly Cot deducts money and routes to arExit at the Cot', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const nav = useNavigationStore()
    const wrapper = mount(ArGoblin)

    await innButton(wrapper, 'Rent Smelly Cot').trigger('click')

    expect(hero.getMoney()).toBe(25) // 100 - 75
    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.COT })
  })

  it('Rent Smelly Cot is disabled when unaffordable', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(10)
    const wrapper = mount(ArGoblin)

    expect(innButton(wrapper, 'Rent Smelly Cot').attributes('disabled')).toBeDefined()
    await innButton(wrapper, 'Rent Smelly Cot').trigger('click')
    expect(hero.getMoney()).toBe(10)
  })

  it('Buy a Drink at 0 Charm always slips a mickey, emptying the entire pack (money included)', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(50)
    hero.addPackCount('Food', 3)
    const nav = useNavigationStore()
    const wrapper = mount(ArGoblin)

    await innButton(wrapper, 'Buy a Drink').trigger('click')

    // Money is itself stored as a "Marks" pack entry (see itAgent.ts's
    // getMoney()/subMoney()) - Java's Screen.getPack().clrQueue() wipes the
    // whole pack, Marks included, matching the "*** Your Backpack is Empty!
    // ***" flavor line. The $10 drink cost was already spent first, but
    // that's moot once the pack (and the Marks it held) is cleared right
    // after.
    expect(hero.getMoney()).toBe(0)
    expect(hero.packCount('Food')).toBe(0)
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('mickey')
  })

  it('Buy a Drink shows the exhaustion notice when the hero has no quests left', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(50)
    hero.addFatigue(hero.getBaseQuests())
    const nav = useNavigationStore()
    const wrapper = mount(ArGoblin)

    await innButton(wrapper, 'Buy a Drink').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('nearly pass out')
  })

  it('the Shop tab is buy-only: no Sell toggle is ever rendered', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArGoblin)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Shop tab
    expect(wrapper.findAll('input[type=radio]')).toHaveLength(2) // just Inn/Shop, no Buy/Sell
    expect(wrapper.text()).toContain('Gobble Inn Postcard')
  })

  it('buying an item deducts money and adds it to the pack', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(1000)
    const wrapper = mount(ArGoblin)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Shop tab
    const row = wrapper.findAll('.goblin__list li').find((li) => li.text().startsWith('Identify Scroll'))!
    await row.trigger('click')
    const buy = wrapper.findAll('.goblin__actions button').find((b) => b.text().startsWith('Buy'))!
    const priceMatch = buy.text().match(/\$(\d+)/)!
    const price = Number(priceMatch[1])

    await buy.trigger('click')

    expect(hero.getMoney()).toBe(1000 - price)
    expect(hero.packCount('Identify Scroll')).toBe(1)
  })

  it('buying is capped by what the hero can afford', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(10) // Identify Scroll costs 60
    const wrapper = mount(ArGoblin)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Shop tab
    const row = wrapper.findAll('.goblin__list li').find((li) => li.text().startsWith('Identify Scroll'))!
    await row.trigger('click')
    await wrapper.findAll('.goblin__actions button').find((b) => b.text().startsWith('Buy'))!.trigger('click')

    expect(hero.getMoney()).toBe(10)
    expect(hero.packCount('Identify Scroll')).toBe(0)
  })

  it('exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArGoblin)

    await wrapper.get('.indoors__exit').trigger('click')
    expect(nav.currentComponent).toBeNull()
  })
})
