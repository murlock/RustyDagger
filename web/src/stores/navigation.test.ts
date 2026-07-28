import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useNavigationStore } from './navigation'

const ScreenA = defineComponent({ render: () => h('div', 'A') })
const ScreenB = defineComponent({ render: () => h('div', 'B') })
const ScreenC = defineComponent({ render: () => h('div', 'C') })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('navigation store', () => {
  it('starts with no current screen', () => {
    const nav = useNavigationStore()
    expect(nav.currentComponent).toBeNull()
    expect(nav.currentProps).toEqual({})
    expect(nav.showStatusBar).toBe(false)
  })

  it('goto sets the current component, props, and defaults showStatus true', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA, { name: 'Zog' })
    expect(nav.currentComponent).toBe(ScreenA)
    expect(nav.currentProps).toEqual({ name: 'Zog' })
    expect(nav.showStatusBar).toBe(true)
  })

  it('goto defaults home to whatever was previously current', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA)
    nav.goto(ScreenB)
    nav.goHome()
    expect(nav.currentComponent).toBe(ScreenA)
  })

  it('goHome unwinds a multi-level chain one step at a time', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA)
    nav.goto(ScreenB)
    nav.goto(ScreenC)

    nav.goHome()
    expect(nav.currentComponent).toBe(ScreenB)

    nav.goHome()
    expect(nav.currentComponent).toBe(ScreenA)
  })

  it('goHome is a no-op when there is no home to return to', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA)
    nav.goHome()
    expect(nav.currentComponent).toBe(ScreenA)
  })

  it('goto accepts an explicit home override, independent of the current screen', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA)
    const aEntry = nav.current
    nav.goto(ScreenB)
    nav.goto(ScreenC, {}, { home: aEntry })
    nav.goHome()
    expect(nav.currentComponent).toBe(ScreenA)
  })

  it('showStatus can be suppressed, mirroring Screen.hideStatusBar()', () => {
    const nav = useNavigationStore()
    nav.goto(ScreenA, {}, { showStatus: false })
    expect(nav.showStatusBar).toBe(false)
  })
})
