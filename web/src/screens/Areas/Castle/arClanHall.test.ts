import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeroStore } from '../../../stores/hero'
import { useNavigationStore } from '../../../stores/navigation'
import { ItNote } from '../../../domain/itNote'
import * as C from '../../../domain/constants'
import ArClanHall from './arClanHall.vue'
import ArNotice from '../../Utility/arNotice.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

function fetchRouter(handlers: { peek?: () => Response; makeClan?: () => Response; killClan?: () => Response; mail?: () => Response }) {
  return vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/mail') return handlers.mail?.() ?? new Response(JSON.stringify({ ok: true }), { status: 200 })
    if (url === '/api/clans' && method === 'POST') return handlers.makeClan?.() ?? new Response(JSON.stringify({ ok: true }), { status: 200 })
    if (url.startsWith('/api/clans/') && method === 'DELETE') return handlers.killClan?.() ?? new Response(JSON.stringify({ ok: true }), { status: 200 })
    if (url.startsWith('/api/clans/') && method === 'GET') return handlers.peek?.() ?? new Response(JSON.stringify({ error: 'No Clan Found' }), { status: 404 })
    return new Response('{}', { status: 404 })
  })
}

async function selectRadio(wrapper: ReturnType<typeof mount>, label: string) {
  const target = wrapper.findAll('.clan__actions label').find((l) => l.text().includes(label))!
  await target.find('input[type=radio]').setValue(true)
}

describe('arClanHall', () => {
  it('clanless hero defaults to Join/Create with no initial network call', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const heroStore = useHeroStore()
    heroStore.createHero('Zoggy')
    const wrapper = mount(ArClanHall)
    await flush()

    expect(wrapper.text()).toContain('Enter a Clan Name')
    expect(wrapper.findAll('.clan__actions label').map((l) => l.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('Join'), expect.stringContaining('Create')]),
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('petitioning a found clan sends mail and deducts $1000', async () => {
    vi.stubGlobal('fetch', fetchRouter({ peek: () => new Response(JSON.stringify({ leader: 'Leadric', members: 3, power: 9, ability: 'None' }), { status: 200 }) }))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.addMoney(2000)
    const nav = useNavigationStore()
    const wrapper = mount(ArClanHall)
    await flush()

    await wrapper.find('.clan__lookup input').setValue('Wolves')
    await wrapper.find('.clan__lookup input').trigger('change')
    await flush()
    expect(wrapper.text()).toContain('Leader: Leadric')

    await wrapper.find('.clan__enact input[type=checkbox]').setValue(true)
    await wrapper.get('.clan__enact button').trigger('click')
    await flush()

    expect(hero.getMoney()).toBe(2000 - 1000)
    expect(fetch).toHaveBeenCalledWith('/api/mail', expect.objectContaining({ method: 'POST' }))
    expect(nav.currentComponent).toBe(ArNotice)
  })

  it('creating a clan when none is found deducts $250k and sets the hero\'s clan', async () => {
    vi.stubGlobal('fetch', fetchRouter({}))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.getRank().fixCount(C.LEVEL, 20) // baseQuests 27+3*level must clear CREATE_QUESTS=75
    hero.addMoney(300000)
    const nav = useNavigationStore()
    const wrapper = mount(ArClanHall)
    await flush()

    await wrapper.find('.clan__lookup input').setValue('Newborn')
    await wrapper.find('.clan__lookup input').trigger('change')
    await flush()
    expect(wrapper.text()).toContain('No Clan Found')

    await selectRadio(wrapper, 'Create')
    await wrapper.find('.clan__enact input[type=checkbox]').setValue(true)
    await wrapper.get('.clan__enact button').trigger('click')
    await flush()

    expect(hero.getClan()).toBe('Newborn')
    expect(hero.getMoney()).toBe(300000 - 250000)
    expect(fetch).toHaveBeenCalledWith('/api/clans', expect.objectContaining({ method: 'POST' }))
    expect(nav.currentComponent).toBe(ArNotice)
  })

  it('a mailed Petition note in pack surfaces as "Petition from X" (bug fix: Java only ever checked instanceof itValue, which an itNote never is)', async () => {
    vi.stubGlobal('fetch', fetchRouter({ peek: () => new Response(JSON.stringify({ leader: 'Zoggy', members: 2, power: 4, ability: 'None' }), { status: 200 }) }))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.setClan('Wolves')
    hero.addPack(ItNote.create('Petition', 'Newbie', null, 'Sire,\nI wish to join thy guild.\nThankee'))
    const wrapper = mount(ArClanHall)
    await flush()

    expect(wrapper.text()).toContain('Petition from Newbie')
  })

  it('Grant removes the petition from pack and mails the petitioner a Grant note', async () => {
    vi.stubGlobal('fetch', fetchRouter({ peek: () => new Response(JSON.stringify({ leader: 'Zoggy', members: 2, power: 4, ability: 'None' }), { status: 200 }) }))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.setClan('Wolves')
    hero.addPack(ItNote.create('Petition', 'Newbie', null, 'Sire,\nI wish to join thy guild.\nThankee'))
    const wrapper = mount(ArClanHall)
    await flush()

    await wrapper.findAll('.clan__petition-actions button').find((b) => b.text() === 'Grant')!.trigger('click')
    await flush()

    expect(hero.getPack().find('Petition')).toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/mail', expect.objectContaining({ method: 'POST' }))
  })

  it('disbanding clears the hero\'s own clan membership (bug fix: Java re-set the same clan and never nulled it)', async () => {
    vi.stubGlobal('fetch', fetchRouter({ peek: () => new Response(JSON.stringify({ leader: 'Zoggy', members: 1, power: 3, ability: 'None' }), { status: 200 }) }))
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zoggy')
    hero.setClan('Wolves')
    hero.addMoney(60000)
    const wrapper = mount(ArClanHall)
    await flush()

    await selectRadio(wrapper, 'Quit')
    await wrapper.find('.clan__enact input[type=checkbox]').setValue(true)
    await wrapper.get('.clan__enact button').trigger('click')
    await flush()

    expect(hero.getClan()).toBeNull()
    expect(fetch).toHaveBeenCalledWith('/api/clans/Wolves', expect.objectContaining({ method: 'DELETE' }))
  })
})
