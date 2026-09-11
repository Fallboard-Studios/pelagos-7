# Implementation Plan: Header & Hub Consolidation + Temperature

Source spec: [docs/specs/HEADER_HUB_CONSOLIDATION.md](../specs/HEADER_HUB_CONSOLIDATION.md). Source intent: [docs/intent/header-hub-consolidation.md](../intent/header-hub-consolidation.md). Not part of the roadmap. Deletes `TransportBar.*`/`HubNav.*`/`hubNavConfig.ts`, adds `Header.tsx` (3-row header), a seeded decorative temperature readout, and an optional `boxSize` override on `Toggle`/`RadioButton`.

## Overview

Two independent foundation layers — temperature plumbing (a pure function + a store field) and a primitive capability addition (`boxSize` on `Toggle`/`RadioButton`) — land first, each fully testable in isolation with zero visible change to the running app. `Header.tsx` is then built and unit-tested against mocked stores, still unmounted — `TransportBar` stays live. Only once `Header` is proven does the plan swap it in, which is also where the spec's one genuinely risky mechanism lives (§1.6's vertical deadzone fix) — isolated into its own task so it's individually reviewable and revertable. The old hub tile grid (`HubNav`/`ConsolePanel`'s grid branch/`Console`'s pointer-events dance) is retired last, once `Header`'s nav group is the confirmed, live replacement — never before, so the app is never left without a way to navigate between tiles.

## Architecture Decisions

- **Temperature and `boxSize` are built and merged before `Header` even exists**, not alongside it — both are small, independently testable, and `Header` needs both simultaneously (spec §1.3/§1.4), so building them first means `Header`'s own task is pure assembly of already-proven pieces, not assembly-plus-invention.
- **`Header.tsx` is built and fully unit-tested (mocked stores, RTL) before it's wired into `ScreenViewport`** — same "build in isolation, prove it, then swap it in" shape `TransportBar.test.tsx` itself already uses. This keeps every task up to and including Task 8 leaving `main`/the branch in an unchanged, working, visually-identical state (old `TransportBar` still renders) — the risk of the swap itself (Task 9) is isolated to exactly one task.
- **The horizontal deadzone relocation and the vertical deadzone fix are one task (Task 9), not two** — shipping the `Header` swap without the corresponding `Console.css` margin-top fix would leave the app in a *known-broken* intermediate state (drawer content hidden under the header, the exact failure the deadzone requirement exists to prevent — spec §1.6). Splitting them would violate "every task leaves the system working."
- **The old hub grid is dismantled in 3 small tasks (10-12), never 1 large one** — `ConsolePanel`'s null-branch change (Task 10) must land before `Console.css`'s now-dead pointer-events rule is removed (Task 11), which must land before `HubNav.tsx`/`hubNavConfig.ts` are deleted (Task 12) — each step is mechanical and low-risk individually; bundling them would exceed the ~5-file task guideline and make a single bad diff harder to bisect.
- **Docs land last, after the code they describe has actually shipped** — same ordering `OBLIQUE_CABINETRY_RADIO_BUTTON.md`'s own plan used, so the doc note is spot-checked against real shipped code, not a spec draft.

## Dependency Graph

```
Task 1 (localeTemperature.ts)     Task 4 (Toggle boxSize)      Task 6 (headerNavConfig.ts)
        │                                 │                              │
Task 2 (uiStore temperature field)  Task 5 (RadioButton boxSize)  Task 7 (useHeaderRowFit)
        │                                 │                              │
Task 3 (wire into                        │                              │
  AttenuationStyleView) ───────┐          │                              │
        │                      │          │                              │
   [Checkpoint A]         [Checkpoint B]  │                        [independent]
        │                      │          │                              │
        └──────────────────────┴──────────┴──────────────┬───────────────┘
                                                            │
                                              Task 8 (Header.tsx, unmounted)
                                                            │
                                                      [Checkpoint C]
                                                            │
                                    Task 9 (wire into ScreenViewport + deadzone fix
                                             + delete TransportBar.*)
                                                            │
                                              Task 10 (ConsolePanel null branch)
                                                            │
                                              Task 11 (Console.tsx/.css cleanup)
                                                            │
                                    Task 12 (delete HubNav.*/hubNavConfig.ts/HubNavItem)
                                                            │
                                                      [Checkpoint D]
                                                            │
                                      Task 13 (docs/UI_SHELL.md)   Task 14 (docs/COMPONENT_LIBRARY.md)
                                                            │
                                                    [Final Checkpoint]
```

Tasks 1-2, 4-5, and 6-7 are three mutually-independent tracks — safe to build in any order or in parallel (separate sessions/agents) before Task 8. Task 3 depends on both 1 and 2 but not on 4-7. Task 14 depends only on 4-5 (not on the Header-swap tasks) and could move earlier; kept last to match "docs describe shipped code" (see Architecture Decisions).

---

## Task List

### Phase 1: Temperature plumbing

- [ ] **Task 1: `localeTemperature.ts` — seeded, continuously-drifting temperature**

  **Description:** Add `src/utils/localeTemperature.ts` per spec §1.3 — `LOCALE_TEMPERATURE_RANGE` (`{ min: -120, max: -30 }`) and `computeLocaleTemperature(localeId, x, y, hour)`, mirroring `localeBpmSeed.ts`'s `generateLocaleBpm` shape but sampling `getSeededVal` at the live float `hour` as the offset instead of a fixed `0`.

  **Acceptance criteria:**
  - [ ] `computeLocaleTemperature` is a pure function — no store reads, no side effects.
  - [ ] Result is always an integer within `[-120, -30]` inclusive, for any `hour` in `[0, 24)`.
  - [ ] Two different `hour` values for the same `(localeId, x, y)` produce different results (proving continuous-offset sampling, not a flat per-locale constant like BPM) — but the same `hour` for the same inputs is deterministic (same result every call).

  **Verification:**
  - [ ] `npx vitest run src/utils/localeTemperature.test.ts` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/utils/localeTemperature.ts`, `src/utils/localeTemperature.test.ts`

  **Estimated scope:** XS (1 new file + test, no existing file touched)

- [ ] **Task 2: `uiStore.ts` — `activeLocaleTemperature` field**

  **Description:** Add `activeLocaleTemperature: number | null` (default `null`) and `setActiveLocaleTemperature` to `UIStore`, placed immediately beside `activeLocaleLocalTime`/`setActiveLocaleLocalTime` — identical shape, no persistence, per spec §4's diff shape.

  **Acceptance criteria:**
  - [ ] `activeLocaleTemperature` defaults to `null` on store creation.
  - [ ] `setActiveLocaleTemperature(t)` sets exactly that field, no side effects on any other field.
  - [ ] `UIStore` interface and store implementation both updated (no type/impl drift).

  **Verification:**
  - [ ] `npx vitest run src/stores/uiStore.test.ts` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/stores/uiStore.ts`, `src/stores/uiStore.test.ts`

  **Estimated scope:** XS (1 file + test)

- [ ] **Task 3: Wire temperature into `AttenuationStyleView.tsx`'s existing tick**

  **Description:** Per spec §1.3/§4 — inside the existing 1s `tick()`, after `setActiveLocaleLocalTime(hour)`, read the current locale's `coordinates` (same `locale` object `dayStartTimestamp` already comes from) and call `setActiveLocaleTemperature(computeLocaleTemperature(localeId, locale.coordinates.x, locale.coordinates.y, hour))`. No new effect, no new interval — same tick, one more line.

  **Acceptance criteria:**
  - [ ] Each tick call updates both `activeLocaleLocalTime` and `activeLocaleTemperature` from the same `hour` value (no drift between the two).
  - [ ] No second `setInterval`/timer introduced.
  - [ ] Behavior when `locale` is not found (`if (!locale) return;`) is unchanged — temperature is not set to a stale/garbage value in that branch.

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/worldView/AttenuationStyleView.test.tsx` passes, including a new case asserting `setActiveLocaleTemperature` is called with `computeLocaleTemperature`'s result for the tick's own `hour`/coordinates (mock or spy `computeLocaleTemperature`).
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 1, Task 2.

  **Files:** `src/components/panels/screen/worldView/AttenuationStyleView.tsx`, `src/components/panels/screen/worldView/AttenuationStyleView.test.tsx`

  **Estimated scope:** XS (1 file + test, few-line change)

### Checkpoint A: Temperature plumbing verified
- [ ] `npm test`, `npm run build:types`, `npm run lint` all clean.
- [ ] No visible app change yet — `activeLocaleTemperature` updates live in the store (verifiable via devtools/store inspection) but nothing renders it until Task 8.
- [ ] Review with human before proceeding (optional at this checkpoint — low-risk, purely additive; may combine with Checkpoint B's review).

---

### Phase 2: Primitive capability — `boxSize` override

- [ ] **Task 4: `Toggle.tsx` — optional `boxSize` prop**

  **Description:** Per spec §1.4/§4 — add `boxSize?: number` to `ToggleProps`, threaded as `boxHeight={boxSize ?? CABINET_TOGGLE_BOX_SIZE}` on the internal `CabinetBox` call. Omitted, behavior is byte-for-byte identical to today.

  **Acceptance criteria:**
  - [ ] `boxSize={44}` results in `CabinetBox` receiving `boxHeight={44}` (assert via mocked `CabinetBox` props, same pattern the file's existing tests use).
  - [ ] Omitting `boxSize` still passes `boxHeight={CABINET_TOGGLE_BOX_SIZE}` (32) — regression guard.
  - [ ] Every existing `Toggle.test.tsx` case passes unmodified.
  - [ ] No other `Toggle` consumer in the app (Audio Rig, Robot Options, etc.) requires any call-site change — confirmed by `npm run build:types` surfacing nothing.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/Toggle.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/components/ui/controls/Toggle.tsx`, `src/components/ui/controls/Toggle.test.tsx`

  **Estimated scope:** XS (1 file + test, additive-only)

- [ ] **Task 5: `RadioButton.tsx` — optional `boxSize` prop**

  **Description:** Per spec §1.4/§4 — add `boxSize?: number` to `RadioButtonProps`; when provided, pass `boxHeight`/`frontWidth`/`frontHeight` all equal to `boxSize` on every option's `CabinetBox` (spread conditionally so omitting `boxSize` passes none of the three, preserving today's content-sized/tiered default exactly).

  **Acceptance criteria:**
  - [ ] `boxSize={44}` results in every option's `CabinetBox` receiving `boxHeight={44} frontWidth={44} frontHeight={44}`.
  - [ ] Omitting `boxSize` passes none of `boxHeight`/`frontWidth`/`frontHeight` — regression guard matching every current consumer's real behavior.
  - [ ] Every existing `RadioButton.test.tsx` case passes unmodified.
  - [ ] No existing `RadioButton` consumer (Audio Setting, Decay Mode, per-layer Type, `CompanyButtonRow`, `Lfo.tsx`'s Shape row) requires any call-site change.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/RadioButton.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/components/ui/controls/RadioButton.tsx`, `src/components/ui/controls/RadioButton.test.tsx`

  **Estimated scope:** XS (1 file + test, additive-only)

### Checkpoint B: Primitives support `boxSize`
- [ ] `npm test` (full suite) clean — proves zero regression across every existing `Toggle`/`RadioButton` consumer app-wide, not just their own test files.
- [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
- [ ] Review with human before proceeding (optional — same low-risk/additive reasoning as Checkpoint A).

---

### Phase 3: Header-only foundations (data + hook)

- [ ] **Task 6: `headerNavConfig.ts` — `HEADER_NAV_SCHEMA`**

  **Description:** Add `src/data/headerNavConfig.ts` exporting `HEADER_NAV_SCHEMA: RadioButtonSchema` per spec §1.4 — 3 options (`robots`/`audioRig`/`settings`), no schema-level `loreLabel`/`humanLabel` (§1.4's flagged a11y trade-off, open question #2 in the spec). Does **not** touch or delete `src/data/hubNavConfig.ts` yet — that file is still `HubNav.tsx`'s only consumer until Task 12.

  **Acceptance criteria:**
  - [ ] `HEADER_NAV_SCHEMA.options` values are exactly `'robots' | 'audioRig' | 'settings'`, matching the `HubTile` union.
  - [ ] `src/data/hubNavConfig.ts` is untouched (still exists, still exports `HUB_NAV_ITEMS`, still used by `HubNav.tsx`).

  **Verification:**
  - [ ] `npm run build:types` clean (new file type-checks against `RadioButtonSchema`).
  - [ ] `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/data/headerNavConfig.ts`

  **Estimated scope:** XS (1 new file, no test needed — static data, exercised by Task 8's `Header.test.tsx`)

- [ ] **Task 7: `useHeaderRowFit.ts` — row 1+3 merge threshold hook**

  **Description:** Add the `ResizeObserver`-driven self-fit hook per spec §1.5, mirroring `useVoxelTrackBoxCount`'s shape. Returns `true` once the observed element's width can fit `buttonCount` boxes at `boxSize`px + `gap` plus a reserved minimum for the volume slider (`MIN_VOLUME_RESERVE_PX` — spec §7 open item #4, an unconfirmed-but-low-risk engineering default; pick a defensible starting value here, e.g. matching the volume slider's current `80px` CSS width).

  **Acceptance criteria:**
  - [ ] Returns `false` below the computed threshold width, `true` at/above it.
  - [ ] Recomputes on a simulated resize (mocked `ResizeObserver`, same pattern `useVoxelTrackBoxCount.test.ts` uses).
  - [ ] Disconnects its observer on unmount (no leaked observer — mirror `useVoxelTrackBoxCount`'s cleanup).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/useHeaderRowFit.test.ts` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/components/panels/screen/useHeaderRowFit.ts`, `src/components/panels/screen/useHeaderRowFit.test.ts`

  **Estimated scope:** S (1 new file + test, real but self-contained logic)

---

### Phase 4: `Header.tsx` — built and proven, not yet mounted

- [ ] **Task 8: `Header.tsx`/`.css`/`.test.tsx`**

  **Description:** Build the full 3-row header per spec §1.2-§1.5: row 1 (volume slider, ported unchanged from `TransportBar.tsx`), row 2 (`HH:MM -XX°C`, reading `activeLocaleLocalTime`/`activeLocaleTemperature`), row 3 (`Toggle` for Mute + `RadioButton` for nav, both `boxSize={TOUCH_TARGET_SIZE}`, wired to `handleNavChange`'s robots-detail-view-clears-`selectedRobotId` behavior per spec §1.4). Uses `useHeaderRowFit` to toggle a `header--inline` modifier class. **Not wired into `ScreenViewport` yet** — `TransportBar` stays the live header until Task 9. `Header.tsx` exposes its root element via a forwarded ref (needed by Task 9's height measurement — added here so Task 9 doesn't have to re-touch this file's component signature).

  **Acceptance criteria:**
  - [ ] Renders exactly one volume slider (role `slider`, name `/volume/i`), bound to `audioStore.volume`/`setVolume`, `disabled={!isPoweredOn}` — same behavior `TransportBar.test.tsx`'s existing slider tests verify.
  - [ ] Renders `HH:MM -XX°C` from `activeLocaleLocalTime`/`activeLocaleTemperature` store fixtures; renders `—` (or an equivalent placeholder) when temperature is `null`.
  - [ ] Renders one `Toggle` for Mute (`value === isMuted`, calling `setMuted` on change) and one `RadioButton` group (3 options, `value === activeHubTile ?? ''`).
  - [ ] Selecting a nav option calls `setActiveHubTile`; re-selecting the active option clears it to `null`/`''` (deselect-to-empty, unmodified `RadioButton` behavior — regression guard, not new logic in `Header.tsx` itself).
  - [ ] Selecting `'robots'` while a `selectedRobotId` fixture is set also calls `selectRobot(null)`.
  - [ ] `header--inline` class presence tracks a mocked `useHeaderRowFit` return value (both `true` and `false` cases).
  - [ ] Component forwards/exposes a ref to its root `<header>` element.
  - [ ] Component is **not** imported or rendered anywhere outside its own test file yet (`ScreenViewport.tsx` still renders `TransportBar`).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/Header.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` (full suite) clean — proves `Header` being added doesn't break anything, since nothing references it yet.

  **Dependencies:** Task 2 (temperature store field), Task 3 (temperature actually populated — not strictly required for this task's own tests, which use fixtures, but keeps the feature demonstrably end-to-end by the time it matters), Task 4, Task 5 (`boxSize`), Task 6 (`HEADER_NAV_SCHEMA`), Task 7 (`useHeaderRowFit`).

  **Files:** `src/components/panels/screen/Header.tsx`, `src/components/panels/screen/Header.css`, `src/components/panels/screen/Header.test.tsx`

  **Estimated scope:** M (3 files, but the densest single task in this plan — assembles every prior task's output; consider sub-splitting rows 1/2 vs. row 3 into two commits within this one task if it runs long, per spec §6's commit grouping)

### Checkpoint C: `Header` built and proven in isolation
- [ ] `npm test`, `npm run build:types`, `npm run lint`, `npm run build` all clean.
- [ ] App is visually unchanged — `TransportBar` is still the live header (confirm via `npm run dev`).
- [ ] Review with human before proceeding — **recommended, not optional**, before Task 9's higher-risk swap.

---

### Phase 5: Go live — swap `Header` in, fix the deadzone

- [ ] **Task 9: Wire `Header` into `ScreenViewport`; fix horizontal + vertical deadzone clearance; delete `TransportBar.*`**

  **Description:** The highest-risk task in this plan (spec §1.6, §7 item #1). `ScreenViewport.tsx` swaps `<TransportBar />` for `<Header />`, holds a ref + `ResizeObserver` over `Header`'s forwarded root (Task 8) reporting its real rendered height, and applies that as a `--header-height` custom property on `.screen-content`. `ScreenViewport.css`'s `.screen-content .transport-bar { padding-left: var(--sleeve-bar-width); }` selector is renamed to target `Header`'s root class (horizontal deadzone, mechanism unchanged — spec §1.6). `Console.css`'s `.console { margin-top: var(--power-corner-height); }` becomes `margin-top: max(var(--header-height, var(--power-corner-height)), var(--power-corner-height));` (the fail-safe fallback chain from spec §1.6 — never under-clears, even before the first `ResizeObserver` callback fires). `TransportBar.tsx`/`.css`/`.test.tsx` are deleted.

  **Acceptance criteria:**
  - [ ] `Header` is the only header-like element rendered by `ScreenViewport` — `TransportBar` no longer exists in the codebase.
  - [ ] `--header-height` is set on `.screen-content` and updates on a real resize (manual check — jsdom performs no real layout, so this is not fully provable by an automated test; a unit test can still assert the `ResizeObserver` callback wiring/inline-style-setting logic in isolation).
  - [ ] `Console.css`'s `margin-top` uses the `max(...)` fallback-chain form specified above verbatim — not a bare `var(--header-height)` swap (spec §3's explicit constraint).
  - [ ] Horizontal deadzone (`padding-left: var(--sleeve-bar-width)`) is applied to `Header`'s whole root, not per-row.

  **Verification:**
  - [ ] `npx vitest run src/components/panels/physical/ScreenViewport.test.tsx` passes (new/updated cases for the height-measurement wiring, if that file exists — create it if it doesn't, matching `ScreenViewport.tsx`'s existing test coverage level).
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] `npm test` (full suite) clean.
  - [ ] **Manual check (flag for Crawford, cannot be automated — spec §5):** at every breakpoint and both powered states, confirm (a) no header content renders under the power-switch corner, and (b) no `Console` content (any drawer/tab) renders underneath the header's own lower row(s) — the core risk this task exists to close.

  **Dependencies:** Task 8.

  **Files:** `src/components/panels/physical/ScreenViewport.tsx`, `src/components/panels/physical/ScreenViewport.css`, `src/components/panels/screen/console/Console.css`, plus deletion of `src/components/panels/screen/TransportBar.tsx`, `TransportBar.css`, `TransportBar.test.tsx`

  **Estimated scope:** M (3 edited files + 3 deletions; flagged high-risk despite modest file count — see Risks table)

- [ ] **Task 10: `ConsolePanel.tsx` — null-tile branch returns nothing**

  **Description:** Per spec §1.7/§4 — `activeHubTile === null` now returns `null` (no `<HubNav />`, no wrapper div, no back button). Safe only now that `Header`'s nav group (Task 9) is the live, confirmed replacement navigation path.

  **Acceptance criteria:**
  - [ ] `activeHubTile === null` renders nothing from `ConsolePanel`.
  - [ ] Every other tile's existing content/back-button behavior (`TILE_CONTENT` map, `handleBack`) is unchanged.

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/ConsolePanel.test.tsx` passes (old grid-state assertions removed/updated; every other case unmodified).
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 9.

  **Files:** `src/components/panels/screen/console/ConsolePanel.tsx`, `src/components/panels/screen/console/ConsolePanel.test.tsx`

  **Estimated scope:** XS (1 file + test)

- [ ] **Task 11: `Console.tsx`/`Console.css` — drop the now-dead `.console--grid` pointer-events mechanism**

  **Description:** Per spec §1.7 — with `ConsolePanel` never rendering `HubNav`-shaped content in the null-tile case anymore (Task 10), `Console.tsx`'s conditional `console--grid` class and `Console.css`'s `.console--grid`/`.console--grid .sc-button` rules have nothing left to do. Plan's own call (spec §7 item #5): `Console.tsx` conditionally skips rendering its `.console` wrapper's `inset: 0` box entirely when `activeHubTile === null`, rather than keeping the wrapper and simplifying the CSS rule — cleaner given the wrapper would otherwise be an empty, purposeless box.

  **Acceptance criteria:**
  - [ ] `Console.tsx` no longer references `console--grid` anywhere.
  - [ ] `Console.css`'s `.console--grid`/`.console--grid .sc-button` rules are deleted.
  - [ ] Clicking in the empty hub area (no tile selected) still reaches `WorldView`'s robots underneath (manual check — no `HubNav` tiles exist anymore to special-case, so this should now work "for free" with no pointer-events rule needed at all).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/Console.test.tsx` passes, if it exists (update/remove grid-state-specific cases per spec §5).
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check: world-view click-through still works with no tile selected.

  **Dependencies:** Task 10.

  **Files:** `src/components/panels/screen/console/Console.tsx`, `src/components/panels/screen/console/Console.css`, `src/components/panels/screen/console/Console.test.tsx` (if present)

  **Estimated scope:** XS (2-3 files, deletion-heavy)

- [ ] **Task 12: Delete `HubNav.*`, `hubNavConfig.ts`, `HubNavItem`**

  **Description:** Final cleanup, per spec §2/§3 — delete `HubNav.tsx`/`.css`/`.test.tsx` and `src/data/hubNavConfig.ts` (superseded by Task 6's `headerNavConfig.ts`), and remove the now-unused `HubNavItem` interface from `src/types/hub.ts` (`HubTile` itself is unchanged and still needed).

  **Acceptance criteria:**
  - [ ] `HubNav.tsx`/`.css`/`.test.tsx` and `hubNavConfig.ts` no longer exist.
  - [ ] `HubNavItem` no longer exists in `src/types/hub.ts`; `HubTile` is untouched.
  - [ ] No remaining import of any deleted file anywhere in `src/` (caught by `npm run build:types`).

  **Verification:**
  - [ ] `npm run build:types` clean (the strongest signal here — any stale import becomes a compile error).
  - [ ] `npm run lint` clean.
  - [ ] `npm test` (full suite) clean.

  **Dependencies:** Task 6 (replacement already exists), Task 10 (`HubNav` no longer rendered by anything).

  **Files:** delete `src/components/panels/screen/console/HubNav.tsx`, `HubNav.css`, `HubNav.test.tsx`, `src/data/hubNavConfig.ts`; edit `src/types/hub.ts`

  **Estimated scope:** XS (pure deletion + 1 small edit)

### Checkpoint D: Feature complete, old hub grid fully retired
- [ ] `npm run build:types`, `npm run lint`, `npm run build`, `npm test` (full suite) all clean.
- [ ] No trace of `TransportBar`/`HubNav`/`hubNavConfig`/`HubNavItem` anywhere in `src/`.
- [ ] Manual checks from Task 9 (deadzone) and Task 11 (click-through) both performed and confirmed.
- [ ] Manual check (spec §5, not yet covered above): confirm the volume+buttons row genuinely merges inline once there's room at 44×44, time+temp stays separate at every width, and temperature visibly drifts over ~30s of real time rather than sitting static or jumping at hour boundaries.
- [ ] Review with human before proceeding to docs/PR.

---

### Phase 6: Docs

- [ ] **Task 13: `docs/UI_SHELL.md` — replace `TransportBar`/`HubNav` description**

  **Description:** Update the "Sleeve & Glass" overview paragraph (currently describing `TransportBar` as "a sticky mute+metadata bar" and `HubNav` as the tile grid) to describe `Header`'s 3 rows and the nav `RadioButton` group instead, per spec §2.

  **Acceptance criteria:**
  - [ ] No remaining reference to `TransportBar` or `HubNav` as currently-existing components in `docs/UI_SHELL.md`.
  - [ ] New text accurately describes `Header`'s 3 rows and the always-visible nav group, spot-checked against the actual shipped `Header.tsx` (Task 8/9), not the spec's draft.

  **Verification:**
  - [ ] Manual review only (docs-only change).
  - [ ] `npm run lint` clean (in case any code fences are lint-checked).

  **Dependencies:** Task 9, Task 10, Task 11, Task 12 (describes the fully-shipped end state).

  **Files:** `docs/UI_SHELL.md`

  **Estimated scope:** XS (docs only)

- [ ] **Task 14: `docs/COMPONENT_LIBRARY.md` — `boxSize` override note**

  **Description:** Add a short note to `Toggle`'s and `RadioButton`'s existing sections documenting the new optional `boxSize` prop, matching the file's established "internal rendering changed / contract note" pattern.

  **Acceptance criteria:**
  - [ ] Both `Toggle`'s and `RadioButton`'s sections document `boxSize`'s purpose (overriding default sizing) and default-omitted behavior (unchanged from before this feature).
  - [ ] Spot-checked against the actual shipped `Toggle.tsx`/`RadioButton.tsx` prop interfaces (Tasks 4-5), not the spec's draft.

  **Verification:**
  - [ ] Manual review only (docs-only change).

  **Dependencies:** Task 4, Task 5.

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only)

### Final Checkpoint: Complete
- [ ] All acceptance criteria across all 14 tasks met.
- [ ] `npm run build:types`, `npm run lint`, `npm run build`, `npm test` (full suite) all clean.
- [ ] Every manual check listed across Tasks 9, 11, and Checkpoint D performed and confirmed.
- [ ] `docs/UI_SHELL.md` and `docs/COMPONENT_LIBRARY.md` reflect the shipped feature.
- [ ] Not yet reviewed with Crawford — not ready for PR until the manual checks above are done and reviewed (same convention every prior Oblique Cabinetry task doc in this repo has used).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Task 9's vertical deadzone fix (`--header-height` cross-sibling measurement) has no existing precedent in this codebase and can't be fully proven by jsdom (no real layout) | High — a miscalculation directly reproduces the "content hidden under the header" failure the whole feature is meant to avoid | Isolated into its own single task (not bundled with Header's build), explicit fail-safe `max(...)` fallback chain specified verbatim in the acceptance criteria (not left to implementer judgment), and an explicit, named manual check before the checkpoint gate |
| `Header.tsx` (Task 8) is the densest task in this plan — assembles 5 prior tasks' output across 3 files | Medium — higher chance of a mismatch surfacing only at integration (e.g. a prop name drift between Task 4/5's `boxSize` and Task 8's usage) | `npm run build:types` after every task catches interface drift immediately; Task 8 is followed by Checkpoint C (human review recommended) before the higher-risk Task 9 proceeds |
| Retiring the old hub grid (Tasks 10-12) happens only after `Header`'s nav group is live (Task 9) — but if Task 9 ships with an undiscovered bug in the nav wiring, there is a window where both the old and new navigation must coexist correctly, or users lose the ability to navigate | Low-Medium — narrow window, but a real regression class | Task 9's own acceptance criteria require `Header`'s nav group to already be verified end-to-end (Task 8's tests) before Task 9 lands; Checkpoint D's manual checks explicitly re-confirm navigation works before Tasks 10-12's deletions are considered safe to have shipped |
| `MIN_VOLUME_RESERVE_PX` (Task 7) and the exact volume-slider width carried into `Header.css` (Task 8) are both unconfirmed engineering defaults (spec §7 items #4 and the `GLOBAL_VOLUME_CONTROL.md`-precedented `80px` default) | Low — cosmetic, easy to retune | Flagged explicitly in both tasks' descriptions; Checkpoint D's manual check includes visually confirming the inline-merge threshold "looks right," not just that the mechanism functions |
| Dropping per-option lore-label flavor text when hub tiles move from `Button` to `RadioButton` (Task 6) is a content regression a reviewer might not expect | Low — pure flavor text, no functional loss, but easy to miss in review since it's an omission rather than a visible bug | Already flagged in the spec (§7 item #3) and restated here; reviewer should specifically check `HEADER_NAV_SCHEMA`'s options against the old `HUB_NAV_ITEMS`' `loreLabel` values during Task 6's review, not just its `value`/`label` correctness |

## Open Questions

Resolved during Plan (not left open):

- ~~Does `Header.tsx` get wired into `ScreenViewport` in the same task it's built in?~~ **Resolved: no** — built and fully unit-tested unmounted first (Task 8), wired in as its own, more carefully reviewed task (Task 9), specifically so a `Header`-internals bug and a deadzone-measurement bug never have to be debugged at the same time.
- ~~Does the old hub grid get torn down before or after `Header`'s nav group ships?~~ **Resolved: strictly after** (Tasks 10-12 all depend on Task 9) — the app must never pass through a state with no working navigation.
- ~~Is `ConsolePanel` returning `null` vs. `Console.tsx` skipping its own wrapper the right split?~~ **Resolved (spec §7 item #5, restated in Task 11): `Console.tsx` skips the wrapper.** `ConsolePanel` returning `null` (Task 10) is the natural, minimal fix at that layer regardless.

Carried forward from spec §7, not blocking this plan (same items, not re-litigated):

1. The exact `ResizeObserver`/ref plumbing for `--header-height` (which component owns the observer) is specified at the task level (Task 9: `ScreenViewport.tsx` owns it, observing `Header`'s forwarded ref) — this resolves spec §7 item #1's "left open for Plan" note.
2. No group-level accessible name for the row-3 `Toggle`/`RadioButton` (spec §7 item #2) — carried forward as-is; not a Plan-level decision, a design trade-off for a human to weigh in on during Checkpoint C or D's review.
3. `MIN_VOLUME_RESERVE_PX`'s exact value (spec §7 item #4) — resolved at the task level to "start from the volume slider's existing `80px` CSS width as a defensible default" (Task 7); still flagged for a visual sanity check, not a blocking unknown.
