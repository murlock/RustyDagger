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
  - [x] `arBuild.vue` (`DCourt/Screens/Command/arBuild.java`, "Hero
    Description") ported: 4 radio groups (Gender/Dress/Behavior/Title,
    Title restricted to Male/Female) plus 9 free-text fields
    (Race/Build/Sign/Skin/Eyes/Hair/Habit/Marks/Phrase), a Random button,
    and "Fix These Settings Permanently" (commits to `hero.getLooks()`)
    vs. "I'll get to this later" (leaves looks empty so `needsBuild()`
    re-prompts next login). Wired into `arEntry.vue`'s `enter()` - closes
    the Phase 4 walking-skeleton gap where `needsBuild()` was noted as
    unreachable - mirroring Java's `player.needsBuild() ? new
    arBuild(next2) : next2` by `nav.goto(ArTown)`-then-capture-`nav.current`
    to build a `home` `ScreenEntry` that's never actually rendered, then
    `nav.goto(ArBuild, {}, { home: townEntry, showStatus: false })`.
    Deliberate deviation: dropped `Tools.detokenize()` (escaped `{`/`|`/`}`
    for the legacy `{type|field}` save-file format) since Phase 2's JSON
    persistence has no such delimiter scheme to protect. 4 component tests
    plus 1 new `arEntry.test.ts` case for the routing; verified end-to-end
    with a headless-Chromium run (bump a saved hero to level 6, re-enter,
    confirm arBuild renders, confirm "Fix Settings" persists 13 looks
    entries and returns to Town).
  - [x] `arFinish.vue` (`DCourt/Screens/Command/arFinish.java`, "Time to
    Finally Rest") ported: end-of-session stat deltas against a new
    `heroStore.sessionStartCount()` snapshot (`Player.startValues()`,
    captured in `hero.ts`'s `load()` - never on `createHero()`, matching
    Java never calling `startValues()` from the create path either, so a
    brand-new hero's whole starting stat block reads as "today's gains").
    Portrait picked from the same place→image tiering as Java's local
    `which[]` table. Deliberate deviations: "Reload/Refresh to Play Again"
    became a real "Play Again" button routing to `arEntry` (no page-reload
    analog in an SPA); Credits renders inline instead of routing through
    the unported `arNotice` (task #13) - overkill for one static text
    block. Not yet reachable from navigation - its Java trigger (`arExit`,
    Player's "save and end the day" flow) is deferred, see below. 7
    component tests.
  - [x] `arRanking.vue` (`DCourt/Screens/Command/arRanking.java`)
    reinterpreted as a same-device leaderboard (Fame/Skill/Level tabs)
    over `heroStorage.listHeroes()`, dropping the Guild/Clan tabs that
    needed multiplayer/clan-aggregate data no longer modeled at all - user
    confirmed this scope over a minimal stub. 4 component tests.
  - [x] `arError.vue` (`DCourt/Screens/Command/arError.java`) ported: an
    explicit "Continue" button replaces Java's "click anywhere to
    dismiss" (`action()` only responding when `e.target == this`). 2
    component tests.
  - **Deferred**: `arExit.vue` (`DCourt/Screens/Command/arExit.java`, the
    day-end "sleep and save" screen reached from `Player.tryToExit()`/a
    dead hero with no quests left) - user chose to defer it rather than
    stub it, since it genuinely depends on two unported things: it
    `extends arNotice` (task #13) and its flavor text comes from
    `PlaceTable` (per-location sleep text, Cooking Gear/Camp Tent/Sleeping
    Bag checks - not ported anywhere yet, needed by the Wilds screens
    around task #18-22 regardless). Revisit once those exist.

  - [x] `arNotice.vue` (`DCourt/Screens/Utility/arNotice.java`) ported:
    full-screen message + dismiss, matching `arError.vue`'s precedent of an
    explicit "Continue" button instead of Java's click-anywhere-to-dismiss
    `down(x,y)`. 2 component tests.
  - [x] `arDetail.vue` (`DCourt/Screens/Utility/arDetail.java`, item detail
    view) ported on top of `arNotice.vue`: `itArms` gets full armament
    stats (identifying a Secret weapon as a side effect if the hero has the
    matching Smith/Armor trait, same as Java's constructor), `itCount` gets
    its GearTable type blurb, `itNote` gets sender/date/body. 4 component
    tests.
  - [x] Shop template ported as `web/src/screens/Template/useShop.ts` (a
    composable, not a base class - Vue has no screen inheritance, per
    `Indoors.vue`'s existing precedent) plus `web/src/screens/Template/
    Trade.vue` (`Template/Trade.java`'s 1/10/100/1000 quantity buttons on
    top of it). `arTrader.vue` refactored onto `Trade.vue`, restoring the
    Sell tab that Phase 4's bespoke buy-only version had skipped entirely
    (Java's `arTrader extends Trade`, not `Shop` directly, so it always had
    Sell - the walking skeleton just hadn't ported that far yet). Verified
    end-to-end with headless Chromium: create hero → Town → Trade Shop →
    buy 1 Food → Info (shows the stock catalog item's detail, not the pack
    item's - see deviation note below) → Continue → switch to Sell → sell
    the Food back → cash and pack count both correct, row disappears when
    the stock hits 0. 90 tests total across `useShop`'s consumers (unit
    tests were kept at the component level - `Trade.vue`/`arTrader.vue` -
    rather than testing the composable in isolation, since nothing else
    exercises it yet).
    - Deliberate deviation, carried over from Java rather than fixed: an
      item's `itCount.getCount()` is dual-purpose - `GearTable.shopItem()`
      constructs stock-catalog entries as `new ItCount(key, cost)`, so a
      catalog item's own `getCount()` returns its *price*, not an owned
      quantity. `Shop.shopName()`/`arDetail.countDetail()` both call
      `it.getCount()` on whatever's selected, so opening Info on a Buy-tab
      row shows that price-as-count (e.g. "Food[2]" for a $2 item) rather
      than how many the hero owns - confirmed this is exactly what
      `arDetail.java` does too, not a porting bug. `shopName()`'s *display*
      count instead calls `Screen.packCount(it)` (the hero's real pack
      count), which is why the list rows themselves show the right
      number - only the Info popup inherits this quirk.
    - `useShop.ts`'s `discardItem()` collapses Java's
      `Shop.discardItem()`'s `sellList.find==null && buyList!=null &&
      buyList.find==null` pack-mode check to just "not a Marks token, has
      stock value, and the subclass doesn't exclude it" - `getBuyList()`
      is never overridden by any shop in this codebase (stays `null`),
      which makes the `buyList!=null` conjunct always false and the whole
      expression always false, i.e. never discarded on that basis. Spelled
      out in a comment in case a future Shop subclass ever does set a
      buyList.
    - **Deferred**: `Smith.vue` (`Template/Smith.java`, weapon/armour
      smithing) and a bare `Shop.vue` (for `arGoblin`, which extends `Shop`
      directly rather than `Trade`) - both need a concrete consumer
      (`arWeapon`/`arArmour`/`arDwfSmith` for Smith; `arGoblin` for bare
      Shop) to verify the composable's shape against, and none exist yet.
      `useShop.ts` itself is already shaped to support them (mirrors
      `Shop.java`'s real fields: `stockValue`/`packValue`/mode/discard
      hooks), so wiring them up should mostly be UI work once those area
      screens are ported.

  **Remaining Phase 5 backlog** (numbering matches this session's local
  task tracker, kept stable here so notes above/below that reference
  "task #N" stay meaningful - re-derive against the Java file list under
  `src/main/java/DCourt/Screens/` if this drifts):
  - [x] #5 `arExit` (Command) - the "sleep and save" day-end screen ported:
    dead-hero branch (`doExhaust()` + the mortally-wounded flavor text),
    else the place's sleep text (`data/places.json`, already fully ported
    since Phase 1 - the "PlaceTable-driven" blocker noted below turned out
    to already be solved, just unconsumed) plus Cooking Gear/Camp Tent/
    Sleeping Bag flavor lines, then a quests-remaining footer. Continue
    saves and routes to `ArFinish` (`showStatus:false`), which becomes
    reachable from navigation for the first time here. Standalone screen
    rather than wrapping `ArNotice.vue`, since arExit's dismiss action
    (save + advance) differs from arNotice's plain `goHome()` and Vue has
    no screen inheritance to fall back on (same reasoning as `Indoors.vue`).
    Dropped: `Player.errorScreen()`'s CGI-failure path (`heroStore.save()`
    is a synchronous localStorage write with no failure mode) and
    `saveScore()` (multiplayer ranking upload, matches arRanking.vue's
    local-leaderboard reinterpretation). 5 component tests.
  - [x] #6 `Shop` template - see Phase 5 notes above (`useShop.ts`).
  - [ ] #7 `Smith` template (`Template/Smith.java`) - weapon/armour
    smithing, used by arWeapon/arArmour/arDwfSmith. Deferred alongside a
    bare `Shop.vue`, see Phase 5 notes above - no consumer exists yet.
  - [x] #8 `Trade` template - see Phase 5 notes above (`Trade.vue`,
    `arTrader.vue` refactored onto it).
  - [x] #9 `Transfer` template - `web/src/screens/Template/useTransfer.ts`,
    a composable (same rationale as `useShop.ts`: no Vue screen
    inheritance). Selecting a stack of 1 transfers immediately; a bigger
    stack "prepares" a quantity control and waits for an explicit Transfer
    click, matching `prepareTransfer()`/the scrollbar. `arPackage.java`
    (Transfer's other Java subclass, mail-to-another-hero) isn't a fit for
    any consumer here - its whole purpose is a multiplayer CGI mail
    transfer with nobody to receive it (see README's "Multiplayer was
    removed") - so `arStorage` (#17) is this composable's only consumer.
  - [x] #10 `WildsScreen` template - `web/src/screens/Template/useWildsScreen.ts`,
    a composable (same rationale as `useShop.ts`/`useTransfer.ts`). Ported
    `testAdvance()` (exhaustion/rope/light gating, `findClimb()`/
    `findLight()` consuming Rope/Torch as a side effect of checking, exactly
    like Java) and `doSearch()` (the hidden-location bitmask search
    minigame) in full - both are real, self-contained logic. `pickQuest()`/
    `selectQuest()`/`Screen.findBeast()` are *not* ported: every concrete
    `pickQuest()` in Java ends in `new arQuest(...)`, and arQuest/arBattle
    (#35) is deliberately done last - there's no consumer to verify
    monster-selection against yet. Each screen supplies `pickQuest` as a
    real navigation callback instead; today that's always a "quest
    encounters aren't available yet" notice (see arField.vue below), but
    the composable itself has no knowledge of that - swapping in a real
    arQuest call later is a one-line change per consumer.
    - `arField` (#22), `arForest` (#19), and `arHills` (#20) are the
      consumers so far - see their own entries below for how the still-
      missing arQuest pieces were handled per-hotspot.
  - [x] #11 `arStatus` (Utility) - Hero Status Screen ported: header stats
    (Guts/Wits/Charm/Quests with wound/fatigue deltas, Attack/Defend/Skill
    with a disease delta, an Exp progress bar, the guild-rank line), a
    clickable pack list and H/B/F/R/L armament slots sharing one `pick`
    selection, and all six actions (Use/Info/Peer/Dump Slot/Oops/Exit).
    Closes the Phase 3 `StatusBar.vue` `@open` no-op gap - `App.vue` now
    routes it to `ArStatus`. Every `do*()` effect (heal/cure/blind/panic/
    blast/revive/haste/refresh/cookie/youth/aging/food, plus the
    identify/glow/bless/luck/flame/enchant scroll-targeting flow and
    Grant) was already sitting in the Phase 1/2 domain layer unused until
    now - this screen is what finally calls it. 8 component tests, plus a
    headless-Chromium run (create hero -> Town -> StatusBar -> arStatus ->
    select Marks -> Info -> arDetail) to confirm the wiring end-to-end.
    - Bug found and fixed in the process: `pick`/`useItem` were declared
      with plain `ref()`, which wraps assigned class instances in a Vue
      reactive Proxy - every `===`/`indexOf` check against the hero's raw
      pack/gear list items then silently failed (different object
      identity), making Use/wear/dump all no-ops. Same root cause as
      `hero.ts`'s documented `shallowRef<ItHero>` note; fixed the same way
      here.
    - Deliberate deviations: battle mode (`new arStatus(from, true)`,
      the "Use (N actions)" label and `actCount()` gating) is dropped
      entirely rather than stubbed - nothing in this codebase can
      construct this screen with battle=true yet (arBattle/arQuest is
      #35, deliberately done last), so there's no way to verify that path
      end-to-end. Peer is rendered permanently disabled (targets arPeer,
      #15, unported). EFF_SCRIBE is a documented no-op in `tryEffect()`
      (targets arScribe, #16, unported) - matches Java's own structure,
      where `tryEffect()` returning false already skips consumption, so
      leaving it unhandled is a faithful "does nothing yet" rather than a
      special-cased gap. EFF_FACELESS's arNotice would normally chain into
      arPeer; it returns here instead. Enchant Scroll's death branch calls
      `heroStore.resolveDeath()` (the same domain call every other death
      path uses) but surfaces the result via arNotice, since no screen in
      this codebase routes hero death anywhere more specific yet either
      (arField/the healer flow is #22, unported).
    - The Mound/Hills status-line hint `StatusBar.vue` deferred back in
      Phase 3 is a separate, still-open gap (needs `arMound`/`arHills`,
      #20/#21) - not touched here.
  - [x] #12 `arDetail` - see Phase 5 notes above.
  - [x] #13 `arNotice` - see Phase 5 notes above. Closes the Phase 4 gap
    where arEntry's arrival/day-tick flavor text was skipped (that text
    itself still isn't wired up - only the screen it needs now exists) and
    unblocks #5/#10.
  - [ ] #14 `arPackage` (Utility) - re-read while building the Transfer
    template (#9): this isn't general pack/inventory management, it's
    mail-a-package-to-another-hero over a CGI server call
    (`Loader.SENDMAIL`), with a malformed-name check and a "don't mail
    yourself" joke as its only other logic. With no server and no other
    players (README: "Multiplayer was removed"), there's no one to
    receive it - low value as a real port. `arStorage` (#17) became the
    Transfer template's actual consumer instead. Revisit only if a
    same-device "mailbox" concept ever makes sense here.
  - [ ] #15 `arPeer` (Utility) - adapt for no-multiplayer.
  - [ ] #16 `arScribe` (Utility).
  - [x] #17 `arStorage` (Utility) - hero storage/bank ported on `useTransfer`
    (#9): pack <-> `hero.getStore()`, capped by `hero.storeMax()`. Not
    wrapped in `Indoors.vue` - `arStorage extends Transfer` directly in
    Java (no face/greeting portrait), so this is a standalone two-column
    layout matching `Transfer.java`'s own. Reached from arTavern's Storage
    button (#25). 4 component tests.
  - [ ] #18 `arCastle` (Wilds) - on WildsScreen; hotspots to
    arClanHall/arPostal.
  - [x] #19 `arForest` (Wilds) - on `useWildsScreen` (#10). Reached from
    arField's Forest Road hotspot (now live, see #22's entry) and arHills'
    Forest Trail. Smithy (-> arDwfSmith, Smith template #7) and The Guild
    (-> arGuild, #28) render disabled, same "no partial value without the
    whole destination" reasoning as arField's Goblin Mound. Quest! runs the
    real `doSearch()` hidden-location minigame (Smithy/The Guild/Mountain
    Trail all start hidden, exactly like `getPic(ix).hide()`); To Fields
    (-> arField) and Mountain Trail (-> arHills, once found) run their own
    bespoke real tired-check + wits-contest travel logic - the ambush
    outcome routes into `pickQuest()`, a real encounter (#35, done later
    the same session). 8 component tests.
  - [x] #20 `arHills` (Wilds) - on `useWildsScreen` (#10). Reached from
    arForest's Mountain Trail. Jewel Store/Magic Shop/Abandoned Mines start
    hidden (same minigame as arForest); Jewel Store and Magic Shop (once
    found) open `arGemShop`/`arMagicShop` (#30/#31, on the Trade template -
    the first consumers of `ShopConfig.buyNames`/`stockValueMultiplier`,
    see below). `needsRope()` is unconditionally true here in Java, so
    *every* Quest/Abandoned Mines attempt - including searches - consumes
    a Rope; this tripped up the first draft of the tests (they ran out of
    Rope partway through a multi-click sequence) before landing on giving
    enough up front. 8 component tests.
    - Bug found and fixed in the process, general to both arForest and
      arHills: their hidden-location bitmask (`hidden`) started as a
      component-local `shallowRef`, which a headless-Chromium run (not the
      component tests - see below) revealed gets silently reset to its
      initial value on every single successful search. Cause: a
      "you discover..." result routes through `ArNotice` via
      `useWildsScreen.ts`'s `notice()`, and `App.vue`'s
      `<component :is="nav.currentComponent">` swapping away to `ArNotice`
      and back unmounts and remounts the whole screen component - any
      state declared inside `<script setup>` is per-instance and doesn't
      survive that round-trip, no matter how "top-level" it looks in the
      file. Component tests never caught this because mounting
      `ArForest`/`ArHills` directly in a test never exercises the
      surrounding `App.vue` routing that does the unmount/remount -
      exactly the class of bug this project's headless-Chromium
      verification step exists to catch (see Phase 4's own notes for
      three earlier examples).
      First fix attempt lifted `hidden` into a single bare ES module
      singleton, which turned out to be a second bug: a bare module-level
      ref is shared by *every* hero that plays in the same browser tab -
      finish a session with hero A (who found the Smithy), hit "Play
      Again" from arFinish, load/create hero B, and B would see A's
      discoveries in the Forest despite never having searched there. Fixed
      properly by keying the singleton on `hero.getName()`
      (`arForest.state.ts`/`arHills.state.ts` now export
      `hiddenBits(name)`/`setHiddenBits(name, bits)` over a
      `reactive<Record<string, number>>`, and each component reads/writes
      through a `computed({ get, set })` keyed on the current hero) -
      verified with a headless-Chromium run creating two heroes back to
      back and confirming the second one's Forest starts clean, plus a new
      "does not leak discovered locations between different heroes"
      component test in both files. Both test files reset their hero's
      entry by hand in `beforeEach`, for the same reason `localStorage` and
      Pinia get reset there - it's shared state that outlives a single
      `it()` the same way it outlives a component instance.
    - Deviation, a direct consequence of the fix above: Java constructs a
      fresh `arForest()`/`arHills()` (hidden reset to 7) every time the
      region is entered from elsewhere, so finds don't carry over between
      visits even within one hero's session - this map has no such
      per-visit boundary, so a given hero's found locations stay found for
      as long as the page stays loaded, even after leaving and coming
      back. Treated as a minor, forgiving modernization (documented in
      both `.state.ts` files) rather than something to chase with explicit
      reset calls threaded through every screen that routes into these
      two. Not persisted to the hero's save data either, matching Java
      never writing `hidden` to the hero file - it's pure in-memory Screen
      state there too, and this stays pure in-memory (page-session-only)
      the same way.
  - [ ] #21 `arMound` (Wilds) - deferred, not just disabled-hotspot-style:
    entering arMound at all is gated behind `new arQuest(...)` in Java
    (`arField.enterMound()`), so - unlike arForest/arHills - there is no
    reachable entry point to build towards yet, and no partial value to
    offer. `arMound` also uses `Loader.cgiBuffer` (a live server call) for
    its Vortex hotspot, another already-dropped multiplayer dependency (see
    README's "Multiplayer was removed") independent of the quest-engine
    blocker. #35 (arQuest/arBattle) is done now, which removes the quest-
    gate blocker in principle - but arMound.vue itself still doesn't
    exist, so there's nowhere for that gate to land yet. Revisit as its
    own task.
  - [x] #22 `arField` (Wilds) - on `useWildsScreen` (#10). Enables arTown's
    "Leave Town" hotspot (no longer disabled) - Town's other exit, Castle
    Gate, stays disabled (needs arCastle, #18, unbuilt). Live hotspots:
    Town Road (-> arTown), Healers Tower (-> arHealer, #33, built alongside
    this), Exit Game (-> arExit, #5), Quest! (real `testAdvance()`, no
    hidden locations here so `doSearch()` is always a no-op - matches Java,
    arField never overrides `getHideBits()`), and - added once arForest
    (#19) existed to route to - Forest Road (real tired-check +
    wits-contest travel logic, ambush outcome routes into a real
    encounter via #35). Goblin Mound stays disabled: unlike Forest Road, entering
    arMound at all is gated behind `new arQuest(...)` in Java, so there's
    no partial value to offer there without the quest engine (#35) - see
    #21's entry. 10 component tests, plus a headless-Chromium run (Town ->
    Leave Town -> Fields -> Healers Tower -> Exit -> Quest!, and later
    extended Fields -> Forest -> Hills -> Gem Shop once #19/#20 existed)
    confirming the chain.
  - [ ] #23 `arWeapon` (Areas/Town) - on Smith template; enables arTown's
    disabled Weapons hotspot.
  - [ ] #24 `arArmour` (Areas/Town) - on Smith template; enables arTown's
    disabled Armour hotspot.
  - [x] #25 `arTavern` (Areas/Town) - enables arTown's Tavern hotspot (no
    longer disabled). Built on `Indoors.vue` like arTrader. Buy a Drink
    runs the gossip minigame inline (charm-weighted roll -> steal-all-
    money/pass-out/nothing/gossip-with-charm-gain branches, routing to
    `ArNotice`); Sleep on Floor/Room/Suite route to `ArExit` (#5) with the
    cost pre-deducted, matching `Screen.tryToExit()`; Storage routes to
    `ArStorage` (#17), with its cost paid from cash first and any shortfall
    pulled from *stored* Marks (`arTavern.java`'s own quirk, replicated
    faithfully - lets a broke hero still reopen storage using marks they'd
    already banked). 6 component tests, plus a headless-Chromium run
    (Town -> Tavern -> Sleep on Floor -> arExit -> Continue -> arFinish,
    and separately Town -> Tavern -> Storage) confirming the whole chain.
    - Dropped: the constructor's HOTEL-trait cost discount
      (`cost[i] = (cost[i]+9)/10`) - it mutates the shared static `cost`
      array before `createTools()` unconditionally overwrites cost[1..4]
      with fresh level-based values right after, so it's clobbered before
      ever being read - dead code in the original too, not a deviation
      worth flagging as a behavior change.
    - Deviation: the gossip fallback greeting ("<X> who?") used
      `Tools.getBest()` (`Player.best`, a server-reported field) - dropped
      with the rest of the multiplayer session state (see itHero.ts's
      header comment); substituted the hero's own name.
    - Bug found and fixed in the process, not specific to this screen:
      `web/src/style.css` (unmodified Vite scaffold boilerplate, global
      via `main.ts`) had `h1, h2 { color: var(--text-h) }` - a near-black
      color that silently overrode every screen's own inherited heading
      color (`h2`'s own-property color always beats an ancestor's
      inherited one, regardless of the ancestor's specificity). Harmless
      on light backgrounds, unreadable on `arStorage`'s navy background,
      which is what surfaced it. Fixed by dropping that `color` line -
      `arEntry.vue`'s `<h1>` already sets its own explicit color via a
      class selector, so it was unaffected either way.
  - [ ] #26 `arClanHall` (Areas/Castle).
  - [ ] #27 `arPostal` (Areas/Castle) - adapt for no-multiplayer where
    relevant.
  - [ ] #28 `arGuild` (Areas/Forest).
  - [ ] #29 `arDwfSmith` (Areas/Forest) - on Smith template.
  - [x] #30 `arGemShop` (Areas/Hills) - on Trade template. Reached from
    arHills' Jewel Store (#20). First shop to override `getBuyList()`
    (buys any Loot-type treasure beyond its own gem stock) - `useShop.ts`'s
    `discardItem()` only had the "buyList always null" case implemented
    until now (see Phase 5's original note on that simplification); added
    proper `ShopConfig.buyNames` support alongside it, matching Java's real
    `sellList.find==null && buyList!=null && buyList.find==null` logic
    instead of the collapsed always-false version. `getSpecial()`'s "Peer
    $250" (-> arPeer, #15, unported) renders disabled via a new opt-in
    `#special` slot on `Trade.vue` (most shops don't have one). 5 component
    tests.
  - [x] #31 `arMagicShop` (Areas/Hills) - on Trade template. Reached from
    arHills' Magic Shop (#20). Also overrides `getBuyList()` (buys any
    Potion or Scroll beyond its own stock, via the same `buyNames`
    support). `stockValue(Item)` in the decompiled source reads as
    `stockValue(it) * 2` calling itself - an infinite recursion that would
    crash the shop's very first render - read as a decompiler
    mistranslation of `super.stockValue(it) * 2` (a 2x price markup) and
    ported as such via a new `ShopConfig.stockValueMultiplier` (default 1
    for every other shop). 4 component tests.
  - [ ] #32 `arGoblin` (Areas/Mound) - extends `Shop` directly (not Trade),
    so this is the consumer that should drive the deferred bare `Shop.vue`
    from #6's notes above.
  - [x] #33 `arHealer` (Areas/Fields) - built alongside arField (#22),
    which is its only entry point. Plain `Screen` in Java (not `Indoors`),
    but reuses `Indoors.vue` anyway for the matching portrait+greeting
    shape (a visual-composition choice, not hierarchy fidelity). 6
    component tests, including the "mercy pricing" case (every service is
    free at level 1) and Tithe's cash-to-exp conversion capped at the
    level-up threshold.
  - [ ] #34 `arQueen` + Queen sub-screens (Areas/Queen: arqBoast, arqDice,
    arqFlirt, arqGame, arqMingle, arqStudy).
  - [x] #35 Quest engine: `arQuest` + `arBattle`, done once arField/
    arForest/arHills (#19/#20/#22) existed to quest against. New files
    under `web/src/screens/Quest/`:
    - `questSession.ts` - a `QuestSession` (mob/weight/title/opt/gate)
      carried by reference through every `nav.goto()` between arQuest and
      arBattle, built only via `createQuestSession()` (which `markRaw`s
      it - see its comment on why a plain object literal isn't safe to
      pass through Pinia-stored nav props here).
    - `useQuestOptions.ts` - port of `Options.java`'s `fixList()`/
      `append()`/`remove()`/`redraw()`/`nextRound()`: the numbered
      interaction menu (bribe/feed/riddle/trade/help/seduce/attack/flee/
      control/backstab/berzerk/swindle/ieatsu/fish/bushido/capture),
      gated by hero traits/inventory/guild ranks and by first-round vs.
      later-round rules. `entries` is a `shallowRef` so arQuest.vue's
      list re-renders when it's rebuilt.
    - `battleRound.ts` - port of `arBattle.java`'s pure combat math
      (`battle()`/`agentAct()`/`actorControls()`/`actorSwindles()`/
      `spellEffects()`/`combatEvents()`) as a single `runBattleRound()`
      call, computed *once* per round by the caller (questActions.ts),
      not inside arBattle.vue's own mount - see its header comment for
      why (the events-notice interstitial round-trip would otherwise
      double-apply the round, the same class of bug the hidden-bits fix
      above already ran into).
    - `questActions.ts` - port of `arQuest.java`'s `applyChoice()` and
      everything it dispatches to (tryBribe/trySupply/tryRiddle/tryTrade/
      tryAssist/trySeduce/tryFlee/tryToken/tryCapture/stareDown/
      heroControls/mobControls/swapGoods/heroSwindles/mobSwindles/
      mobFlees/heroWins) plus `battleActionResult()`, as a composable
      function (not component methods) taking `session` explicitly -
      needed because arBattle.vue must call `battleActionResult()` after
      arQuest.vue has already unmounted, which a component method
      (`defineExpose`) can't survive.
    - `questHelpers.ts` - `packString()` (Screen.packString, loot-list
      formatting) and `selectQuestKey()` (WildsScreen.selectQuest's
      weighted-random monster picker + the flat 1% Faery chance),
      returning a plain catalog key string rather than a pre-balanced
      `itMonster` - `selectQuest()`/`Screen.findBeast()`/monster
      balancing collapse into one `MonsterTable.find(key, heroLevel,
      heroPower, weight)` call in this port (see Phase 1's `itMonster.ts`,
      which already did the balancing math - `balance(weight)` in Java
      read `Tools.getHero()` as a global for level/power; the TS port
      already took them as explicit params instead).
    - `arQuest.vue` / `arBattle.vue` - the two screens themselves, thin
      now that the logic above is pulled out - portrait + flavor text +
      option buttons, and round text + a Continue button, respectively.
    - Each Wilds screen supplies its own `beasts[]`/`weight[]` arrays and
      `pickQuest()`/`startQuest()` (copied verbatim from arField.java/
      arForest.java/arHills.java) and wires them into `useWildsScreen`'s
      `pickQuest` callback, replacing the "not available yet" placeholder
      notice from #19/#20/#22 with a real encounter. arHills' Abandoned
      Mines additionally launches a *fixed* `Hills:Dragon` encounter
      (weight 5) rather than a random pick, matching `cavern()`.
    - The domain layer needed essentially no new code - `itMonster.ts`'s
      `chooseActions()`/`resetActions()`/`balance()` and `itAgent.ts`'s
      `reduceFight()`/`reduceMagic()`/`reduceThief()`/`reduceIeatsu()`
      (Java's overloaded `fight(int)`/`magic(int)`/etc. setters, which
      subtract from the temp pool despite the name) were already fully
      ported back in Phase 1/2, unused until this consumer existed.
    - Verified with 24 new tests across the 5 new modules plus
      arQuest.vue/arBattle.vue, updates to arField/arForest/arHills's own
      tests (their "not available yet" placeholder assertions now check
      for a real `ArQuest` navigation instead), and three full
      headless-Chromium playthroughs from Town to a resolved encounter -
      one where the monster fled before combat, one ending in hero death
      (confirming `heroStore.resolveDeath()` - already wired into every
      other death path - integrates correctly here too, including gear/
      quest loss), and one ending in victory (loot merged, exp gained).
    - Deliberate deviations:
      - `Tools.getBest()` (a server-reported multiplayer field, in
        `mobControls()`'s "convinces you that you are X" flavor line) is
        substituted with the hero's own name, same as every other screen
        that already hit this (arTavern.vue, arHealer.vue,
        arGemShop.vue).
      - `mobControls()`'s hero-death branch (killed by a controlling
        monster's malice) surfaces `heroStore.resolveDeath()`'s result
        via `arNotice` rather than a dedicated healer screen - nothing
        else in this codebase routes death anywhere more specific either
        (arStatus's `effectEnchant` hit the exact same gap first).
      - `init()`'s auto-trigger of choice 16 (SPELLS) when the hero
        arrives with a pending "Magic Assault" action queued from
        arStatus's scroll-casting flow isn't ported - that only ever
        fires with `battle=true` passed to `arStatus`, which nothing in
        this codebase does yet (arStatus's own battle-mode integration
        was explicitly deferred when it was built, before this quest
        engine existed for it to integrate with - worth revisiting now
        that it does).
      - `trySupply()`'s refusal-refund path always gives back
        `GearTypes.FOOD`, even when the attempt was feeding Fish (`CARP`)
        - matches the decompiled source exactly (`hero.addPack("food",
        cost)`, not the `id` parameter); kept as-is since item names
        match case-insensitively in this domain model either way, so
        it's not even an observable bug, just an odd read.

- [ ] **Phase 6 — Parity testing.** Vitest for domain logic checked
  against the old Java jar as an oracle (`gradle build && java -jar ...`
  still works per `README.md`). Manual screen-by-screen comparison for
  UI flows.

- [ ] **Phase 7 — Decommission Java.** Remove `build.gradle`,
  `gradlew*`, `src/main/java`, `DCourt.jar`; update `README.md`.
