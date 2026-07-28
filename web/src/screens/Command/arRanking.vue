<script setup lang="ts">
// Port of DCourt/Screens/Command/arRanking.java. Java's version read a
// server-side "Rankfile" and showed 5 tabs (Fame/Skill/Rank/Guild/Clan)
// aggregating every player account. There's no server here (see README's
// "Multiplayer was removed", already reflected in Phase 1's dropped
// rankString()/leader/clan-aggregation fields) - reinterpreted as a
// same-device leaderboard over heroStorage.listHeroes(), keeping only the
// 3 tabs that map to data a single hero actually has (Fame/Skill/Level).
// Guild and Clan are dropped: Guild is a boolean trait per hero, not an
// aggregate ranking dimension, and there's no clan-membership model at all.
import { computed, ref } from 'vue'
import { useNavigationStore } from '../../stores/navigation'
import { listHeroes, loadHero } from '../../engine/heroStorage'
import * as C from '../../domain/constants'

const nav = useNavigationStore()

type SortKey = 'fame' | 'skill' | 'level'
const sortKey = ref<SortKey>('fame')

const TABS: { key: SortKey; label: string }[] = [
  { key: 'fame', label: C.FAME },
  { key: 'skill', label: C.SKILL },
  { key: 'level', label: C.LEVEL },
]

interface Row {
  name: string
  title: string
  level: number
  fame: number
  skill: number
  attack: number
  defend: number
  money: number
  dead: boolean
}

const rows = computed<Row[]>(() => {
  const list: Row[] = []
  for (const name of listHeroes()) {
    const hero = loadHero(name)
    if (!hero) continue
    list.push({
      name: hero.getName(),
      title: hero.getTitle(),
      level: hero.getLevel(),
      fame: hero.getFame(),
      skill: hero.getSkill(),
      attack: hero.getAttack(),
      defend: hero.getDefend(),
      money: hero.getMoney(),
      dead: hero.isDead(),
    })
  }
  list.sort((a, b) => b[sortKey.value] - a[sortKey.value])
  return list
})

function back() {
  nav.goHome()
}
</script>

<template>
  <div class="ranking">
    <div class="ranking__header">
      <h2>Local Rankings</h2>
      <button type="button" @click="back">Done</button>
    </div>

    <div class="ranking__tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        :class="{ 'ranking__tab--active': sortKey === tab.key }"
        @click="sortKey = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <p v-if="rows.length === 0" class="ranking__empty">No Records Found</p>
    <table v-else class="ranking__table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Level</th>
          <th>Fame</th>
          <th>Skill</th>
          <th>At/Df</th>
          <th>Cash</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.name" :class="{ 'ranking__row--dead': row.dead }">
          <td>{{ row.title }}{{ row.name }}</td>
          <td>{{ row.level }}</td>
          <td>{{ row.fame }}</td>
          <td>{{ row.skill }}</td>
          <td>{{ row.attack }}/{{ row.defend }}</td>
          <td>{{ row.money }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ranking {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1.5em;
  background: #00cc00;
  color: black;
}

.ranking__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ranking__tabs {
  display: flex;
  gap: 0.5em;
  margin: 1em 0;
}

.ranking__tab--active {
  font-weight: bold;
  text-decoration: underline;
}

.ranking__table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffffaa;
}

.ranking__table th,
.ranking__table td {
  text-align: left;
  padding: 0.25em 0.5em;
  border-bottom: 1px solid #00000033;
}

.ranking__row--dead {
  opacity: 0.5;
  font-style: italic;
}

.ranking__empty {
  font-style: italic;
}
</style>
