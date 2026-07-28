// Port of DCourt/Control/GearTable.java

import gearData from '../../data/gear.json'
import * as ArmsTable from './armsTable'
import { effectLabel } from '../gearTypes'
import { Item } from '../item'
import { ItCount } from '../itCount'

interface GearRecord {
  name: string
  type: number
  cost: number
  effect: number
}

const unknown: GearRecord = { name: 'Unknown', type: 0, cost: 0, effect: 0 }
const table = new Map<string, GearRecord>()
for (const entry of gearData as GearRecord[]) {
  table.set(entry.name, entry)
}

function get(key: string): GearRecord {
  return table.get(key) ?? unknown
}

export function find(itemOrKey: Item | string | null | undefined): boolean {
  if (itemOrKey == null) return false
  const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.getName()
  if (table.has(key) || ArmsTable.find(key)) return true
  console.error(`GearTable could not find item=[${key}]`)
  return false
}

export function shopItem(itemOrKey: Item | string): Item | null {
  const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.getName()
  const rec = table.get(key)
  if (!rec) return ArmsTable.shopItem(key)
  return new ItCount(key, rec.cost)
}

export function getType(itemOrKey: Item | string): number {
  const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.getName()
  return get(key).type
}
export function getCost(itemOrKey: Item | string): number {
  const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.getName()
  return get(key).cost
}
export function getEffect(itemOrKey: Item | string): number {
  const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.getName()
  return get(key).effect
}

export function isScroll(itemOrKey: Item | string): boolean {
  return getType(itemOrKey) === 7
}
export function canHeroUse(itemOrKey: Item | string): boolean {
  return getEffect(itemOrKey) !== 0
}
export function effectLabelFor(itemOrKey: Item | string): string {
  return effectLabel[getEffect(itemOrKey)]
}

export function canMageUse(key: string, magicRank: number): boolean {
  return getType(key) === 5 && magicRank * magicRank * 25 >= getCost(key)
}

export function findList(type: number): Array<{ name: string; cost: number }> {
  return [...table.values()].filter((rec) => rec.type === type).map((rec) => ({ name: rec.name, cost: rec.cost }))
}
