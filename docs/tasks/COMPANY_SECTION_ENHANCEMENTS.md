# Implementation Plan: Company Section Enhancements

Source spec: [docs/specs/COMPANY_SECTION_ENHANCEMENTS.md](../specs/COMPANY_SECTION_ENHANCEMENTS.md). Source intent: [docs/intent/company-section-enhancements.md](../intent/company-section-enhancements.md). Four independently-conceived changes to the Company section (`CompanyManager.tsx`/`RobotsTab.tsx` area) that turn out to share two real dependency edges once broken into tasks — see Architecture Decisions and the Dependency Graph below.

## Overview

Add a required `color` field to `Company`, seeded at spawn time and `Math.random()`-picked (with collision-avoidance) for user-created companies; give `RadioButton` an optional per-option color that reuses existing CSS with no new rules; wire both together so `RobotSelectionCard`'s company picker and `CompanyButtonRow`'s own buttons show each company's color; wrap `CompanyCrudControls` in a collapsed-by-default accordion; and sort `RobotsTab`'s robot list so the currently-focused company's members sink to the bottom. None of the four top-level changes need each other, but two of them share files/types with narrower internal dependencies (see below) — task order follows those, not the four-change grouping itself.

## Architecture Decisions

- **`Company.color` (Task 1) and `RadioButtonSchema.color` (Task 3) are the two true foundations — both are pure type + generation/rendering changes with no dependency on anything else in this plan, and both are prerequisites for `companyConfig.ts`'s schema builders (Task 5).** Same "foundation lands first" precedent [docs/tasks/ROBOT_CARDS_REDESIGN.md](ROBOT_CARDS_REDESIGN.md) used for `isRobotAudible`. They touch entirely disjoint files (`Company.ts`/`spawnSystem.ts` vs. `types/controls.ts`/`RadioButton.tsx`) and can land in either order or in parallel.
- **Task 2 (fixing ~10 existing test fixtures) is its own task, sequenced immediately after Task 1, not folded into it.** Making `Company.color` required breaks `npm run build:types` for every existing hand-built `Company` fixture until each gets a `color` value — mechanical, uniform, one-line-per-file churn, genuinely distinct work from Task 1's own generation logic. It's listed at 10 files, deliberately over this plan's usual ~5-file task ceiling: splitting a single uniform mechanical edit across two arbitrary task boundaries would add process overhead without reducing real risk, so it stays one task. See spec §7 item 1 — flagged there for Crawford's explicit sign-off on the required-field choice, not silently absorbed here.
- **Tasks 4 and 5 (the two consumers of Tasks 1/3) are independent of each other and can land in either order once their own dependencies exist**, same "parallelizable consumers" shape ROBOT_CARDS_REDESIGN's own Phase 2 used — Task 4 touches only `CompanyCrudControls.tsx`, Task 5 touches only `companyConfig.ts`. Neither reads the other's file.
- **Tasks 6 (CRUD accordion) and 7 (robot-list sort) have zero dependencies on anything in this plan** and could in principle land first — placed in Phase 2 anyway (not Phase 1) purely because Phase 1's foundation work is higher-risk and worth isolating in its own review checkpoint before anything else proceeds, not because of a real ordering requirement.
- **Task 6 shares a file with Task 4** (`CompanyCrudControls.tsx`/`.test.tsx` — accordion wrap vs. color-generation wiring, touching different functions in the same component). Logically independent, but sequenced rather than parallelized to avoid avoidable merge friction on the same small file.
- **Task 5 shares a file with Task 6** (`companyConfig.ts` — the new `COMPANY_CRUD_ACCORDION_SCHEMA` constant vs. the two builder functions gaining `color`). Same reasoning: different exports, no real conflict, sequenced anyway.
- **Docs (Task 8) land last**, once every shipped shape is real and spot-checkable — matching the "docs land last" precedent in every prior task plan in this repo.

## Dependency Graph

```
Task 1 (Company.color + generateCompanyIdentityColor + spawn-loop wiring)
    │
    ├──→ Task 2 (fix ~10 existing Company test fixtures — needs the type to exist)
    │
    ├──→ Task 4 (CompanyCrudControls.tsx — pickRandomCompanyColor + handleCreate)
    │
    └──→ Task 5 (companyConfig.ts — color on both schema builders) ◄──┐
                                                                        │
Task 3 (RadioButtonSchema.color + RadioButton.tsx per-item style) ─────┘

Task 6 (CompanyCrudControls.tsx — CRUD accordion wrap + COMPANY_CRUD_ACCORDION_SCHEMA)
    — independent, but shares CompanyCrudControls.tsx with Task 4 and companyConfig.ts with Task 5
      (sequence, don't parallelize, against either)

Task 7 (RobotsTab.tsx — sortRobotsByCompanyFocus + its use) — fully independent

Tasks 1–7 ──→ Task 8 (docs/COMPONENT_LIBRARY.md)
```

## Task List

### Phase 1: Foundation

- [ ] **Task 1: `Company.color` — the type + seeded spawn-time generation**

  **Description:** Add `color: string` (required) to `Company` (spec §1.2). Add `generateCompanyIdentityColor(noiseMap, offset)` to `src/systems/spawnSystem.ts`, mirroring `generateRobotIdentityColor` exactly (same clamped-index-into-`ROBOT_IDENTITY_COLOR_NAMES` shape) but with its own dataId (`'company.identityColor'`) so it doesn't share `generateRobotIdentityColor`'s seeded stream. Wire it into the existing company-spawn loop (`spawnSystem.ts:595-600`), seeded off the company's own loop index `c`, matching `company.size`/`company.member`'s own per-`c` seeding.

  **Acceptance criteria:**
  - [ ] `Company` requires `color: string`; `CompanyOptionsSnapshot` is untouched.
  - [ ] `generateCompanyIdentityColor` uses `getSeededVal` with dataId `'company.identityColor'` — never `Math.random()`.
  - [ ] Given the same seed/noiseMap and the same company index `c`, `generateCompanyIdentityColor` returns the same color every call (reproducible).
  - [ ] The returned value is always a member of `ACCENT_COLORS`' own value set (via `ROBOT_IDENTITY_COLOR_NAMES`).
  - [ ] Every company built by the spawn loop has a `color` set via `generateCompanyIdentityColor`, following the same `noiseMap ? f(noiseMap, …) : f(fallbackFn, …)` shape `id`/`name` already use in that same object literal.

  **Verification:**
  - [ ] `npx vitest run src/systems/spawnSystem.test.ts` passes, including new coverage for `generateCompanyIdentityColor`'s value-set membership and determinism.
  - [ ] `npm run build:types` — expected to surface every fixture in Task 2's file list as newly failing; this is expected and resolved by Task 2, not by this task.
  - [ ] `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/types/Company.ts`, `src/systems/spawnSystem.ts`, `src/systems/spawnSystem.test.ts`

  **Estimated scope:** S (2 source files + their tests, one new function + one call-site wire-up)

- [ ] **Task 2: Fix existing `Company` test fixtures for the new required field**

  **Description:** Add a `color` value (any valid hex, e.g. reuse an `ACCENT_COLORS` entry) to every hand-built `Company` object literal across the codebase that Task 1's required field breaks. Purely mechanical — no logic changes, no new assertions beyond the one noted below.

  **Acceptance criteria:**
  - [ ] `npm run build:types` is clean with zero remaining "missing property `color`" errors.
  - [ ] Every `Company` literal in the files listed below has a `color` value.
  - [ ] `Company.test.ts` additionally gains one assertion that `color` is required at the type level (e.g. a `// @ts-expect-error` case constructing a `Company` without it) — check this file's own existing pattern for testing other required fields before adding a new one.

  **Verification:**
  - [ ] `npm run build:types` clean.
  - [ ] `npx vitest run` (full suite) — no fixture update in this task changes any test's actual assertions or outcomes, only the literals' shape, so every test that passed before must still pass.

  **Dependencies:** Task 1 (the field must exist to fix references to it).

  **Files:** `src/types/Company.test.ts`, `src/components/selection/RobotSelectionCard.test.tsx`, `src/components/robot/RobotDisplaySection.test.tsx`, `src/components/company/CompanyOptionsSection.test.tsx`, `src/stores/localeStore.test.ts`, `src/components/panels/screen/worldView/AttenuationStyleView.test.tsx`, `src/components/company/CompanyButtonRow.test.tsx`, `src/systems/factoryPlacementSystem.test.ts`, `src/systems/audioSwells.test.ts`, `src/components/actors/FactoryBubbleStream.test.tsx`

  **Estimated scope:** L (10 files — deliberately over this plan's usual ceiling; see Architecture Decisions above for why it isn't split further)

- [ ] **Task 3: `RadioButtonSchema` + `RadioButton.tsx` — optional per-option color**

  **Description:** Add optional `color?: string` to `RadioButtonSchema.options[]` (spec §1.3). In `RadioButton.tsx`, apply `getRobotColorStyle(option.color)` as an inline `style` on each option's `ToggleGroup.Item` when `color` is set, `undefined` otherwise. No new CSS — existing `CabinetBox.css`/`RadioButton.css` rules already read the ambient custom properties this scopes per-item.

  **Acceptance criteria:**
  - [ ] `RadioButtonSchema.options[].color` is optional; every other field on the option type is unchanged.
  - [ ] An option with `color` set renders that color's value in its own scoped `--color-accent-a`/`-b`/`--color-accent`/`--color-accent-gradient` custom properties (via `getRobotColorStyle`), visible on its `ToggleGroup.Item`'s inline style.
  - [ ] An option with no `color` renders with no inline `style` at all on its `ToggleGroup.Item` — byte-for-byte the same DOM as today.
  - [ ] No new rule is added to `RadioButton.css` or `CabinetBox.css`.
  - [ ] Every existing `RadioButton` consumer (Audio Setting, Decay Mode, per-layer Type, Header's nav group, …) renders identically to before this change.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/RadioButton.test.tsx` passes (28/28 existing style, plus new coverage for the per-option `color` prop and the "no color → no inline style" case).
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/types/controls.ts`, `src/components/ui/controls/RadioButton.tsx`, `src/components/ui/controls/RadioButton.test.tsx`

  **Estimated scope:** S (1 type file + 1 component + its test, one new prop wired through)

### Checkpoint: Foundation
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] `Company.color` has no real consumer yet beyond spawn generation and the fixed fixtures — no dead-code lint warnings expected (it's a required field, referenced everywhere `Company` already is).
- [ ] `RadioButtonSchema.color`/`RadioButton.tsx`'s new rendering path has no real consumer populating it yet — every existing schema still omits it.
- [ ] Review with human before proceeding.

---

### Phase 2: Consumers (parallelizable in principle — see Architecture Decisions for the file-sharing caveats)

- [ ] **Task 4: `CompanyCrudControls.tsx` — user-created company color**

  **Description:** Add `pickRandomCompanyColor(existingColors: string[]): string` (spec §1.2) alongside the file's existing `suggestCompanyName` — `Math.random()`-fed, bounded re-roll against every color already in use by an existing company in the locale, capped at `ROBOT_IDENTITY_COLOR_NAMES.length` attempts. Wire it into `handleCreate`, passing `companies.map((c) => c.color)` (the `companies` list already in scope).

  **Acceptance criteria:**
  - [ ] `pickRandomCompanyColor` never returns a color present in its `existingColors` argument, as long as at least one hue in `ROBOT_IDENTITY_COLOR_NAMES` isn't already in use.
  - [ ] `pickRandomCompanyColor`'s retry loop is bounded (at most `ROBOT_IDENTITY_COLOR_NAMES.length` attempts) — never an unbounded `while (true)`.
  - [ ] `handleCreate` assigns the new company a `color` computed via `pickRandomCompanyColor`, distinct from every other company currently in the locale (given `MAX_COMPANIES = 6` against 18 hues, this always succeeds in practice).
  - [ ] Uses `Math.random()`, not `getSeededVal` — this is the live-UI-roll path, matching `suggestCompanyName`'s own precedent, not reproducible world generation.

  **Verification:**
  - [ ] `npx vitest run src/components/company/CompanyCrudControls.test.tsx` passes, including new coverage: a fixture with several existing company colors produces a new company whose color isn't among them; the bounded-loop fallback path is exercised (e.g. mock `Math.random()`'s sequence — check this file's existing `Math.random()` mocking pattern, if any, from `suggestCompanyName`'s own tests before writing new ones).
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 1 (`Company.color` must exist).

  **Files:** `src/components/company/CompanyCrudControls.tsx`, `src/components/company/CompanyCrudControls.test.tsx`

  **Estimated scope:** S (1 component + its test, one new helper + one call-site wire-up)

- [ ] **Task 5: `companyConfig.ts` — `color` on both schema builders**

  **Description:** `buildCompanyAssignmentSchema` and `buildCompanyButtonRowSchema` each add `color: c.color` to every real-company option they build; the non-company sentinel options (`Freelance`, `None`, `All`) omit `color` entirely, keeping today's ambient fallback (spec §1.3).

  **Acceptance criteria:**
  - [ ] `buildCompanyAssignmentSchema(companies)`: every company option carries `color: company.color`; the `Freelance` option has no `color` key.
  - [ ] `buildCompanyButtonRowSchema(companies)`: every company option carries `color: company.color`; `None`/`All` have no `color` key.
  - [ ] No change to either function's own call sites (`RobotSelectionCard.tsx`, `RobotDisplaySection.tsx`, `CompanyButtonRow.tsx`) — `color` flows through automatically once both this task and Task 1/3 are in place.

  **Verification:**
  - [ ] `npx vitest run src/data/companyConfig.test.ts` passes, with new assertions for `color` presence/absence on both builders.
  - [ ] New assertion in `RobotSelectionCard.test.tsx` and `CompanyButtonRow.test.tsx` that the rendered company options carry each company's own `color`.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 1 (`Company.color` must exist to read), Task 3 (`RadioButtonSchema.color` must exist to assign into).

  **Files:** `src/data/companyConfig.ts`, `src/data/companyConfig.test.ts`, `src/components/selection/RobotSelectionCard.test.tsx`, `src/components/company/CompanyButtonRow.test.tsx`

  **Estimated scope:** S (1 data file + 3 test files, additive field on 2 existing functions)

- [ ] **Task 6: `CompanyCrudControls` — CRUD accordion**

  **Description:** Add `COMPANY_CRUD_ACCORDION_SCHEMA` to `companyConfig.ts` (spec §1.1). Wrap `CompanyCrudControls`'s existing return JSX in `<AccordionContainer schema={COMPANY_CRUD_ACCORDION_SCHEMA}>` — no `defaultOpen` (defaults to `false`), no `style` (inherits `CompanyManager`'s ambient `company` trait color via cascade). `CompanyManager.tsx` itself needs no edit — `CompanyButtonRow` stays outside, above, unaffected.

  **Acceptance criteria:**
  - [ ] `COMPANY_CRUD_ACCORDION_SCHEMA` has non-empty `loreLabel`/`humanLabel` and `type: 'accordion'`.
  - [ ] `CompanyCrudControls`'s Create/Rename/Delete controls are not visible/queryable on initial render.
  - [ ] Activating the accordion trigger reveals them; activating it again hides them.
  - [ ] `CompanyManager.tsx` is unmodified — `CompanyButtonRow`, then the (now-accordioned) `CompanyCrudControls`, then `CompanyOptionsSection`, in that order.
  - [ ] No new `timelineMap` key beyond what `AccordionContainer` already registers internally (`accordion-company.crud`).

  **Verification:**
  - [ ] `npx vitest run src/components/company/CompanyCrudControls.test.tsx` passes — every existing Create/Rename/Delete test still passes once its own setup opens the accordion first; new coverage for collapsed-by-default and toggle behavior.
  - [ ] `npx vitest run src/data/companyConfig.test.ts` — new `describe('COMPANY_CRUD_ACCORDION_SCHEMA')` block.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None. Shares `CompanyCrudControls.tsx`/`.test.tsx` with Task 4 and `companyConfig.ts`/`.test.ts` with Task 5 — land after both, sequentially, to avoid avoidable merge friction (see Architecture Decisions).

  **Files:** `src/components/company/CompanyCrudControls.tsx`, `src/components/company/CompanyCrudControls.test.tsx`, `src/data/companyConfig.ts`, `src/data/companyConfig.test.ts`

  **Estimated scope:** S (2 source files + their tests, one new schema + one wrapping change)

- [ ] **Task 7: `RobotsTab` — selection-driven sort**

  **Description:** Add `sortRobotsByCompanyFocus(robots, companyId)` as a named export in `RobotsTab.tsx` (spec §1.4) — a stable two-block partition, returning `robots` unchanged when `companyId` is `null`. Call it with `useUIStore((s) => s.selectedCompanyId)` before rendering the list.

  **Acceptance criteria:**
  - [ ] `sortRobotsByCompanyFocus(robots, null)` returns the input in original order.
  - [ ] `sortRobotsByCompanyFocus(robots, companyId)` returns every robot not in `companyId` first (original relative order preserved), that company's members last (original relative order preserved).
  - [ ] A `companyId` matching zero robots returns the input unchanged (empty members block).
  - [ ] `RobotsTab` renders `sortedRobots`, not the raw store `robots` array; `useLocaleStore`'s own `robots` array is never mutated or reordered in the store.
  - [ ] The sort reads only `selectedCompanyId` (not `allRobotsSelected`) — relying on `uiStore.ts`'s own mutual-exclusivity invariant (spec §1.5 item 1).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/RobotsTab.test.tsx` passes, with new coverage: a 4+-robot fixture across 2+ companies plus at least one Freelance robot, asserting DOM order changes correctly on `selectedCompanyId` change and reverts on `null`/`selectAllRobots()`.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/components/panels/screen/console/RobotsTab.tsx`, `src/components/panels/screen/console/RobotsTab.test.tsx`

  **Estimated scope:** S (1 component + its test, one pure function + one call-site wire-up)

### Checkpoint: Consumers wired
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Every company-representing `RadioButton` option (robot card's company picker, `CompanyButtonRow`'s own buttons) renders with its company's own color.
- [ ] `CompanyCrudControls` is collapsed by default and toggles independently of company selection.
- [ ] `RobotsTab`'s list reorders correctly on company selection and reverts on `None`/`All`.
- [ ] Manual check (not automated): `npm run dev`, open the Robots tile — visually confirm all of the above end-to-end, plus that creating several new companies never produces two with visibly the same color. Not yet run.
- [ ] Review with human before proceeding.

---

### Phase 3: Docs

- [ ] **Task 8: `docs/COMPONENT_LIBRARY.md` — document `RadioButton`'s per-option `color`**

  **Description:** Add a line to `RadioButton`'s existing contract entry documenting the new optional per-option `color` field: what it does (rest-state hint + stronger selected-state tint, via the same ambient-CSS-custom-property mechanism every other trait/identity color in the app already uses) and that it's additive/backward-compatible.

  **Acceptance criteria:**
  - [ ] `RadioButton`'s entry in `docs/COMPONENT_LIBRARY.md` mentions the optional `color` field and its visual effect.
  - [ ] No other primitive's entry in that doc is touched.

  **Verification:**
  - [ ] Manual review — spot-checked against the shipped `RadioButton.tsx`/`companyConfig.ts`.
  - [ ] `npm run build:types`, `npm run lint` clean (docs-only change).

  **Dependencies:** Tasks 1–7 (documents the final shipped shape).

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across all 8 tasks are met.
- [ ] `docs/COMPONENT_LIBRARY.md` reflects the shipped `RadioButton` contract.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `Company.color` as a required field breaks `npm run build:types` across ~10 existing test fixture files | Medium — blocks all further work until fixed, but each fix is a one-line addition | Task 2 is sequenced immediately after Task 1, before Phase 1's own checkpoint, so the break is never left standing across a checkpoint |
| `generateCompanyIdentityColor` accidentally reuses `generateRobotIdentityColor`'s own dataId or offset stream, producing correlated (non-independent) seeded colors between robots and companies | Medium — a subtle world-generation bug, not visually obvious until two seeded entities suspiciously share a color pattern | Task 1's acceptance criteria explicitly require a distinct dataId (`'company.identityColor'`) and the company's own loop index as the offset, verified by a determinism test against a real seed |
| `pickRandomCompanyColor`'s collision-avoidance loop is unbounded or silently returns a duplicate once every hue is already in use | Low — `MAX_COMPANIES` (6) is always well under the 18-hue palette today, but a future constant change could expose this | Task 4 specifies a bounded retry (`ROBOT_IDENTITY_COLOR_NAMES.length` attempts) with an explicit fallback return, and its own test exercises the boundary case directly |
| `RadioButton.tsx`'s new per-item `style` regresses the visual appearance of an existing consumer that doesn't set `color` (Audio Setting, Decay Mode, Header's nav group, …) | High if it happens — a visible UI regression across the app, not scoped to Company work | Task 3's acceptance criteria require byte-for-byte identical DOM (no inline `style` attribute at all) when `color` is omitted, and its own test suite asserts this directly rather than just testing the new `color`-present case |
| `companyConfig.ts`'s builders (Task 5) land before `Company.color`/`RadioButtonSchema.color` exist (Tasks 1/3), producing a real compile error in between if merged out of order | Low — both prerequisite tasks are small and fast | `npm run build:types` is a required verification step on every task; Task 5's own listed Dependencies make the ordering explicit and self-enforcing, same reasoning ROBOT_CARDS_REDESIGN's own risk table used for its analogous case |
| Tasks 4 and 6 (or 5 and 6) land in parallel against the same small file (`CompanyCrudControls.tsx` / `companyConfig.ts`), causing avoidable merge conflicts despite being logically independent | Low — a process annoyance, not a correctness risk | Architecture Decisions and each affected task's own Dependencies note the sharing explicitly; land sequentially rather than in parallel |

## Open Questions

Carried forward from spec §7, not blocking this plan:

1. **`Company.color` as a required field touches ~10 existing test fixture files (spec §7 item 1, this plan's Task 2).** Chosen to match `Robot.identityColor`'s own required-field precedent; flagged again here since Task 2's file count is a real, visible cost of that choice — worth Crawford's explicit sign-off before Task 2 starts, not just at spec review.
2. **No collision-avoidance for spawn-time sibling companies (spec §7 item 2, this plan's Task 1)** — accepted as low-risk given small spawn-time company counts. Two companies in the same freshly-generated locale can, rarely, share a color; every company created afterward via Task 4's path cannot.
3. **`COMPANY_CRUD_ACCORDION_SCHEMA`'s exact label text (spec §7 item 3, this plan's Task 6)** — a best guess, not confirmed with Crawford directly.
4. **Branch base — off `main` or off `layout/robot-card-cleanup` (spec §7 item 4)** — depends on that branch's merge timing relative to when implementation of this plan actually starts; not resolvable at planning time.
