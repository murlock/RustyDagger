import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArCastle from './arCastle.vue'
import ArTown from '../Areas/arTown.vue'
import ArQueen from '../Areas/arQueen.vue'
import ArQuest from '../Quest/arQuest.vue'
import ArNotice from '../Utility/arNotice.vue'
import ArClanHall from '../Areas/Castle/arClanHall.vue'
import ArPostal from '../Areas/Castle/arPostal.vue'
import type { QuestSession } from '../Quest/questSession'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot:not(.hotspot--disabled)').find((s) => s.text().includes(text))!
}

describe('arCastle', () => {
  it('Town Gate returns to arTown', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArCastle)

    await spot(wrapper, 'Town Gate').trigger('click')
    expect(nav.currentComponent).toBe(ArTown)
  })

  it('Clan Hall and Post Office route to arClanHall/arPostal', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 10)
    hero.calcRaise()
    const nav = useNavigationStore()

    for (const [text, component] of [['Clan Hall', ArClanHall], ['Post Office', ArPostal]] as const) {
      const wrapper = mount(ArCastle)
      await spot(wrapper, text).trigger('click')
      expect(nav.currentComponent).toBe(component)
    }
  })

  describe('Royal Court (goQueen())', () => {
    it('enters arQueen directly when the hero has social standing', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.getRank().fixCount(C.SOCIAL, 1)
      hero.calcRaise()
      const nav = useNavigationStore()
      const wrapper = mount(ArCastle)

      await spot(wrapper, 'Royal Court').trigger('click')
      expect(nav.currentComponent).toBe(ArQueen)
    })

    it('launches a Castle Quest gated to arQueen when no social standing', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.calcRaise()
      hero.setWits(100000)
      const nav = useNavigationStore()
      const wrapper = mount(ArCastle)

      await spot(wrapper, 'Royal Court').trigger('click')

      expect(nav.currentComponent).toBe(ArQuest)
      const session = (nav.currentProps as { session: QuestSession }).session
      expect(session.title).toBe('Castle Quest')
      expect(session.gate?.component).toBe(ArQueen)
    })
  })

  it('hides Dunjeons below level 8 and Docks below level 10', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const wrapper = mount(ArCastle)

    expect(wrapper.text()).not.toContain('Dunjeons')
    expect(wrapper.text()).not.toContain('Docks')
  })

  it('Dunjeons launches a real quest once level 8+', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 8)
    hero.calcRaise()
    hero.setWits(100000)
    hero.addPackCount('Torch', 1) // needsLight(1) gates the Dunjeons quest
    const nav = useNavigationStore()
    const wrapper = mount(ArCastle)

    await spot(wrapper, 'Dunjeons').trigger('click')

    expect(nav.currentComponent).toBe(ArQuest)
    expect((nav.currentProps as { session: QuestSession }).session.title).toBe('Dunjeon Quest')
  })

  it('Dunjeons needs a light source', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 8)
    hero.calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArCastle)

    await spot(wrapper, 'Dunjeons').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('TORCHES')
  })

  it('Docks failure shows a flavor notice and costs fatigue', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 10)
    hero.calcRaise()
    hero.setWits(0) // guarantees the wits-vs-100 "find ocean" contest fails
    const nav = useNavigationStore()
    const wrapper = mount(ArCastle)
    const fatigueBefore = hero.getFatigue()

    await spot(wrapper, 'Docks').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('fruitless searching')
    expect(hero.getFatigue()).toBe(fatigueBefore + 1)
  })

  it('Docks success routes to a resolved-destination quest behind an arrival notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 10)
    hero.calcRaise()
    hero.setWits(100000) // guarantees the "find ocean" contest succeeds
    const nav = useNavigationStore()
    const wrapper = mount(ArCastle)

    await spot(wrapper, 'Docks').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    const message = (nav.currentProps as { message: string }).message
    expect(message).toMatch(/oceanic inhabitants|Hie Brasil|Shangala/)
    expect(nav.current?.home?.component).toBe(ArQuest)
    const session = (nav.current?.home?.props as { session: QuestSession }).session
    expect(['Ocean Quest', 'Brasil Quest', 'Shang Quest']).toContain(session.title)
  })
})
