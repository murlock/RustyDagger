// Port of DCourt/Control/ArmsTable.java — backed by data/arms.json instead
// of parsing embedded `{itArms|...}` literals at runtime.

import armsData from '../../data/arms.json'
import { ItArms } from '../itArms'

interface ArmsData {
  name: string
  attack: number
  defend: number
  skill: number
  traits: string[]
}

function build(entry: ArmsData): ItArms {
  const arms = new ItArms(entry.name, entry.attack, entry.defend, entry.skill)
  for (const trait of entry.traits) arms.fixTrait(trait)
  return arms
}

// Java's ArmsTable.get() returns the same cached hashtable entry on every
// call (a shared mutable instance) — shopItem() is the one that copies it
// before handing it out. Preserved here rather than always minting a fresh
// instance, in case anything ever relies on get() identity.
const table = new Map<string, ItArms>()
for (const entry of armsData as ArmsData[]) {
  table.set(entry.name, build(entry))
}

export function find(key: string): boolean {
  return table.has(key)
}

export function get(key: string): ItArms | null {
  const arms = table.get(key)
  if (!arms) {
    console.error(`ArmsTable could not find key=[${key}]`)
    return null
  }
  return arms
}

export function shopItem(key: string): ItArms | null {
  const arms = get(key)
  return arms ? (arms.copy() as ItArms) : null
}

export function keys(): string[] {
  return [...table.keys()]
}
