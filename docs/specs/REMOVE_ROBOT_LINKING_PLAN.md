# Implementation Plan: Remove Post-Spawn Robot Linking

Spec: [REMOVE_ROBOT_LINKING.md](./REMOVE_ROBOT_LINKING.md)

## Overview

Delete the "Link to Robot" feature (UI row, propagation subscriber, store actions, and the `linkedRobotId` field) without touching spawn-time copy/inherit or the unrelated Copy Robot / Preset rows. This is a pure deletion — there's no new code to design, so the plan is entirely about **sequencing the removal so the codebase compiles and lints clean after every task**, rather than the usual bottom-up dependency build order.

## Architecture Decisions

- **Order is inverted from a normal build:** for a deletion, callers must be removed *before* the things they call, not after. Task order is UI/consumers → store actions/interface → the `linkedRobotId` field itself, so `npm run build:types` stays green at every checkpoint.
- **The `linkedRobotId` field removal is bundled with its two remaining producers/consumers** (`spawnSystem.ts`'s initializer and `localeStore.ts`'s `removeRobot` cleanup) into a single task. Removing the field from `types/Robot.ts` alone would break both call sites immediately (TS "unknown property" / property-doesn't-exist errors), so they must land together.
- No task touches more than 3 files; each is independently verifiable via `npm run build:types` and `npm run lint`.

## Task List

### Phase 1: Remove the UI surface

- [ ] **Task 1: Remove the "Link To Robot" row from Robot Meta**
  - **Description:** Delete the link UI row and every piece of state/logic that exists only to back it, from `RobotMetaTab.tsx`. Leave Copy Robot, Presets, Name, Age, and Persist rows untouched.
  - **Acceptance criteria:**
    - [ ] `linkTarget` state, its reset `useEffect`, `linkableRobots`, `currentParent`, `linkToRobot`, `unlinkRobot`, and the `hasCycle` import are all removed from `RobotMetaTab.tsx`.
    - [ ] The "Link To Robot" JSX row is removed; no other row's markup or behavior changes.
    - [ ] `.link-control` and `.link-indicator` rules removed from `RobotMetaTab.css`.
  - **Verification:**
    - [ ] `npm run build:types` passes
    - [ ] `npm run lint` passes (catches the now-unused `hasCycle` import if missed)
    - [ ] Manual: open Robot Editor → Robot Meta tab for any robot — no "Link To Robot" row appears; Copy Robot and Preset rows still work.
  - **Dependencies:** None
  - **Files likely touched:**
    - `src/components/panels/screen/console/RobotMetaTab.tsx`
    - `src/components/panels/screen/console/RobotMetaTab.css`
  - **Estimated scope:** Small (2 files)

### Checkpoint: UI removed
- [ ] `build:types` and `lint` clean
- [ ] Robot Meta tab renders with no link UI; Copy Robot / Presets still functional
- [ ] `localeStore.linkRobot`/`unlinkRobot`/`hasCycle` still exist but are now unused by any component (confirmed by a quick grep) — expected at this point, cleaned up in Phase 2

### Phase 2: Remove the propagation subscriber and store surface

- [ ] **Task 2: Delete `linkPropagationSystem.ts` and its wiring**
  - **Description:** Delete the file outright and remove its init/teardown from the app lifecycle.
  - **Acceptance criteria:**
    - [ ] `src/systems/linkPropagationSystem.ts` no longer exists.
    - [ ] `App.tsx` no longer imports `initLinkPropagation`/`teardownLinkPropagation` or calls them in its effect.
  - **Verification:**
    - [ ] `npm run build:types` passes
    - [ ] `npm run lint` passes
    - [ ] `npm test` passes (no test imports the deleted module)
  - **Dependencies:** None (independent of Task 1, but sequenced after it for a clean single-purpose diff)
  - **Files likely touched:**
    - `src/systems/linkPropagationSystem.ts` (deleted)
    - `src/App.tsx`
  - **Estimated scope:** Small (2 files)

- [ ] **Task 3: Remove `linkRobot`/`unlinkRobot`/`hasCycle` from the store**
  - **Description:** Now that no component or system calls these, remove them from the store implementation and its interface.
  - **Acceptance criteria:**
    - [ ] `hasCycle`, `linkRobot`, `unlinkRobot` removed from `src/stores/localeStore.ts`.
    - [ ] `linkRobot`/`unlinkRobot` removed from the `LocaleState` interface in `src/types/locale.ts`.
    - [ ] `removeRobot` in `localeStore.ts` is untouched for now (still references `linkedRobotId` — that's Task 4).
  - **Verification:**
    - [ ] `npm run build:types` passes
    - [ ] `npm run lint` passes
    - [ ] `npm test` passes
  - **Dependencies:** Task 1 (must not remove actions a component still calls)
  - **Files likely touched:**
    - `src/stores/localeStore.ts`
    - `src/types/locale.ts`
  - **Estimated scope:** Small (2 files)

### Checkpoint: Store surface clean
- [ ] `build:types`, `lint`, and `test` all clean
- [ ] Repo-wide grep for `linkRobot|unlinkRobot|hasCycle|linkPropagation` returns no hits under `src/` outside of `localeStore.ts`'s `removeRobot` and `Robot.ts`'s field declaration (the two remaining spots, handled next)

### Phase 3: Remove the `linkedRobotId` field

- [ ] **Task 4: Remove `linkedRobotId` from the Robot type and its two remaining touch points**
  - **Description:** Remove the field and, in the same change, remove the two places that still read/write it — `spawnSystem.ts`'s initializer and `localeStore.ts`'s `removeRobot` child-cleanup — since removing the field alone would break both immediately.
  - **Acceptance criteria:**
    - [ ] `linkedRobotId?: string | null;` removed from `src/types/Robot.ts`.
    - [ ] `linkedRobotId: null,` removed from the new-robot object literal in `src/systems/spawnSystem.ts`.
    - [ ] `removeRobot` in `src/stores/localeStore.ts` no longer maps over robots clearing `linkedRobotId` — it just filters out the removed robot.
  - **Verification:**
    - [ ] `npm run build:types` passes
    - [ ] `npm run lint` passes
    - [ ] `npm test` passes, including `spawnSystem.test.ts` (confirms spawn-time copy/inherit is unaffected)
  - **Dependencies:** Task 3
  - **Files likely touched:**
    - `src/types/Robot.ts`
    - `src/systems/spawnSystem.ts`
    - `src/stores/localeStore.ts`
  - **Estimated scope:** Small (3 files)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test` all pass
- [ ] Repo-wide grep for `linkedRobotId|linkRobot|unlinkRobot|hasCycle|linkPropagation` returns **zero** results under `src/`
- [ ] Manual smoke test: spawn several robots in a locale (or let the scheduler run) and confirm the occasional copied-personality robot still appears — spawn-time copy/inherit is unaffected
- [ ] All spec Success Criteria checked off

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing a stray reference to `linkedRobotId`/link actions outside `src/` (e.g. in a fixture or story file) | Low — would surface as a build/lint failure | Final repo-wide grep at the Task 4 checkpoint before calling this done |
| Removing store actions before their last caller is gone, causing a transient build break mid-session | Low — purely a sequencing mistake | Task order enforces UI-first, store-second, field-last; each task ends with `build:types` |

## Open Questions

None — this plan implements the spec as approved with no new decisions required.
