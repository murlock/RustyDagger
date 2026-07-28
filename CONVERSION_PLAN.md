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

- [x] **Phase 4 — Walking skeleton.** Entry → create hero → town → one
  shop (Trader) → back, working end-to-end and saved, verified by actually
  driving a headless browser through the loop rather than trusting
  typecheck/tests alone - which is exactly what caught the four bugs
  below, none in the code this phase wrote.
  - `web/src/screens/Command/arEntry.vue`, `arCreate.vue`,
    `web/src/screens/Areas/arTown.vue`, `Template/Indoors.vue`, and
    `Areas/Town/arTrader.vue` (the one shop) ported. **Deliberate gaps**:
    no password field or Lists/Credits buttons on arEntry (no server
    auth, ranking was multiplayer); arLoading's staged animation skipped
    in favor of jumping straight to arEntry (cosmetic AWT flavor, not
    architecture); arEntry's heroAwakens() day-tick flavor text and the
    PlaceTable-driven arrival screen skipped (need `arNotice`, Phase 5);
    arBuild skipped (`needsBuild()` only ever fires past level 5, which
    nothing in this walking skeleton can reach); arTown's Tavern/Weapons/
    Armour/Castle Gate/Leave Town hotspots render disabled (screens don't
    exist yet); arTrader only implements Shop.java's buy path, not
    sell/special - full `Shop`/`Trade` templates wait for Phase 5 when
    more shops need them. New heroes land in Town (`Constants.TOWN`)
    instead of Java's `Constants.FIELDS`, since Town is the only hub
    that exists - `arEntry`/`arCreate` both sync a loaded/created hero's
    `place` there for consistency. 17 new component tests across the four
    screens (`@vue/test-utils`), 90 Vitest tests total.
  - `Images/` (95 files, game art) was never actually copied into
    `web/public` despite Phase 0's note claiming it was - fixed by
    copying to `web/public/Images/`, preserving subdirectories (e.g.
    `Faces/Sally.jpg`) so paths match what `Tools.loadImage()` used.
  - Bugs found by driving the app for real, none related to this phase's
    own new code:
    - `ItHero`'s `storeList`/`looksList` fields (declared `!: ItList`,
      no initializer) were silently `undefined` at runtime: this
      tsconfig sets `useDefineForClassFields: true`, and a subclass
      field with no initializer still gets `[[Define]]`'d to `undefined`
      right after `super()` returns - clobbering the assignment
      `fixLists()` made *during* that `super()` call (dispatched
      polymorphically from `ItAgent`'s constructor). Fixed by declaring
      those two fields `declare` instead of `!`, which opts them out of
      the per-field define entirely. `dumpList` didn't need this since it
      has its own initializer (redundant re-assignment, not a clobber).
    - `heroStorage.ts`'s `loadHero()` never called `calcCombat()`/
      `calcRaise()` after `ItHero.fromSaveJSON()`, despite Phase 2's own
      notes saying attack/defend/skill/raise are "derived on load" -
      that wiring was never actually written. A freshly-loaded hero's
      `raise` silently read back as `0`, so `checkLevel()`'s `exp <
      raise` check (`0 < 0`) was false and every single reload granted a
      spurious level-up. Fixed by calling both in `loadHero()`.
    - `Hotspot.vue` collapsed to zero height whenever `width`/`height`
      were omitted (the "let it size normally" mode this phase's screens
      all use): the icon `<img>` was `height: 100%` against a wrapper
      whose own height is auto (shrink-to-fit) - a circular dependency
      invisible to jsdom-based component tests, since jsdom doesn't do
      real layout. Fixed by moving explicit width/height onto the `<img>`
      itself (only set when the caller actually passes them) and
      defaulting the CSS to `width: 100%; height: auto`.
    - `StatusBar.vue` (and this phase's `arTown.vue`/`arTrader.vue`) used
      `const hero = computed(() => heroStore.hero)` and read
      `hero.value` from other computeds - `heroStore.hero` is a
      `shallowRef<ItHero>` mutated in place (money, pack, ...), never
      reassigned, so that intermediate computed always recomputes to the
      *same object reference* and Vue's computed short-circuit
      optimization never re-triggers its own dependents, no matter how
      many times `triggerRef` fires. This meant `StatusBar` has silently
      never reflected a post-mount mutation since Phase 3 - no test ever
      mounted it, mutated, then re-checked. Fixed by having every
      computed read `heroStore.hero` directly instead of through that
      middle layer (confirmed via an isolated reactivity probe before
      touching the real components). `hero.ts`'s `save()` now also calls
      `triggerRef(hero)`, which *is* needed, just wasn't sufficient by
      itself.
    - `arCreate.vue`'s trait-toggle revert (spend more build points than
      remain) flipped `traitState` back correctly, but the checkbox's
      native `checked` DOM property stayed visually true: the revert
      happens synchronously inside the same `change` handler, so between
      Vue's last render and its next patch the bound value only ever
      went false → true → false - a net no-op Vue's vnode diff never
      perceives as a change worth patching. Fixed by syncing
      `event.target.checked` directly in the revert branch.
  - Verification note (not a code change): no browser-automation tool
    was available in this environment, so `playwright` was added as a
    `web/` devDependency (with the user's sign-off) to drive a real
    headless Chromium through the full loop and catch the bugs above -
    kept installed for reuse verifying Phase 5+.

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
