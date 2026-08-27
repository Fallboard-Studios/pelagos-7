# Companies

**Status: design doc for [Roadmap Phase 10](roadmap/roadmap.md) — not yet implemented.** Nothing in this file describes current app behavior; there is no `Company` type, no `Locale.companies`, and no `Robot.companyId` anywhere in `src/` today. Update this banner and fold this content into an implementation-sourced version once `Company`/`CompanyOptionsSnapshot`, the `localeStore.ts` company actions, and `CompanyOptionsPanel` land.

**Related docs:** [ROBOT_LIFECYCLE.md](ROBOT_LIFECYCLE.md) (the fixed 12-robot roster and per-robot state this groups) · [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the seed determinism company spawn-time generation follows) · [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) (the `Select` primitive this phase adds) · [SESSION_STORAGE.md](SESSION_STORAGE.md) (Phase 12 — will persist Companies the same way it persists Robot Options overrides) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 8 (Robot Selection, the list view this extends), Phase 9 (Robot Options, the drawers this reuses), Phase 10 (this phase)

## What a Company Is

A Company is a user-managed, named group of robots within one locale. Its only job is to let every Robot Options field be edited across all of its member robots at once instead of one robot at a time. A robot belongs to at most one Company; a robot with no `companyId` is **Freelance** — the implicit default, not a distinct flag or a member of some hidden "no company" company.

```ts
interface Company {
  id: string;
  name: string;
  robotIds: string[];
  lastEditedOptions?: CompanyOptionsSnapshot;
}
```

`CompanyOptionsSnapshot` mirrors every editable field the four Robot Options sections expose — Audio Setting, Volume + its LFO, and the full contents of the Ping Controls, Ping Contour, and Signature Array drawers. It deliberately excludes the read-only Display rows (Name/Job/Battery/Docking) and the Reset Melody action, neither of which has a company-scoped meaning.

## Spawn-Time Generation

Companies are seeded once per locale, the same deterministic way the rest of a fresh locale is — no `crypto.randomUUID()`, no `Math.random()` outside the noise-map/seed utilities [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) documents. `spawnInitialRoster` (`src/systems/spawnSystem.ts`) generates 2-3 companies, each with a seeded 3-4 robots (disjoint, drawn from the 12-robot roster), each given a generated Adjective+Noun name (the same word-list pattern `generateRobotName` already uses). A locale can load with a meaningful chunk of its roster already grouped — and a meaningful chunk left Freelance — before a user touches anything. `MAX_COMPANIES` (`= 6`, `src/constants/index.ts`) is a separate ceiling on top of this, capping how many companies can exist at once (spawn-generated plus anything created by hand afterward), not the spawn target itself.

Retransmitting a new seed/coordinates in Sector Settings regenerates Companies fresh, the same way it already regenerates the entire robot roster — this is deliberate, not an oversight: nothing about a company (membership, name, its settings snapshot) is meant to survive a reseed, matching how nothing else in the locale does either, and reading as part of the same "new world" event lore-wise.

## Selection & Highlighting

`uiStore.ts` tracks `selectedCompanyId: string | null`, independent of the existing `selectedRobotId`. Selecting a company:

- Highlights each member robot's card in the robot list (`RobotsTab`).
- Glows each member robot in the world view, reusing the same visual `Robot.tsx`'s `.robot.selected` class already defines for single-robot selection — a second `isCompanyMember` CSS hook, not a second visual language.
- Populates the `CompanyOptionsPanel` (see below) from that company's state.

Selecting "None" (the default) or deleting the currently-selected company both return the panel to its disabled, valueless state and clear `selectedCompanyId`.

## The Company Options Panel

`RobotsTab` renders a `CompanyOptionsPanel` beneath the existing robot card list: a button row (one button per company, capped at `MAX_COMPANIES`, plus "None"), CRUD controls (Create/Rename/Delete — Create pre-fills a `TextInput` with a generated name the user can accept as-is or edit before confirming), and then the same `RobotDisplaySection`/`PingControlsDrawer`/`PingContourDrawer`/`SignatureArrayDrawer` primitives Robot Options (Phase 9) already built.

- **"None" selected:** every control renders `disabled`, bound to no value.
- **A company selected:** every control binds to that company's `lastEditedOptions`. The first time a company is ever edited, `lastEditedOptions` is seeded from its first member robot's current values; every field edit after that updates `lastEditedOptions` field-by-field, so re-selecting the company later — even after selecting a different company or "None" in between — picks the panel back up exactly where the last edit left it, not back at robot[0]'s live values.

## Editing Semantics: Broadcast, Not Link

A company-scoped edit is a one-time broadcast, not a live binding. Changing a field in the `CompanyOptionsPanel` writes that one field to **every current member robot**, through exactly the same call path the single-robot drawers already use — `updateRobot` plus whatever live `AudioEngine`/`lfoEngine`/`regenerateMelody` call already accompanies that field in `RobotDisplaySection`/`PingControlsDrawer`/`PingContourDrawer`/`SignatureArrayDrawer`. Those handlers are extracted into shared pure functions so both call sites (single-robot drawer, company panel's per-member loop) stay identical — skipping the matching engine call for a company-wide edit would reproduce the exact stale-cache bug Phase 9's post-launch fixes already found and fixed for the single-robot case (see roadmap Phase 9's "Post-launch fixes" note).

Only the one field that was changed propagates — not the company's entire snapshot. A user editing a single member robot's value afterward changes only that robot; the company's `lastEditedOptions` and the other member robots are untouched. There is no ongoing link between a robot and its company's settings after the broadcast — reassigning a robot to a different company, or leaving it in the same one, doesn't retroactively apply anything.

## Company Membership

Reassignment happens through a `Select` dropdown (Company grouping is what motivates this phase adding `Select` as the Design System's 14th primitive — see [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md)) shown in two places, both driving the same `localeStore.ts` actions:

- `RobotSelectionCard` (the list view)
- `RobotDisplaySection` (Robot Options, Phase 9)

The dropdown lists every company by name plus "Freelance." Selecting a company updates the robot's `companyId` and moves its ID between the old and new company's `robotIds`. Deleting a company (`removeCompany`) clears `companyId` on every member robot first — every robot in a deleted company becomes Freelance, mirroring `removeLocale`'s existing per-robot cleanup-before-removal pattern.

## Forbidden Patterns

- Don't apply a company-wide edit by writing directly to `Locale.robots` in bulk — go through the same shared per-field functions the single-robot drawers use, so every accompanying `AudioEngine`/`lfoEngine`/`regenerateMelody` call happens too.
- Don't make company membership a live-linked override — a company edit broadcasts once; it never re-applies later, and a subsequent single-robot edit is never overwritten by anything company-related.
- Don't generate company count, names, or membership with `crypto.randomUUID()` or bare `Math.random()` — seed everything through `getSeededVal`/the locale noise map, per [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md).
- Don't reuse `selectedRobotId` for company selection, and don't skip `isCompanyMember` in favor of forcing `isSelected` for every member robot — the two selection states are independent and must stay that way.
- Don't carry companies across a Sector Settings reseed (e.g. diffing old vs. new membership, trying to preserve a renamed company) — a reseed regenerates Companies fresh, deliberately, same as the rest of the roster.
