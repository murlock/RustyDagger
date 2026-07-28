// Port of DCourt/Items/List/itNote.java.
//
// The Java version stores from/date/body both as plain fields and as
// entries in the inherited itList queue (an implementation detail of reusing
// itList's fix()/getValue()); since the fields are the only state that's
// actually read, this port keeps just the fields.

import { Item, type ItemJSON } from './item'
import { ItList } from './itList'

export class ItNote extends ItList {
  private from: string | null = null
  private date: string | null = null
  private body: string | null = null

  constructor(name: string) {
    super(name)
  }

  static create(name: string, from: string, today: string | null, body: string): ItNote {
    const note = new ItNote(name)
    note.setFrom(from)
    note.setDate(today)
    note.setBody(body)
    return note
  }

  static fromNote(other: ItNote): ItNote {
    const copy = new ItNote(other.getName())
    copy.from = other.from
    copy.date = other.date
    copy.body = other.body
    return copy
  }

  copy(): Item {
    return ItNote.fromNote(this)
  }

  setFrom(val: string | null): void {
    this.from = val
  }
  setDate(val: string | null): void {
    this.date = val
  }
  setBody(val: string | null): void {
    this.body = val
  }
  getFrom(): string | null {
    return this.from
  }
  getDate(): string | null {
    return this.date
  }
  getBody(): string | null {
    return this.body
  }

  getCount(): number {
    return 1
  }

  getValue(): string | null {
    return this.body
  }

  toShow(): string {
    return `${this.getName()}: ${this.getFrom()}`
  }

  toLoot(): string {
    return this.getName()
  }

  toJSON(): ItemJSON {
    return { type: 'note', name: this.getName(), from: this.from, date: this.date, body: this.body }
  }
}
