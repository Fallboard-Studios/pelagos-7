import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
import { LfoTargetGroup } from '@/components/ui/controls/LfoTargetGroup';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import {
  SOURCE_ACCORDION_SCHEMA,
  SIGNATURE_ARRAY_CONFIG,
  type SignatureArrayParamSchema,
} from '@/data/robotOptionsConfig';
import { LFO_DRIFT_GROUPS } from '@/data/audioRigConfig';
import { useAudioStore } from '@/stores/audioStore';
import type { WaveformType } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { LfoValue, RadioButtonSchema, SliderCenteredZeroSchema, SliderLinearSchema } from '@/types/controls';
import type { RobotLfoTargetId } from '@/types/lfo';

import './SignatureArrayDrawer.css';

const ROBOTS_DRIFT_GROUP = LFO_DRIFT_GROUPS.find((g) => g.group === 'robots')!;

/**
 * Robot Drift — moved here from AudioRigDrawer's Transport & Composition accordion (post-
 * DIRECTIONAL_PANEL_WIRING follow-up fix), then reordered to render last, after Baseline/Coaxial/
 * Harmonic, rather than first. Still edits the same global `globalAudio.lfoDrift.
 * robots` slice it always did — a rig-wide value, not a per-robot one — so unlike every other
 * panel in this drawer it reads/writes `useAudioStore` directly instead of going through `value`/
 * `onLfoChange` props. Deliberately ignores this drawer's own `disabled` prop: that prop reflects
 * whether a robot/company is selected, which has no bearing on a global control. A separate
 * component (not inlined in SignatureArrayDrawer's own render) purely to keep the store subscription
 * out of a component whose own doc comment promises "no store access" for everything else in it.
 */
function RobotDriftPanel() {
  const rateDrift = useAudioStore((s) => s.globalAudio.lfoDrift.robots.rateDrift);
  const depthDrift = useAudioStore((s) => s.globalAudio.lfoDrift.robots.depthDrift);
  const setGlobalLfoDrift = useAudioStore((s) => s.setGlobalLfoDrift);

  return (
    <DirectionalPanel schema={ROBOTS_DRIFT_GROUP.panel}>
      <SliderCenteredZero
        schema={ROBOTS_DRIFT_GROUP.rateSchema}
        value={rateDrift * 100}
        onChange={(v) => setGlobalLfoDrift('robots', { rateDrift: v / 100 })}
      />
      <SliderCenteredZero
        schema={ROBOTS_DRIFT_GROUP.depthSchema}
        value={depthDrift * 100}
        onChange={(v) => setGlobalLfoDrift('robots', { depthDrift: v / 100 })}
      />
    </DirectionalPanel>
  );
}

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
  /** Continuous params (gain, detune, phase, pulseWidth): live, no gap in audio. Gain is also
   *  how Coaxial/Harmonic are muted now (gain: 0) — a live update on the existing voice, not a
   *  rebuild; `filterAudibleLayers` (AudioEngine.ts) only excludes a muted layer from the
   *  composite voice the next time something else triggers a real rebuild (e.g. a Type change). */
  onContinuousChange: (layers: OscillatorLayer[]) => void;
  /** Structural changes (type) — may cause a brief audio gap while the voice rebuilds. */
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
 * One Source AccordionContainer wrapping 3 DirectionalPanels, one per fixed layer slot (Baseline/
 * Coaxial/Harmonic), plus the Robot Drift panel — docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 8,
 * replacing the former single "Signature Array" accordion around 3 unlabeled layer divs. Robot
 * Drift was moved here from AudioRigDrawer's Transport & Composition accordion in a follow-up
 * fix, landing last, after Harmonic — see RobotDriftPanel below.
 *
 * Otherwise purely presentational as of Roadmap Phase 10 (Task 16) — no `robot` prop, no store
 * access beyond RobotDriftPanel's own global lfoDrift subscription; both RobotOptionsTab (robot
 * mode) and CompanyOptionsSection (company mode) derive `value` and wire each callback through
 * robotOptionsActions.applyLayersContinuous/applyLayersStructural/applyLayerLfo themselves
 * (`SignatureArrayDrawerProps` is unchanged — neither call site needed any edit).
 * Dragging Coaxial/Harmonic's own Gain to 0 mutes the layer (eventually excluded from the
 * composite voice, see AudioEngine.reserveVoice's filterAudibleLayers) without discarding its
 * Type/Detune/Phase/Interval configuration — there's no separate Active toggle.
 *
 * Each layer's own `signature-array-drawer__layer` `data-layer-key` div is wrapped *around* by
 * its DirectionalPanel, not replaced by it — DirectionalPanel's props are locked to
 * `{ schema, children }` (no prop passthrough) and can't carry `data-layer-key` itself.
 *
 * Each layer's LFO-tied params (Gain/Detune/Phase/Interval) render through one LfoTargetGroup —
 * a shared LFO display per layer, replacing the old per-param nested "Modulation" accordion
 * (docs/specs/LFO_CONSOLIDATED_DISPLAY.md). Type stays rendered inline, outside the group — it
 * has no LFO of its own.
 */
export function SignatureArrayDrawer({ value, onContinuousChange, onStructuralChange, onLfoChange, disabled }: SignatureArrayDrawerProps) {
  const layers = value.layers ?? [];

  return (
    <AccordionContainer schema={SOURCE_ACCORDION_SCHEMA}>
      <div className="signature-array-drawer">

        {SIGNATURE_ARRAY_CONFIG.map((block, idx) => {
          const layer = layers[idx];
          if (!layer) return null;

          const withUpdatedLayer = (updated: OscillatorLayer) =>
            layers.map((l, i) => (i === idx ? updated : l));

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
            <DirectionalPanel schema={block.panel} key={block.key}>
              <div className="signature-array-drawer__layer" data-layer-key={block.key}>
                <RadioButton
                  schema={typeParam.schema as RadioButtonSchema}
                  value={layer.type}
                  onChange={handleTypeChange}
                  disabled={disabled}
                />
                <LfoTargetGroup
                  groupId={`robotOptions.${block.key}`}
                  sliderPanelOrientation="row"
                  fields={lfoParams.map((p) => ({
                    field: p.field,
                    label: (p.schema as SliderLinearSchema | SliderCenteredZeroSchema).humanLabel ?? p.field,
                    lfoValue: value.lfoSettings?.[p.lfoTarget!] ?? { ...DEFAULT_LFO_SETTINGS[p.lfoTarget!] },
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
            </DirectionalPanel>
          );
        })}
        <RobotDriftPanel />
      </div>
    </AccordionContainer>
  );
}

export default SignatureArrayDrawer;
