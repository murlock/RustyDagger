import { describe, expect, it } from 'vitest'
import { ItCount } from './itCount'
import { ItList } from './itList'
import { ItToken } from './itToken'
import { ItValue } from './itValue'

describe('ItList', () => {
  it('append/find/getCount round-trip for counted items', () => {
    const pack = new ItList('pack')
    pack.append(new ItCount('Marks', 10))
    expect(pack.getCount('Marks')).toBe(10)
    expect(pack.getCount()).toBe(1)
  })

  it('merges duplicate counted items instead of adding a second entry', () => {
    const pack = new ItList('pack')
    pack.append(new ItCount('Marks', 10))
    pack.append(new ItCount('Marks', 5))
    expect(pack.getCount()).toBe(1)
    expect(pack.getCount('Marks')).toBe(15)
  })

  it('name matching is case-insensitive', () => {
    const pack = new ItList('pack')
    pack.append(new ItCount('Marks', 10))
    expect(pack.getCount('marks')).toBe(10)
    expect(pack.find('MARKS')).not.toBeNull()
  })

  it('fixTrait/hasTrait/clrTrait manage bare marker tokens', () => {
    const gear = new ItList('gear')
    expect(gear.hasTrait('Bless')).toBe(false)
    gear.fixTrait('Bless')
    expect(gear.hasTrait('Bless')).toBe(true)
    gear.clrTrait('Bless')
    expect(gear.hasTrait('Bless')).toBe(false)
  })

  it('subCount drops the entry once it reaches zero', () => {
    const pack = new ItList('pack')
    pack.append(new ItCount('Torch', 3))
    expect(pack.subCount('Torch', 2)).toBe(2)
    expect(pack.getCount('Torch')).toBe(1)
    expect(pack.subCount('Torch', 5)).toBe(1)
    expect(pack.contains('Torch')).toBe(false)
  })

  it('fixValue/getValue store and retrieve a value entry', () => {
    const values = new ItList('values')
    values.fixValue('state', 'Alive')
    expect(values.getValue('state')).toBe('Alive')
    values.fixValue('state', 'Dead')
    expect(values.getValue('state')).toBe('Dead')
  })

  it('copy() produces an independent deep copy', () => {
    const pack = new ItList('pack')
    pack.append(new ItCount('Marks', 10))
    const copy = pack.copy() as ItList
    copy.append(new ItCount('Torch', 1))
    expect(pack.getCount()).toBe(1)
    expect(copy.getCount()).toBe(2)
  })

  it('insert() puts items at the front, append() at the back', () => {
    const list = new ItList('opts')
    list.append(new ItToken('a'))
    list.insert(new ItToken('b'))
    expect(list.select(0)!.getName()).toBe('b')
    expect(list.select(1)!.getName()).toBe('a')
  })

  it('mergeTokens builds bare token entries from a string array', () => {
    const opts = new ItList('opts', ['help', 'backstab', 'swindle'])
    expect(opts.getCount()).toBe(3)
    expect(opts.contains('backstab')).toBe(true)
  })

  it('drop removes by id or by instance', () => {
    const pack = new ItList('pack')
    const val = new ItValue('key', 'val')
    pack.append(val)
    expect(pack.drop('key')).toBe(val)
    expect(pack.contains('key')).toBe(false)
  })
})
