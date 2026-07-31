import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import ArNotice from './arNotice.vue'

const PriorScreen = defineComponent({ render: () => h('div', 'prior') })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('arNotice', () => {
  it('shows the message', () => {
    const wrapper = mount(ArNotice, { props: { message: 'A door creaks open.' } })
    expect(wrapper.text()).toContain('A door creaks open.')
  })

  it('Continue returns to the screen that was home', async () => {
    const nav = useNavigationStore()
    nav.goto(PriorScreen)
    nav.goto(ArNotice, { message: 'hi' })
    const wrapper = mount(ArNotice, { props: { message: 'hi' } })
    await wrapper.get('button').trigger('click')
    expect(nav.currentComponent).toBe(PriorScreen)
  })
})
