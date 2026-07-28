// Port of DCourt/Tools/MadLib.java — simple $token$ text templating

const GENDER_KEYS: Record<string, [string, string]> = {
  $HE$: ['he', 'she'],
  $HIM$: ['him', 'her'],
  $HIS$: ['his', 'her'],
  $MAN$: ['man', 'woman'],
  $BOY$: ['boy', 'girl'],
}

export class MadLib {
  private table = new Map<string, string>()
  private text: string

  constructor(msg: string | MadLib) {
    if (msg instanceof MadLib) {
      this.table = new Map(msg.table)
      this.text = msg.text
      return
    }
    this.text = msg ?? ''
    this.replace('$CR$', '\n')
    this.replace('$TB$', '\t')
    this.replace('$$', '$')
  }

  clone(): MadLib {
    return new MadLib(this)
  }

  getReplace(key: string): string | null {
    return this.table.get(key) ?? null
  }

  getText(): string {
    return this.update(this.text)
  }

  replace(key: string, val: string | number): void {
    this.table.set(key, String(val))
  }

  append(val: string): void {
    this.text = (this.text ?? '') + val
  }

  genderize(male: boolean): void {
    for (const [key, [m, f]] of Object.entries(GENDER_KEYS)) {
      this.replace(key, male ? m : f)
    }
  }

  capitalize(): void {
    const chars = this.text.split('')
    let spaces = 0
    for (let ix = 0; ix < chars.length; ix++) {
      const c = chars[ix]
      if (c > ' ') {
        if (spaces > 1 && c >= 'a' && c <= 'z') {
          chars[ix] = String.fromCharCode(c.charCodeAt(0) - 32)
        }
        spaces = 0
      } else {
        spaces++
      }
    }
    this.text = chars.join('')
  }

  private update(from: string): string {
    let result = ''
    let ix = 0
    for (;;) {
      const dx = from.indexOf('$', ix)
      if (dx < 0) break
      result += from.slice(ix, dx)
      ix = dx
      const dx2 = from.indexOf('$', dx + 1)
      if (dx2 < 0) break
      const sub = from.slice(ix, dx2 + 1)
      ix = dx2 + 1
      const put = this.getReplace(sub)
      result += put == null ? sub : this.update(put)
    }
    return result + from.slice(ix)
  }
}
