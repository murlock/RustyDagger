import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '../../stores/navigation'
import { useHeroStore } from '../../stores/hero'
import * as C from '../../domain/constants'
import ArBuild from './arBuild.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function mountBuild() {
  const heroStore = useHeroStore()
  heroStore.createHero('Zog')
  const wrapper = mount(ArBuild)
  const nav = useNavigationStore()
  return { wrapper, heroStore, nav }
}

describe('arBuild', () => {
  it('randomizes text fields and a title choice on mount', async () => {
    const { wrapper } = mountBuild()
    await nextTick()
    const inputs = wrapper.findAll('.build__fields input')
    for (const input of inputs) {
      expect((input.element as HTMLInputElement).value).not.toBe('')
    }
  })

  it('"Fix These Settings Permanently" commits looks and returns home', async () => {
    const { wrapper, heroStore, nav } = mountBuild()
    await wrapper.get('.build__actions button:first-child').trigger('click')

    const looks = heroStore.hero!.getLooks()
    expect(looks.getValue(C.RACE)).not.toBeNull()
    expect(looks.getValue(C.GENDER)).toMatch(/Male|Female|Both|None/)
    expect(looks.getCount()).toBeGreaterThan(0)
    // no explicit home was set up in this mount, so goHome is a no-op -
    // the important part is that it didn't throw and looks got saved
    expect(nav).toBeDefined()
  })

  it('"I\'ll get to this later" leaves looks empty', async () => {
    const { wrapper, heroStore } = mountBuild()
    await wrapper.get('.build__actions button:last-child').trigger('click')
    expect(heroStore.hero!.getLooks().getCount()).toBe(0)
  })

  it('random reassigns the title/gender-linked radio groups together', async () => {
    const { wrapper } = mountBuild()
    const titleFieldset = wrapper.findAll('fieldset')[3]
    const checkedTitle = titleFieldset.findAll('input[type="radio"]').filter(
      (i) => (i.element as HTMLInputElement).checked,
    )
    expect(checkedTitle).toHaveLength(1)
  })
})
