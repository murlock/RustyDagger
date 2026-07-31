import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setSeed } from '../../engine/dice'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import * as GearTable from '../../domain/tables/gearTable'
import { ItArms } from '../../domain/itArms'
import * as ArmsTrait from '../../domain/armsTrait'
import ArStatus from './arStatus.vue'
import ArDetail from './arDetail.vue'
import ArNotice from './arNotice.vue'
import ArTown from '../Areas/arTown.vue'

function knife(): ItArms {
  const item = GearTable.shopItem('Knife')
  if (!(item instanceof ItArms)) throw new Error('expected an ItArms')
  return item
}

function row(wrapper: ReturnType<typeof mount>, name: string) {
  return wrapper.findAll('.status__pack li').find((li) => li.text().startsWith(name))!
}

function actionButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.status__actions button').find((b) => b.text().startsWith(label))!
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

describe('arStatus', () => {
  it('renders the hero header stats', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 8, 6, 0, 0, 0)
    const wrapper = mount(ArStatus)

    expect(wrapper.text()).toContain('Zog')
    expect(wrapper.text()).toContain('Guts: 10')
    expect(wrapper.text()).toContain('Wits: 8')
    expect(wrapper.text()).toContain('Charm: 6')
  })

  it('Info opens arDetail for the selected pack item', async () => {
    const heroStore = useHeroStore()
    const nav = useNavigationStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Food', 1)
    const wrapper = mount(ArStatus)

    await row(wrapper, 'Food').trigger('click')
    await actionButton(wrapper, 'Info').trigger('click')

    expect(nav.currentComponent).toBe(ArDetail)
    expect((nav.currentProps as { item: { getName(): string } }).item.getName()).toBe('Food')
  })

  it('using a Healing Salve heals wounds and consumes the only one in the pack', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addWounds(30)
    hero.addPackCount('Healing Salve', 1)
    const wrapper = mount(ArStatus)

    await row(wrapper, 'Healing Salve').trigger('click')
    await actionButton(wrapper, 'Use').trigger('click')

    expect(hero.getWounds()).toBe(15)
    expect(hero.packCount('Healing Salve')).toBe(0)
  })

  it('wearing a weapon moves it from pack to the gear slot, and Use again unequips it', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    const weapon = knife()
    hero.addPack(weapon)
    const wrapper = mount(ArStatus)

    await row(wrapper, weapon.getName()).trigger('click')
    await actionButton(wrapper, 'Use').trigger('click')

    expect(hero.getGear().indexOf(weapon)).toBeGreaterThanOrEqual(0)
    expect(hero.getPack().indexOf(weapon)).toBe(-1)

    // wearGear() leaves the newly-equipped item selected (matching Java's
    // arStatus.wearGear() setting `this.pick = what`) - Use again unequips
    // it directly, no need to reselect it from the gear slot first.
    await actionButton(wrapper, 'Use').trigger('click')

    expect(hero.getGear().indexOf(weapon)).toBe(-1)
    expect(hero.getPack().indexOf(weapon)).toBeGreaterThanOrEqual(0)
  })

  it('a cursed equipped weapon cannot be unequipped', async () => {
    const heroStore = useHeroStore()
    const nav = useNavigationStore()
    const hero = heroStore.createHero('Zog')
    const weapon = knife()
    weapon.fixTrait(ArmsTrait.CURSE)
    hero.addPack(weapon)
    const wrapper = mount(ArStatus)

    await row(wrapper, weapon.getName()).trigger('click')
    await actionButton(wrapper, 'Use').trigger('click') // wear it - leaves it selected
    await actionButton(wrapper, 'Use').trigger('click') // try to remove it

    expect(hero.getGear().indexOf(weapon)).toBeGreaterThanOrEqual(0)
    expect(nav.currentComponent).toBe(ArNotice)
  })

  it('Dump Slot moves a pack item to the dump list, and Oops restores it', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Food', 3)
    const wrapper = mount(ArStatus)

    await row(wrapper, 'Food').trigger('click')
    await actionButton(wrapper, 'Dump Slot').trigger('click')

    expect(hero.packCount('Food')).toBe(0)
    expect(hero.getDump().isEmpty()).toBe(false)

    await actionButton(wrapper, 'Oops').trigger('click')

    expect(hero.packCount('Food')).toBe(3)
    expect(hero.getDump().isEmpty()).toBe(true)
  })

  it('using an Identify Scroll on an equipped Secret weapon reveals it and opens arDetail', async () => {
    const heroStore = useHeroStore()
    const nav = useNavigationStore()
    const hero = heroStore.createHero('Zog')
    hero.setWits(1000) // guarantees the tryScroll contest() succeeds regardless of seed
    const weapon = knife()
    weapon.fixTrait(ArmsTrait.SECRET)
    hero.addPack(weapon)
    hero.addPackCount('Identify Scroll', 1)
    const wrapper = mount(ArStatus)

    await row(wrapper, weapon.getName()).trigger('click')
    await actionButton(wrapper, 'Use').trigger('click') // wear the (still Secret) weapon

    await row(wrapper, 'Identify Scroll').trigger('click')
    await actionButton(wrapper, 'Use').trigger('click') // enter scroll-targeting mode

    const slot = wrapper.findAll('.status__gear p').find((p) => p.text().startsWith('R:'))!
    await slot.trigger('click') // target the equipped weapon
    // The Use button relabels to the scroll's effect name ("identify")
    // while targeting, so select it by position rather than by "Use" text.
    await wrapper.findAll('.status__actions button')[0].trigger('click') // apply the scroll

    expect(weapon.hasTrait(ArmsTrait.SECRET)).toBe(false)
    expect(hero.packCount('Identify Scroll')).toBe(0)
    expect(nav.currentComponent).toBe(ArDetail)
  })

  it('Exit returns to the screen that opened it', async () => {
    const heroStore = useHeroStore()
    const nav = useNavigationStore()
    heroStore.createHero('Zog')
    nav.goto(ArTown)
    nav.goto(ArStatus)

    const wrapper = mount(ArStatus)
    await actionButton(wrapper, 'Exit').trigger('click')

    expect(nav.currentComponent).toBe(ArTown)
  })

  describe('battle mode (opened from arQuest, arStatus.java\'s `new arStatus(from, true)`)', () => {
    it('shows the remaining action count in the Use button label', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.resetActions() // no guild ranks -> exactly 1 action
      const wrapper = mount(ArStatus, { props: { battle: true } })

      expect(actionButton(wrapper, 'Use').text()).toBe('Use (1)')
    })

    it('using an item spends one action and the label reflects the new count', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.resetActions() // exactly 1 action
      hero.addWounds(10)
      hero.addPackCount('Healing Salve', 1)
      const wrapper = mount(ArStatus, { props: { battle: true } })

      await row(wrapper, 'Healing Salve').trigger('click')
      expect(actionButton(wrapper, 'Use').text()).toContain('(1)')

      await actionButton(wrapper, 'Use').trigger('click')

      expect(hero.actCount()).toBe(0)
      expect(hero.getWounds()).toBe(0) // the heal still applied
    })

    it('Use is disabled once the hero is out of actions', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.resetActions()
      hero.act() // spend the hero's only action before even opening the pack
      hero.addPackCount('Food', 1)
      const wrapper = mount(ArStatus, { props: { battle: true } })

      await row(wrapper, 'Food').trigger('click')

      expect(actionButton(wrapper, 'Use').attributes('disabled')).toBeDefined()
      await actionButton(wrapper, 'Use').trigger('click')
      expect(hero.packCount('Food')).toBe(1) // click was a no-op - nothing consumed
    })

    it('does not show an action count outside battle mode', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.resetActions()
      hero.addPackCount('Food', 1)
      const wrapper = mount(ArStatus) // battle defaults to false

      expect(actionButton(wrapper, 'Use').text()).toBe('Use')
    })
  })
})
