import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import ArPeer from './arPeer.vue'
import ArTown from '../Areas/arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arPeer', () => {
  it('spend=1: own hero resolves for free with no network call', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    vi.stubGlobal('fetch', vi.fn())
    const wrapper = mount(ArPeer, { props: { spend: 1 } })
    await flushPromises()

    expect(wrapper.text()).toContain('Cost: Free')
    expect(wrapper.text()).toContain('Zog')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('spend=1: seeking another hero fetches from the server and shows the description', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(1000)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ save: { type: 'hero', name: 'Bobby', guts: 5, wits: 5, charm: 5, items: [] } }),
          { status: 200 },
        ),
      ),
    )
    const wrapper = mount(ArPeer, { props: { spend: 1 } })
    await flushPromises()

    await wrapper.find('input[type=text]').setValue('Bobby')
    await wrapper.find('.peer__seek button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Bobby')
    expect(hero.getMoney()).toBe(1000 - 250)
  })

  it('shows "Unable to Load" when the server has no such hero', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(1000)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 404 })))
    const wrapper = mount(ArPeer, { props: { spend: 1 } })
    await flushPromises()

    await wrapper.find('input[type=text]').setValue('Nobody')
    await wrapper.find('.peer__seek button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to Load <Nobody>')
  })

  it('spend=4 (CLANPEER) shows no seek field and views the given hero directly', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ save: { type: 'hero', name: 'Petitioner', guts: 4, wits: 4, charm: 4, items: [] } }),
          { status: 200 },
        ),
      ),
    )
    const wrapper = mount(ArPeer, { props: { spend: 4, who: 'Petitioner' } })
    await flushPromises()

    expect(wrapper.find('.peer__seek').exists()).toBe(false)
    expect(wrapper.text()).toContain('Petitioner')
  })

  it('Done returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArPeer, { spend: 1 })

    const wrapper = mount(ArPeer, { props: { spend: 1 } })
    await flushPromises()
    await wrapper.findAll('button').find((b) => b.text() === 'Done')!.trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}
