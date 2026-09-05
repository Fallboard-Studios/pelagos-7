import type { ReactNode } from 'react';
import { Lfo } from './Lfo';
import { DirectionalPanel } from './DirectionalPanel';
import { withActiveClass } from './activeClass';
import { useLfoTargetGroup, type LfoTargetGroupField } from './useLfoTargetGroup';
import type { LfoValue, PanelOrientation } from '@/types/controls';
import './LfoTargetGroup.css';

export type { LfoTargetGroupField } from './useLfoTargetGroup';

export interface LfoTargetGroupProps<F extends string = string> {
  /** Unique per group unit — becomes the timelineMap key and the shared Lfo's own schema.id
   *  namespace. E.g. 'audioRig.eq3', 'robotOptions.layer1', 'robotOptions.volume'. */
  groupId: string;
  fields: LfoTargetGroupField<F>[];
  onLfoChange: (field: F, value: LfoValue) => void;
  /** Caller renders its own slider for `field`. The row wrapper below already selects this
   *  field on click or focus ("click around the row"); `select` is handed to the caller too,
   *  for any additional wiring it wants. Keeps every existing per-schema-type slider dispatch
   *  exactly where it already lives. */
  renderField: (field: F, targeted: boolean, select: () => void) => ReactNode;
  disabled?: boolean;
  /** Rendered directly beneath the shared Lfo display, inside the same wrapper — only passed
   *  for eq3/filterLPF/filterHPF, the only groups with a per-group drift control today. */
  driftContent?: ReactNode;
  /** Orientation for the DirectionalPanel wrapping just the field rows — "taken from slider
   *  children": the caller owns each field's own ControlSchema (LfoTargetGroup only ever sees
   *  opaque `renderField` output), so it computes and passes this explicitly, same rule
   *  VERTICAL_SLIDERS.md's classification already uses elsewhere (vertical -> row, else
   *  column). Defaults to 'column' — no current caller's fields are ever schema-'vertical'. */
  sliderPanelOrientation?: PanelOrientation;
}

/**
 * Shared composition component (docs/specs/LFO_CONSOLIDATED_DISPLAY.md §1.2) — one shared LFO
 * display per group of LFO-tied sliders, replacing the old per-slider nested "Modulation"
 * accordion. Renders bare rows (each wired to select its field on click or focus — "click
 * around the row", not just the slider itself) inside their own DirectionalPanel, one shared
 * `Lfo` display driven by whichever field is currently targeted, and optional `driftContent`
 * below it — column[sliders-panel, Lfo, driftContent], a follow-up fix to
 * docs/tasks/DIRECTIONAL_PANEL_WIRING.md so the shared display and drift sliders never get
 * squeezed into a row-oriented sliders group. Not schema-driven like the 14 ControlSchema
 * primitives — it composes caller-rendered sliders + one `Lfo`.
 */
export function LfoTargetGroup<F extends string = string>({
  groupId,
  fields,
  onLfoChange,
  renderField,
  disabled,
  driftContent,
  sliderPanelOrientation = 'column',
}: LfoTargetGroupProps<F>) {
  const { selected, transitioning, select, isTargeted, displayValue, displayLabel } = useLfoTargetGroup({
    groupId,
    fields,
  });

  return (
    <div className="sc-lfo-target-group">
      <DirectionalPanel schema={{ id: `${groupId}.sliders`, type: 'directionalPanel', orientation: sliderPanelOrientation }}>
        {fields.map((f) => (
          <div
            key={f.field}
            className={withActiveClass('sc-lfo-target-group__row', isTargeted(f.field))}
            onClick={() => select(f.field)}
            onFocus={() => select(f.field)}
          >
            {renderField(f.field, isTargeted(f.field), () => select(f.field))}
          </div>
        ))}
      </DirectionalPanel>
      <div className={withActiveClass('sc-lfo-target-group__display', transitioning)}>
        <Lfo
          schema={{ id: `${groupId}.lfo`, type: 'lfo', humanLabel: displayLabel }}
          value={displayValue}
          onChange={(v) => onLfoChange(selected, v)}
          disabled={disabled || transitioning}
        />
      </div>
      {driftContent}
    </div>
  );
}

export default LfoTargetGroup;
