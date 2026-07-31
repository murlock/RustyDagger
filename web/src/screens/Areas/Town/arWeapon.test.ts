import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import { loadHero } from '../../../engine/heroStorage'
import type { ItHero } from '../../../domain/itHero'
import * as AT from '../../../domain/armsTrait'
import * as ArmsTable from '../../../domain/tables/armsTable'
import ArTown from '../arTown.vue'
import ArWeapon from './arWeapon.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.smith__list li').find((li) => li.text().startsWith(name))!
}
function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.smith__actions button').find((b) => b.text().startsWith(label))!
}
// ItArms instances don't merge into a single counted entry like ItCount
// goods do (see useShop.ts's `selected` comment) - ItList.getCount('Knife')
// would just return the *first* matching instance's own internal queue
// length (its trait tokens), not how many Knives are in the pack. Count by
// filtering elements() by name instead.
function packArmsCount(hero: ItHero | null, name: string): number {
  return hero!.getPack().elements().filter((it) => it.isMatch(name)).length
}

describe('arWeapon', () => {
  it('lists the stock priced off itArms.stockValue(), not GearTable', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArWeapon)

    // Knife: attack 2, defend 0, skill -1, RIGHT trait -> stockValue() 9,
    // arWeapon's own RIGHT multiplier trunc(9 * 1.3) = 11.
    expect(row(wrapper, 'Knife').text()).toContain('$11')
  })

  it('buying inserts a fresh weapon instance (not a stacked count) and deducts money', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(50)
    const wrapper = mount(ArWeapon)

    await row(wrapper, 'Knife').trigger('click')
    await button(wrapper, 'Buy').trigger('click')

    expect(hero.getMoney()).toBe(39)
    expect(packArmsCount(hero, 'Knife')).toBe(1)
    expect(packArmsCount(loadHero('Zog'), 'Knife')).toBe(1)
  })

  it('Buy is disabled when the hero cannot afford the selected weapon', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(5) // Knife costs 11
    const wrapper = mount(ArWeapon)

    await row(wrapper, 'Knife').trigger('click')

    expect(button(wrapper, 'Buy').attributes('disabled')).toBeDefined()
    await button(wrapper, 'Buy').trigger('click')
    expect(hero.getMoney()).toBe(5)
  })

  it('two of the same weapon can be bought and sold independently by instance', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const wrapper = mount(ArWeapon)

    await row(wrapper, 'Knife').trigger('click')
    await button(wrapper, 'Buy').trigger('click')
    await row(wrapper, 'Knife').trigger('click')
    await button(wrapper, 'Buy').trigger('click')
    expect(packArmsCount(hero, 'Knife')).toBe(2)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    const knifeRows = wrapper.findAll('.smith__list li').filter((li) => li.text().startsWith('Knife'))
    expect(knifeRows).toHaveLength(2) // two separate rows, not merged into one count

    await knifeRows[0].trigger('click')
    await button(wrapper, 'Sell').trigger('click')

    expect(packArmsCount(hero, 'Knife')).toBe(1) // exactly one removed, not both
    expect(hero.getMoney()).toBeGreaterThan(0)
  })

  it('Identify clears the Secret trait on the selected weapon for a fee', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const secretArms = ArmsTable.shopItem('Knife')!
    secretArms.fixTrait(AT.SECRET)
    hero.addPack(secretArms)
    const wrapper = mount(ArWeapon)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    await row(wrapper, 'Knife').trigger('click')
    const identify = button(wrapper, 'Identify')
    expect(identify.text()).toContain('$40')

    await identify.trigger('click')

    expect(secretArms.hasTrait(AT.SECRET)).toBe(false)
    expect(hero.getMoney()).toBe(60)
  })

  it('Identify is disabled for a weapon that is not Secret', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const wrapper = mount(ArWeapon)

    await row(wrapper, 'Knife').trigger('click')

    expect(button(wrapper, 'Identify').attributes('disabled')).toBeDefined()
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArWeapon)

    const wrapper = mount(ArWeapon)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})
