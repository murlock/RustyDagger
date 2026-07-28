import { describe, expect, it, vi } from 'vitest'
import { today } from './today'

describe('today', () => {
  it('formats the current date as yyyy-MM-dd', () => {
    vi.setSystemTime(new Date(2026, 0, 5)) // Jan 5, 2026 - exercises zero-padding
    expect(today()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})
