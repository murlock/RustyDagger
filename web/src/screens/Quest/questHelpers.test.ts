import { describe, expect, it } from 'vitest'
import { setSeed } from '../../engine/dice'
import { ItList } from '../../domain/itList'
import { ItCount } from '../../domain/itCount'
import { packString, selectQuestKey } from './questHelpers'

describe('packString', () => {
  it('is empty for an empty list', () => {
    expect(packString('\nYou Find:', new ItList('pack'))).toBe('')
  })

  it('formats each item on its own indented line', () => {
    const list = new ItList('pack')
    list.append(new ItCount('Food', 3))
    list.append(new ItCount('Marks', 10))
    expect(packString('\nYou Find:', list)).toBe('\nYou Find:\n     3 Food\n     10 Marks\n')
  })
})

describe('selectQuestKey', () => {
  it('always returns a region-prefixed or Faery key', () => {
    setSeed(1)
    for (let i = 0; i < 50; i++) {
      const key = selectQuestKey('Fields', ['Rodent', 'Goblin'], [1, 1])
      expect(key === 'Faery' || key.startsWith('Fields:')).toBe(true)
    }
  })

  it('picks names proportional to their weight', () => {
    setSeed(1)
    const counts: Record<string, number> = {}
    for (let i = 0; i < 500; i++) {
      const key = selectQuestKey('Fields', ['Common', 'Rare'], [99, 1])
      counts[key] = (counts[key] ?? 0) + 1
    }
    expect(counts['Fields:Common']).toBeGreaterThan(counts['Fields:Rare'] ?? 0)
  })
})
