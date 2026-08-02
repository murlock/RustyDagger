import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import ArScribe from './arScribe.vue'
import ArTown from '../Areas/arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arScribe', () => {
  it('Done adds a Letter note to the pack when spend is Pen & Paper', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArScribe, { spend: 'Pen & Paper' })

    const wrapper = mount(ArScribe, { props: { spend: 'Pen & Paper' } })
    await wrapper.find('textarea').setValue('Dear diary...')
    await wrapper.findAll('button').find((b) => b.text() === 'Done')!.trigger('click')

    const note = hero.getPack().find('Letter')
    expect(note).not.toBeNull()
    expect(nav.currentComponent).toBe(ArTown)
  })

  it('Done adds a Postcard note for any other stationery', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    const wrapper = mount(ArScribe, { props: { spend: 'Gobble Inn Postcard' } })
    await wrapper.findAll('button').find((b) => b.text() === 'Done')!.trigger('click')

    expect(hero.getPack().find('Postcard')).not.toBeNull()
  })

  it('does not spend a second unit of stationery on Done (see header comment)', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Pen & Paper', 1)
    const before = hero.packCount('Pen & Paper')
    const wrapper = mount(ArScribe, { props: { spend: 'Pen & Paper' } })
    await wrapper.findAll('button').find((b) => b.text() === 'Done')!.trigger('click')

    expect(hero.packCount('Pen & Paper')).toBe(before)
  })

  it('Cancel discards without adding a note', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArScribe, { spend: 'Pen & Paper' })

    const wrapper = mount(ArScribe, { props: { spend: 'Pen & Paper' } })
    await wrapper.findAll('button').find((b) => b.text() === 'Cancel')!.trigger('click')

    expect(hero.getPack().find('Letter')).toBeNull()
    expect(nav.currentComponent).toBe(ArTown)
  })
})
