import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../stores/navigation'
import { ItHero } from '../../domain/itHero'
import { DEAD } from '../../domain/itAgent'
import { saveHero } from '../../engine/heroStorage'
import { heroHasDied } from '../../domain/gameStrings'
import * as C from '../../domain/constants'
import { useHeroStore } from '../../stores/hero'
import ArEntry from './arEntry.vue'
import ArCreate from './arCreate.vue'
import ArBuild from './arBuild.vue'
import ArTown from '../Areas/arTown.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('arEntry', () => {
  it('disables Enter until the name is at least 4 characters', async () => {
    const wrapper = mount(ArEntry)
    const button = wrapper.get('button')
    await wrapper.get('#hero-name').setValue('Zog')
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.get('#hero-name').setValue('Zogo')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('routes an unknown name to arCreate with the typed name as a prop', async () => {
    const wrapper = mount(ArEntry)
    const nav = useNavigationStore()
    await wrapper.get('#hero-name').setValue('Newbie')
    await wrapper.get('button').trigger('click')

    expect(nav.currentComponent).toBe(ArCreate)
    expect(nav.currentProps).toEqual({ name: 'Newbie' })
    expect(nav.showStatusBar).toBe(false)
  })

  it('routes an existing alive hero straight to arTown and syncs place to Town', async () => {
    const hero = new ItHero('Returner')
    saveHero(hero)

    const wrapper = mount(ArEntry)
    const nav = useNavigationStore()
    await wrapper.get('#hero-name').setValue('Returner')
    await wrapper.get('button').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
    expect(nav.showStatusBar).toBe(true)

    // heroStore.hero was mutated and saved before navigating
    expect(useHeroStore().hero!.getPlace()).toBe(C.TOWN)
  })

  it('routes a hero past level 5 with no recorded looks through arBuild, homed on arTown', async () => {
    const hero = new ItHero('Builder')
    hero.getRank().fixCount(C.LEVEL, 6)
    saveHero(hero)

    const wrapper = mount(ArEntry)
    const nav = useNavigationStore()
    await wrapper.get('#hero-name').setValue('Builder')
    await wrapper.get('button').trigger('click')

    expect(nav.currentComponent).toBe(ArBuild)
    expect(nav.showStatusBar).toBe(false)
    nav.goHome()
    expect(nav.currentComponent).toBe(ArTown)
  })

  it('shows a notice and does not navigate for a dead hero', async () => {
    const hero = new ItHero('Doomed')
    hero.setState(DEAD)
    saveHero(hero)

    const wrapper = mount(ArEntry)
    const nav = useNavigationStore()
    await wrapper.get('#hero-name').setValue('Doomed')
    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain(heroHasDied)
    expect(nav.currentComponent).toBeNull()
  })
})
