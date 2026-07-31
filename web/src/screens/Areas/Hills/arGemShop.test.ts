import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import ArGemShop from './arGemShop.vue'
import ArHills from '../../Wilds/arHills.vue'
import NotImplemented from '../../Utility/NotImplemented.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.trade__list li').find((li) => li.text().startsWith(name))
}

describe('arGemShop', () => {
  it('lists the gem stock with GearTable prices', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArGemShop)

    expect(row(wrapper, 'Quartz')?.text()).toContain('$100')
  })

  it('will also buy Loot-type treasure that is not part of its own stock', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Tusk', 1) // type 4 (Loot), not a gem in this shop's own stock list
    const wrapper = mount(ArGemShop)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    expect(row(wrapper, 'Tusk')).toBeDefined()
  })

  it('does not offer to buy junk that has no stock value at all', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Rock', 1) // type 0 (Junk), cost 0 - excluded on that basis alone
    const wrapper = mount(ArGemShop)

    await wrapper.findAll('input[type=radio]')[1].setValue(true)
    expect(row(wrapper, 'Rock')).toBeUndefined()
  })

  it('the Peer button routes to NotImplemented (arPeer not ported yet)', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArGemShop)

    const peer = wrapper.findAll('button').find((b) => b.text().includes('Peer'))!
    await peer.trigger('click')
    expect(nav.currentComponent).toBe(NotImplemented)
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArHills)
    nav.goto(ArGemShop)

    const wrapper = mount(ArGemShop)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArHills)
  })
})
