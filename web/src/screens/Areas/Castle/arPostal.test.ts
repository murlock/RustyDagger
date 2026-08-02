import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import ArPostal from './arPostal.vue'
import ArPackage from '../../Utility/arPackage.vue'
import ArTown from '../arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('arPostal', () => {
  it('lists mail fetched from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ mail: [{ id: 1, sender: 'Bobby', label: 'Package from SirBobby' }] }), { status: 200 })),
    )
    const heroStore = useHeroStore()
    heroStore.createHero('Zoggy')
    const wrapper = mount(ArPostal)
    await flush()

    expect(wrapper.text()).toContain('Package from SirBobby')
  })

  it('shows "-- empty --" with no mail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ mail: [] }), { status: 200 })))
    const heroStore = useHeroStore()
    heroStore.createHero('Zoggy')
    const wrapper = mount(ArPostal)
    await flush()

    expect(wrapper.text()).toContain('-- empty --')
  })

  it('Take Mail adds the package contents to the pack, deducts $100, and removes the row', async () => {
    const payload = { type: 'list', name: 'Mail', items: [{ type: 'count', name: 'Torch', count: 3 }] }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input)
        if (url.includes('/take/')) {
          return new Response(JSON.stringify({ sender: 'Bobby', label: 'Package from SirBobby', payload }), { status: 200 })
        }
        return new Response(JSON.stringify({ mail: [{ id: 7, sender: 'Bobby', label: 'Package from SirBobby' }] }), { status: 200 })
      }),
    )
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.addMoney(1000)
    const wrapper = mount(ArPostal)
    await flush()

    await wrapper.find('.postal__box li').trigger('click')
    await wrapper.findAll('button').find((b) => b.text().startsWith('Take Mail'))!.trigger('click')
    await flush()

    expect(hero.packCount('Torch')).toBe(3)
    expect(hero.getMoney()).toBe(900)
    expect(wrapper.text()).toContain('-- empty --')
  })

  it('a failed Take Mail leaves the row in place (client/server stay consistent)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input)
        if (url.includes('/take/')) return new Response(JSON.stringify({ error: 'gone' }), { status: 404 })
        return new Response(JSON.stringify({ mail: [{ id: 7, sender: 'Bobby', label: 'Package from SirBobby' }] }), { status: 200 })
      }),
    )
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.addMoney(1000)
    const wrapper = mount(ArPostal)
    await flush()

    await wrapper.find('.postal__box li').trigger('click')
    await wrapper.findAll('button').find((b) => b.text().startsWith('Take Mail'))!.trigger('click')
    await flush()

    expect(hero.getMoney()).toBe(1000)
    expect(wrapper.text()).toContain('Package from SirBobby')
  })

  it('Send Mail routes to arPackage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ mail: [] }), { status: 200 })))
    const heroStore = useHeroStore()
    heroStore.createHero('Zoggy')
    const nav = useNavigationStore()
    const wrapper = mount(ArPostal)
    await flush()

    await wrapper.findAll('button').find((b) => b.text().startsWith('Send Mail'))!.trigger('click')
    expect(nav.currentComponent).toBe(ArPackage)
  })

  it('Exit returns to the screen that opened it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ mail: [] }), { status: 200 })))
    const heroStore = useHeroStore()
    heroStore.createHero('Zoggy')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArPostal)
    const wrapper = mount(ArPostal)
    await flush()

    await wrapper.get('.indoors__exit').trigger('click')
    expect(nav.currentComponent).toBe(ArTown)
  })
})
