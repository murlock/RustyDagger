import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArHills from './arHills.vue'
import ArForest from './arForest.vue'
import ArGemShop from '../Areas/Hills/arGemShop.vue'
import ArMagicShop from '../Areas/Hills/arMagicShop.vue'
import ArExit from '../Command/arExit.vue'
import ArNotice from '../Utility/arNotice.vue'
import { setHiddenBits } from './arHills.state'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
  // arHills.state.ts's hidden-bits map is a real module singleton, keyed
  // by hero name (see its comment) - it survives across tests in this file
  // the same way it survives ArHills unmount/remount in the real app, so
  // it must be reset by hand here. Every test in this file uses 'Zog'.
  setHiddenBits('Zog', 7)
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot').find((s) => s.text().includes(text))!
}
const HIDDEN_NAMES = ['Jewel Store', 'Magic Shop', 'Abandoned Mines']

describe('arHills', () => {
  it('sets the hero place to hills', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    mount(ArHills)
    expect(hero.getPlace()).toBe(C.HILLS)
  })

  it('Jewel Store, Magic Shop, and Abandoned Mines start hidden', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const wrapper = mount(ArHills)
    for (const name of HIDDEN_NAMES) expect(wrapper.text()).not.toContain(name)
    expect(wrapper.text()).toContain('Quest')
    expect(wrapper.text()).toContain('Exit Game')
    expect(wrapper.text()).toContain('Forest Trail')
  })

  it('Quest requires Rope even when nothing is hidden anymore', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.setWits(100000)
    hero.addPackCount('Rope', 3) // needsRope() gates *every* testAdvance() call here, including the 3 search clicks
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    // Exhaust the search pool (3 clicks reveals everything and each one
    // consumes a Rope too), then Quest again - now out of Rope - should
    // hit the needsRope() gate before ever reaching pickQuest().
    for (let i = 0; i < 3; i++) await spot(wrapper, 'Quest').trigger('click')
    expect(hero.packCount('Rope')).toBe(0)
    await spot(wrapper, 'Quest').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('ROPE')
  })

  it('Quest succeeds once the hero is carrying enough Rope', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.setWits(100000)
    hero.addPackCount('Rope', 5) // 3 search clicks + 1 final click, each consumes one
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    for (let i = 0; i < 3; i++) await spot(wrapper, 'Quest').trigger('click')
    await spot(wrapper, 'Quest').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('not available yet')
    expect(hero.packCount('Rope')).toBe(1)
  })

  it('Abandoned Mines (once revealed) needs Rope, then shows a quest-not-available notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.setWits(100000)
    hero.addPackCount('Rope', 3) // enough to get through the 3 reveal clicks
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    for (let tries = 0; tries < 3 && !wrapper.text().includes('Abandoned Mines'); tries++) {
      await spot(wrapper, 'Quest').trigger('click')
    }
    expect(wrapper.text()).toContain('Abandoned Mines')
    hero.getPack().fixCount('Rope', 0) // however much the reveal search used, make sure none is left for the check below

    await spot(wrapper, 'Abandoned Mines').trigger('click')
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('ROPE')

    hero.addPackCount('Rope', 1)
    await spot(wrapper, 'Abandoned Mines').trigger('click')
    expect((nav.currentProps as { message: string }).message).toContain('not available yet')
  })

  it('Jewel Store and Magic Shop (once revealed) open their shops', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.setWits(100000)
    hero.addPackCount('Rope', 3) // enough to get through the 3 reveal clicks
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    for (let i = 0; i < 3; i++) await spot(wrapper, 'Quest').trigger('click')
    expect(wrapper.text()).toContain('Jewel Store')
    expect(wrapper.text()).toContain('Magic Shop')

    await spot(wrapper, 'Jewel Store').trigger('click')
    expect(nav.currentComponent).toBe(ArGemShop)

    await wrapper.vm.$nextTick()
    await spot(wrapper, 'Magic Shop').trigger('click')
    expect(nav.currentComponent).toBe(ArMagicShop)
  })

  it('does not leak discovered locations between different heroes', async () => {
    const heroStore = useHeroStore()
    const alice = heroStore.createHero('Alice')
    alice.calcRaise()
    alice.setWits(100000)
    alice.addPackCount('Rope', 3)
    const wrapperAlice = mount(ArHills)
    for (let tries = 0; tries < 3 && HIDDEN_NAMES.every((n) => !wrapperAlice.text().includes(n)); tries++) {
      await spot(wrapperAlice, 'Quest').trigger('click')
    }
    expect(HIDDEN_NAMES.some((n) => wrapperAlice.text().includes(n))).toBe(true)

    heroStore.createHero('Bob').calcRaise()
    const wrapperBob = mount(ArHills)
    for (const name of HIDDEN_NAMES) expect(wrapperBob.text()).not.toContain(name)
  })

  it('Exit Game routes to arExit with the hills location', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    await spot(wrapper, 'Exit Game').trigger('click')
    expect(nav.currentComponent).toBe(ArExit)
    expect(nav.currentProps).toEqual({ loc: C.HILLS })
  })

  it('Forest Trail travels to arForest when the roll succeeds', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    hero.setWits(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArHills)

    await spot(wrapper, 'Forest Trail').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('Enter the Forest')
    expect(nav.current?.home?.component).toBe(ArForest)
  })
})
