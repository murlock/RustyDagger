import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArTown from './arTown.vue'
import ArTrader from './Town/arTrader.vue'
import ArTavern from './Town/arTavern.vue'
import ArWeapon from './Town/arWeapon.vue'
import ArArmour from './Town/arArmour.vue'
import ArField from '../Wilds/arField.vue'
import ArCastle from '../Wilds/arCastle.vue'
import ArQuest from '../Quest/arQuest.vue'
import ArNotice from '../Utility/arNotice.vue'
import type { QuestSession } from '../Quest/questSession'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

function spot(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.hotspot:not(.hotspot--disabled)').find((s) => s.text().includes(text))!
}

describe('arTown', () => {
  it('hides the Castle Gate hotspot below level 6', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    expect(wrapper.text()).not.toContain('Castle Gate')
  })

  it('shows the Castle Gate hotspot at level 6+', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 6)
    hero.calcRaise() // keep exp(0) < raise so onMounted's checkLevel() doesn't also fire
    const wrapper = mount(ArTown)
    expect(wrapper.text()).toContain('Castle Gate')
  })

  it('navigates to arWeapon when the Weapons hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    await spot(wrapper, 'Weapons').trigger('click')
    expect(nav.currentComponent).toBe(ArWeapon)
  })

  it('navigates to arArmour when the Armour hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    await spot(wrapper, 'Armour').trigger('click')
    expect(nav.currentComponent).toBe(ArArmour)
  })

  it('navigates to arTrader when the Trade Shop hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    const spot = wrapper.findAll('.hotspot:not(.hotspot--disabled)').find((s) => s.text().includes('Trade Shop'))!
    await spot.trigger('click')
    expect(nav.currentComponent).toBe(ArTrader)
  })

  it('navigates to arTavern when the Tavern hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    const spot = wrapper.findAll('.hotspot:not(.hotspot--disabled)').find((s) => s.text().includes('Tavern'))!
    await spot.trigger('click')
    expect(nav.currentComponent).toBe(ArTavern)
  })

  it('navigates to arField when the Leave Town hotspot is clicked', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArTown)
    const nav = useNavigationStore()

    const spot = wrapper.findAll('.hotspot:not(.hotspot--disabled)').find((s) => s.text().includes('Leave Town'))!
    await spot.trigger('click')
    expect(nav.currentComponent).toBe(ArField)
  })

  it('shows a level-up banner when checkLevel() fires on mount', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.learn(hero.getRaise())

    const wrapper = mount(ArTown)
    await nextTick() // onMounted's checkLevel() result lands via a ref, one tick after mount
    expect(wrapper.text()).toContain('Level')
    expect(hero.getLevel()).toBe(1)
  })

  describe('Castle Gate (enterCastle())', () => {
    it('enters arCastle directly when the hero has social standing', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.getRank().fixCount(C.LEVEL, 6)
      hero.calcRaise()
      hero.getRank().fixCount(C.SOCIAL, 1)
      const nav = useNavigationStore()
      const wrapper = mount(ArTown)

      await spot(wrapper, 'Castle Gate').trigger('click')
      expect(nav.currentComponent).toBe(ArCastle)
    })

    it('enters arCastle directly when the hero holds a Castle Permit', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.getRank().fixCount(C.LEVEL, 6)
      hero.calcRaise()
      hero.addPackCount('Castle Permit', 1)
      const nav = useNavigationStore()
      const wrapper = mount(ArTown)

      await spot(wrapper, 'Castle Gate').trigger('click')
      expect(nav.currentComponent).toBe(ArCastle)
    })

    it('shows the too-tired notice when the hero has no quests left', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.getRank().fixCount(C.LEVEL, 6)
      hero.calcRaise()
      hero.addFatigue(hero.getBaseQuests())
      const nav = useNavigationStore()
      const wrapper = mount(ArTown)

      await spot(wrapper, 'Castle Gate').trigger('click')
      expect(nav.currentComponent).toBe(ArNotice)
      expect((nav.currentProps as { message: string }).message).toContain('exhausted')
    })

    it('launches a Town:Guard quest gated to arCastle when no permit/social and quests remain', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.getRank().fixCount(C.LEVEL, 6)
      hero.calcRaise()
      const nav = useNavigationStore()
      const wrapper = mount(ArTown)

      await spot(wrapper, 'Castle Gate').trigger('click')

      expect(nav.currentComponent).toBe(ArQuest)
      const session = (nav.currentProps as { session: QuestSession }).session
      expect(session.title).toBe('Castle Gate')
      expect(session.gate?.component).toBe(ArCastle)
    })
  })
})
