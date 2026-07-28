import { describe, expect, it } from 'vitest'
import { chance, contest, fourTest, percent, roll, setSeed, skew, spread, twice } from './dice'

describe('roll', () => {
  it('returns 0 for values below 1', () => {
    expect(roll(0)).toBe(0)
    expect(roll(-5)).toBe(0)
  })

  it('stays within [0, value) across many samples', () => {
    setSeed(1)
    for (let i = 0; i < 1000; i++) {
      const r = roll(6)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(6)
    }
  })

  it('is deterministic for a given seed', () => {
    setSeed(42)
    const a = [roll(100), roll(100), roll(100)]
    setSeed(42)
    const b = [roll(100), roll(100), roll(100)]
    expect(a).toEqual(b)
  })
})

describe('twice', () => {
  it('sums two rolls within [0, 2*value)', () => {
    setSeed(2)
    for (let i = 0; i < 200; i++) {
      const r = twice(10)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(20)
    }
  })
})

describe('percent', () => {
  it('is always false at 0%', () => {
    setSeed(3)
    for (let i = 0; i < 200; i++) expect(percent(0)).toBe(false)
  })

  it('is always true at 100%', () => {
    setSeed(4)
    for (let i = 0; i < 200; i++) expect(percent(100)).toBe(true)
  })
})

describe('chance', () => {
  it('only ever matches within [0, value)', () => {
    setSeed(5)
    for (let i = 0; i < 200; i++) {
      // just exercising for crashes / range issues, chance(1) is always true
      expect(chance(1)).toBe(true)
    }
  })
})

describe('contest', () => {
  it('always favors the side holding the entire pool', () => {
    setSeed(6)
    for (let i = 0; i < 200; i++) expect(contest(10, 0)).toBe(true)
    for (let i = 0; i < 200; i++) expect(contest(0, 10)).toBe(false)
  })
})

describe('fourTest', () => {
  it('returns a count between 0 and 4', () => {
    setSeed(7)
    for (let i = 0; i < 200; i++) {
      const r = fourTest(5, 5)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(4)
    }
  })
})

describe('spread', () => {
  it('returns a positive number', () => {
    setSeed(8)
    for (let i = 0; i < 200; i++) {
      expect(spread(20)).toBeGreaterThan(0)
    }
  })
})

describe('skew', () => {
  it('terminates and returns a non-negative count', () => {
    setSeed(9)
    for (let i = 0; i < 200; i++) {
      expect(skew(10)).toBeGreaterThanOrEqual(0)
    }
  })
})
