import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import ArCreate from './arCreate.vue'
import ArTown from '../Areas/arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function rows(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.create__row')
}

describe('arCreate', () => {
  it('starts with 20 build points unspent and Enter disabled', () => {
    const wrapper = mount(ArCreate, { props: { name: 'Zog' } })
    expect(wrapper.get('.create__build').text()).toContain('20')
    const enter = wrapper.get('.create__actions button:last-child')
    expect(enter.attributes('disabled')).toBeDefined()
  })

  it('spending build points on a stat enables Enter once the pool hits zero', async () => {
    const wrapper = mount(ArCreate, { props: { name: 'Zog' } })
    const gutsPlus = rows(wrapper)[0].findAll('button')[1]
    for (let i = 0; i < 20; i++) await gutsPlus.trigger('click')

    expect(wrapper.get('.create__build').text()).toContain('0')
    const enter = wrapper.get('.create__actions button:last-child')
    expect(enter.attributes('disabled')).toBeUndefined()
  })

  it('will not raise a stat past what the build pool can afford', async () => {
    const wrapper = mount(ArCreate, { props: { name: 'Zog' } })
    const gutsPlus = rows(wrapper)[0].findAll('button')[1]
    for (let i = 0; i < 25; i++) await gutsPlus.trigger('click')

    // only 20 points exist, so guts caps at 4 + 20 = 24
    expect(rows(wrapper)[0].get('.create__value').text()).toBe('24')
  })

  it('reverts a trait toggle that the remaining build points cannot cover', async () => {
    const wrapper = mount(ArCreate, { props: { name: 'Zog' } })
    const gutsPlus = rows(wrapper)[0].findAll('button')[1]
    for (let i = 0; i < 20; i++) await gutsPlus.trigger('click')

    // build is now 0 - Noble costs 12p, which isn't there to spend
    const nobleCheckbox = wrapper.get('input[type="checkbox"]')
    await nobleCheckbox.setValue(true)
    expect((nobleCheckbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('beginPlay builds the hero from the chosen stats/traits and lands in arTown', async () => {
    const wrapper = mount(ArCreate, { props: { name: 'Warrioress' } })
    const gutsPlus = rows(wrapper)[0].findAll('button')[1]
    for (let i = 0; i < 12; i++) await gutsPlus.trigger('click')
    // spend the remaining 8 points on the Warrior trait
    const warriorCheckbox = wrapper.findAll('input[type="checkbox"]')[2]
    await warriorCheckbox.setValue(true)

    await wrapper.get('.create__actions button:last-child').trigger('click')

    const heroStore = useHeroStore()
    const hero = heroStore.hero!
    expect(hero.getName()).toBe('Warrioress')
    expect(hero.getGuts()).toBe(16)
    expect(hero.getMoney()).toBe(25)
    expect(hero.getPlace()).toBe(C.TOWN)
    expect(hero.fightRank()).toBe(1)
    expect(hero.hasTrait(C.GUILD)).toBe(true)

    const nav = useNavigationStore()
    expect(nav.currentComponent).toBe(ArTown)
  })
})
