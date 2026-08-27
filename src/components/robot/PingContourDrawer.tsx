import { SliderLog } from '@/components/ui/controls/SliderLog';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { AudioEngine } from '@/engine/AudioEngine';
import {
  PING_CONTOUR_ACCORDION_SCHEMA,
  ATTACK_SCHEMA,
  DECAY_SCHEMA,
  SUSTAIN_SCHEMA,
  RELEASE_SCHEMA,
} from '@/data/robotOptionsConfig';
import type { ADSREnvelope, Robot } from '@/types/Robot';

import './PingContourDrawer.css';

interface PingContourDrawerProps {
  robot: Robot;
}

/**
 * One AccordionContainer editing the robot's single shared audioAttributes.adsr — the first-ever
 * UI to edit this field directly (Roadmap Phase 9; per-layer ADSR overrides are gone). Every edit
 * calls AudioEngine.updateVoiceEnvelope, never reReserveVoice, so there's no audio dropout.
 */
export function PingContourDrawer({ robot }: PingContourDrawerProps) {
  const localeId = getActiveLocaleId();
  const adsr = robot.audioAttributes.adsr;

  const commitAdsr = (next: ADSREnvelope) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, {
      audioAttributes: { ...robot.audioAttributes, adsr: next },
    });
    AudioEngine.updateVoiceEnvelope(robot.id, next);
  };

  const handleAttackChange = (v: number) => commitAdsr({ ...adsr, attack: v });
  const handleDecayChange = (v: number) => commitAdsr({ ...adsr, decay: v });
  const handleReleaseChange = (v: number) => commitAdsr({ ...adsr, release: v });
  // Sustain is displayed 0-100% but stored 0..1 (Robot.ts's ADSREnvelope.sustain) — the one field
  // in this phase that isn't a 1:1 pass-through between the control and the stored value.
  const handleSustainChange = (pct: number) => commitAdsr({ ...adsr, sustain: pct / 100 });

  return (
    <AccordionContainer schema={PING_CONTOUR_ACCORDION_SCHEMA}>
      <div className="ping-contour-drawer">
        <SliderLog schema={ATTACK_SCHEMA} value={adsr.attack} onChange={handleAttackChange} />
        <SliderLog schema={DECAY_SCHEMA} value={adsr.decay} onChange={handleDecayChange} />
        <SliderLinear schema={SUSTAIN_SCHEMA} value={adsr.sustain * 100} onChange={handleSustainChange} />
        <SliderLog schema={RELEASE_SCHEMA} value={adsr.release} onChange={handleReleaseChange} />
      </div>
    </AccordionContainer>
  );
}

export default PingContourDrawer;
