// Port of DCourt/Items/List/itText.java.
//
// Rather than porting the Buffer-format parsing (parseText walking nested
// itLists), this consumes the already-shaped `text: { template, substitutions }`
// produced by web/scripts/build-legacy-data.mjs for monster flavor text.

import { roll } from '../engine/dice'
import { MadLib } from './madlib'

export interface TextSource {
  template: string
  substitutions: Record<string, string[]>
}

export class ItText {
  private madlib: MadLib
  private identity: string | null = null

  constructor(source: TextSource) {
    this.madlib = new MadLib(source.template)
    for (const [key, options] of Object.entries(source.substitutions)) {
      if (options.length < 1) continue
      const pick = options[roll(options.length)]
      this.madlib.replace(key, pick)
      if (key === '$NAME$') this.identity = pick
    }
  }

  getText(): string {
    return this.madlib.getText()
  }

  getIdentity(): string | null {
    return this.identity
  }
}
