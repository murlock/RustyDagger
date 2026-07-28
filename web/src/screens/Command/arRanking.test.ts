import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../stores/navigation'
import { ItHero } from '../../domain/itHero'
import { saveHero } from '../../engine/heroStorage'
import * as C from '../../domain/constants'
import ArRanking from './arRanking.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

// loadHero() recomputes attack/defend/skill via calcCombat() (see
// heroStorage.ts), so skill can't be seeded directly - drive it up through
// wits, which calcCombat() actually derives it from.
function seedHero(name: string, fame: number, wits: number) {
  const hero = new ItHero(name)
  hero.fixStatus(C.FAME, fame)
  hero.setWits(wits)
  saveHero(hero)
}

describe('arRanking', () => {
  it('shows "No Records Found" with no saved heroes', () => {
    const wrapper = mount(ArRanking)
    expect(wrapper.text()).toContain('No Records Found')
  })

  it('sorts by Fame by default, most famous first', () => {
    seedHero('Lowfame', 5, 0)
    seedHero('Highfame', 50, 0)
    const wrapper = mount(ArRanking)
    const names = wrapper.findAll('tbody tr').map((row) => row.get('td').text())
    expect(names[0]).toContain('Highfame')
    expect(names[1]).toContain('Lowfame')
  })

  it('re-sorts when a different tab is clicked', async () => {
    seedHero('Lowfame-Highskill', 5, 30)
    seedHero('Highfame-Lowskill', 50, 4)
    const wrapper = mount(ArRanking)
    await wrapper.findAll('.ranking__tabs button')[1].trigger('click') // Skill tab
    const names = wrapper.findAll('tbody tr').map((row) => row.get('td').text())
    expect(names[0]).toContain('Lowfame-Highskill')
  })

  it('Done returns home', async () => {
    const wrapper = mount(ArRanking)
    const nav = useNavigationStore()
    await wrapper.get('.ranking__header button').trigger('click')
    expect(nav.current).toBeNull()
  })
})
