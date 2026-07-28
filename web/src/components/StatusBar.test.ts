import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useHeroStore } from '../stores/hero'
import StatusBar from './StatusBar.vue'

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

    await wrapper.get('.status-bar').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})
