// Port of DCourt/Items/itList.java

import { chance, roll } from '../engine/dice'
import { Item, type ItemJSON } from './item'
import { ItCount } from './itCount'
import { ItToken } from './itToken'
import { ItValue } from './itValue'
import type { ItArms } from './itArms'

export class ItList extends ItToken {
  private queue: Item[] = []

  constructor(name: string, initial?: string[]) {
    super(name)
    if (initial) this.mergeTokens(initial)
  }

  static fromList(other: ItList): ItList {
    const copy = new ItList(other.getName())
    for (let ix = 0; ix < other.getCount(); ix++) {
      copy.append(other.select(ix)!.copy())
    }
    return copy
  }

  copy(): Item {
    return ItList.fromList(this)
  }

  toShow(): string {
    return `${this.getName()}(1)`
  }

  toLoot(): string {
    return `1 ${this.getName()}`
  }

  isEmpty(): boolean {
    return this.getCount() < 1
  }

  getQueue(): Item[] {
    return this.queue
  }

  clrQueue(): void {
    this.queue = []
  }

  elements(): Item[] {
    return this.queue
  }

  mergeList(other: ItList): void {
    for (const it of other.elements()) this.insert(it)
  }

  mergeTokens(names: string[]): void {
    for (const n of names) this.append(new ItToken(n))
  }

  decay(rate: number): boolean {
    let result = false
    for (let ix = 0; ix < this.getCount(); ix++) {
      if (this.select(ix)!.decay(rate)) result = true
    }
    return result
  }

  insertId(id: string | null): void {
    if (id != null) this.insert(new ItToken(id))
  }

  insertValue(id: string | null, val: string | null): void {
    if (id != null) this.insert(new ItValue(id, val))
  }

  insert(it: Item | null | undefined): void {
    if (!it) return
    if (!(it instanceof ItCount) || this.find(it.getName()) == null) {
      this.queue.unshift(it)
    } else {
      this.addCount(it)
    }
  }

  appendId(id: string | null): void {
    if (id != null) this.append(new ItToken(id))
  }

  appendValue(id: string | null, val: string | null): void {
    if (id != null) this.append(new ItValue(id, val))
  }

  append(it: Item | null | undefined): void {
    if (!it) return
    if (!(it instanceof ItCount) || this.find(it.getName()) == null) {
      this.queue.push(it)
    } else {
      this.addCount(it)
    }
  }

  addCount(id: string, num: number): number
  addCount(itc: ItCount): number
  addCount(a: string | ItCount, b?: number): number {
    const itc = typeof a === 'string' ? new ItCount(a, b ?? 0) : a
    if (itc.getCount() < 1) return this.getCount(itc.getName())
    const it = this.find(itc.getName())
    if (it) return it.add(itc.getCount())
    this.insert(itc)
    return itc.getCount()
  }

  // Java's hasTrait/clrTrait check `instanceof itToken` — but every concrete
  // Item subclass in this codebase (ItCount, ItValue, ItList, ...) extends
  // ItToken, so that check is really just "an entry with this name exists",
  // not "a bare marker token exists". Preserved as-is rather than tightened,
  // since fixTrait/clrTrait pairs still only ever add/remove bare tokens.
  hasTrait(id: string): boolean {
    return this.find(id) != null
  }

  fixTrait(id: string | null): void {
    if (id == null) return
    this.drop(id)
    this.append(new ItToken(id))
  }

  clrTrait(id: string | null): void {
    if (id == null) return
    const it = this.find(id)
    if (it) {
      this.drop(it)
    }
  }

  dropAll(): void {
    this.queue = []
  }

  drop(idOrItem: string | Item | null | undefined): Item | null {
    const it = typeof idOrItem === 'string' ? this.find(idOrItem) : idOrItem
    if (!it) return null
    const ix = this.queue.indexOf(it)
    if (ix < 0) return null
    this.queue.splice(ix, 1)
    return it
  }

  subCount(id: string, num: number): number
  subCount(it: ItCount): number
  subCount(a: string | ItCount, b?: number): number {
    const [id, num] = typeof a === 'string' ? [a, b ?? 0] : [a.getName(), a.getCount()]
    if (num < 1) return this.getCount(id)
    const it = this.find(id)
    if (!it || !(it instanceof ItCount)) return 0
    const sum = it.getCount()
    if (num < sum) return it.sub(num)
    this.drop(it)
    return sum
  }

  zero(id: string): void {
    const it = this.find(id)
    if (it && it instanceof ItCount) this.drop(it)
  }

  dropItem(id: string): void {
    const it = this.find(id)
    if (it) this.drop(it)
  }

  fixCount(id: string, num: number): void {
    this.fix(new ItCount(id, num))
  }

  fixValue(id: string, val: string): void {
    this.fix(new ItValue(id, val))
  }

  fix(it: Item): void {
    this.drop(it.getName())
    this.append(it)
  }

  update(list: ItList): void {
    for (const it of this.elements()) list.fix(it)
  }

  fixList(id: string): ItList {
    let it = this.find(id)
    if (!it || !(it instanceof ItList)) {
      this.drop(it)
      const itlist = new ItList(id)
      it = itlist
      this.append(itlist)
    }
    return it as ItList
  }

  select(ix: number): Item | null {
    if (ix < 0 || ix >= this.queue.length) return null
    return this.queue[ix]
  }

  selectNth(id: string, num: number): Item | null {
    let count = 0
    for (const it of this.elements()) {
      if (it.isMatch(id)) {
        count++
        if (count > num) return it
      }
    }
    return null
  }

  indexOf(what: Item): number {
    return this.queue.indexOf(what)
  }

  firstOf(id: string): number {
    for (let ix = 0; ix < this.getCount(); ix++) {
      if (this.select(ix)!.isMatch(id)) return ix
    }
    return -1
  }

  find(id: string | null | undefined): Item | null {
    if (id == null) return null
    for (const it of this.queue) {
      if (it.isMatch(id)) return it
    }
    return null
  }

  getCount(itemOrId?: Item | string): number {
    if (itemOrId === undefined) return this.queue.length
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.getName()
    const it = this.find(id)
    return it ? it.getCount() : 0
  }

  contains(id: string): boolean {
    return this.find(id) != null
  }

  getValue(id?: string): string | null {
    if (id === undefined) return null
    const it = this.find(id)
    if (!it || !(it instanceof ItValue)) return null
    return it.getValue()
  }

  loseHalf(): void {
    let ix = 0
    while (ix < this.getCount()) {
      const it = this.select(ix)!
      if (it instanceof ItCount) {
        it.sub(roll(1 + it.getCount()))
        if (it.getCount() <= 0) {
          this.drop(it)
        } else {
          ix++
        }
      } else {
        if (!chance(2)) {
          this.drop(it)
        } else {
          ix++
        }
      }
    }
  }

  fullSkill(): number {
    let skill = 0
    for (const it of this.queue) {
      if (isArms(it)) skill += it.fullSkill()
    }
    return skill
  }

  fullAttack(): number {
    let attack = 0
    for (const it of this.queue) {
      if (isArms(it)) attack += it.fullAttack()
    }
    return attack
  }

  fullDefend(): number {
    let defend = 0
    for (const it of this.queue) {
      if (isArms(it)) defend += it.fullDefend()
    }
    return defend
  }

  findArms(id: string): ItArms | null {
    for (const it of this.queue) {
      if (isArms(it) && it.hasTrait(id)) return it
    }
    return null
  }

  toJSON(): ItemJSON {
    return { type: 'list', name: this.name, items: this.queue.map((it) => it.toJSON()) }
  }
}

// ItList also defines fullAttack/fullDefend/fullSkill (summed over an
// itArms's own children), so a duck-typed method check can't tell the two
// apart — ItArms carries an explicit discriminator instead (see itArms.ts).
function isArms(it: Item): it is ItArms {
  return (it as { readonly kind?: string }).kind === 'arms'
}
