import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import ArError from './arError.vue'

const PriorScreen = defineComponent({ render: () => h('div', 'prior') })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('arError', () => {
  it('shows the error message', () => {
    const wrapper = mount(ArError, { props: { message: 'Something broke' } })
    expect(wrapper.text()).toContain('Something broke')
    expect(wrapper.text()).toContain('ERROR - Dragon Court Error has occurred')
  })

  it('Continue returns to the screen that was home before the error', async () => {
    const nav = useNavigationStore()
    nav.goto(PriorScreen)
    nav.goto(ArError, { message: 'oops' })
    const wrapper = mount(ArError, { props: { message: 'oops' } })
    await wrapper.get('button').trigger('click')
    expect(nav.currentComponent).toBe(PriorScreen)
  })
})
