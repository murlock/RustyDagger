# Java → Vue Conversion Plan

RustyDagger ("Dragon Court") is being converted from a decompiled Java AWT
applet (`src/main/java/DCourt/...`, ~18k lines) to a Vue 3 + TypeScript SPA
in `web/`. This doc is the persistent record of the plan and the decisions
behind it, so it survives independent of any one session.

## Decisions

- **UI fidelity**: modernize the UI as we go, not a pixel-perfect
  recreation of the original 400x300 layout.
- **Persistence**: hero save data moves from local files (one file per
  hero name, via `FileLoader`) to browser storage (localStorage/IndexedDB),
  keyed by hero name.
- **Stack**: Vite + Vue 3 + TypeScript + Pinia + Vitest.
- **Node toolchain**: managed via `mise` (see `mise.toml`, pinned to
  Node 24) rather than a system-wide install.
- **npm supply-chain hygiene**: `.npmrc` sets `min-release-age=7` — npm
  won't install a package version published in the last 7 days, to reduce
  exposure to just-published compromised releases.

## Why this order

Port the domain/logic layer faithfully first (it's pure data + math, easy
to verify with tests), then build new UI on top of it screen by screen.
This avoids redesigning the UI and re-deriving game logic at the same
time. The old Java build stays in the repo as a runnable oracle
(`gradle build && java -jar ...`) until parity is confirmed, then gets
removed in the final phase.

## Phases

- [x] **Phase 0 — Scaffold.** Vite + Vue 3 + TS + Pinia + Vitest project
  in `web/`. Images moved to reuse as static assets. Navigation store
  stub (`web/src/stores/navigation.ts`) and a full port of the RNG/dice
  helpers from `Tools.java` (`web/src/engine/dice.ts`, unit tested).
  Build, typecheck, dev server, and test suite all verified working.

- [x] **Phase 1 — Domain model.** Ported the `Item` hierarchy (`itList`,
  `itToken`, `itValue`, `itCount`, `itPercent`, `itRandom`, `itArms`,
  `itHero`, `itAgent`, `itMonster`, `itNote`, `itText`) to TS in
  `web/src/domain/`. Game data (monsters, gear, places, arms) migrated to
  static JSON in `web/src/data/` via a one-time script
  (`web/scripts/build-legacy-data.mjs`) that parses the legacy
  `{type|field}` format out of the decompiled Java sources, rather than
  porting the text-format parser into the app itself. `Static/*`
  (Constants, GameStrings, GearTypes, ArmsTrait, Rumors, QuestStrings)
  ported to plain TS constant modules. 39 Vitest tests cover list/count
  semantics, arms combat math, hero leveling/death, and a full
  monster-catalog integrity check (all 55 monsters build cleanly against
  the gear/arms tables).
  Deliberate deviations from the Java version, to keep domain logic
  decoupled from UI/persistence (both later phases):
  - `itHero.tryToLevel(Screen)` / `killedScreen(Screen,...)` — which built
    and pushed AWT Screens directly — became `checkLevel()` /
    `resolveDeath()`, returning plain result objects for the UI layer to
    act on.
  - Screen/Portrait references dropped; `getPicture()` etc. replaced by
    plain filename strings.
  - Multiplayer remnants (`pass`/`sessionID`/`best`/`leader` fields,
    `rankString()`) dropped — matches `README.md`'s "Multiplayer was
    removed".
  - `itCount`'s random-offset count obfuscation (anti-memory-editing, no
    observable effect) dropped.

- [x] **Phase 2 — Engine services.** `web/src/stores/hero.ts` is the
  Pinia counterpart to `Player.java` (`createHero`/`load`/`save`/
  `checkLevel`/`resolveDeath`/`advanceDay`/`isDead`/`isAlive`/`isCreate`/
  `needsBuild`), on top of a localStorage-based `web/src/engine/heroStorage.ts`
  (`saveHero`/`loadHero`/`listHeroes`, keyed by hero name) replacing
  `FileLoader`. `web/src/engine/today.ts` ports `Tools.getToday()`. 15 new
  Vitest tests cover the store and storage layer.
  - Serialization gap found and closed along the way: `toJSON()` existed on
    every `Item` subclass from Phase 1, but nothing could deserialize, and
    `ItHero` had no hero-level JSON shape at all (guts/wits/charm are plain
    `ItAgent` fields, not queue entries, so inherited `ItList.toJSON()`
    couldn't round-trip a hero). Added `web/src/domain/itemFactory.ts`
    (`itemFromJSON`, reconstructing all 8 `ItemJSON` variants) and
    `ItHero.toSaveJSON()`/`static fromSaveJSON()` (not `toJSON()` - `HeroJSON`
    isn't a member of the shared `ItemJSON` union, so overriding `toJSON`'s
    signature would break the `Item` contract). `attack`/`defend`/`skill` and
    `raise` aren't saved - `calcCombat()`/`calcRaise()` derive them on load,
    matching the Java version.
  - Bug found and fixed in the process: `ItHero.fromHero()`/`copy()` duplicated
    the constructor's auto-created empty `pack`/`gear`/`stat`/... sublists
    instead of replacing them, so `fixLists()` picked up the empty originals
    and copies silently lost all pack/gear/etc. contents. Fixed with a
    `clrQueue()` before copying; same fix applied in `fromSaveJSON`.
  - `hero.ts` uses Pinia's setup-store syntax with `shallowRef<ItHero | null>`
    rather than options-store `state()`: Vue's deep-reactive `UnwrapRef`
    mapped type can't represent `ItHero`'s private fields, so a class
    instance in options-store state fails to type-check at all under
    `vue-tsc -b` (the real `npm run build`, stricter than a bare
    `vue-tsc --noEmit`) - `markRaw` doesn't help, since the mismatch is in
    the state type itself, not runtime behavior. Because `shallowRef` (like
    `markRaw`) leaves mutations to the hero's internals untracked,
    `isDead`/`isAlive`/`isCreate`/`needsBuild` are plain functions rather
    than Pinia `getters` (Vue `computed`, which would cache a stale result
    across such mutations rather than re-evaluating).

- [x] **Phase 3 — Navigation & shared UI.** `web/src/stores/navigation.ts`
  now carries per-screen `props` (mirroring Screen subclass constructor
  args like `from`/`battle`/message text) and a `showStatus` flag
  (mirroring `Screen.status`/`hideStatusBar()`), alongside the existing
  `home`-chain `goto`/`goHome` (multi-level unwinding already fell out of
  the original linked-`ScreenEntry` design - each `home` is itself a full
  entry with its own `home`). `goto()` also accepts an explicit `home`
  override for the rare case (see `arStatus.effectEnchant`) where Java
  constructs a `Screen` purely to hold a `home` pointer without displaying
  it. 7 new Vitest tests in `navigation.test.ts`.
  - `web/src/components/Hotspot.vue` replaces `Portrait.java`: a
    positioned, clickable image region with `text`+`type` covering
    NOTEXT/SUBTEXT/SUPERTEXT (`type: 'caption'` = label below the image,
    `type: 'overlay'` = white text superimposed on it). `x`/`y`/`width`/
    `height` are optional - omit them to let a modernized layout size the
    element normally instead of reproducing the original's absolute
    `reshape()` coordinates. Emits `click` for the parent screen to
    resolve navigation (replacing `Portrait.mouseDown()`'s
    `postEvent`/`Screen.down(x,y)` dispatch). 7 component tests via
    `@vue/test-utils`.
  - `web/src/components/StatusBar.vue` replaces `StatusPic.java`: reads
    `useHeroStore()` directly (like `StatusPic` reads `Tools.getHero()`
    as a singleton) and renders the same two-line summary
    (title/name/guts/wits/charm/cash, then quests/level/exp/weapon &
    armour). **Deliberate gap**: `StatusPic.paint()` swaps its third
    segment for a Mound/Hills-specific hint (Cats Eyes/glowing item/Torch
    count, or Hill Folk/Rope count) based on `Tools.getRegion()` -
    `arMound`/`arHills` don't exist until Phase 5, so `StatusBar` always
    renders the default weapon & armour line for now; revisit once those
    area screens are ported. Clicking emits an `open` event rather than
    navigating directly, since the target (`arStatus`, the Hero Status
    Screen) is also unported until Phase 5 - `App.vue` wires `@open` to a
    no-op with a comment explaining why. 5 component tests.
  - `App.vue` now spreads `nav.currentProps` onto the routed component
    and renders `StatusBar` when `nav.showStatusBar` is true.
  - Environment note (not a code change): the shell's `node` on `PATH`
    was a stray system v26, not the `mise`-pinned v24 - Node 26's global
    `localStorage` shadows jsdom's and breaks every localStorage-touching
    test with "Cannot read properties of undefined (reading 'clear')".
    Symptom only reproduces outside `mise exec -- npm test`/`mise exec --
    npm run <script>`; worth remembering if tests mysteriously fail in a
    fresh shell.

- [ ] **Phase 4 — Walking skeleton.** Loading → create hero → town → one
  shop → back, working end-to-end and saved, to validate the
  architecture before mass-porting the remaining ~60 screens.

- [ ] **Phase 5 — Bulk screen port, by area.** In dependency order:
  Command screens (entry/create/build/finish/ranking) → reusable
  templates (Shop/Smith/Trade/Transfer/Indoors/WildsScreen, since many
  areas extend these) → Utility screens → Wilds + Areas (Town, Castle,
  Forest, Hills, Mound, Queen, Fields, Faery) → Quest engine
  (`arQuest` / `arBattle`, likely the most intricate logic).

- [ ] **Phase 6 — Parity testing.** Vitest for domain logic checked
  against the old Java jar as an oracle (`gradle build && java -jar ...`
  still works per `README.md`). Manual screen-by-screen comparison for
  UI flows.

- [ ] **Phase 7 — Decommission Java.** Remove `build.gradle`,
  `gradlew*`, `src/main/java`, `DCourt.jar`; update `README.md`.
