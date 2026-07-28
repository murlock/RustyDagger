// Port of DCourt/Items/Item.java.
//
// The original Buffer-based text serialization (toString(depth) / factory(Buffer))
// is replaced by toJSON()/fromJSON() — game data is migrated to static JSON once
// (see web/scripts/build-legacy-data.mjs) and hero saves go to JSON in browser
// storage, so nothing needs to read or write the legacy `{type|field}` format
// at runtime.

// Recursive shape for anything that can live inside a generic list (pack,
// gear, temp, stat, rank, values, store, looks, opts...). itText and the
// itHero/itMonster agents never nest inside a list, so they're not part of
// this union — see itMonster.ts and itHero.ts for their own JSON shapes.
export type ItemJSON =
  | { type: 'token'; name: string }
  | { type: 'count'; name: string; count: number }
  | { type: 'percent'; name: string; count: number }
  | { type: 'random'; name: string; count: number }
  | { type: 'value'; name: string; value: string | null }
  | { type: 'list'; name: string; items: ItemJSON[] }
  | { type: 'arms'; name: string; attack: number; defend: number; skill: number; items: ItemJSON[] }
  | { type: 'note'; name: string; from: string | null; date: string | null; body: string | null }

export abstract class Item {
  abstract copy(): Item
  abstract getName(): string
  abstract setName(name: string): void
  abstract toShow(): string
  abstract toLoot(): string
  abstract isMatch(other: Item | string | null | undefined): boolean
  abstract getValue(): string | null
  abstract setValue(value: string | null): void
  abstract getCount(): number
  abstract setCount(count: number): void
  abstract add(value: number): number
  abstract sub(value: number): number
  abstract decay(rate: number): boolean
  abstract toInteger(): number
  abstract toLong(): number
  abstract toJSON(): ItemJSON
}

export function nameMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false
  return a.toLowerCase() === b.toLowerCase()
}
