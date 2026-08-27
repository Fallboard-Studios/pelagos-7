import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { Toggle } from '@/components/ui/controls/Toggle';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { AudioEngine } from '@/engine/AudioEngine';
import { lfoEngine } from '@/engine/lfoEngine';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import {
  SIGNATURE_ARRAY_ACCORDION_SCHEMA,
  SIGNATURE_ARRAY_CONFIG,
  type SignatureArrayParamSchema,
} from '@/data/robotOptionsConfig';
import type { Robot, WaveformType } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { LfoValue, RadioButtonSchema, SliderCenteredZeroSchema, SliderLinearSchema } from '@/types/controls';
import type { RobotLfoTargetId } from '@/types/lfo';

import './SignatureArrayDrawer.css';

interface SignatureArrayDrawerProps {
  robot: Robot;
}

/** Continuous params (gain, detune, phase, pulseWidth): live, no gap in audio. */
function commitContinuous(robot: Robot, localeId: string, layers: OscillatorLayer[]) {
  useLocaleStore.getState().updateRobot(localeId, robot.id, {
    audioAttributes: { ...robot.audioAttributes, layers },
  });
  AudioEngine.updateVoiceLayerParams(robot.id, layers);
}

/** Structural changes (type, active/mute) — may cause a brief audio gap while the voice
 *  rebuilds; active toggling changes which layers the composite voice actually includes. */
function commitStructural(robot: Robot, localeId: string, layers: OscillatorLayer[]) {
  useLocaleStore.getState().updateRobot(localeId, robot.id, {
    audioAttributes: { ...robot.audioAttributes, layers },
  });
  AudioEngine.reReserveVoice(robot.id);
}

function paramValue(layer: OscillatorLayer, field: SignatureArrayParamSchema['field']): number {
  switch (field) {
    case 'gain': return layer.gain;
    case 'detune': return layer.detune;
    case 'phase': return layer.phase;
    case 'pulseWidth': return layer.pulseWidth ?? 0.5;
    default: return 0;
  }
}

/**
 * One AccordionContainer wrapping the 3 fixed layer slots (Baseline/Coaxial/Harmonic — Roadmap
 * Phase 9). Replaces RobotOscillatorsTab's dynamic add/delete list. Toggling Coaxial/Harmonic's
 * Active off mutes the layer (excluded from the composite voice, see AudioEngine.reserveVoice's
 * filterActiveLayers) without discarding its Type/Gain/Detune/Phase/Interval configuration.
 */
export function SignatureArrayDrawer({ robot }: SignatureArrayDrawerProps) {
  const localeId = getActiveLocaleId();
  const layers = robot.audioAttributes.layers ?? [];

  const handleLfoChange = (target: RobotLfoTargetId) => (value: LfoValue) => {
    const nextLfoSettings = { ...robot.lfoSettings, [target]: value } as Robot['lfoSettings'];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { lfoSettings: nextLfoSettings });
    lfoEngine.setLfoShape(target, value.shape, robot.id);
    lfoEngine.setLfoRate(target, value.rate, robot.id);
    lfoEngine.setLfoDepth(target, value.depth, robot.id);
    if (value.active) {
      if (lfoEngine.connectLfoTarget(target, robot.id)) lfoEngine.start(target, robot.id);
    } else {
      lfoEngine.disconnectLfoTarget(target, robot.id);
      lfoEngine.stop(target, robot.id);
    }
  };

  return (
    <AccordionContainer schema={SIGNATURE_ARRAY_ACCORDION_SCHEMA}>
      <div className="signature-array-drawer">
        {SIGNATURE_ARRAY_CONFIG.map((block, idx) => {
          const layer = layers[idx];
          if (!layer) return null;

          const withUpdatedLayer = (updated: OscillatorLayer) =>
            layers.map((l, i) => (i === idx ? updated : l));

          const handleActiveChange = (active: boolean) =>
            commitStructural(robot, localeId, withUpdatedLayer({ ...layer, active }));

          const handleTypeChange = (value: string) =>
            commitStructural(robot, localeId, withUpdatedLayer({ ...layer, type: value as WaveformType }));

          const handleParamChange = (field: SignatureArrayParamSchema['field']) => (value: number) => {
            const updated: OscillatorLayer = { ...layer, [field]: value };
            commitContinuous(robot, localeId, withUpdatedLayer(updated));
          };

          // 'pulse' only — Tone.js's OmniOscillator.width getter returns undefined for every
          // other type (including 'square'), so showing Interval there was an editable control
          // with no audible effect. AudioEngine's own pulseWidth LFO gate already only allows
          // 'pulse' for the same reason (getRobotModulationTarget).
          const showPulseWidth = layer.type === 'pulse';

          return (
            <div key={block.key} className="signature-array-drawer__layer" data-layer-key={block.key}>
              {block.activeSchema && (
                <Toggle schema={block.activeSchema} value={layer.active} onChange={handleActiveChange} />
              )}
              {block.params.map((param) => {
                if (param.field === 'pulseWidth' && !showPulseWidth) return null;

                if (param.field === 'type') {
                  return (
                    <RadioButton
                      key={param.field}
                      schema={param.schema as RadioButtonSchema}
                      value={layer.type}
                      onChange={handleTypeChange}
                    />
                  );
                }

                const value = paramValue(layer, param.field);
                const onChange = handleParamChange(param.field);
                const lfoTarget = param.lfoTarget;
                const lfoValue: LfoValue | undefined = lfoTarget
                  ? (robot.lfoSettings?.[lfoTarget] ?? { ...DEFAULT_LFO_SETTINGS[lfoTarget], active: false })
                  : undefined;

                return (
                  <div key={param.field} className="signature-array-drawer__param">
                    {param.field === 'detune' ? (
                      <SliderCenteredZero schema={param.schema as SliderCenteredZeroSchema} value={value} onChange={onChange} />
                    ) : (
                      <SliderLinear schema={param.schema as SliderLinearSchema} value={value} onChange={onChange} />
                    )}
                    {lfoTarget && param.lfoAccordion && lfoValue && (
                      <AccordionContainer
                        schema={param.lfoAccordion}
                        defaultOpen={lfoValue.active}
                        contentActive={lfoValue.active}
                      >
                        <Lfo
                          schema={{ id: `${param.lfoAccordion.id}.control`, type: 'lfo' }}
                          value={lfoValue}
                          onChange={handleLfoChange(lfoTarget)}
                        />
                      </AccordionContainer>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </AccordionContainer>
  );
}

export default SignatureArrayDrawer;
