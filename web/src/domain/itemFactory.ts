// Reconstructs an Item tree from the ItemJSON produced by toJSON(). Kept out
// of item.ts/itList.ts because it needs ItArms/ItNote, and itList.ts avoids
// importing ItArms to sidestep a circular import (see itList.ts's isArms comment).

import { type Item, type ItemJSON } from './item'
import { ItArms } from './itArms'
import { ItCount } from './itCount'
import { ItList } from './itList'
import { ItNote } from './itNote'
import { ItPercent } from './itPercent'
import { ItRandom } from './itRandom'
import { ItToken } from './itToken'
import { ItValue } from './itValue'

export function itemFromJSON(json: ItemJSON): Item {
  switch (json.type) {
    case 'token':
      return new ItToken(json.name)
    case 'count':
      return new ItCount(json.name, json.count)
    case 'percent':
      return new ItPercent(json.name, json.count)
    case 'random':
      return new ItRandom(json.name, json.count)
    case 'value':
      return new ItValue(json.name, json.value)
    case 'note': {
      const note = new ItNote(json.name)
      note.setFrom(json.from)
      note.setDate(json.date)
      note.setBody(json.body)
      return note
    }
    case 'list': {
      const list = new ItList(json.name)
      for (const child of json.items) list.append(itemFromJSON(child))
      return list
    }
    case 'arms': {
      const arms = new ItArms(json.name, json.attack, json.defend, json.skill)
      for (const child of json.items) arms.append(itemFromJSON(child))
      return arms
    }
  }
}
