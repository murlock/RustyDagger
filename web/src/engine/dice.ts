// Port of DCourt/Tools/Tools.java's dice/RNG helpers.
// Uses a seedable PRNG (mulberry32) instead of java.util.Random so results are
// testable and deterministic per-seed; exact per-roll parity with the Java
// version isn't a goal (or achievable), just equivalent statistical behavior.

export interface Rng {
  nextInt(): number
}

class Mulberry32 implements Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  nextInt(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) - 0x80000000
  }
}

let rng: Rng = new Mulberry32(Date.now())

export function setSeed(seed: number): void {
  rng = new Mulberry32(seed)
}

export function setRng(custom: Rng): void {
  rng = custom
}

export function roll(value: number): number {
  if (value < 1) return 0
  let num = rng.nextInt()
  if (num < 0) num = -num
  return num % value
}

export function twice(value: number): number {
  return roll(value) + roll(value)
}

export function contest(a: number, b: number): boolean {
  return roll(a + b) < a
}

export function percent(value: number): boolean {
  return roll(100) < value
}

export function chance(value: number): boolean {
  return roll(value) === 0
}

export function select<T>(list: T[]): T {
  return list[roll(list.length)]
}

export function fourTest(a: number, b: number): number {
  const test = a + b
  let num = 0
  if (roll(test) < a) num++
  if (roll(test) < a) num++
  if (roll(test) < a) num++
  if (roll(test) < a) num++
  return num
}

export function spread(value: number): number {
  const min = Math.floor((value * 5) / 7)
  return 1 + min + twice(value - min)
}

export function skew(value: number): number {
  let sum = 0
  while (percent(value)) sum++
  return sum
}
