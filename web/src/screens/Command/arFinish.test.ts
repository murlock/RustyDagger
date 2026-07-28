import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import { DEAD } from '../../domain/itAgent'
import * as C from '../../domain/constants'
import ArFinish from './arFinish.vue'
import ArRanking from './arRanking.vue'
import ArEntry from './arEntry.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function seededHero(name: string) {
  const heroStore = useHeroStore()
  heroStore.createHero(name)
  heroStore.save()
  heroStore.load(name) // captures the sessionStart snapshot, like a real login
  return heroStore
}

describe('arFinish', () => {
  it('shows "Spirit!" when nothing changed since session start', () => {
    seededHero('Zog')
    const wrapper = mount(ArFinish)
    expect(wrapper.text()).toContain('Spirit!')
  })

  it('shows non-zero stat deltas since session start', () => {
    const heroStore = seededHero('Zog')
    heroStore.hero!.setGuts(heroStore.hero!.getGuts() + 5)
    const wrapper = mount(ArFinish)
    expect(wrapper.text()).toContain('+5 Guts')
    expect(wrapper.text()).not.toContain('Spirit!')
  })

  it('picks the Floor portrait for an alive hero in a known place', () => {
    const heroStore = seededHero('Zog')
    heroStore.hero!.setPlace(C.TOWN)
    const wrapper = mount(ArFinish)
    expect(wrapper.get('.finish__portrait').attributes('src')).toBe('/Images/Final/Floor.jpg')
  })

  it('picks the Dead portrait for a dead hero regardless of place', () => {
    const heroStore = seededHero('Zog')
    heroStore.hero!.setPlace(C.TOWN)
    heroStore.hero!.setState(DEAD)
    const wrapper = mount(ArFinish)
    expect(wrapper.get('.finish__portrait').attributes('src')).toBe('/Images/Final/Dead.jpg')
  })

  it('Lists routes to arRanking', async () => {
    seededHero('Zog')
    const wrapper = mount(ArFinish)
    const nav = useNavigationStore()
    await wrapper.get('.finish__actions button:first-child').trigger('click')
    expect(nav.currentComponent).toBe(ArRanking)
  })

  it('Play Again routes to arEntry', async () => {
    seededHero('Zog')
    const wrapper = mount(ArFinish)
    const nav = useNavigationStore()
    await wrapper.get('.finish__again').trigger('click')
    expect(nav.currentComponent).toBe(ArEntry)
  })

  it('toggles credits text', async () => {
    seededHero('Zog')
    const wrapper = mount(ArFinish)
    expect(wrapper.find('.finish__credits').exists()).toBe(false)
    await wrapper.get('.finish__actions button:last-child').trigger('click')
    expect(wrapper.find('.finish__credits').exists()).toBe(true)
  })
})
