// Port of DCourt/Control/PlaceTable.java.
// The Java version resolved `launch` to a Screen instance via reflection
// (Class.forName) — screen resolution belongs to the UI layer (later
// phases), so this just exposes the raw launch identifier string.

import placesData from '../../data/places.json'

export interface PlaceRecord {
  name: string
  launch: string | null
  decay: number
  use: string
  awake: string
  sleep: string
}

const table = new Map<string, PlaceRecord>()
for (const entry of placesData as PlaceRecord[]) {
  table.set(entry.name, entry)
}

export function get(key: string | null | undefined): PlaceRecord {
  const record = key == null ? undefined : table.get(key)
  return record ?? table.get('limbo')!
}
