import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useState, type CSSProperties } from 'react';

import { CabinetBox } from './CabinetBox';
import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import { useVoxelTrackGap } from './useCabinetBoxHeight';
import type { RadioButtonSchema } from '@/types/controls';
import './RadioButton.css';

interface RadioButtonProps {
  schema: RadioButtonSchema;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Optional fixed square size for every option's CabinetBox, overriding
   *  the responsive useCabinetBoxHeight() tier RadioButton otherwise
   *  inherits by omitting boxHeight/frontWidth/frontHeight entirely. Every
   *  existing consumer (Audio Setting, Decay Mode, per-layer Type,
   *  CompanyButtonRow, ...) omits this and is unaffected.
   *  docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4. */
  boxSize?: number;
}

/** Single-select control wrapping @radix-ui/react-toggle-group (type="single")
 *  — already installed elsewhere in the codebase (e.g. RobotAudioTab.tsx's
 *  Audio Mode row, pre-Phase-9), so this avoids adding a redundant
 *  @radix-ui/react-radio-group dependency for the same job. A deselect-to-empty
 *  event (Radix's single-mode ToggleGroup emits '' when the active item is
 *  clicked again) is guarded and does not call onChange. `disabled` disables
 *  the whole group at once (Radix's own `ToggleGroup.Root` prop) — there's no
 *  per-item disabled here, matching every other control primitive's single
 *  `disabled` flag.
 *
 *  Renders through CabinetBox (roadmap Phase 11.1.6) — one box per option,
 *  popped for the option matching `value`, flat for every other. Reuses
 *  Toggle's (11.1.2) value-keyed pop precedent generalized to N boxes, and
 *  Button's (11.1.1) content-sized/breakpoint-scaled box sizing — never
 *  Toggle's own fixed-32px/textless shape. Only the selected option's front
 *  face is accent-tinted (RadioButton.css, keyed off Radix's own
 *  data-state='on'); every other option stays on CabinetBox.css's
 *  --color-surface default. See docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md
 *  §1 for the full derivation, including why this is the first consumer with
 *  more than one CabinetBox per control.
 *
 *  Each option also pops on mouseEnter/mouseLeave, matching Button's own
 *  hover-pop feedback (Button.tsx) — added after 11.1.6 shipped, reversing
 *  that phase's original "no hover/partial-pop on unselected options"
 *  exclusion. `hoveredValue` tracks at most one hovered option at a time (not
 *  a per-option boolean set), since only one option can be under the pointer;
 *  a disabled group never pops on hover, mirroring Button's own
 *  `!disabled && ...` guard. Hover only ever *adds* pop on top of the
 *  selected-state pop — it never un-pops the selected option on
 *  mouseLeave. */
export function RadioButton({ schema, value, onChange, disabled, boxSize }: RadioButtonProps) {
  // Reuses the same breakpoint-tier gap VoxelTrack (11.1.3) uses between its
  // own boxes — not renamed to something RadioButton-neutral; see
  // docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md §1.5 for why.
  const gap = useVoxelTrackGap();
  const rowTokens = { '--cabinet-radio-gap': `${gap}px` } as CSSProperties;
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  return (
    <div className="sc-radio-button">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <ToggleGroup.Root
        type="single"
        className="sc-radio-button__root"
        style={rowTokens}
        value={value}
        onValueChange={(next) => { if (next) onChange(next); }}
        aria-label={resolveAccessibleName(schema)}
        disabled={disabled}
      >
        {schema.options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            className="sc-radio-button__item"
            value={option.value}
            aria-label={option.label}
            onMouseEnter={() => setHoveredValue(option.value)}
            onMouseLeave={() => setHoveredValue((current) => (current === option.value ? null : current))}
          >
            <CabinetBox
              popped={option.value === value || (!disabled && option.value === hoveredValue)}
              timelineKey={`cabinet-radio-${schema.id}-${option.value}`}
              {...(boxSize !== undefined ? { boxHeight: boxSize, frontWidth: boxSize, frontHeight: boxSize } : {})}
            >
              {option.label}
            </CabinetBox>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
