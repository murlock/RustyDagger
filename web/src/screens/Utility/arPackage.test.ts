import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import ArPackage from './arPackage.vue'
import ArTown from '../Areas/arTown.vue'
import ArNotice from '../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })))
})

function stashItem(wrapper: ReturnType<typeof mount>, label: string) {
  const lists = wrapper.findAll('.package__list')
  return lists[0].findAll('li').find((li) => li.text().startsWith(label))!
}

describe('arPackage', () => {
  it('malformed recipient name shows a notice and does not spend money', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    hero.addMoney(1000)
    const nav = useNavigationStore()
    const wrapper = mount(ArPackage, { props: { title: 'Sloeth Dreyfus Postal Express' } })

    await stashItem(wrapper, 'Torch').trigger('click')
    await wrapper.find('input[type=text]').setValue('Bo')
    await wrapper.get('.package__send button').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.currentProps.message).toContain('malformed')
    expect(hero.getMoney()).toBe(1000)
  })

  it('mailing yourself shows a notice instead of sending', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.addPackCount('Torch', 1)
    hero.addMoney(1000)
    const nav = useNavigationStore()
    const wrapper = mount(ArPackage, { props: { title: 'Sloeth Dreyfus Postal Express' } })

    await stashItem(wrapper, 'Torch').trigger('click')
    await wrapper.find('input[type=text]').setValue('Zoggy')
    await wrapper.get('.package__send button').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.currentProps.message).toContain('yourself')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('a successful send deducts $100/item and routes past this screen on Continue', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    hero.addMoney(1000)
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArPackage, { title: 'Sloeth Dreyfus Postal Express' })
    const wrapper = mount(ArPackage, { props: { title: 'Sloeth Dreyfus Postal Express' } })

    await stashItem(wrapper, 'Torch').trigger('click')
    await wrapper.find('input[type=text]').setValue('Bobby')
    await wrapper.get('.package__send button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(hero.getMoney()).toBe(1000 - 100)
    expect(hero.packCount('Torch')).toBe(0)
    expect(fetch).toHaveBeenCalledWith('/api/mail', expect.objectContaining({ method: 'POST' }))
    expect(nav.currentComponent).toBe(ArNotice)
  })

  it('a failed send refunds the money and shows MAIL_CANCEL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 500 })))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    hero.addMoney(1000)
    const wrapper = mount(ArPackage, { props: { title: 'Sloeth Dreyfus Postal Express' } })

    await stashItem(wrapper, 'Torch').trigger('click')
    await wrapper.find('input[type=text]').setValue('Bobby')
    await wrapper.get('.package__send button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(hero.getMoney()).toBe(1000)
    const nav = useNavigationStore()
    expect(nav.currentProps.message).toContain('Error while trying to send mail')
  })

  it('Exit merges any staged-but-unsent stash back into the pack', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.addPackCount('Torch', 1)
    const nav = useNavigationStore()
    nav.goto(ArTown)
    nav.goto(ArPackage, { title: 'Sloeth Dreyfus Postal Express' })
    const wrapper = mount(ArPackage, { props: { title: 'Sloeth Dreyfus Postal Express' } })

    await stashItem(wrapper, 'Torch').trigger('click')
    expect(hero.packCount('Torch')).toBe(0)

    await wrapper.get('.package__header button').trigger('click')

    expect(hero.packCount('Torch')).toBe(1)
    expect(nav.currentComponent).toBe(ArTown)
  })
})
