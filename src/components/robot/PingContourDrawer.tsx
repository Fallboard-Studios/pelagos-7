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
export function PingContourDrawer({ value: adsr, onChange, disabled }: PingContourDrawerProps) {
  const handleAttackChange = (v: number) => onChange({ ...adsr, attack: v });
  const handleDecayChange = (v: number) => onChange({ ...adsr, decay: v });
  const handleReleaseChange = (v: number) => onChange({ ...adsr, release: v });
  // Sustain is displayed 0-100% but stored 0..1 (Robot.ts's ADSREnvelope.sustain) — the one field
  // in this drawer that isn't a 1:1 pass-through between the control and the stored value.
  const handleSustainChange = (pct: number) => onChange({ ...adsr, sustain: pct / 100 });

  return (
    <AccordionContainer schema={ENVELOPE_ACCORDION_SCHEMA}>
      <DirectionalPanel schema={PING_CONTOUR_PANEL_SCHEMA}>
        <div className="ping-contour-drawer">
          <SliderLog schema={ATTACK_SCHEMA} value={adsr.attack} onChange={handleAttackChange} disabled={disabled} />
          <SliderLog schema={DECAY_SCHEMA} value={adsr.decay} onChange={handleDecayChange} disabled={disabled} />
          <SliderLinear schema={SUSTAIN_SCHEMA} value={adsr.sustain * 100} onChange={handleSustainChange} disabled={disabled} />
          <SliderLog schema={RELEASE_SCHEMA} value={adsr.release} onChange={handleReleaseChange} disabled={disabled} />
        </div>
      </DirectionalPanel>
    </AccordionContainer>
  );
}

export default PingContourDrawer;
