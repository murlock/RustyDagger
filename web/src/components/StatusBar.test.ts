import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../stores/hero'
import { useNavigationStore } from '../stores/navigation'
import * as C from '../domain/constants'
import * as AT from '../domain/armsTrait'
import * as ArmsTable from '../domain/tables/armsTable'
import StatusBar from './StatusBar.vue'
import ArMound from '../screens/Wilds/arMound.vue'
import ArHills from '../screens/Wilds/arHills.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('StatusBar', () => {
  it('renders nothing when no hero is loaded', () => {
    const wrapper = mount(StatusBar)
    expect(wrapper.find('.status-bar').exists()).toBe(false)
  })

  it('renders the hero title/name, guts/wits/charm/cash line', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(StatusBar)

    const lines = wrapper.findAll('.status-bar__line')
    expect(lines[0].text()).toContain('Zog')
    expect(lines[0].text()).toContain(`Guts:${heroStore.hero!.getGuts()}`)
    expect(lines[0].text()).toContain(`Wits:${heroStore.hero!.getWits()}`)
    expect(lines[0].text()).toContain(`Charm:${heroStore.hero!.getCharm()}`)
    expect(lines[0].text()).toContain(`Cash: $${heroStore.hero!.getMoney()}`)
  })

  it('shows wounds as current/max guts once wounded', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    heroStore.hero!.addWounds(2)
    const wrapper = mount(StatusBar)

    const line = wrapper.findAll('.status-bar__line')[0].text()
    const guts = heroStore.hero!.getGuts()
    expect(line).toContain(`Guts:${guts - 2}/${guts}`)
  })

  it('renders quests/level/exp and the default weapon & armour line', () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(StatusBar)

    const line = wrapper.findAll('.status-bar__line')[1].text()
    expect(line).toContain(`Quests:${heroStore.hero!.getQuests()}`)
    expect(line).toContain(`Level:${heroStore.hero!.getLevel()}`)
    expect(line).toContain(`Exp:${heroStore.hero!.getExp()}`)
    expect(line).toContain(`${heroStore.hero!.getWeapon()} & ${heroStore.hero!.getArmour()}`)
  })

  it('emits open when clicked with a hero loaded', async () => {
    const heroStore = useHeroStore()
    heroStore.createHero('Zog')
    const wrapper = mount(StatusBar)

    await wrapper.get('.status-bar__info').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  describe('region-specific third-line hint (StatusPic.paint())', () => {
    it('shows Torch count while in the Mound by default', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.addPackCount('Torch', 3)
      const nav = useNavigationStore()
      nav.goto(ArMound)
      const wrapper = mount(StatusBar)

      expect(wrapper.findAll('.status-bar__line')[1].text()).toContain('Torch (3)')
    })

    it('prefers Cats Eyes over Torch count while in the Mound', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.fixStatTrait(C.CATSEYES)
      hero.addPackCount('Torch', 3)
      const nav = useNavigationStore()
      nav.goto(ArMound)
      const wrapper = mount(StatusBar)

      const line = wrapper.findAll('.status-bar__line')[1].text()
      expect(line).toContain('Cats Eyes')
      expect(line).not.toContain('Torch')
    })

    it('shows a glowing gear item over Torch count while in the Mound', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      const lantern = ArmsTable.shopItem('Knife')!
      lantern.fixTrait(AT.GLOWS)
      hero.getGear().insert(lantern)
      const nav = useNavigationStore()
      nav.goto(ArMound)
      const wrapper = mount(StatusBar)

      expect(wrapper.findAll('.status-bar__line')[1].text()).toContain('glowing Knife')
    })

    it('shows Rope count while in the Hills by default', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.addPackCount('Rope', 2)
      const nav = useNavigationStore()
      nav.goto(ArHills)
      const wrapper = mount(StatusBar)

      expect(wrapper.findAll('.status-bar__line')[1].text()).toContain('Rope (2)')
    })

    it('shows Hill Folk instead of Rope count while in the Hills', () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.fixStatTrait(C.HILLFOLK)
      const nav = useNavigationStore()
      nav.goto(ArHills)
      const wrapper = mount(StatusBar)

      const line = wrapper.findAll('.status-bar__line')[1].text()
      expect(line).toContain('Hill Folk')
      expect(line).not.toContain('Rope')
    })
  })

  describe('Quests reset button (testing aid, not a Java port)', () => {
    it('refills fatigue/quests without emitting open', async () => {
      const heroStore = useHeroStore()
      const hero = heroStore.createHero('Zog')
      hero.calcRaise()
      hero.addFatigue(hero.getBaseQuests())
      expect(hero.getQuests()).toBe(0)
      const wrapper = mount(StatusBar)

      await wrapper.get('.status-bar__reset').trigger('click')

      expect(hero.getQuests()).toBe(hero.getBaseQuests())
      expect(wrapper.emitted('open')).toBeUndefined()
    })
  })
})
