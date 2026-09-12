import type { CSSProperties } from 'react';
import { SliderLog } from '@/components/ui/controls/SliderLog';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
import {
  ENVELOPE_ACCORDION_SCHEMA,
  PING_CONTOUR_PANEL_SCHEMA,
  ATTACK_SCHEMA,
  DECAY_SCHEMA,
  SUSTAIN_SCHEMA,
  RELEASE_SCHEMA,
} from '@/data/robotOptionsConfig';
import type { ADSREnvelope } from '@/types/Robot';

import './PingContourDrawer.css';

interface PingContourDrawerProps {
  value: ADSREnvelope;
  onChange: (next: ADSREnvelope) => void;
  disabled?: boolean;
  /** Optional inline style forwarded to this drawer's own AccordionContainer — trait-color
   *  scoping (getTraitColorStyle('timeSpace'), Roadmap Phase 14), applied identically at both
   *  the RobotOptionsTab and CompanyOptionsSection call sites — this drawer always renders in
   *  Time/Space, whether it's editing one robot or a company's bulk baseline. See
   *  docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.5. */
  style?: CSSProperties;
}

/**
 * One Envelope AccordionContainer wrapping one Ping Contour DirectionalPanel, editing the
 * robot's single shared ADSR envelope. Purely presentational as of Roadmap Phase 10 (Task 15),
 * regrouped by docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 7 — no `robot` prop, no store access;
 * both RobotOptionsTab (robot mode) and CompanyOptionsSection (company mode) derive `value` and
 * wire `onChange` through robotOptionsActions.applyAdsr themselves, which is what calls
 * AudioEngine.updateVoiceEnvelope (never reReserveVoice, so there's no audio dropout).
 * `PingContourDrawerProps` is unchanged — neither call site needed any edit for this restructure.
 */
export function PingContourDrawer({ value: adsr, onChange, disabled, style }: PingContourDrawerProps) {
  const handleAttackChange = (v: number) => onChange({ ...adsr, attack: v });
  const handleDecayChange = (v: number) => onChange({ ...adsr, decay: v });
  const handleReleaseChange = (v: number) => onChange({ ...adsr, release: v });
  // Sustain is displayed 0-100% but stored 0..1 (Robot.ts's ADSREnvelope.sustain) — the one field
  // in this drawer that isn't a 1:1 pass-through between the control and the stored value.
  const handleSustainChange = (pct: number) => onChange({ ...adsr, sustain: pct / 100 });

  return (
    <AccordionContainer schema={ENVELOPE_ACCORDION_SCHEMA} style={style}>
      <DirectionalPanel schema={PING_CONTOUR_PANEL_SCHEMA}>
        <DirectionalPanel schema={{ id: 'robotOptions.pingContour.topRow', type: 'directionalPanel', orientation: 'responsive' }}>
          <SliderLog schema={ATTACK_SCHEMA} value={adsr.attack} onChange={handleAttackChange} disabled={disabled} />
          <SliderLog schema={DECAY_SCHEMA} value={adsr.decay} onChange={handleDecayChange} disabled={disabled} />
        </DirectionalPanel>
        <DirectionalPanel schema={{ id: 'robotOptions.pingContour.bottomRow', type: 'directionalPanel', orientation: 'responsive' }}>
          <SliderLinear schema={SUSTAIN_SCHEMA} value={adsr.sustain * 100} onChange={handleSustainChange} disabled={disabled} />
          <SliderLog schema={RELEASE_SCHEMA} value={adsr.release} onChange={handleReleaseChange} disabled={disabled} />
        </DirectionalPanel>
      </DirectionalPanel>
    </AccordionContainer>
  );
}

export default PingContourDrawer;
