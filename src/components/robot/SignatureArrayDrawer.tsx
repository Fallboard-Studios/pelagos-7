import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { Toggle } from '@/components/ui/controls/Toggle';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { LfoTargetGroup } from '@/components/ui/controls/LfoTargetGroup';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import {
  SIGNATURE_ARRAY_ACCORDION_SCHEMA,
  SIGNATURE_ARRAY_CONFIG,
  type SignatureArrayParamSchema,
} from '@/data/robotOptionsConfig';
import type { WaveformType } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { LfoValue, RadioButtonSchema, SliderCenteredZeroSchema, SliderLinearSchema } from '@/types/controls';
import type { RobotLfoTargetId } from '@/types/lfo';

import './SignatureArrayDrawer.css';

export interface SignatureArrayValue {
  layers: OscillatorLayer[];
  // Partial, not Robot['lfoSettings'] (a full Record) — this component's own lookup below
  // (`value.lfoSettings?.[lfoTarget] ?? default`) already treats it as potentially-partial at
  // runtime, and CompanyOptionsSection's resolved snapshot is genuinely partial (only fields a
  // company has actually been edited for are present). A full Record is still assignable here.
  lfoSettings?: Partial<Record<RobotLfoTargetId, LfoValue>>;
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
 *
 * Each layer's LFO-tied params (Gain/Detune/Phase/Interval) render through one LfoTargetGroup —
 * a shared LFO display per layer, replacing the old per-param nested "Modulation" accordion
 * (docs/specs/LFO_CONSOLIDATED_DISPLAY.md). Type stays rendered inline, outside the group — it
 * has no LFO of its own.
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
          const typeParam = block.params.find((p) => p.field === 'type')!;
          const lfoParams = block.params.filter((p) => p.field !== 'type' && (p.field !== 'pulseWidth' || showPulseWidth));

          return (
            <div key={block.key} className="signature-array-drawer__layer" data-layer-key={block.key}>
              {block.activeSchema && (
                <Toggle schema={block.activeSchema} value={layer.active} onChange={handleActiveChange} disabled={disabled} />
              )}
              <RadioButton
                schema={typeParam.schema as RadioButtonSchema}
                value={layer.type}
                onChange={handleTypeChange}
                disabled={disabled}
              />
              <LfoTargetGroup
                groupId={`robotOptions.${block.key}`}
                fields={lfoParams.map((p) => ({
                  field: p.field,
                  label: (p.schema as SliderLinearSchema | SliderCenteredZeroSchema).humanLabel ?? p.field,
                  lfoValue: value.lfoSettings?.[p.lfoTarget!] ?? { ...DEFAULT_LFO_SETTINGS[p.lfoTarget!], active: false },
                }))}
                onLfoChange={(field, v) => onLfoChange(lfoParams.find((p) => p.field === field)!.lfoTarget!, v)}
                disabled={disabled}
                renderField={(field) => {
                  const param = lfoParams.find((p) => p.field === field)!;
                  const paramVal = paramValue(layer, field);
                  const onChange = handleParamChange(field);
                  return (
                    <div className="signature-array-drawer__param">
                      {field === 'detune' ? (
                        <SliderCenteredZero schema={param.schema as SliderCenteredZeroSchema} value={paramVal} onChange={onChange} disabled={disabled} />
                      ) : (
                        <SliderLinear schema={param.schema as SliderLinearSchema} value={paramVal} onChange={onChange} disabled={disabled} />
                      )}
                    </div>
                  );
                }}
              />
            </div>
          );
        })}
      </div>
    </AccordionContainer>
  );
}

export default SignatureArrayDrawer;
