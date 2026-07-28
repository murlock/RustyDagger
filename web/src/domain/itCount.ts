// Port of DCourt/Items/Token/itCount.java.
//
// The Java version stored count as `value + random offset` (re-rolled on
// every write) purely to obscure the number in memory against cheat tools —
// it has no observable effect on getCount()/setCount() round-tripping, and
// there's no equivalent threat model for a client-side save the player
// already fully controls, so it's dropped here.

import { Item, type ItemJSON } from './item'
import { ItToken } from './itToken'

export class ItCount extends ItToken {
  private count: number

  constructor(name: string, count = 0) {
    super(name)
    this.count = count
  }

  copy(): Item {
    return new ItCount(this.name, this.count)
  }

  getCount(): number {
    return this.count
  }

  setCount(count: number): void {
    this.count = count
  }

  add(value: number): number {
    if (value > 0) this.setCount(this.getCount() + value)
    return this.getCount()
  }

  adds(value: number): number {
    this.setCount(this.getCount() + value)
    return this.getCount()
  }

  sub(value: number): number {
    let sum = this.getCount()
    if (value < 0) return 0
    if (value > sum) value = sum
    this.setCount(sum - value)
    return value
  }

  // overridden by ItPercent (a % chance of 1) and ItRandom (a random amount
  // in [0, count]) — realizes a nominal count into an actual roll
  makeCount(): number {
    return this.getCount()
  }

  toJSON(): ItemJSON {
    return { type: 'count', name: this.name, count: this.count }
  }
}
