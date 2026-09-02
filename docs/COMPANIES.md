# Companies

Source of truth: [`src/types/Company.ts`](../src/types/Company.ts), [`src/stores/localeStore.ts`](../src/stores/localeStore.ts), [`src/systems/companyOptions.ts`](../src/systems/companyOptions.ts), [`src/systems/robotOptionsActions.ts`](../src/systems/robotOptionsActions.ts), [`src/components/company/`](../src/components/company/).

**Related docs:** [ROBOT_LIFECYCLE.md](ROBOT_LIFECYCLE.md) (the fixed 12-robot roster and per-robot state this groups) · [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the seed determinism company spawn-time generation follows) · [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) (the `Select` primitive this phase added) · [SESSION_STORAGE.md](SESSION_STORAGE.md) (Phase 12 — will persist Companies the same way it persists Robot Options overrides) · [roadmap/roadmap.md](roadmap/roadmap.md) § 10 (Companies), § 8 (Robot Selection, the list view this extends), § 9 (Robot Options, the drawers this reuses)

## What a Company Is

A Company is a user-managed, named group of robots within one locale. Its only job is to let every editable Robot Options field be edited across all of its member robots at once instead of one robot at a time. A robot belongs to at most one Company; a robot with no `companyId` is **Freelance** — the implicit default, not a distinct flag or a member of some hidden "no company" company.

```ts
// src/types/Company.ts
interface Company {
  id: string;
  name: string;
  robotIds: string[];
  lastEditedOptions?: CompanyOptionsSnapshot;
}
```

`CompanyOptionsSnapshot` mirrors every editable field the four Robot Options sections expose — Audio Setting, Volume + its LFO, and the full contents of the Ping Controls, Ping Contour, and Signature Array drawers. It deliberately excludes the read-only Display rows (Name/Job/Battery/Docking) and the Reset Melody action, neither of which has a company-scoped meaning. Every field on it is optional — see "The Snapshot Merge" below for why. This includes `clickTrackActive` — Ping Controls' Click Track testing toggle (see [MELODY_SYSTEM.md](MELODY_SYSTEM.md)'s Click Track note) — which, unlike Reset Melody, *does* have a company-scoped meaning (broadcasting it puts every member's playback into click-track mode at once) even though its own control only ever renders behind `DEV_TUNING`.

## Spawn-Time Generation

Companies are seeded once per locale, the same deterministic way the rest of a fresh locale is — no `crypto.randomUUID()`, no `Math.random()` outside the noise-map/seed utilities [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) documents. `spawnInitialCompanies` (`src/systems/spawnSystem.ts`) — a separate function from `spawnInitialRoster`, called immediately after it from `worldTransition.ts`'s `initializeLocale`, inside the same `locale.robots.length === 0` guard — generates 2-3 companies (`INITIAL_COMPANIES_MIN`/`_MAX`), each claiming a seeded 3-4 robots (`COMPANY_SIZE_MIN`/`_MAX`; disjoint, drawn from the 12-robot roster via a shrinking sample pool so no robot is ever claimed twice), each given a generated name via `generateCompanyName` (Adjective + Noun, the same mechanism `generateRobotName` uses, paired with a distinct `COMPANY_NOUNS` list so a company can never generate the exact word-pair a robot name can). A locale loads with a meaningful chunk of its roster already grouped — and a meaningful chunk left Freelance — before a user touches anything. `MAX_COMPANIES` (`= 6`, `src/constants/index.ts`) is a separate ceiling on top of this, capping how many companies can exist at once (spawn-generated plus anything created by hand afterward via `CompanyCrudControls`) — it's never read by spawn generation itself.

Because `spawnInitialCompanies` hooks into the exact same guard `spawnInitialRoster` does, Companies inherit `worldTransition.ts`'s existing retransmit semantics for free, with no company-specific branching: a coordinates-changing retransmit builds a genuinely new, empty locale (robots *and* companies regenerate fresh), while an Attenuation-Style-only retransmit re-parents the *existing* locale untouched (robots *and* companies both survive unchanged). Nothing about a company — membership, name, its settings snapshot — is meant to survive a coordinates reseed; this is deliberate, matching how nothing else in the locale survives one either, and reading as part of the same "new world" event lore-wise.

## Selection & Highlighting

`uiStore.ts` tracks `selectedCompanyId: string | null`, independent of the existing `selectedRobotId` — selecting one never touches the other. Selecting a company:

- Highlights each member robot's card in the robot list (`RobotsTab`).
- Glows each member robot in the world view — `Robot.tsx`'s `isCompanyMember` (`robot.companyId === selectedCompanyId && selectedCompanyId !== null`) reuses the exact same `.robot.selected` CSS declaration single-robot selection already defines (`OceanScene.css`), not a second visual language. `isCompanyMember` and `isSelected` are independent and can both apply to the same robot at once.
- Populates `CompanyOptionsSection` (see below) from that company's state.

Selecting "None" (the default) — or deleting the currently-selected company, or a selected company dropping to zero members — all return the panel to its disabled, valueless state.

## The Company Manager

`RobotsTab` renders `CompanyManager` (`src/components/company/CompanyManager.tsx`) beneath the existing robot card list — pure composition of three components, in this order:

1. **`CompanyButtonRow`** — one button per company plus "None." Reuses the `RadioButton` primitive (an options-list "one active among many" control RadioButton already implements, including active-state styling) rather than a bespoke button list.
2. **`CompanyCrudControls`** — Create (a locally-staged name draft pre-filled by a fresh `generateCompanyName` suggestion, fed by `Math.random()` rather than a seeded noise map since it's a live UI convenience roll, not replayable world generation; disabled at `MAX_COMPANIES`), Rename (a `TextInput` bound live to the selected company's name, disabled with none selected), and Delete (disabled with none selected).
3. **`CompanyOptionsSection`** — the bulk-edit panel: `AudioSettingSection` (extracted from `RobotDisplaySection` — Audio Setting + Volume + its LFO, *not* the read-only Name/Job/Battery/Docking rows, which have no company-scoped meaning), `PingControlsDrawer`, `PingContourDrawer`, and `SignatureArrayDrawer` — the exact same four presentational sections `RobotOptionsTab` (single-robot editing) renders, each refactored to a `value`/`onChange`/`disabled` contract with no `robot` prop and no store access of its own.

With "None" selected, or a selected company with zero members, every section in `CompanyOptionsSection` renders `disabled` with a placeholder value (structurally complete — e.g. 3 signature-array layer slots, not an empty array — so the panel's layout doesn't jump when a company is selected). With a non-empty company selected, each section's value comes from `resolveCompanyOptions` (see below).

## The Snapshot Merge

`resolveCompanyOptions(company, firstMember)` (`src/systems/companyOptions.ts`) is what makes "revert to the last state it was in when last editing, or the first robot's options if unused" true without a special-cased first-edit branch:

```ts
return { ...fromFirstMember, ...company.lastEditedOptions };
```

Every field the company has never been edited for falls back live to `firstMember`'s (the company's first member robot's) *current* value — not a value frozen at whenever the company was first selected. A field the company *has* been edited for reads from its own recorded `lastEditedOptions` instead, regardless of what the first member has since drifted to individually. Re-selecting a company after switching away and back always shows exactly what was last dialed in for it, field by field — this is a deliberate simplification over literally cloning every field into `lastEditedOptions` at first-edit time (functionally identical from the user's perspective; see `docs/specs/COMPANIES.md` §7.1 for the reasoning), and it's why `CompanyOptionsSnapshot`'s fields are all optional rather than a fully-populated snapshot.

## Editing Semantics: Broadcast, Not Link

A company-scoped edit is a one-time broadcast, not a live binding. Changing a field in `CompanyOptionsSection` calls the matching function from `src/systems/robotOptionsActions.ts` — `applyAudioMode`, `applyVolume`, `applyVolumeLfo`, `applyDensity`, `applyMotifLength`, `applyNoteVariance`, `applyOctaveMin`, `applyOctaveMax`, `applyClickTrackActive`, `applyAdsr`, `applyLayersContinuous`, `applyLayersStructural`, `applyLayerLfo` — once per current member robot. These are the exact same functions `RobotOptionsTab` calls once for a single robot; nothing about what an edit *does* differs between the two call sites, only how many robots it's called for. Skipping the matching `AudioEngine`/`lfoEngine`/`regenerateMelody` call a company-wide edit would otherwise miss would reproduce the exact stale-cache bug Roadmap Phase 9's post-launch fixes already found and fixed for the single-robot case.

Only the one field that was changed propagates into `lastEditedOptions` — never the company's entire resolved snapshot. A user editing a single member robot's value afterward (even from that robot's own Robot Options screen) changes only that robot; the company's `lastEditedOptions` and every other member robot are untouched. There is no ongoing link between a robot and its company's settings after the broadcast — reassigning a robot to a different company, or leaving it in the same one, doesn't retroactively apply anything.

The same "only the one changed thing" rule applies one level deeper for compound fields (`volumeLfo`, `rhythmicMotifLength`, `noteVariance`, `adsr`, `layers`, per-layer `lfoSettings`) — dragging Ping Contour's Attack slider, for instance, must not overwrite every member's own Decay/Sustain/Release with the panel's shared baseline. Every compound drawer (`Lfo`, `PingContourDrawer`, `StepperWithToggle`, `SignatureArrayDrawer`) always emits a *whole* replacement value built by spreading its `value` prop — which is `CompanyOptionsSection`'s resolved baseline, not any individual member's own state — with just the touched sub-field set. `CompanyOptionsSection` diffs the old vs. new value (`diffCompoundField`/`diffLayerField`, `src/systems/companyOptions.ts`) to isolate that single sub-field, then merges just it onto each member's own current value (via `resolveCompanyOptions(undefined, member)`, or the member's own `lfoSettings` entry) before calling the matching `applyXxx` — so a member's own untouched sub-fields survive a broadcast intact, even when they differ from the panel's baseline.

## Company Membership

Reassignment happens through a `Select` dropdown (the Design System's 14th primitive — see [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md), added specifically to support this) shown in two places, both calling the same `localeStore.assignRobotToCompany(localeId, robotId, companyId | null)`:

- `RobotSelectionCard` (the list view)
- `RobotDisplaySection` (Robot Options, Phase 9)

The dropdown lists every company by name plus "Freelance" (`FREELANCE_VALUE`, a non-empty sentinel — Radix `Select.Item` rejects an empty string). `assignRobotToCompany` is one atomic store transition: it updates the robot's own `companyId` and both the old and new company's `robotIds` together, including the case where old and new are the same company (a genuine bug found in code review before merge — re-selecting the currently-assigned company must remove-then-re-add the robot from `robotIds`, not just remove it; see `localeStore.test.ts`'s regression coverage). Deleting a company (`removeCompany`) clears `companyId` on every member robot first — every robot in a deleted company becomes Freelance, mirroring `removeLocale`'s existing per-robot cleanup-before-removal pattern.

`RobotSelectionCard`'s company row wraps its `Select` in a `stopPropagation` handler, not a DOM `closest()` check — the card itself is a clickable `role="button"` `<li>`, and React re-propagates a Radix `Select` dropdown's portaled events along the *component* tree, not the DOM tree, so a DOM-containment guard would miss clicks on the dropdown's options specifically (they render outside the card's DOM subtree via a portal) even though it would correctly catch clicks on the trigger.

## Forbidden Patterns

- Don't apply a company-wide edit by writing directly to `Locale.robots` in bulk — go through the matching `robotOptionsActions.ts` function per member, so every accompanying `AudioEngine`/`lfoEngine`/`regenerateMelody` call happens too.
- Don't make company membership a live-linked override — a company edit broadcasts once; it never re-applies later, and a subsequent single-robot edit is never overwritten by anything company-related.
- Don't generate company count, size, membership, or names with `crypto.randomUUID()` or bare `Math.random()` — seed everything through `getSeededVal`/the locale noise map, per [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md). (`CompanyCrudControls`' Create-suggestion and its `crypto.randomUUID()` company ID are the one deliberate exception — a live, user-triggered action has no seed to derive from in the first place, unlike spawn-time generation.)
- Don't reuse `selectedRobotId` for company selection, and don't skip `isCompanyMember` in favor of forcing `isSelected` for every member robot — the two selection states are independent and must stay that way.
- Don't carry companies across a coordinates-changing Sector Settings reseed (e.g. diffing old vs. new membership, trying to preserve a renamed company) — that kind of reseed regenerates Companies fresh, deliberately, same as the rest of the roster. An Attenuation-Style-only reseed already preserves everything, companies included, with no company-specific code needed for that case either.
- Don't filter derived arrays (like a company's member robots) *inside* a Zustand selector callback (`useLocaleStore(s => robots.filter(...))`) — it returns a new array reference every call, which `useSyncExternalStore` reads as "always changed," causing an infinite re-render loop. Subscribe to the raw array and filter outside the selector instead (see `CompanyOptionsSection.tsx`).
