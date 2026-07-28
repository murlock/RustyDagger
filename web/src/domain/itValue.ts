// Port of DCourt/Items/Token/itValue.java

import { Item, type ItemJSON } from './item'
import { ItToken } from './itToken'

export class ItValue extends ItToken {
  private value: string | null

  constructor(name: string, value: string | null = null) {
    super(name)
    this.value = value
  }

  copy(): Item {
    return new ItValue(this.name, this.value)
  }

  getValue(): string | null {
    return this.value
  }

  setValue(value: string | null): void {
    this.value = value
  }

  toLong(): number {
    if (this.value == null) return 0
    const n = Number(this.value)
    return Number.isNaN(n) ? 0 : n
  }

  toInt(): number {
    return this.toLong()
  }

  toJSON(): ItemJSON {
    return { type: 'value', name: this.name, value: this.value }
  }
}
