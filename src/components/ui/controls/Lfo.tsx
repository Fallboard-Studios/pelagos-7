import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { DualLabel } from './DualLabel';
import { RadioButton } from './RadioButton';
import { SliderLinear } from './SliderLinear';
import { withActiveClass } from './activeClass';
import { LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
import type { LfoSchema, LfoValue, RadioButtonSchema, SliderLinearSchema } from '@/types/controls';
import './Lfo.css';

interface LfoProps {
  schema: LfoSchema;
  value: LfoValue;
  onChange: (value: LfoValue) => void;
  disabled?: boolean;
}

const SHAPE_OPTIONS = LFO_SHAPES.map((shape) => ({ value: shape, label: shape.toUpperCase() }));

/**
 * The Rate slider's own draggable step. Radix's step grid always anchors to
 * `min` (min + n*step) — anchoring at LFO_RATE_MIN (0) gives a clean
 * 0/0.25/0.5/0.75/1.0... grid, the same sequence this always produced, now
 * with an extra rung at the bottom: 0 itself is a real, meaningful value —
 * the LFO's "off" state, replacing the removed OSCILLATION STATE toggle
 * (see lfoEngine.ts's connect/disconnect callers).
 */
const RATE_STEP = 0.05;

/**
 * Composes RadioButton (shape) + two SliderLinears (rate, depth) per the
 * grid's OSCILLATION rows. `LfoValue` is a type-only reuse of the real Phase
 * 0 engine type (src/types/lfo.ts) — no import of src/engine/lfoEngine.ts or
 * any Tone object, so this stays presentation-only. The root also carries a
 * plain `isActive` class, now driven by `rate > 0` rather than a separate
 * flag, so a consumer can still write `.sc-lfo.isActive { ... }`.
 */
function LfoInner({ schema, value, onChange, disabled }: LfoProps) {
  // Memoized (docs/tasks/OBLIQUE_CABINETRY_MEMOIZATION.md follow-up, found live via React
  // DevTools "highlight updates"): these 3 schema objects used to be constructed fresh, inline,
  // on every render of Lfo — unlike every other primitive's schema in this codebase, which is
  // always a stable reference. Keyed on schema.id alone; every other input (SHAPE_OPTIONS,
  // LFO_RATE_MIN/MAX, RATE_STEP, LFO_DEPTH_MIN/MAX) is already a module-level constant.
  const shapeSchema: RadioButtonSchema = useMemo(
    () => ({ id: `${schema.id}.shape`, type: 'radio', humanLabel: 'Shape', options: SHAPE_OPTIONS }),
    [schema.id],
  );
  // Fixed 'horizontal', never 'auto' — docs/specs/AUDIO_RIG_RESPONSIVE_LAYOUT.md §1.3:
  // every LFO slider (this Rate/Depth pair, and Rate Drift/Depth Drift alongside it)
  // is always horizontal, each its own row, at every breakpoint.
  const rateSchema: SliderLinearSchema = useMemo(
    () => ({ id: `${schema.id}.rate`, type: 'sliderLinear', humanLabel: 'Rate', min: LFO_RATE_MIN, max: LFO_RATE_MAX, step: RATE_STEP, unit: 'Hz', orientation: 'horizontal' }),
    [schema.id],
  );
  const depthSchema: SliderLinearSchema = useMemo(
    () => ({ id: `${schema.id}.depth`, type: 'sliderLinear', humanLabel: 'Depth', min: LFO_DEPTH_MIN, max: LFO_DEPTH_MAX, unit: '%', orientation: 'horizontal' }),
    [schema.id],
  );

  // Stable per-field onChange handlers, reading the latest value/onChange via ref rather than
  // closing over them directly (empty deps — these never change identity for the life of this
  // component instance). Without this, dragging Rate would rebuild a fresh onChange for Shape
  // and Depth too (both close over the same `value`/`onChange`), defeating their own memo for
  // fields that didn't actually change — the same "sibling field forces a re-render" cascade
  // Task 12 fixed at the AudioRigDrawer level, one layer deeper inside Lfo itself.
  const latest = useRef({ value, onChange });
  // Written in an effect, not directly during render — mutating a ref mid-render is disallowed
  // (react-hooks/refs; React Compiler assumes render is pure). Effects run synchronously after
  // commit, before the browser paints and long before any user interaction could invoke one of
  // the event handlers below, so this is never observably stale.
  useEffect(() => {
    latest.current = { value, onChange };
  });

  const handleShapeChange = useCallback((shape: string) => {
    latest.current.onChange({ ...latest.current.value, shape: shape as LfoValue['shape'] });
  }, []);
  const handleRateChange = useCallback((rate: number) => {
    latest.current.onChange({ ...latest.current.value, rate });
  }, []);
  const handleDepthChange = useCallback((depth: number) => {
    latest.current.onChange({ ...latest.current.value, depth });
  }, []);

  return (
    <div className={withActiveClass('sc-lfo', value.rate > 0)}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <RadioButton
        schema={shapeSchema}
        value={value.shape}
        onChange={handleShapeChange}
        disabled={disabled}
      />
      <SliderLinear
        schema={rateSchema}
        value={value.rate}
        onChange={handleRateChange}
        disabled={disabled}
      />
      <SliderLinear
        schema={depthSchema}
        value={value.depth}
        onChange={handleDepthChange}
        disabled={disabled}
      />
    </div>
  );
}

// React.memo (docs/tasks/OBLIQUE_CABINETRY_MEMOIZATION.md Task 10) — every prop is a primitive,
// a stable schema object, or the LfoValue object (compared shallowly — a caller replacing it
// wholesale on any real change is the expected usage, matching every other primitive here).
export const Lfo = memo(LfoInner);
