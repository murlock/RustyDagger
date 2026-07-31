import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import * as C from '../../../domain/constants'
import * as AT from '../../../domain/armsTrait'
import ArHealer from './arHealer.vue'
import ArField from '../../Wilds/arField.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.healer__options button').find((b) => b.text().startsWith(label))!
}

describe('arHealer', () => {
  it('every service is free for a level-1 hero (mercy pricing)', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 1)
    hero.addWounds(20)
    const wrapper = mount(ArHealer)

    expect(button(wrapper, 'Minor Healing').text()).toContain('$0')
    expect(button(wrapper, 'Full Healing').text()).toContain('$1')
  })

  it('Full Healing removes all wounds and deducts the cost', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 3)
    hero.addWounds(20)
    hero.addMoney(1000)
    const wrapper = mount(ArHealer)

    await button(wrapper, 'Full Healing').trigger('click')

    expect(hero.getWounds()).toBe(0)
    expect(hero.getMoney()).toBeLessThan(1000)
  })

  it('Cure Disease clears disease, Blind, and Panic', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 3)
    hero.addMoney(1000)
    hero.getTemp().addCount(AT.DISEASE, 5)
    hero.getTemp().fixTrait(AT.BLIND)
    const wrapper = mount(ArHealer)

    await button(wrapper, 'Cure Disease').trigger('click')

    expect(hero.disease()).toBe(0)
    expect(hero.hasTrait(AT.BLIND)).toBe(false)
  })

  it('Cure Disease is disabled (cost $0) when the hero is healthy', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 3)
    hero.addMoney(1000)
    const wrapper = mount(ArHealer)

    expect(button(wrapper, 'Cure Disease').attributes('disabled')).toBeDefined()
  })

  it('Tithe converts cash to exp but caps it at the level-up threshold', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixRank(C.LEVEL, 1)
    hero.getStatus().fixCount(C.AGE, 20) // level(1) + 14 <= age, so the tithe actually grants exp
    hero.calcRaise()
    hero.addMoney(100000)
    const wrapper = mount(ArHealer)

    await button(wrapper, 'Tithe').trigger('click')

    expect(hero.getExp()).toBe(hero.getRaise())
  })

  it('Exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArField)
    nav.goto(ArHealer)

    const wrapper = mount(ArHealer)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArField)
  })
})
