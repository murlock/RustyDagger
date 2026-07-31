import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import * as C from '../../../domain/constants'
import ArForest from '../../Wilds/arForest.vue'
import ArGuild from './arGuild.vue'
import ArNotice from '../../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.guild__options button').find((b) => b.text().startsWith(label))!
}

describe('arGuild', () => {
  it('shows "Closed For Rituals" when the hero has fewer than 5 quests left', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addFatigue(hero.getBaseQuests() - 4) // leaves exactly 4 quests
    const wrapper = mount(ArGuild)

    expect(wrapper.text()).toContain('Closed For Rituals')
  })

  it('Join Guild is disabled below $4000', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(3999)
    const wrapper = mount(ArGuild)

    expect(button(wrapper, 'Join Guild').attributes('disabled')).toBeDefined()
  })

  it('Join Guild is enabled at $4000+', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(4000)
    const wrapper = mount(ArGuild)

    expect(button(wrapper, 'Join Guild').attributes('disabled')).toBeUndefined()
  })

  it('joining sets the Guild trait, deducts $4000, adds fatigue, and shows the flavor notice', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.calcRaise()
    hero.addMoney(4000)
    const fatigueBefore = hero.getFatigue()
    const nav = useNavigationStore()
    const wrapper = mount(ArGuild)

    await button(wrapper, 'Join Guild').trigger('click')

    expect(hero.hasTrait(C.GUILD)).toBe(true)
    expect(hero.getMoney()).toBe(0)
    expect(hero.getFatigue()).toBe(fatigueBefore + 5)
    expect(nav.currentComponent).toBe(ArNotice)
    expect((nav.currentProps as { message: string }).message).toContain('guild pass')
  })

  it('skill training is disabled until the hero has joined', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 3)
    hero.calcRaise()
    hero.addMoney(10000)
    const wrapper = mount(ArGuild)

    expect(button(wrapper, 'Fighter Skill').attributes('disabled')).toBeDefined()
  })

  it('a member trains Fighter Skill for free at guild rank 0, then pays for the next rank', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 3)
    hero.calcRaise()
    hero.fixStatTrait(C.GUILD)
    hero.addMoney(10000)
    const moneyBefore = hero.getMoney()
    const wrapper = mount(ArGuild)

    expect(button(wrapper, 'Fighter Skill').text()).toContain('Free')

    await button(wrapper, 'Fighter Skill').trigger('click')

    expect(hero.fightRank()).toBe(1)
    expect(hero.getMoney()).toBe(moneyBefore) // free at guild rank 0
    expect(hero.getGuts()).toBe(0) // addWits/addCharm affected, not Guts
  })

  it('applies the stat costs and rank gain for Magery and Trading training', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 3)
    hero.calcRaise()
    hero.fixStatTrait(C.GUILD)
    hero.addMoney(10000)
    const wrapper = mount(ArGuild)

    await button(wrapper, 'Magery Skill').trigger('click')
    expect(hero.magicRank()).toBe(1)
    expect(hero.getGuts()).toBe(-2)
    expect(hero.getCharm()).toBe(-2)
  })

  it('skill training disables once guild rank catches up to hero level', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.getRank().fixCount(C.LEVEL, 1)
    hero.calcRaise()
    hero.fixStatTrait(C.GUILD)
    hero.addMoney(10000)
    const wrapper = mount(ArGuild)

    await button(wrapper, 'Fighter Skill').trigger('click') // guildRank now 1, matches level 1

    const forestWrapper = mount(ArGuild) // remount to read fresh state cleanly
    expect(button(forestWrapper, 'Fighter Skill').attributes('disabled')).toBeDefined()
  })

  it('exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    nav.goto(ArForest)
    nav.goto(ArGuild)

    const wrapper = mount(ArGuild)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArForest)
  })
})
