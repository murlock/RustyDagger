// Port of DCourt/Items/Token/itPercent.java

import { percent } from '../engine/dice'
import { Item, type ItemJSON } from './item'
import { ItCount } from './itCount'

export class ItPercent extends ItCount {
  copy(): Item {
    return new ItPercent(this.getName(), this.getCount())
  }

  // rolls a fresh 0/1 each time it's realized (e.g. building a monster's pack)
  makeCount(): number {
    return percent(this.getCount()) ? 1 : 0
  }

  toJSON(): ItemJSON {
    return { type: 'percent', name: this.getName(), count: this.getCount() }
  }
}
