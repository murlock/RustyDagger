import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../../stores/navigation'
import { useHeroStore } from '../../../stores/hero'
import * as AT from '../../../domain/armsTrait'
import * as ArmsTable from '../../../domain/tables/armsTable'
import ArForest from '../../Wilds/arForest.vue'
import ArDwfSmith from './arDwfSmith.vue'

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

describe('arDwfSmith', () => {
  it('lists the stock priced off itArms.stockValue() with the Left multiplier', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(ArDwfSmith)

    // Bill Hook: attack 17, defend 0, skill 5, RIGHT+LEFT traits ->
    // stockValue() 747, arDwfSmith's own LEFT multiplier trunc(747 * 1.3) = 971.
    expect(row(wrapper, 'Bill Hook').text()).toContain('$971')
  })

  it('buying deducts money and inserts a fresh instance', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(2000)
    const wrapper = mount(ArDwfSmith)

    await row(wrapper, 'Bill Hook').trigger('click')
    await button(wrapper, 'Buy').trigger('click')

    expect(hero.getMoney()).toBe(1029)
    expect(hero.getPack().elements().filter((it) => it.isMatch('Bill Hook'))).toHaveLength(1)
  })

  it('Identify clears the Secret trait on the selected weapon for a fee', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addMoney(100)
    const secretArms = ArmsTable.shopItem('Steel Sword')!
    secretArms.fixTrait(AT.SECRET)
    hero.addPack(secretArms)
    const wrapper = mount(ArDwfSmith)

    await wrapper.findAll('input[type=radio]')[1].setValue(true) // Sell tab
    await row(wrapper, 'Steel Sword').trigger('click')
    const identify = button(wrapper, 'Identify')
    expect(identify.text()).toContain('$60')

    await identify.trigger('click')

    expect(secretArms.hasTrait(AT.SECRET)).toBe(false)
    expect(hero.getMoney()).toBe(40)
  })

  it('exit returns to the screen that opened the shop', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog').calcRaise()
    const nav = useNavigationStore()
    nav.goto(ArForest)
    nav.goto(ArDwfSmith)

    const wrapper = mount(ArDwfSmith)
    await wrapper.get('.indoors__exit').trigger('click')

    expect(nav.currentComponent).toBe(ArForest)
  })
})
