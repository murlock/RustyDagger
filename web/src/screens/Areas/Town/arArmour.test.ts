import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import * as AT from '../../../domain/armsTrait'
import * as ArmsTable from '../../../domain/tables/armsTable'
import ArTown from '../arTown.vue'
import ArArmour from './arArmour.vue'

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

describe('arArmour', () => {
  it('lists the stock priced off itArms.stockValue() with the Body multiplier', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArArmour)

    // Clothes: attack 0, defend 2, skill 0, BODY trait -> stockValue() 10,
    // arArmour's own BODY multiplier trunc(10 * 1.3) = 13.
    expect(row(wrapper, 'Clothes').text()).toContain('$13')
  })

  it('buying deducts money and inserts a fresh instance', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(50)
    const wrapper = mount(ArArmour)

    await row(wrapper, 'Clothes').trigger('click')
    await button(wrapper, 'Buy').trigger('click')

    expect(hero.getMoney()).toBe(37)
    expect(hero.getPack().elements().filter((it) => it.isMatch('Clothes'))).toHaveLength(1)
  })

  it('Polish clears Decay and restores worn-down stats for a fee', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const worn = ArmsTable.shopItem('Clothes')!
    worn.setDefend(0) // ground down from the base item's defend 2
    worn.fixTrait(AT.DECAY)
    hero.addPack(worn)
    const wrapper = mount(ArArmour)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    await row(wrapper, 'Clothes').trigger('click')
    const polish = button(wrapper, 'Polish')
    // Decay fee ($1) + defend gap 2 squared * 4 ($16) = $17
    expect(polish.text()).toContain('$17')

    await polish.trigger('click')

    expect(worn.hasTrait(AT.DECAY)).toBe(false)
    expect(worn.getDefend()).toBe(2)
    expect(hero.getMoney()).toBe(83)
  })

  it('Polish is disabled for an item with nothing to fix', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const wrapper = mount(ArArmour)

    await row(wrapper, 'Clothes').trigger('click')

    expect(button(wrapper, 'Polish').attributes('disabled')).toBeDefined()
  })

  it('Polish is disabled for a Secret item', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const secret = ArmsTable.shopItem('Clothes')!
    secret.fixTrait(AT.DECAY)
    secret.fixTrait(AT.SECRET)
    hero.addPack(secret)
    const wrapper = mount(ArArmour)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    await row(wrapper, 'Clothes').trigger('click')

    expect(button(wrapper, 'Polish').attributes('disabled')).toBeDefined()
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArArmour)

    const wrapper = mount(ArArmour)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })
})
