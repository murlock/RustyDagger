import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import NotImplemented from './NotImplemented.vue'

const PriorScreen = defineComponent({ render: () => h('div', 'prior') })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('NotImplemented', () => {
  it('shows the feature name', () => {
    const wrapper = mount(NotImplemented, { props: { feature: 'Clan Hall' } })
    expect(wrapper.text()).toContain('Clan Hall is not implemented yet.')
  })

  it('shows the optional reason', () => {
    const wrapper = mount(NotImplemented, { props: { feature: 'Invest', reason: 'Requires the mail system.' } })
    expect(wrapper.text()).toContain('Requires the mail system.')
  })

  it('Continue returns to the screen that was home', async () => {
    const nav = useNavigationStore()
    nav.goto(PriorScreen)
    nav.goto(NotImplemented, { feature: 'Clan Hall' })
    const wrapper = mount(NotImplemented, { props: { feature: 'Clan Hall' } })
    await wrapper.get('button').trigger('click')
    expect(nav.currentComponent).toBe(PriorScreen)
  })
})
