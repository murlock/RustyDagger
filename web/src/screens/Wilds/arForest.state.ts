// arForest's hidden-location bitmask (Smithy/Guild/Mountain Trail), lifted
// out of the component into a real ES module singleton, keyed per hero.
//
// Why a module singleton at all: doSearch()'s "you discover..." result
// routes through ArNotice (see useWildsScreen.ts's `notice()`), and
// App.vue's `<component :is="nav.currentComponent">` swap away to
// ArNotice and back to ArForest unmounts and remounts the ArForest
// component instance - any state declared inside its <script setup> (even
// a ref that looks module-level at a glance) is per-instance and would
// silently reset to 7 on every single "you discover" round-trip, making
// the search minigame unable to ever accumulate progress in the real app
// (this was caught by a headless-Chromium run, not by component tests -
// mounting ArForest directly in a test never exercises the surrounding
// App.vue routing that unmounts/remounts it).
//
// Why keyed by hero name, not a single ref: a bare module-level ref is
// shared by *every* hero that plays in the same browser tab - e.g. finish
// a session with hero A (who has found the Smithy), hit "Play Again" from
// arFinish, and load/create hero B: B would see A's discoveries the
// instant they reached the Forest, despite never having searched there
// themselves. Keying by `hero.getName()` keeps each hero's search progress
// isolated, matching how every other piece of hero state in this app is
// already scoped per hero.
//
// Deviation kept from the original fix: Java constructs a brand-new
// arForest() (hidden reset to 7) every time the region is entered fresh
// from Fields/Hills, so finds don't carry over between visits even within
// one hero's session. This map has no such per-visit boundary - a given
// hero's finds persist for as long as the page stays loaded, even after
// leaving and re-entering the forest. Treated as a minor, forgiving
// modernization rather than a bug: re-deriving "was this a fresh visit or
// a notice round-trip" would need explicit reset calls threaded through
// every screen that routes into arForest, for a mechanic (find secret
// shops faster next time) nobody is worse off for keeping. Not persisted
// to the hero's save data either, matching Java never writing `hidden` to
// the hero file - it's pure in-memory Screen state there too.
import { reactive } from 'vue'

const byHero = reactive<Record<string, number>>({})

export function hiddenBits(heroName: string): number {
  return byHero[heroName] ?? 7
}

export function setHiddenBits(heroName: string, bits: number): void {
  byHero[heroName] = bits
}
