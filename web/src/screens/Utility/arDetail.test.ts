import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import * as GearTable from '../../domain/tables/gearTable'
import { ItArms } from '../../domain/itArms'
import * as ArmsTrait from '../../domain/armsTrait'
import * as C from '../../domain/constants'
import ArDetail from './arDetail.vue'

function knife(): ItArms {
  const item = GearTable.shopItem('Knife')
  if (!(item instanceof ItArms)) throw new Error('expected an ItArms')
  return item
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('arDetail', () => {
  it('shows the GearTable type blurb for a plain count item', () => {
    const item = GearTable.shopItem('Food')!
    const wrapper = mount(ArDetail, { props: { item } })
    expect(wrapper.text()).toContain('Food')
    expect(wrapper.text()).toContain('Gear')
  })

  it('shows attack/defense/skill for an identified weapon', () => {
    const item = knife()
    const wrapper = mount(ArDetail, { props: { item } })
    expect(wrapper.text()).not.toContain('Not Identified')
  })

  it('shows "Not Identified" for a Secret weapon the hero cannot ID', () => {
    const item = knife()
    item.fixTrait(ArmsTrait.SECRET)
    const wrapper = mount(ArDetail, { props: { item } })
    expect(wrapper.text()).toContain('Not Identified')
  })

  it('identifies a Secret weapon when the hero has the Smith trait', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.fixStatTrait(C.SMITH)
    const item = knife()
    item.fixTrait(ArmsTrait.SECRET)
    item.fixTrait(ArmsTrait.RIGHT)
    const wrapper = mount(ArDetail, { props: { item } })
    expect(wrapper.text()).not.toContain('Not Identified')
  })
})
