import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import ArMagicShop from './arMagicShop.vue'
import ArHills from '../../Wilds/arHills.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.trade__list li').find((li) => li.text().startsWith(name))
}

describe('arMagicShop', () => {
  it('doubles the gear-table price for its own stock', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArMagicShop)

    // Identify Scroll costs $60 in GearTable; this shop marks it up 2x.
    expect(row(wrapper, 'Identify Scroll')?.text()).toContain('$120')
  })

  it('will also buy any potion or scroll beyond its own stock list', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Cookie', 1) // type 6 (Potion), not in this shop's own stock
    const wrapper = mount(ArMagicShop)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    expect(row(wrapper, 'Cookie')).toBeDefined()
  })

  it('has no special button', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArMagicShop)

    expect(wrapper.findAll('.trade__actions button, button').some((b) => b.text().includes('Peer'))).toBe(false)
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArHills)
    nav.goto(ArMagicShop)

    const wrapper = mount(ArMagicShop)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArHills)
  })
})
