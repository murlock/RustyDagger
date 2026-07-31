import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArForest from './arForest.vue'
import ArField from './arField.vue'
import ArHills from './arHills.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'
import { setHiddenBits } from './arForest.state'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
  // arForest.state.ts's hidden-bits map is a real module singleton, keyed
  // by hero name (see its comment) - it survives across tests in this file
  // the same way it survives ArForest unmount/remount in the real app, so
  // it must be reset by hand here. Every test in this file uses 'Zog'.
  setHiddenBits('Zog', 7)
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot').find((s) => s.text().includes(text))!
}
const HIDDEN_NAMES = ['Smithy', 'The Guild', 'Mountain Trail']

describe('arForest', () => {
  it('sets the hero place to forest', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    mount(ArForest)
    expect(hero.getPlace()).toBe(C.FOREST)
  })

  it('Smithy, The Guild, and Mountain Trail start hidden', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArForest)
    for (const name of HIDDEN_NAMES) expect(wrapper.text()).not.toContain(name)
    expect(wrapper.text()).toContain('To Fields')
    expect(wrapper.text()).toContain('Quest!')
    expect(wrapper.text()).toContain('Exit Game')
  })

  it('a successful search reveals exactly one hidden location', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setWits(100000) // overwhelms doSearch's contest(wits, power*20=40)
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    await spot(wrapper, 'Quest!').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('you discover')
    const revealed = HIDDEN_NAMES.filter((name) => wrapper.text().includes(name))
    expect(revealed.length).toBe(1)
  })

  it('does not leak discovered locations between different heroes', async () => {
    const heroStore = useHeroStore()
    const alice = heroStore.createHero('Alice')
    alice.setWits(100000)
    const wrapperAlice = mount(ArForest)
    for (let tries = 0; tries < 3 && HIDDEN_NAMES.every((n) => !wrapperAlice.text().includes(n)); tries++) {
      await spot(wrapperAlice, 'Quest!').trigger('click')
    }
    expect(HIDDEN_NAMES.some((n) => wrapperAlice.text().includes(n))).toBe(true)

    heroStore.createHero('Bob')
    const wrapperBob = mount(ArForest)
    for (const name of HIDDEN_NAMES) expect(wrapperBob.text()).not.toContain(name)
  })

  it('Exit Game routes to arExit with the forest location', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    await spot(wrapper, 'Exit Game').trigger('click')
    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.FOREST })
  })

  it('To Fields shows the exhaustion notice when the hero has no quests left', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addFatigue(hero.getBaseQuests())
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    await spot(wrapper, 'To Fields').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('far too exhausted')
  })

  it('To Fields travels there (notice homed on arField) when the travel roll succeeds', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setWits(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    await spot(wrapper, 'To Fields').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('Enter the Fields')
    expect(nav.current?.home?.component).toBe(ArField)
  })

  it('To Fields shows a quest-not-available notice when the travel roll fails', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setWits(0)
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    await spot(wrapper, 'To Fields').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('not available yet')
  })

  it('Mountain Trail (once revealed) travels to arHills when the roll succeeds', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setWits(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArForest)

    // Each successful search reveals one distinct hidden location and
    // removes it from the pool, so all 3 are always found within 3 clicks.
    for (let tries = 0; tries < 3 && !wrapper.text().includes('Mountain Trail'); tries++) {
      await spot(wrapper, 'Quest!').trigger('click')
    }
    expect(wrapper.text()).toContain('Mountain Trail')

    await spot(wrapper, 'Mountain Trail').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('Enter the Mountains')
    expect(nav.current?.home?.component).toBe(ArHills)
  })
})
