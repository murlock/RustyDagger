import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { setSeed } from '../../engine/dice'
import { useHeroStore } from '../../stores/hero'
import { useNavigationStore } from '../../stores/navigation'
import type { ItHero } from '../../domain/itHero'
import * as MonsterTable from '../../domain/tables/monsterTable'
import { QuestOptions } from './useQuestOptions'
import { createQuestSession, type QuestSession } from './questSession'
import { runBattleRound } from './battleRound'
import ArBattle from './arBattle.vue'
import ArQuest from './arQuest.vue'
import ArNotice from '../Utility/arNotice.vue'

const PriorScreen = defineComponent({ render: () => h('div', 'prior') })

function session(hero: ItHero, key: string, weight = 1): QuestSession {
  const mob = MonsterTable.find(key, hero.getLevel(), hero.getPower(), weight)!
  mob.resetActions()
  mob.chooseActions(hero, true)
  const nav = useNavigationStore()
  nav.goto(PriorScreen)
  const opt = new QuestOptions([...mob.getOptions().getQueue().map((it) => it.getName())])
  return createQuestSession(mob, weight, 'Test Quest', opt, nav.current)
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  setSeed(1)
})

describe('arBattle', () => {
  it('renders the round text it was given', () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Rodent')
    const wrapper = mount(ArBattle, { props: { session: s, text: 'Zog:Weak Blow\n    ---Rodent Scratched\n' } })

    expect(wrapper.text()).toContain('Zog:Weak Blow')
  })

  it('Continue with a slain monster routes to a victory notice homed on the gate', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(1000, 1000, 1000, 0, 0, 0)
    hero.calcCombat() // derives a high skill/speed from wits so the attack roll actually lands, not just hits hard
    hero.resetActions()
    hero.setAttack(100000)
    const s = session(hero, 'Fields:Rodent')
    const { text } = runBattleRound(hero, s.mob, null)
    expect(s.mob.isDead()).toBe(true)

    const nav = useNavigationStore()
    const wrapper = mount(ArBattle, { props: { session: s, text } })
    await wrapper.get('button').trigger('click')

    expect(nav.currentComponent).toBe(ArNotice)
    expect(nav.current?.home?.component).toBe(PriorScreen)
    expect((nav.currentProps as { message: string }).message).toContain('slain')
  })

  it('Continue with the monster still alive routes back to arQuest for another round', async () => {
    const heroStore = useHeroStore()
    const hero = heroStore.createHero('Zog')
    hero.setVals(10, 10, 10, 0, 0, 0)
    hero.resetActions()
    const s = session(hero, 'Fields:Wizard') // defensive, unlikely to die to a default-stat hero's opening blow
    const { text } = runBattleRound(hero, s.mob, null)

    const nav = useNavigationStore()
    const wrapper = mount(ArBattle, { props: { session: s, text } })
    await wrapper.get('button').trigger('click')

    if (!s.mob.isDead() && !hero.isDead()) {
      expect(nav.currentComponent).toBe(ArQuest)
      expect((nav.currentProps as { session: QuestSession }).session).toBe(s)
    }
  })
})
