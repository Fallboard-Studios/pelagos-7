# Spec: Remove Post-Spawn Robot Linking

## Objective

Remove the manual "Link to Robot" ability from the Robot Editor's Meta tab, along with every piece of code that exists solely to support it. Spawn-time attribute copy/inherit (the ~30% seeded chance for a newly spawned robot to inherit an existing robot's audio personality) is a **separate system and is explicitly out of scope** — it must continue to work unchanged.

**Why:** Post-spawn linking (parent → child inheritance that live-propagates edits) has no test coverage, no docs coverage, and adds a standing subscriber (`linkPropagationSystem`) plus store surface area (`linkRobot`/`unlinkRobot`/`hasCycle`/`linkedRobotId`) for a feature the product no longer wants. Removing it reduces state shape and eliminates a live Zustand-subscription side-effect path.

**Success looks like:** The "Link To Robot" row is gone from Robot Meta. No dead code, dead state field, or dead store actions remain. Spawn-time copy (`shouldCopy` path in `spawnSystem.ts`) is untouched and still passes its existing tests.

## Scope

### In scope (delete/edit)
| File | Action |
|---|---|
| `src/systems/linkPropagationSystem.ts` | **Delete file.** Its only purpose is propagating parent→child changes over `linkedRobotId`. |
| `src/App.tsx` | Remove `initLinkPropagation`/`teardownLinkPropagation` import and the two calls in the effect. |
| `src/components/panels/screen/console/RobotMetaTab.tsx` | Remove the "Link To Robot" row and all its backing code: `linkTarget` state + reset effect, `linkableRobots`, `currentParent`, `linkToRobot`, `unlinkRobot`, the `hasCycle` import. |
| `src/components/panels/screen/console/RobotMetaTab.css` | Remove `.link-control` and `.link-indicator` rules (used only by the removed row). |
| `src/stores/localeStore.ts` | Remove `hasCycle`, `linkRobot`, `unlinkRobot`. Simplify `removeRobot` to no longer scan for/clear children's `linkedRobotId` (field is gone — see below). |
| `src/types/locale.ts` | Remove `linkRobot` and `unlinkRobot` from the `LocaleState` interface. |
| `src/types/Robot.ts` | Remove the `linkedRobotId?: string | null;` field. |
| `src/systems/spawnSystem.ts` | Remove the `linkedRobotId: null,` initializer in the new-robot object. |

### Out of scope (do not touch)
- `spawnSystem.ts`'s `shouldCopy` / copy-on-spawn logic (lines ~343–395) — this is the "copy/inherit at initial spawn" behavior the user is keeping.
- `RobotMetaTab.tsx`'s "Copy Robot" row (`copyTarget`, `performCopyFromTarget`, `undoCopy`) — a different, unrelated manual copy action; stays as-is.
- Robot presets (`applyPreset`) — unrelated.

## Verified Facts (from codebase inspection)

- `linkedRobotId` is set/read only by: `linkRobot`/`unlinkRobot`/`hasCycle` (localeStore.ts), `linkPropagationSystem.ts`, the `linkedRobotId: null` initializer in `spawnSystem.ts`, and the child-cleanup line in `removeRobot`. No other file references it.
- No test files reference `linkRobot`, `unlinkRobot`, `hasCycle`, `linkedRobotId`, or `linkPropagationSystem` (confirmed via repo-wide search of `src/**/*.{test,spec}.{ts,tsx}`).
- No file under `docs/` mentions linking — no reference-doc updates required.
- `RobotEditorTab.tsx` and `RobotEditorTab.css` (the parent tab container) contain no link-specific code — no changes needed there.
- `RobotList.tsx` / `ConsoleNavigation.tsx` matched only on unrelated "editor tab" navigation text — no changes needed there.

## Tech Stack

React 19, TypeScript 5.9, Zustand 5, Radix UI (`@radix-ui/react-select`, `@radix-ui/react-alert-dialog`), Vitest + Testing Library.

## Commands

```bash
npm test              # Vitest
npm run lint          # ESLint
npm run build:types   # tsc --noEmit
```

## Code Style

Follow existing patterns in the touched files exactly (they're already idiomatic for this repo): Zustand actions via `set`/`get`, `Partial<Robot>` update objects, `AudioEngine` re-sync wrapped in `try/catch` with `DEV_TUNING`-gated logging.

## Testing Strategy

- No existing tests target the removed code, so no test deletions are required.
- After removal, run the full suite (`npm test`) to confirm nothing outside the removed surface implicitly depended on `linkedRobotId` (e.g. serialization round-trips, snapshot tests).
- Manually verify in-browser: Robot Meta tab renders without a "Link To Robot" row for any selected robot; Copy Robot and Presets rows still work; spawning still produces the occasional copied-personality robot (visually/audibly similar to an existing one).

## Boundaries

- **Always:** Run `npm test`, `npm run lint`, `npm run build:types` before calling this done. Keep the diff limited to the files listed in Scope.
- **Ask first:** Anything not listed above that turns out to reference `linkedRobotId` or the link actions once removal is underway (shouldn't happen per the verified-facts search, but if grep turns up a surprise, stop and confirm before deleting it).
- **Never:** Touch the spawn-time copy/inherit logic or its tests (`spawnSystem.test.ts`'s copy-chance coverage) — that system stays exactly as-is.

## Success Criteria

- [ ] `src/systems/linkPropagationSystem.ts` deleted.
- [ ] `App.tsx` no longer imports or calls `initLinkPropagation`/`teardownLinkPropagation`.
- [ ] "Link To Robot" row and all its handlers/state removed from `RobotMetaTab.tsx`; `hasCycle` import removed.
- [ ] `.link-control`/`.link-indicator` CSS rules removed from `RobotMetaTab.css`.
- [ ] `linkRobot`, `unlinkRobot`, `hasCycle` removed from `localeStore.ts`; `removeRobot` no longer references `linkedRobotId`.
- [ ] `linkRobot`/`unlinkRobot` removed from the `LocaleState` interface in `types/locale.ts`.
- [ ] `linkedRobotId` field removed from `types/Robot.ts`.
- [ ] `linkedRobotId: null` initializer removed from `spawnSystem.ts`'s new-robot object.
- [ ] `npm run build:types`, `npm run lint`, and `npm test` all pass.
- [ ] Spawn-time copy/inherit (30% seeded chance) still functions, unchanged.
- [ ] No remaining references anywhere in `src/` to `linkedRobotId`, `linkRobot`, `unlinkRobot`, `hasCycle`, or `linkPropagationSystem` (verify with a final repo-wide grep).

## Open Questions

None — both scoping questions (delete `linkPropagationSystem.ts` entirely; remove `linkedRobotId` from the `Robot` type entirely) were confirmed with the user before writing this spec.
