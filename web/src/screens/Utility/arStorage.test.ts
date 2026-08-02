import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { loadHero } from '../../engine/heroStorage'
import ArStorage from './arStorage.vue'
import ArTown from '../Areas/arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arStorage', () => {
  it('selecting a single-count pack item transfers it to storage immediately', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    const wrapper = mount(ArStorage, { props: { title: 'The Rusty Flagon' } })

    const lists = wrapper.findAll('.storage__list')
    const packRow = lists[0].findAll('li').find((li) => li.text().startsWith('Torch'))!
    await packRow.trigger('click')

    expect(hero.packCount('Torch')).toBe(0)
    expect(hero.storeCount('Torch')).toBe(1)
  })

  it('the rendered lists themselves reflect the transfer, not just hero state', async () => {
    // Regression test: useTransfer.ts's purseRows/stashRows computeds read
    // plain (non-reactive) ItList objects with no tracked Vue dependency, so
    // without its `version` counter these would keep showing the pre-move
    // snapshot forever even though the underlying hero state above is
    // correct - found while building arPackage.vue on the same composable.
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    const wrapper = mount(ArStorage, { props: { title: 'The Rusty Flagon' } })

    const packRow = wrapper.findAll('.storage__list')[0].findAll('li').find((li) => li.text().startsWith('Torch'))!
    await packRow.trigger('click')

    const lists = wrapper.findAll('.storage__list')
    expect(lists[0].findAll('li').some((li) => li.text().startsWith('Torch'))).toBe(false)
    expect(lists[1].findAll('li').some((li) => li.text().startsWith('Torch'))).toBe(true)
  })

  it('selecting a stack of Food shows a quantity control, and Transfer moves the chosen amount', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Food', 10)
    const wrapper = mount(ArStorage, { props: { title: 'The Rusty Flagon' } })

    const lists = wrapper.findAll('.storage__list')
    const packRow = lists[0].findAll('li').find((li) => li.text().startsWith('Food'))!
    await packRow.trigger('click')

    expect(wrapper.find('input[type=range]').exists()).toBe(true)
    await wrapper.find('input[type=range]').setValue(4)
    await wrapper.get('.storage__transfer button').trigger('click')

    expect(hero.packCount('Food')).toBe(6)
    expect(hero.storeCount('Food')).toBe(4)
    expect(loadHero('Zog')!.storeCount('Food')).toBe(4)
  })

  it('selecting a stored item moves it back to the pack', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addStore('Rope', 1)
    const wrapper = mount(ArStorage, { props: { title: 'The Rusty Flagon' } })

    const lists = wrapper.findAll('.storage__list')
    const storeRow = lists[1].findAll('li').find((li) => li.text().startsWith('Rope'))!
    await storeRow.trigger('click')

    expect(hero.packCount('Rope')).toBe(1)
    expect(hero.storeCount('Rope')).toBe(0)
  })

  it('Exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArStorage, { title: 'The Rusty Flagon' })

    const wrapper = mount(ArStorage, { props: { title: 'The Rusty Flagon' } })
    await wrapper.get('.storage__header button').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})
