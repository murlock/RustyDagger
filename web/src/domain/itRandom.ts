// Port of DCourt/Items/Token/itRandom.java

import { roll } from '../engine/dice'
import { Item, type ItemJSON } from './item'
import { ItCount } from './itCount'

export class ItRandom extends ItCount {
  copy(): Item {
    return new ItRandom(this.getName(), this.getCount())
  }

  // rolls a random amount in [0, count] each time it's realized
  makeCount(): number {
    return roll(1 + this.getCount())
  }

  toJSON(): ItemJSON {
    return { type: 'random', name: this.getName(), count: this.getCount() }
  }
}
