// Port of DCourt/Control/MonsterTable.java — backed by data/monsters.json
// (produced from the embedded Quests.java/VQuests.java definitions by
// web/scripts/build-legacy-data.mjs) instead of the inline Java string
// constants.

import monstersData from '../../data/monsters.json'
import { ItMonster, type MonsterCatalogEntry } from '../itMonster'

const catalog = new Map<string, MonsterCatalogEntry>()
for (const entry of monstersData as MonsterCatalogEntry[]) {
  catalog.set(entry.key, entry)
}

/** Builds a fresh, balanced monster instance for an encounter. */
export function find(key: string, heroLevel: number, heroPower: number, weight: number): ItMonster | null {
  const entry = catalog.get(key)
  if (!entry) {
    console.error(`MonsterTable could not find key=[${key}]`)
    return null
  }
  return ItMonster.fromCatalog(entry, heroLevel, heroPower, weight)
}

export function keys(): string[] {
  return [...catalog.keys()]
}
