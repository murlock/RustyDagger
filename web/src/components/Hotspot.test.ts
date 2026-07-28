import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Hotspot from './Hotspot.vue'

describe('Hotspot', () => {
  it('renders the icon image', () => {
    const wrapper = mount(Hotspot, { props: { src: 'Town.gif' } })
    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('Town.gif')
  })

  it('renders no caption when text is omitted (NOTEXT)', () => {
    const wrapper = mount(Hotspot, { props: { src: 'Town.gif' } })
    expect(wrapper.find('.hotspot__caption').exists()).toBe(false)
  })

  it('renders a below-image caption for type "caption" (SUBTEXT)', () => {
    const wrapper = mount(Hotspot, {
      props: { src: 'Town.gif', text: 'The Town', type: 'caption' },
    })
    const caption = wrapper.get('.hotspot__caption--below')
    expect(caption.text()).toBe('The Town')
    expect(wrapper.find('.hotspot__caption--overlay').exists()).toBe(false)
  })

  it('renders an overlay caption for type "overlay" (SUPERTEXT)', () => {
    const wrapper = mount(Hotspot, {
      props: { src: 'Status.gif', text: 'Level: 4', type: 'overlay' },
    })
    const caption = wrapper.get('.hotspot__caption--overlay')
    expect(caption.text()).toBe('Level: 4')
    expect(wrapper.find('.hotspot__caption--below').exists()).toBe(false)
  })

  it('emits click when clicked', async () => {
    const wrapper = mount(Hotspot, { props: { src: 'Town.gif' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(Hotspot, { props: { src: 'Town.gif', disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('applies absolute positioning when x/y are provided', () => {
    const wrapper = mount(Hotspot, {
      props: { src: 'Town.gif', x: 10, y: 20, width: 60, height: 40 },
    })
    const style = wrapper.attributes('style') ?? ''
    expect(style).toContain('position: absolute')
    expect(style).toContain('left: 10px')
    expect(style).toContain('top: 20px')
    expect(style).toContain('width: 60px')
    expect(style).toContain('height: 40px')
  })
})
