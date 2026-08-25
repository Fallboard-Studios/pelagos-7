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

`CONTROL_SCHEMA_TYPES` is a `readonly` array of all 13 discriminant strings, mirroring `src/types/lfo.ts`'s `LFO_SHAPES`/`ROBOT_LFO_TARGET_IDS` pattern — it makes "all 13 variants covered, no duplicates" a runtime-testable assertion (`src/types/controls.test.ts`), not just a compile-time property.

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

All 13 live in `src/components/ui/controls/`. Naming: PascalCase files, CSS class prefix `sc-` (schema control) to avoid collisions with the existing `rat-`/`rocker-` prefixes.

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
| `Lfo` | `LfoSchema` | `{ schema: LfoSchema; value: LfoValue; onChange: (value: LfoValue) => void }` — composes `RadioButton` + 2×`SliderLinear` + `Toggle` | OSCILLATION rows (LFO Active/Shape/Rate/Depth) |

### `SliderLog`'s epsilon-floor curve

A pure `value = min * (max/min)^t` exponential is undefined at `min = 0` (Attack/Decay/Release all start at 0s). `src/components/ui/controls/sliderLogMath.ts` resolves this: the Radix track operates on an internal `t ∈ [0, 1]`; `t = 0` maps to exactly `schema.min` (including `min = 0`), otherwise `floor * (max/floor)^t` where `floor = Math.max(min, LOG_EPSILON)` and `LOG_EPSILON = 0.001`. `onChange` always receives the mapped display value, never the raw internal `t`.

### `SliderCenteredZero`'s zero-anchored fill

Radix's own `Slider.Range` fills from the track start, not a center zero-point. `src/components/ui/controls/sliderCenteredZeroMath.ts` computes the zero point generally — `(0 - min) / (max - min) * 100%`, not hardcoded to 50% — and a custom fill `<div>` spans from that zero point to the thumb's position via computed inline `left`/`width` styles (the code style's documented exception to "no inline style objects"). Radix's own `Range` stays in the DOM (visually hidden) for structural/a11y parity.

### Displayed-value precision cap

`SliderLinear`, `SliderLog`, `SliderCenteredZero`, and `Stepper` all round their visible `{value}{unit}` label through `src/components/ui/controls/formatDisplayValue.ts` before rendering — at most 3 decimal places, rounded rather than truncated (`5` stays `5`, not `5.000`). This exists to hide floating-point noise (log-scale math, repeated range conversions) that would otherwise surface as e.g. `4999.999999999999Hz`. It's display-only: the value passed to `onChange`/stored in Zustand, and `SliderLinear`/`SliderLog`/`SliderCenteredZero`'s underlying `aria-valuenow`, stay full precision — only the human-readable label is capped.

### `AccordionContainer`

Wraps exactly one Radix `Accordion.Root type="single" collapsible` + one `Item` — a single independent collapsible section, not a group coordinator. A drawer wanting several independently-open sections renders multiple `AccordionContainer` instances side by side. Open/closed is local ephemeral `useState` (presentational, not a domain value). Expand/collapse animates via a GSAP timeline registered in `timelineMap` (`setTimeline`/`killTimeline`), following `PowerRockerSwitch.tsx`'s pattern, and respects `prefers-reduced-motion` (`src/components/ui/controls/accordionAnimation.ts`'s `getAccordionDuration`) the same way `PowerRockerSwitch.css` does. This phase adds `@radix-ui/react-accordion` (^1.2.20) — the one new dependency, confirmed with the user.

The trigger also carries a small round status light, 15px right of the label rather than flush against the trigger's far edge — decorative (`aria-hidden`), mirroring `PowerRockerSwitch`'s power light. It does **not** reflect open/closed (`aria-expanded` already carries that accessibly) — it reflects the caller-supplied `contentActive?: boolean` prop instead: green when `true`, red when `false`, a plain unlit dot (no glow/pulse, inherits the trigger's own text color) when omitted entirely, for accordions with no domain "active" concept (Ping Controls, Ping Contour, Signature Array). `AudioRigDrawer` passes each effect block's own `enabled` state to its top-level accordion, and each LFO's own `active` state to its nested `lfoAccordion` — two independent domain values, not the accordion's own expand state. Color is keyed in CSS purely off `data-content-active` on the light itself, no ref/imperative DOM mutation involved.

## CSS tokens

No new CSS custom properties were introduced in this phase. Every component's CSS pulls color from the existing accent-tier tokens already defined in `src/index.css`: `--color-accent`, `--color-border`, `--color-surface`, `--color-text-primary`, `--color-text-muted`. Per the roadmap's Phase 10 Forward Note, these 13 components are all small interactive-control chrome, so they belong to the locale-seed/accent tier (not the planet-seed/structural `--color-bg`/`--color-surface`-defining tier) — no reclassification will be needed when Phase 10 lands.

## What's explicitly out of scope this phase

- No real domain config files (`audioRigConfig.ts`, `robotOptionsConfig.ts`, `sectorSettingsConfig.ts`) — those are Phases 4/5/9's job.
- No wiring into the existing robot editor (`RobotAudioTab.tsx`/`RobotOscillatorsTab.tsx`) — they remain read-only reference points for by-eye comparison until Phase 9.
- No Storybook-style demo harness.
