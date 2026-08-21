# Implementation Plan: Layout (Roadmap Phase 2)

Source spec: [docs/specs/LAYOUT.md](../specs/LAYOUT.md). Source intent: [docs/intent/phase-2-layout.md](../intent/phase-2-layout.md).

## Overview

Collapse the shell's two layout modes (mobile stack vs. desktop 2-column grid + landscape tablet frame) into one layout that only scales, never reorients. Cut away the power-switch sleeve's matte area down to a small corner + thin top strip so `ScreenViewport` can grow to fill the freed space, rebuild `TransportBar` as a sticky-always mute+metadata bar (restart/pause removed, no replacement), delete `RobotList` outright, and strip every remaining desktop-reorientation media query from `Tablet.css`/`SleeveContainer.css`/`ScreenViewport.css`/`PowerRockerSwitch.css`. `ConsoleNavigation` stops rendering but stays otherwise untouched for Phase 3.

## Architecture Decisions

Resolving the spec's open questions concretely, so nothing gets invented ad hoc mid-Implement:

- **Cutaway mechanism (resolves spec §7.1):** `SleeveContainer`'s power instance stops being a full-width flex bar and becomes two independently-`position: absolute` pieces layered over `ScreenViewport`, not a shrunk grid/flex track:
  - `.sleeve-container__power-corner` — sized to fit `PowerRockerSwitch`'s actual rendered footprint (`width: fit-content` or a measured fixed value — measure against the real rendered switch during Task 7, don't guess a number now), `position: absolute; top: 0; left: 0`, above `ScreenViewport` in stacking order.
  - `.sleeve-container__top-strip` — `position: absolute; top: 0; left: var(--power-corner-width); right: 0; height: 16px`, same stacking tier, purely decorative (`aria-hidden`).
  - `Tablet.css`'s `.tablet` gains `position: relative` (needed as the containing block now that the power `SleeveContainer` is taken out of flex flow — it wasn't previously positioned). With the power instance out of flow, `ScreenViewport` naturally becomes flush with the top of `.tablet`, no separate margin hack needed there.
  - `ScreenViewport` reserves the horizontal band under the switch via its own content, not via a hole punched in its box: the mute+metadata bar gets `padding-top: 16px` (clears the top strip) and a left offset equal to `var(--power-corner-width)` (clears the switch corner) for its own height only — everything below the switch's bottom edge (`WorldView`, `Console`) is full-width, untouched.
  - This keeps the guardrail intact by construction: nothing moves between components, the switch just visually overlaps `ScreenViewport`'s box the same way a `z-index`-raised sibling always could.

- **GSAP cross-file dependency (resolves spec §7.2):** Keep `.transport-bar__displays` and `.transport-bar__btn` as the outer class names on the rebuilt bar's metadata container and surviving mute button respectively. `PowerRockerSwitch.tsx`'s `handlePowerOn` timeline needs zero changes — it already selects by class, not by count, and a `stagger` across a single matched element degenerates to a plain fade with no error. Verified explicitly in Task 9's acceptance criteria rather than assumed.

- **Grid row sizing after dropping `robotlist` (resolves spec §7.4):** `.screen-content`'s mobile grid had one track per area (`auto auto 1fr 1fr` for transport/worldview/console/robotlist). Dropping the `robotlist` area leaves `grid-template-rows: auto 1fr 1fr` — the metadata bar keeps its natural (`auto`) height, `WorldView` and `Console` keep the same 1:1 share of remaining space they already had relative to each other. No new proportion is being invented, just the dead track removed.

- **Decorative rail/gradient flip (spec §7.3) is NOT resolved here.** Whether to also remove `ScreenViewport.css`'s `min-width: 48em` stripe-direction/bevel-orientation flip is still an open question — it wasn't part of what Crawford confirmed in the interview. It gets its own task (Task 11), sequenced last and explicitly gated on a go/no-go answer before it's implemented, so it can't block or get bundled into the rest of the phase.

## Dependency Graph

```
Task 1 (index.css dead tokens)                                   ── independent

Task 2 (Tablet.css: remove reorientation, add position:relative)
    │
    ├── Task 3 (SleeveContainer.css: remove column-flip block)
    ├── Task 4 (PowerRockerSwitch.css: remove transform:none override)
    │
    └── Task 7 (SleeveContainer cutaway structure) ── needs Task 2's position:relative

Task 5 (delete RobotList, drop its render)
    │
    └── Task 6 (ScreenViewport.css: remove 2-col grid, 3-area single-column grid)
            │
            └── Task 8 (ScreenViewport: corner-exclusion CSS for the cutaway) ── needs Task 7

Task 7 ──→ Task 8 ──→ Task 9 (TransportBar rebuild: controls, metadata, sticky-always, wrap)

Task 9 ──→ Task 10 (docs/UI_SHELL.md update)

Task 11 (decorative rail/gradient flip) ── gated on human decision, no code dependency on anything else
```

## Task List

### Phase 1: De-reorient the outer frame

- [x] **Task 1: Remove dead sleeve-width tokens from `index.css`** — done

  **Description:** Delete `--sleeve-width-tablet` and `--sleeve-width-desktop` — defined in `index.css` but never referenced anywhere in `src/` (confirmed by grep in the spec's grounding pass). `--sleeve-width` itself stays; it's the one actually used.

  **Acceptance criteria:**
  - [ ] `--sleeve-width-tablet`/`--sleeve-width-desktop` no longer appear in `index.css`.
  - [ ] `grep -r "sleeve-width-tablet\|sleeve-width-desktop" src/` returns zero matches.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.

  **Dependencies:** None.

  **Files:** `src/index.css`, `src/index.css.test.ts` (new)

  **Estimated scope:** XS (1 file, deletion only)

- [x] **Task 2: `Tablet.css` — remove row-flip/width-scaling, add `position: relative`** — done

  **Description:** Delete the `min-width: 48em/64em/80em/92em` blocks that flip `.tablet` to `flex-direction: row` and progressively widen it. `.tablet` stays `flex-direction: column` at every size, sized by its existing base (mobile) rules only. Add `position: relative` to `.tablet` — required as the containing block for Task 7's absolutely-positioned power corner/top strip (it isn't positioned today).

  **Acceptance criteria:**
  - [ ] No `@media` blocks remain in `Tablet.css`.
  - [ ] `.tablet` has `position: relative`.
  - [ ] At every viewport width, `.tablet` stays a column (`SleeveContainer` / `ScreenViewport` / `SleeveContainer` stacked top-to-bottom).

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: resize the dev server window from narrow to ultra-wide — confirm the tablet frame never flips to a row layout, only scales.

  **Dependencies:** None.

  **Files:** `src/components/tablet/Tablet.css`, `src/components/tablet/Tablet.css.test.ts` (new)

  **Estimated scope:** XS (1 file)

- [x] **Task 3: `SleeveContainer.css` — remove column-flip block** — done

  **Description:** Delete the `min-width: 48em` block that flips `.sleeve-container` to `flex-direction: column` (vertical bar) and rotates `.sleeve-logo` -90°. The base (mobile) rules — horizontal bar, `height: var(--sleeve-width)`, unrotated logo — apply at every size now, matching Task 2's decision that the sleeve never reorients.

  **Acceptance criteria:**
  - [ ] No `@media` blocks remain in `SleeveContainer.css` outside what Task 7 adds for the cutaway.
  - [ ] `.sleeve-logo` never rotates at any viewport width.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm the non-power `SleeveContainer` (bottom bar) stays a plain horizontal strip with an upright "PELAGOS" logo at every width.

  **Dependencies:** Task 2 (sequenced together as the outer-frame phase; no hard code dependency).

  **Files:** `src/components/panels/physical/SleeveContainer.css`, `src/components/panels/physical/SleeveContainer.css.test.ts` (new)

  **Estimated scope:** XS (1 file)

- [x] **Task 4: `PowerRockerSwitch.css` — remove `transform: none` override** — done

  **Description:** Delete the `min-width: 48em { .rocker-panel { transform: none } }` block. The base (mobile) `translateX(100%) rotate(90deg)` transform applies at every size now, matching the sleeve staying a horizontal bar always.

  **Acceptance criteria:**
  - [ ] No `@media` blocks remain in `PowerRockerSwitch.css` other than the existing `prefers-reduced-motion` one (untouched).
  - [ ] `.rocker-panel`'s rotated transform applies at every viewport width.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm the power switch renders in the same rotated orientation at every width — no snap-to-unrotated at ≥48em.

  **Dependencies:** Task 2, Task 3 (sequenced together; verify visually alongside them).

  **Files:** `src/components/ui/physical/PowerRockerSwitch.css`, `src/components/ui/physical/PowerRockerSwitch.css.test.ts` (new)

  **Estimated scope:** XS (1 file)

### Checkpoint: Outer frame de-reorientation
- [x] `npm run build:types`, `npm run lint`, `npm test` (58 files, 688/688 passing), `npm run build` all clean.
- [x] Structural tests confirm zero `@media` blocks remain in `Tablet.css`/`SleeveContainer.css`, and exactly the pre-existing `prefers-reduced-motion` block remains in `PowerRockerSwitch.css` — no reorientation logic left in any of the three files.
- [ ] Manual resize check in a running browser (`npm run dev`) — not yet performed this session; recommended before merging.
- [ ] Review with human before proceeding.

---

### Phase 2: Content grid cleanup (independent of the cutaway)

- [ ] **Task 5: Delete `RobotList`**

  **Description:** Delete `RobotList.tsx`/`RobotList.css` and drop `{isPoweredOn && <RobotList />}` from `ScreenViewport.tsx`. No replacement, no parking for reuse — per the confirmed intent, Phase 8's Robot Selection tile is different enough in shape.

  **Acceptance criteria:**
  - [ ] `RobotList.tsx`/`RobotList.css` no longer exist.
  - [ ] `ScreenViewport.tsx` no longer imports or renders `RobotList`.
  - [ ] No remaining reference to `RobotList` anywhere in `src/` (grep confirms zero matches).

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] `npm test` — no test suite references the deleted files (none existed for `RobotList` itself; confirm nothing else imported it).

  **Dependencies:** None.

  **Files:** `src/components/panels/screen/RobotList.tsx` (deleted), `src/components/panels/screen/RobotList.css` (deleted), `src/components/panels/physical/ScreenViewport.tsx`

  **Estimated scope:** S (2 deletions + 1 edit)

- [ ] **Task 6: `ScreenViewport.css` — remove two-column grid, drop `robotlist` area**

  **Description:** Delete the `min-width: 64em` block (the two-column `.screen-content` grid + its `.screen-occlusion` override). Update the base `.screen-content` to 3 grid areas (`transport worldview console`, one per row) with `grid-template-rows: auto 1fr 1fr` per this plan's Architecture Decision above — the `robotlist` area is gone, no reflow logic replaces it.

  **Acceptance criteria:**
  - [ ] No `@media` blocks remain in `ScreenViewport.css` related to the content grid.
  - [ ] `.screen-content`'s `grid-template-areas` lists exactly `transport`, `worldview`, `console` (no `robotlist`).
  - [ ] Layout doesn't reorient into two columns at any width.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm `WorldView` and `Console` stack in a single column, sharing space evenly, at every viewport width.

  **Dependencies:** Task 5 (grid areas reference `RobotList`'s old slot; sequence after its removal to avoid an intermediate broken state).

  **Files:** `src/components/panels/physical/ScreenViewport.css`

  **Estimated scope:** S (1 file)

### Checkpoint: Content grid cleanup
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] `RobotList` is fully gone; `WorldView`/`Console` render correctly in a single column at every width.
- [ ] Review with human before proceeding.

---

### Phase 3: Cutaway + rebuilt mute/metadata bar

- [ ] **Task 7: `SleeveContainer` — cutaway structure**

  **Description:** Per this plan's Architecture Decision above, split the `hasPowerSwitch` instance into `.sleeve-container__power-corner` (houses `PowerRockerSwitch`, `position: absolute`, sized to the switch's real rendered footprint — measure it, don't guess) and `.sleeve-container__top-strip` (thin 16px decorative lip to its right, `position: absolute`, `aria-hidden`), both above `ScreenViewport` in stacking order. Define `--power-corner-width` (measured value) as a CSS custom property so Task 8 can reference the same number. The non-power `SleeveContainer` instance (bottom bar) is unchanged — still the plain full-width bar from Phase 1.

  **Acceptance criteria:**
  - [ ] `hasPowerSwitch` instance renders both `.sleeve-container__power-corner` (containing `PowerRockerSwitch`) and `.sleeve-container__top-strip`.
  - [ ] Non-power instance renders unchanged (just the `sleeve-logo`, no cutaway markup).
  - [ ] `--power-corner-width` is defined once and reused, not hardcoded in two places.
  - [ ] No interactive element other than `PowerRockerSwitch` exists inside `SleeveContainer`'s markup (guardrail check).

  **Verification:**
  - [ ] `npx vitest run SleeveContainer` — new `SleeveContainer.test.tsx`: `hasPowerSwitch` instance renders the corner + strip + `PowerRockerSwitch`; non-power instance renders only the logo.
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm the power switch renders in its corner, doesn't visually break, and the thin strip is visible to its right.

  **Dependencies:** Task 2 (needs `.tablet`'s `position: relative`).

  **Files:** `src/components/panels/physical/SleeveContainer.tsx`, `src/components/panels/physical/SleeveContainer.css`, `src/components/panels/physical/SleeveContainer.test.tsx` (new)

  **Estimated scope:** M (new structure + CSS + new test file)

- [ ] **Task 8: `ScreenViewport` — reserve space for the cutaway**

  **Description:** Add the padding/offset exclusion described in this plan's Architecture Decision: the metadata bar's own container gets `padding-top: 16px` (clears the top strip) and a left offset of `var(--power-corner-width)` (clears the switch corner) for its own height; everything below is unaffected. No DOM changes needed in `ScreenViewport.tsx` itself beyond what Task 5 already did — this is a CSS-only task.

  **Acceptance criteria:**
  - [ ] Nothing in `ScreenViewport`'s rendered content visually overlaps `SleeveContainer`'s power corner or top strip at any viewport width.
  - [ ] `WorldView`/`Console` (below the bar) are unaffected — full width, no reserved space.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm no visual overlap between the switch/strip and the (still old, pre-Task-9) `TransportBar` content across viewport widths.

  **Dependencies:** Task 6, Task 7.

  **Files:** `src/components/panels/physical/ScreenViewport.css`

  **Estimated scope:** S (1 file, CSS only)

- [ ] **Task 9: `TransportBar` rebuild — controls, metadata, sticky-always, wrap**

  **Description:** Remove restart, pause/play, and `isPaused` state entirely (no replacement). Add a metadata readout — planet name (seed), locale coordinates, BPM, time — reading directly from `planetStore`/`localeStore`/`audioStore`/`constants/time.ts` (existing hooks, no new data file per spec). Remove the `min-width: 48em { position: relative }` override so the bar stays `position: sticky` at every size. Change the row to `flex-wrap: wrap` so metadata drops to a new line when there's no room next to mute, per the confirmed intent. Keep `.transport-bar__displays`/`.transport-bar__btn` as the outer class names (this plan's Architecture Decision resolving spec §7.2) — verify `PowerRockerSwitch.tsx`'s power-on animation still fires correctly against the rebuilt markup.

  **Acceptance criteria:**
  - [ ] No restart or pause/play controls remain in the DOM; `isPaused` state is removed.
  - [ ] Mute toggle behavior is unchanged (still calls `AudioEngine.setMasterVolume`/`store.setMuted`).
  - [ ] Metadata readout displays planet name, locale coordinates, BPM, and time, sourced from existing store hooks only.
  - [ ] The bar is `position: sticky` at every viewport width (no override turns it off).
  - [ ] Mute + metadata sit in one row when there's room; metadata wraps to a new line when there isn't (content-driven, not a new viewport breakpoint).
  - [ ] `PowerRockerSwitch.tsx`'s `handlePowerOn` fade-in animation still visibly fires on the mute button and metadata block on power-on (manual check).

  **Verification:**
  - [ ] `npx vitest run TransportBar` — new `TransportBar.test.tsx`: metadata renders correct values from mocked store state; restart/pause are absent; mute toggle still dispatches the expected `AudioEngine`/`audioStore` calls.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm run build` clean.
  - [ ] Manual: `npm run dev`, power on, confirm the power-on fade-in animation still plays on the rebuilt bar; resize narrow enough to trigger the metadata wrap and confirm it wraps cleanly; confirm sticky behavior holds at every width.

  **Dependencies:** Task 7, Task 8 (bar needs the reserved space to sit in).

  **Files:** `src/components/panels/screen/TransportBar.tsx`, `src/components/panels/screen/TransportBar.css`, `src/components/panels/screen/TransportBar.test.tsx` (new)

  **Estimated scope:** M (behavior removal + new read-only metadata logic + CSS)

### Checkpoint: Cutaway + mute/metadata bar complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Manual pass across mobile/~48em/~64em/92em+ widths: no reorientation anywhere, cutaway renders correctly, mute+metadata bar is sticky and wraps as expected, power-on animation still fires.
- [ ] Review with human before proceeding — this is the phase's core visual deliverable.

---

### Phase 4: Docs and the gated decorative-flip decision

- [ ] **Task 10: `docs/UI_SHELL.md` update**

  **Description:** Update the Overview's list of what `ScreenViewport` renders — drop `RobotList`, and describe `TransportBar` as the sticky mute+metadata bar rather than the old transport controls. Per the roadmap's own Docs note for this phase.

  **Acceptance criteria:**
  - [ ] `RobotList` no longer appears in the Overview's list of rendered components.
  - [ ] `TransportBar`'s description matches its rebuilt behavior (mute + metadata, sticky-always).

  **Verification:**
  - [ ] Manual review — read the updated section against the shipped component, confirm it matches.

  **Dependencies:** Task 9.

  **Files:** `docs/UI_SHELL.md`

  **Estimated scope:** XS (docs only)

- [ ] **Task 11 (gated — needs a human decision before starting): `ScreenViewport.css` decorative rail/gradient flip**

  **Description:** Per spec §7.3, `ScreenViewport.css`'s `min-width: 48em` block also flips `.screen-viewport::before`'s stripe direction and `.screen-rail`'s bevel orientation from vertical (mobile) to horizontal (desktop) — purely decorative, written to accompany the physical sleeve reorientation this phase removes everywhere else. **Do not implement until Crawford confirms** whether to remove this block too (keeping the mobile/vertical-bevel look at every size) or leave it as a deliberate, still-live exception.

  **Acceptance criteria (if confirmed to remove):**
  - [ ] The `min-width: 48em` block affecting `.screen-viewport::before`/`.screen-rail` is deleted.
  - [ ] Decorative bevels/stripes stay in their mobile (vertical) orientation at every width.

  **Verification:**
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual: confirm the decorative bevel/stripe look is consistent across all widths.

  **Dependencies:** None technically, but blocked on the human decision above — do not start without an explicit answer.

  **Files:** `src/components/panels/physical/ScreenViewport.css`

  **Estimated scope:** XS (1 file, once unblocked)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across Tasks 1-10 met (Task 11 resolved either way — implemented or explicitly deferred with a documented reason).
- [ ] `docs/UI_SHELL.md` reflects the shipped shell.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `--power-corner-width` is guessed too small/large, causing content to peek out from under the switch or leaving an ugly gap | Medium — visual bug, easy to miss without checking every width | Task 7 measures the real rendered `PowerRockerSwitch` footprint before picking the value; Task 8's manual check explicitly looks for overlap across widths |
| `PowerRockerSwitch.tsx`'s power-on animation silently stops animating anything if class names drift during the `TransportBar` rebuild | Medium — no error, just a missing visual effect, easy to miss | This plan's Architecture Decision pins the class names down explicitly; Task 9's acceptance criteria include a manual check of the animation firing, not just a code review |
| Removing `SleeveContainer`'s flex-flow participation (Task 7's `position: absolute`) could affect `.tablet`'s `justify-content: space-between` sizing for the remaining flex children | Low — only 2 flex children remain (`ScreenViewport`, bottom `SleeveContainer`) once the top one is absolute | Covered by Task 2/7's manual checks; `.tablet`'s `justify-content` may need revisiting once only one true flex sibling plus the absolute one remain — flag during Task 7 if the bottom sleeve's positioning looks off |
| Task 11 gets implemented anyway "for consistency" without an explicit answer | Low but easy to do by habit, since it's textually adjacent to Task 6's grid removal | Task 11 is a separate task with its own explicit gate note; the Complete checkpoint requires it be either done or explicitly deferred with a reason, not silently skipped or silently bundled in |

## Open Questions

Only one item remains open, carried forward from spec §7.3 — everything else (§7.1, §7.2, §7.4) is resolved into concrete Architecture Decisions above:

1. **Decorative rail/gradient flip (Task 11):** remove it (mobile/vertical bevel look at every size, matching the rest of this phase's "no reorientation" direction), or keep it as a deliberate exception? Needs Crawford's explicit answer before Task 11 starts.
