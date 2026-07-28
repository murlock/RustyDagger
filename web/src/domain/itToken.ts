// Port of DCourt/Items/itToken.java

import { Item, type ItemJSON, nameMatches } from './item'

export class ItToken extends Item {
  protected name: string

  constructor(name: string) {
    super()
    this.name = name
  }

  copy(): Item {
    return new ItToken(this.name)
  }

  getName(): string {
    return this.name
  }

  setName(name: string): void {
    this.name = name
  }

  toShow(): string {
    return `${this.getName()}(${this.getCount()})`
  }

  toLoot(): string {
    return `${this.getCount()} ${this.getName()}`
  }

  getValue(): string | null {
    return null
  }

  setValue(_value: string | null): void {}

  isMatch(other: Item | string | null | undefined): boolean {
    const otherName = typeof other === 'string' ? other : (other?.getName() ?? null)
    return nameMatches(this.name, otherName)
  }

  getCount(): number {
    return 1
  }

  setCount(_count: number): void {}

  add(_value: number): number {
    return 0
  }

  sub(_value: number): number {
    return 0
  }

  decay(_rate: number): boolean {
    return false
  }

  toInteger(): number {
    const n = parseInt(this.name, 10)
    return Number.isNaN(n) ? 0 : n
  }

  toLong(): number {
    return this.toInteger()
  }

  toJSON(): ItemJSON {
    return { type: 'token', name: this.name }
  }
}
