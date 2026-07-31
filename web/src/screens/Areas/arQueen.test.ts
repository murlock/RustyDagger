import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import { setSeed } from '../../engine/dice'
import * as C from '../../domain/constants'
import ArQueen from './arQueen.vue'
import ArCastle from '../Wilds/arCastle.vue'
import ArTown from './arTown.vue'
import ArNotice from '../Utility/arNotice.vue'
import NotImplemented from '../Utility/NotImplemented.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(label))!
}

describe('arQueen', () => {
  it('shows rank progress below rank 9', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const wrapper = mount(ArQueen)
    expect(wrapper.text()).toContain('Peasant to Knight')
  })

  it('hides rank progress and Petition at max rank', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.SOCIAL, 9)
    hero.calcRaise()
    const wrapper = mount(ArQueen)
    expect(button(wrapper, 'Petition')).toBeUndefined()
  })

  it('Invest routes to NotImplemented (mail/CGI-dependent)', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(1000000)
    hero.calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Invest').trigger('click')
    expect(nav.currentComponent).toBe(NotImplemented)
  })

  it('the four minigames are disabled with no quests left', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addFatigue(hero.getBaseQuests())
    hero.addMoney(10000)
    const wrapper = mount(ArQueen)

    for (const label of ['Dice', 'Mingle', 'Boast', 'Game']) {
      expect(button(wrapper, label).attributes('disabled')).toBeDefined()
    }
  })

  it('Dice is additionally disabled below 1000 marks', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(999)
    const wrapper = mount(ArQueen)
    expect(button(wrapper, 'Dice').attributes('disabled')).toBeDefined()
  })

  it('Dice at 0 Wits always loses money and shows a notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(10000)
    hero.setWits(0)
    const nav = useNavigationStore()
    const moneyBefore = hero.getMoney()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Dice').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(hero.getMoney()).toBeLessThan(moneyBefore)
  })

  it('Dice at overwhelming Wits always wins money', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(10000)
    hero.setWits(100000)
    const moneyBefore = hero.getMoney()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Dice').trigger('click')

    expect(hero.getMoney()).toBeGreaterThan(moneyBefore)
  })

  it('Mingle at overwhelming Charm gains experience', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.setCharm(100000)
    const nav = useNavigationStore()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Mingle').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    // gainExp() always applies in full; gainCharm() rolls against the
    // hero's own (already maxed-out) Charm for a further +1, so it's not
    // a reliable "did the best outcome fire" signal at this stat level.
    expect(hero.getExp()).toBeGreaterThan(0)
  })

  it('Boast at 0 Charm/Fight loses money and routes home to arCastle', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(1000)
    const nav = useNavigationStore()
    nav.goto(ArCastle)
    nav.goto(ArQueen)
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Boast').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(hero.getMoney()).toBeLessThan(1000)
    expect(nav.current?.home?.component).toBe(ArCastle)
  })

  it('Boast at overwhelming Charm succeeds and keeps arQueen as home', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.setCharm(100000)
    const nav = useNavigationStore()
    nav.goto(ArCastle)
    nav.goto(ArQueen)
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Boast').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(ArQueen)
  })

  it('Game at 0 Guts wounds the hero and chains into a death notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    const nav = useNavigationStore()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Game').trigger('click')

    // First notice shown is the death resolution (chained on top);
    // its own home, once dismissed, leads to the game outcome notice.
    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(ArNotice)
    expect(hero.isDead()).toBe(false) // resolveDeath() revives immediately
  })

  it('Game at overwhelming Guts gains experience with no death chain', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.setVals(100000, 0, 0, 0, 0, 0)
    const nav = useNavigationStore()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Game').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home).toBeNull()
    // gainExp() always applies in full; gainGuts() rolls against the
    // hero's own (already maxed-out) Guts for a further +1, so it's not a
    // reliable "did the best outcome fire" signal at this stat level.
    expect(hero.getExp()).toBeGreaterThan(0)
  })

  it('Petition is disabled below 3 quests or 5000 marks', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(4999)
    const wrapper = mount(ArQueen)
    expect(button(wrapper, 'Petition').attributes('disabled')).toBeDefined()
  })

  it('a fresh Petition (cheap rank-0 threshold) succeeds and raises social rank', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(5000)
    const nav = useNavigationStore()
    nav.goto(ArCastle)
    nav.goto(ArQueen)
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Petition').trigger('click')

    expect(hero.getSocial()).toBe(1)
    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(ArQueen)
    expect((nav.currentProps as { message: string }).message).toContain('Social Standing Raised')
  })

  it('a Petition at a high rank threshold is rejected and routes home to arTown', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.SOCIAL, 6)
    hero.calcRaise()
    hero.addMoney(5000)
    const nav = useNavigationStore()
    const wrapper = mount(ArQueen)

    await button(wrapper, 'Petition').trigger('click')

    expect(hero.getSocial()).toBe(6) // unchanged
    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(ArTown)
    expect((nav.currentProps as { message: string }).message).toContain('laughs coldly')
  })

  it('Exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    nav.goto(ArCastle)
    nav.goto(ArQueen)

    const wrapper = mount(ArQueen)
    await wrapper.get('.queen__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArCastle)
  })
})
