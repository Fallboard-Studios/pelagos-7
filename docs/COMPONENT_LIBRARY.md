# Component Library

Roadmap Phase 1 (Architecture & Components). Source spec: [docs/specs/ARCHITECTURE_AND_COMPONENTS.md](specs/ARCHITECTURE_AND_COMPONENTS.md). Source task plan: [docs/tasks/ARCHITECTURE_AND_COMPONENTS_PLAN.md](tasks/ARCHITECTURE_AND_COMPONENTS_PLAN.md). Field data: [docs/reference/ROBOT_DATA_GRID.md](reference/ROBOT_DATA_GRID.md).

This is the type-safe Design System every later drawer phase (Audio Rig, Sector Settings, Robot Options) builds on. It ships with **zero domain wiring** — every component takes its content and behavior solely through a `ControlSchema` prop plus a controlled `value`/`onChange` pair. No real domain config file (`audioRigConfig.ts`, `robotOptionsConfig.ts`, `sectorSettingsConfig.ts`, ...) exists yet; those belong to Phases 4/5/9.

## The `ControlSchema` contract

`src/types/controls.ts` defines `ControlSchema` as a discriminated union — one interface per primitive below, each extending a shared base:

```typescript
interface ControlSchemaBase {
  id: string;
  loreLabel?: string;   // both optional — a schema entry may supply neither, either, or both
  humanLabel?: string;
}
```

`CONTROL_SCHEMA_TYPES` is a `readonly` array of all 14 discriminant strings, mirroring `src/types/lfo.ts`'s `LFO_SHAPES`/`ROBOT_LFO_TARGET_IDS` pattern — it makes "all 14 variants covered, no duplicates" a runtime-testable assertion (`src/types/controls.test.ts`), not just a compile-time property. `select` (`Select`) was added in Roadmap Phase 10 (Companies), the first addition to this inventory since this phase shipped it at 13.

`LfoValue` (`LfoSettings & { active: boolean }`) is the `Lfo` component's controlled value — a type-only reuse of the real Phase 0 engine type (`src/types/lfo.ts`), with no import of `src/engine/lfoEngine.ts` or any `Tone` object.

## The `DualLabel` composition rule

**Every primitive composes `DualLabel` internally for its own label rendering** — `Stepper`, `SliderLinear`, `RadioButton`, `AccordionContainer`, and every other control below render their `loreLabel`/`humanLabel` through an internally-rendered `<DualLabel />`, reading those fields off their *own* schema entry. There is no separate `DualLabelSchema` entry paired alongside a control's schema — one schema entry supplies both the control's bounds/options and its label pair. The standalone `type: 'dualLabel'` variant exists only for pure display-only rows with no other control (Robot Name, Job Data, Battery Data, Docked Status). `DualLabel` itself renders whichever subset of the pair is present — neither (renders nothing), one, or both.

## Accessible names always resolve to something

Because `loreLabel`/`humanLabel` are both optional (`ControlSchemaBase`, exported from `src/types/controls.ts`), a schema entry can supply neither. Every interactive primitive computes its `aria-label` through `src/components/ui/controls/accessibleName.ts`'s `resolveAccessibleName(schema: ControlSchemaBase)`, which prefers `humanLabel`, falls back to `loreLabel`, and — if both are absent — falls back to `schema.id` (the one field every schema is guaranteed to have). This guarantees no control is ever left with an empty computed accessible name (WCAG 4.1.2), even though `schema.id` alone isn't a great human-facing label. Used by `Button`, `Toggle`, `TextInput`, `RadioButton`, `SliderLinear`, `SliderLog`, `SliderCenteredZero`, and `Stepper` (the last via its own `Increment {name}` / `Decrement {name}` template).

## The `isActive` CSS hook

`Toggle`, `StepperWithToggle`, `Lfo`, and `AccordionContainer` each add a plain `isActive` class to their own root element whenever their represented state is "on" (`Toggle`/`StepperWithToggle`/`Lfo`: their `active` value is `true`; `AccordionContainer`: currently expanded) — alongside whatever `data-state` Radix already sets internally on its own primitive. This exists so a consumer can write a plain compound selector instead of an attribute `:has()` query. All four share one implementation, `src/components/ui/controls/activeClass.ts`'s `withActiveClass(base, active)`:

```css
.sc-toggle.isActive { }
.sc-stepper-toggle.isActive { }
.sc-lfo.isActive { }
.sc-accordion.isActive { }
```

## Primitives

All 14 live in `src/components/ui/controls/`. Naming: PascalCase files, CSS class prefix `sc-` (schema control) to avoid collisions with the existing `rat-`/`rocker-` prefixes.

| Component | `ControlSchema` variant | Props | `ROBOT_DATA_GRID.md` row(s) |
|---|---|---|---|
| `DualLabel` | `DualLabelSchema` (standalone) or composed inside every other primitive | `{ loreLabel?: string; humanLabel?: string }` | Robot Name, Job Data, Battery Data, Docked Status |
| `Button` | `ButtonSchema` | `{ schema: ButtonSchema; onClick: () => void }` | Reset Melody |
| `Toggle` | `ToggleSchema` | `{ schema: ToggleSchema; value: boolean; onChange: (value: boolean) => void }` | Layer 2/3 Active, LFO Active |
| `TextInput` | `TextInputSchema` | `{ schema: TextInputSchema; value: string; onChange: (value: string) => void; numeric?: boolean }` — `numeric` renders `type="number"`/`inputMode="decimal"` instead of plain text; it's a rendering-only prop, not part of `TextInputSchema` (the schema still describes generic text entry) | Not in the robot grid — roadmap Phase 5's Sector Settings (About text) |
| `Stepper` | `StepperSchema` | `{ schema: StepperSchema; value: number; onChange: (value: number) => void; disabled?: boolean }` | Density, Motif Length, Octave Range Min/Max |
| `StepperWithToggle` | `StepperWithToggleSchema` | `{ schema: StepperWithToggleSchema; value: { active: boolean; value: number }; onChange: (value) => void }` — composes `Toggle` + `Stepper` (disabled when `!active`) | Note Variance |
| `RadioButton` | `RadioButtonSchema` | `{ schema: RadioButtonSchema; value: string; onChange: (value: string) => void }` — wraps `@radix-ui/react-toggle-group` (`type="single"`) | Audio Setting, Layer Type, LFO Shape |
| `SliderLinear` | `SliderLinearSchema` | `{ schema: SliderLinearSchema; value: number; onChange: (value: number) => void }` | Volume, Sustain, Gain, Phase, Interval, LFO Rate/Depth |
| `SliderLog` | `SliderLogSchema` | `{ schema: SliderLogSchema; value: number; onChange: (value: number) => void }` — epsilon-floor log curve, see below | Attack, Decay, Release |
| `SliderCenteredZero` | `SliderCenteredZeroSchema` | `{ schema: SliderCenteredZeroSchema; value: number; onChange: (value: number) => void }` — zero-anchored custom fill, see below | Detune (all 3 layers) |
| `CoordsInput` | `CoordsInputSchema` | `{ schema: CoordsInputSchema; value: { x: number; y: number }; onChange: (value) => void }` — composes two `TextInput`s with `numeric` set, so X/Y render as native numeric inputs; a blank or non-numeric field is guarded and does not call `onChange` | Not in the robot grid — roadmap Phase 5's Sector Settings |
| `AccordionContainer` | `AccordionSchema` | `{ schema: AccordionSchema; children: ReactNode; defaultOpen?: boolean; contentActive?: boolean }` — one independent collapsible section, not a group coordinator; `contentActive` drives the trigger's status light, see below | Ping Controls, Ping Contour, Signature Array (drawer rows) |
| `Lfo` | `LfoSchema` | `{ schema: LfoSchema; value: LfoValue; onChange: (value: LfoValue) => void; disabled?: boolean }` — composes `RadioButton` + 2×`SliderLinear` + `Toggle` | OSCILLATION rows (LFO Active/Shape/Rate/Depth) |
| `Select` | `SelectSchema` | `{ schema: SelectSchema; value: string; onChange: (value: string) => void; disabled?: boolean }` — wraps `@radix-ui/react-select` (already a dependency before this primitive existed — no new package added) | Not in the robot grid — Roadmap Phase 10's robot-to-company assignment dropdown (`src/data/companyConfig.ts`'s `buildCompanySelectSchema`) |

### `Select` (added Roadmap Phase 10)

The 14th primitive, and the first dropdown in the inventory — the 13 shipped by this phase had no options-list control that opens a floating panel (`RadioButton`'s segmented toggle-group doesn't scale to an open-ended, user-growable list like companies). Same props shape as `RadioButton`, the closest existing precedent (an options-list control wrapping a Radix primitive), plus `disabled` — which every other options-list control here already had by the time this one shipped. `@radix-ui/react-select` was already present in `package.json` from an earlier install; this primitive is simply its first real consumer, so adding it required no new dependency and no confirmation-with-user step the way `@radix-ui/react-accordion` did in this phase's own history.

### `SliderLog`'s epsilon-floor curve

A pure `value = min * (max/min)^t` exponential is undefined at `min = 0` (Attack/Decay/Release all start at 0s). `src/components/ui/controls/sliderLogMath.ts` resolves this: the Radix track operates on an internal `t ∈ [0, 1]`; `t = 0` maps to exactly `schema.min` (including `min = 0`), otherwise `floor * (max/floor)^t` where `floor = Math.max(min, LOG_EPSILON)` and `LOG_EPSILON = 0.001`. `onChange` always receives the mapped display value, never the raw internal `t`.

### `SliderCenteredZero`'s zero-anchored fill

Radix's own `Slider.Range` fills from the track start, not a center zero-point. `src/components/ui/controls/sliderCenteredZeroMath.ts` computes the zero point generally — `(0 - min) / (max - min) * 100%`, not hardcoded to 50% — and a custom fill `<div>` spans from that zero point to the thumb's position via computed inline `left`/`width` styles (the code style's documented exception to "no inline style objects"). Radix's own `Range` stays in the DOM (visually hidden) for structural/a11y parity.

### Displayed-value precision cap

`SliderLinear`, `SliderLog`, `SliderCenteredZero`, and `Stepper` all round their visible `{value}{unit}` label through `src/components/ui/controls/formatDisplayValue.ts` before rendering — at most 3 decimal places, rounded rather than truncated (`5` stays `5`, not `5.000`). This exists to hide floating-point noise (log-scale math, repeated range conversions) that would otherwise surface as e.g. `4999.999999999999Hz`. It's display-only: the value passed to `onChange`/stored in Zustand, and `SliderLinear`/`SliderLog`/`SliderCenteredZero`'s underlying `aria-valuenow`, stay full precision — only the human-readable label is capped.

### `AccordionContainer`

Wraps exactly one Radix `Accordion.Root type="single" collapsible` + one `Item` — a single independent collapsible section, not a group coordinator. A drawer wanting several independently-open sections renders multiple `AccordionContainer` instances side by side. Open/closed is local ephemeral `useState` (presentational, not a domain value). Expand/collapse animates via a GSAP timeline registered in `timelineMap` (`setTimeline`/`killTimeline`), following `PowerRockerSwitch.tsx`'s pattern, and respects `prefers-reduced-motion` (`src/components/ui/controls/accordionAnimation.ts`'s `getAccordionDuration`) the same way `PowerRockerSwitch.css` does. This phase adds `@radix-ui/react-accordion` (^1.2.20) — the one new dependency, confirmed with the user.

The trigger's contents, left to right: a decorative `+`/`−` open-state indicator, the label, then a decorative status light — the label and light both shift right to make room for the indicator, via the trigger's own flex `gap` rather than fixed offsets. Both side indicators are `aria-hidden`; `aria-expanded` on the trigger itself already carries the real open/closed state accessibly, so neither needs to.

- **The `+`/`−` indicator** shows whether the section can be expanded — `+` closed, `−` open — driven directly by the same `open` state as everything else here (not a separate data-state hook). A fixed-width span keeps the label's left edge stable when the glyph swaps.
- **The status light** does **not** reflect open/closed — it reflects the caller-supplied `contentActive?: boolean` prop instead: green when `true`, red when `false`, a plain unlit dot (no glow/pulse, inherits the trigger's own text color) when omitted entirely, for accordions with no domain "active" concept (Ping Controls, Ping Contour, Signature Array). `AudioRigDrawer` passes each effect block's own `enabled` state to its top-level accordion — a single domain value, not the accordion's own expand state. (Each LFO-tied param used to also get its own nested accordion with its own status light reflecting that LFO's `active` state; that pattern is gone — see [Shared composition components](#shared-composition-components) below.) Color is keyed in CSS purely off `data-content-active` on the light itself, no ref/imperative DOM mutation involved.

## Shared composition components

Not part of the 14-primitive `ControlSchema` inventory above — these compose several already-rendered primitives (caller-rendered sliders, one `Lfo`) rather than rendering from a single schema-driven leaf. No new `ControlSchema` variant was added for either.

### `LfoTargetGroup` / `useLfoTargetGroup`

Every LFO-modulatable slider in the console used to render as `[slider]` immediately followed by its own nested `AccordionContainer` (`humanLabel: 'Modulation'`) wrapping one `Lfo` control — EQ3 alone showed 3 near-identical "Modulation" accordions. `docs/specs/LFO_CONSOLIDATED_DISPLAY.md` replaces that with **one shared LFO display per group of LFO-tied sliders**: the sliders render bare, and exactly one `Lfo` control sits below them, showing whichever slider was last **targeted** — clicked, clicked around its row, or keyboard-focused (mouse and keyboard are equivalent). Ships in `src/components/ui/controls/useLfoTargetGroup.ts`:

- **`useLfoTargetGroup({ groupId, fields })`** owns the entire state machine and is the one place the logic lives — `selected` (defaults to `fields[0].field`), `transitioning`, `select(field)`, `isTargeted(field)`, `displayValue`, and `displayLabel`. Selection is local, ephemeral `useState` — never Zustand, mirroring `AccordionContainer`'s own open/closed precedent above.
- **`LfoTargetGroup`** (`src/components/ui/controls/LfoTargetGroup.tsx`), a thin render-prop wrapper around the hook: renders one row per field (each wired to call `select` on click or focus — "click around the row", not just the slider itself — via the row `<div>`'s own `onClick`/`onFocus`), the shared `Lfo` display, and an optional `driftContent` node directly beneath it. The caller supplies each row's actual control through `renderField(field, targeted, select)`, so every existing per-schema-type slider dispatch stays exactly where it already lived. Used by `SignatureArrayDrawer` (one instance per oscillator layer — 3 in the one Signature Array accordion, not 1 for the whole drawer) and `AudioSettingSection` (Volume, a single-field instance — nothing else to target yet, but ready for more sliders to join the same pattern later).
- **`AudioRigDrawer`** calls `useLfoTargetGroup` directly instead of going through the wrapper: its params are already rendered in an existing pass for `updateParam`'s own dispatch, so a second, hand-rolled render pass (`AudioRigLfoGroup`, private to `AudioRigDrawer.tsx`) applies the hook's `isTargeted`/`select` to those same rows instead of re-rendering them through `renderField`. Both call sites share one state machine; only the markup differs.
- **Selecting a new target goes through an explicit transition**, not a direct jump — `select()` kills any in-flight transition, sets `transitioning: true`, and starts a `timelineMap`-registered GSAP timeline (today a 0-duration scaffold; a future pass adds real crossfade timing without changing this shape) whose `onComplete` commits `selected`/clears `transitioning` together. While transitioning, `displayValue` is a neutral placeholder (`NEUTRAL_LFO_VALUE` — same shape `lfoConfig.ts`'s own `makeDefaultLfoSettings()` uses) and the display is disabled, so it can't be edited mid-swap. **`displayLabel`, unlike `displayValue`, stays showing the still-committed field's own name throughout** — only the values reset to neutral, not the label — because blanking both together read as a flicker in practice, not the imperceptible transition the 0-duration scaffold was meant to be.
- **CSS hooks**, `src/components/ui/controls/LfoTargetGroup.css`: `sc-lfo-target-group` root, `__row`/`__display` elements, both taking the `isActive` state class via the same `withActiveClass` helper the primitives above use — `__row`'s `isActive` means "this row is the committed target" (persists through a transition, updated only in `onComplete`), `__display`'s means "currently transitioning" — two different domain concepts on the same shared mechanism, same pattern `Toggle`/`Lfo`/`AccordionContainer` each already apply to their own.

Full design rationale, the field-disappearing fallback (e.g. Signature Array's Interval row hiding when a layer's type leaves `'pulse'`), and the public-API-shape tradeoff: `docs/specs/LFO_CONSOLIDATED_DISPLAY.md`.

## CSS tokens

No new CSS custom properties were introduced in this phase. Every component's CSS pulls color from the existing accent-tier tokens already defined in `src/index.css`: `--color-accent`, `--color-border`, `--color-surface`, `--color-text-primary`, `--color-text-muted`. Per the roadmap's Phase 11 Forward Note, these 13 components are all small interactive-control chrome, so they belong to the locale-seed/accent tier (not the planet-seed/structural `--color-bg`/`--color-surface`-defining tier) — no reclassification will be needed when Phase 11 lands. `Select` (Phase 10) pulls from the exact same accent-tier tokens and needed no new ones either, confirming that forward note held for the one primitive added after this phase shipped.

## What's explicitly out of scope this phase

- No real domain config files (`audioRigConfig.ts`, `robotOptionsConfig.ts`, `sectorSettingsConfig.ts`) — those are Phases 4/5/9's job.
- No wiring into the existing robot editor (`RobotAudioTab.tsx`/`RobotOscillatorsTab.tsx`) — they remain read-only reference points for by-eye comparison until Phase 9.
- No Storybook-style demo harness.
