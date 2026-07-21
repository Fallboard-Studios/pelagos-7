# Spec: Remove Robot Presets from Robot Meta

## Objective

Remove the "Preset" row (Select dropdown + "Load Preset" confirmation dialog + `applyPreset` logic) from the Robot Editor's Meta tab, along with every piece of code that exists only to support it.

**Why:** The preset feature reads `robotPresets` off the `Locale` object via an unchecked type cast — `Locale` (in `types/locale.ts`) has never actually declared a `robotPresets` field, and nothing anywhere in the codebase ever writes one. In practice `presets` is always `[]` and the row has only ever rendered "No presets available." This is dead UI for data that doesn't exist; removing it doesn't change any real behavior for users.

**Success looks like:** The "Preset" row is gone from Robot Meta. No dead code, dead type, or unused import remains. Every other row (Name, Age, Persist, Copy Robot, Undo) is untouched and still works.

## Scope

### In scope (edit)
| File | Action |
|---|---|
| `src/components/panels/screen/console/RobotMetaTab.tsx` | Remove the "Preset" JSX row; remove `presets`, `selectedPresetId`, `applyPreset`; remove the local `RobotPreset` type; remove the now-unused `import * as Select from '@radix-ui/react-select'`. |
| `src/components/panels/screen/console/RobotMetaTab.css` | Remove `.select-trigger` and `.select-empty` — used only by the Preset row's `Select.Trigger`/empty-state. |

### Out of scope (do not touch)
- Name, Age, Persist, Copy Robot, and Undo rows/handlers in `RobotMetaTab.tsx` — unrelated.
- `.dialog-overlay`, `.dialog-content`, `.dialog-actions`, `.btn`, `.native-select`, `.control` in `RobotMetaTab.css` — shared with the Copy Robot dialog, which stays.
- `RobotOscillatorsTab.tsx`/`.css` — has its own, unrelated `Select.*` usage and its own `.select-trigger`/`.select-content`/`.select-item` rules in a separate CSS file; not affected by removing `RobotMetaTab.css`'s copies.
- Spawn-time attribute generation/copy in `spawnSystem.ts` — unrelated "preset" comments there refer to *layered audio* presets (oscillator layer generation), a different concept entirely; do not touch.

## Verified Facts (from codebase inspection)

- `robotPresets`/`RobotPreset` appear nowhere in the repo except `RobotMetaTab.tsx` (confirmed via repo-wide grep). No store, no `Locale` field, no fixture, no other component references them.
- `Locale` (`types/locale.ts`) has no `robotPresets` field — the read at line 180 (`useLocaleStore.getState().getLocaleById(localeId) as { robotPresets?: RobotPreset[] } | undefined`) is a cast onto a property that doesn't exist on the real type, so `presets` is always `[]` at runtime.
- `Select` (`@radix-ui/react-select`) is used only by the Preset row in this file; `AlertDialog` is also used by the Copy Robot row and must stay.
- `.select-trigger` and `.select-empty` are defined in `RobotMetaTab.css` and used only by the Preset row (Copy Robot uses a plain `<select className="native-select">`, not Radix `Select`).
- `.preset-control`, `.select-content`, `.select-item` are referenced in the JSX but have no matching rule in `RobotMetaTab.css` — nothing to remove there.
- No test file exists for `RobotMetaTab.tsx` (confirmed via repo-wide search) — no test deletions required.
- `RobotEditorTab.tsx` renders `RobotMetaTab` as an opaque child; no changes needed there.

## Tech Stack

React 19, TypeScript 5.9, Zustand 5, Radix UI (`@radix-ui/react-select`, `@radix-ui/react-alert-dialog`), Vitest + Testing Library.

## Commands

```bash
npm run build:types   # tsc --noEmit
npm run lint           # ESLint
npm test               # Vitest
```

## Code Style

Match the file's existing conventions exactly — this is a subtractive change, not a rewrite. No new abstractions.

## Testing Strategy

- No existing tests target the removed code, so no test deletions are required.
- After removal, run `npm test` to confirm nothing else implicitly depended on the `RobotPreset` type or `Select` import.
- Manual check: open Robot Editor → Robot Meta for any robot — no "Preset" row appears; Name, Age, Persist, Copy Robot, and Undo (after a copy) all still work.

## Boundaries

- **Always:** Run `npm run build:types`, `npm run lint`, `npm test` before calling this done.
- **Ask first:** Anything outside `RobotMetaTab.tsx`/`RobotMetaTab.css` that turns out to reference presets (shouldn't happen per the verified facts above).
- **Never:** Touch the Copy Robot row/dialog, or `spawnSystem.ts`'s layered-audio "preset" generation — different feature, same word.

## Success Criteria

- [ ] "Preset" row removed from `RobotMetaTab.tsx`'s JSX.
- [ ] `presets`, `selectedPresetId`, `applyPreset`, and the local `RobotPreset` type removed.
- [ ] `import * as Select from '@radix-ui/react-select'` removed (now unused).
- [ ] `.select-trigger` and `.select-empty` removed from `RobotMetaTab.css`.
- [ ] `npm run build:types`, `npm run lint`, `npm test` all pass.
- [ ] Robot Meta renders correctly with Name, Age, Persist, Copy Robot, and Undo rows unchanged.
- [ ] No remaining references anywhere in `src/` to `robotPresets`, `RobotPreset`, or the Preset row's handlers (verify with a final repo-wide grep).

## Open Questions

None.
