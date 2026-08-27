import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { Toggle } from '@/components/ui/controls/Toggle';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';
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

export interface SignatureArrayValue {
  layers: OscillatorLayer[];
  lfoSettings?: Robot['lfoSettings'];
}

interface SignatureArrayDrawerProps {
  value: SignatureArrayValue;
  /** Continuous params (gain, detune, phase, pulseWidth): live, no gap in audio. */
  onContinuousChange: (layers: OscillatorLayer[]) => void;
  /** Structural changes (type, active/mute) — may cause a brief audio gap while the voice
   *  rebuilds; active toggling changes which layers the composite voice actually includes. */
  onStructuralChange: (layers: OscillatorLayer[]) => void;
  onLfoChange: (target: RobotLfoTargetId, value: LfoValue) => void;
  disabled?: boolean;
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
 * One AccordionContainer wrapping the 3 fixed layer slots (Baseline/Coaxial/Harmonic). Purely
 * presentational as of Roadmap Phase 10 (Task 16) — no `robot` prop, no store access; both
 * RobotOptionsTab (robot mode) and CompanyOptionsSection (company mode) derive `value` and wire
 * each callback through robotOptionsActions.applyLayersContinuous/applyLayersStructural/
 * applyLayerLfo themselves. Toggling Coaxial/Harmonic's Active off mutes the layer (excluded from
 * the composite voice, see AudioEngine.reserveVoice's filterActiveLayers) without discarding its
 * Type/Gain/Detune/Phase/Interval configuration.
 */
export function SignatureArrayDrawer({ value, onContinuousChange, onStructuralChange, onLfoChange, disabled }: SignatureArrayDrawerProps) {
  const layers = value.layers ?? [];

  return (
    <AccordionContainer schema={SIGNATURE_ARRAY_ACCORDION_SCHEMA}>
      <div className="signature-array-drawer">
        {SIGNATURE_ARRAY_CONFIG.map((block, idx) => {
          const layer = layers[idx];
          if (!layer) return null;

          const withUpdatedLayer = (updated: OscillatorLayer) =>
            layers.map((l, i) => (i === idx ? updated : l));

          const handleActiveChange = (active: boolean) =>
            onStructuralChange(withUpdatedLayer({ ...layer, active }));

          const handleTypeChange = (v: string) =>
            onStructuralChange(withUpdatedLayer({ ...layer, type: v as WaveformType }));

          const handleParamChange = (field: SignatureArrayParamSchema['field']) => (v: number) => {
            const updated: OscillatorLayer = { ...layer, [field]: v };
            onContinuousChange(withUpdatedLayer(updated));
          };

          // 'pulse' only — Tone.js's OmniOscillator.width getter returns undefined for every
          // other type (including 'square'), so showing Interval there was an editable control
          // with no audible effect.
          const showPulseWidth = layer.type === 'pulse';

          return (
            <div key={block.key} className="signature-array-drawer__layer" data-layer-key={block.key}>
              {block.activeSchema && (
                <Toggle schema={block.activeSchema} value={layer.active} onChange={handleActiveChange} disabled={disabled} />
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
                      disabled={disabled}
                    />
                  );
                }

                const paramVal = paramValue(layer, param.field);
                const onChange = handleParamChange(param.field);
                const lfoTarget = param.lfoTarget;
                const lfoValue: LfoValue | undefined = lfoTarget
                  ? (value.lfoSettings?.[lfoTarget] ?? { ...DEFAULT_LFO_SETTINGS[lfoTarget], active: false })
                  : undefined;

                return (
                  <div key={param.field} className="signature-array-drawer__param">
                    {param.field === 'detune' ? (
                      <SliderCenteredZero schema={param.schema as SliderCenteredZeroSchema} value={paramVal} onChange={onChange} disabled={disabled} />
                    ) : (
                      <SliderLinear schema={param.schema as SliderLinearSchema} value={paramVal} onChange={onChange} disabled={disabled} />
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
                          onChange={(v) => onLfoChange(lfoTarget, v)}
                          disabled={disabled}
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
