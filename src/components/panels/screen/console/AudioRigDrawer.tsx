import type { ReactNode } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderLog } from '@/components/ui/controls/SliderLog';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { Stepper } from '@/components/ui/controls/Stepper';
import { Lfo } from '@/components/ui/controls/Lfo';
import { useLfoTargetGroup } from '@/components/ui/controls/useLfoTargetGroup';
import { withActiveClass } from '@/components/ui/controls/activeClass';
import {
  AUDIO_RIG_CONFIG,
  DECAY_MODE_SCHEMA,
  LFO_DRIFT_GROUPS,
  PING_VARIANCE_AUTOMATION_SCHEMA,
  BPM_SCHEMA,
  type AudioRigParamSchema,
  type AudioRigEffectKey,
} from '@/data/audioRigConfig';
import type { LfoValue } from '@/types/controls';
import type { GlobalAudioSettings } from '@/types/globalAudio';
import type { GlobalLfoTargetId } from '@/types/lfo';
import './AudioRigDrawer.css';
// AudioRigLfoGroup below reuses LfoTargetGroup's own sc-lfo-target-group__row/__display
// classes (styled in LfoTargetGroup.css) instead of LfoTargetGroup itself (see the Rules-of-
// Hooks note on AudioRigLfoGroup) — importing the stylesheet directly here, rather than relying
// on SignatureArrayDrawer/AudioSettingSection to have pulled it in elsewhere in the bundle.
import '@/components/ui/controls/LfoTargetGroup.css';

/** Dispatches a param's ControlSchema to its matching primitive. Covers only
 *  the 4 variants GLOBAL_CHAIN_GRID.md's UI column actually uses for this
 *  drawer — audioRigConfig.test.ts is what guards the closed set in practice. */
function renderParamControl(param: AudioRigParamSchema, value: number, onChange: (v: number) => void) {
  switch (param.schema.type) {
    case 'sliderLinear':
      return <SliderLinear schema={param.schema} value={value} onChange={onChange} />;
    case 'sliderLog':
      return <SliderLog schema={param.schema} value={value} onChange={onChange} />;
    case 'sliderCenteredZero':
      return <SliderCenteredZero schema={param.schema} value={value} onChange={onChange} />;
    case 'stepper':
      return <Stepper schema={param.schema} value={value} onChange={onChange} />;
    default:
      return null;
  }
}

interface AudioRigLfoGroupProps {
  /** Becomes the timelineMap key (`lfo-target-group-${groupId}`) — 'audioRig.eq3' etc. */
  groupId: string;
  /** Every entry's own lfoTarget must be set — the caller only ever passes a block's
   *  lfoTarget-flagged params (eq3/filterLPF/filterHPF today, per audioRigConfig.ts). */
  params: AudioRigParamSchema[];
  effect: Record<string, number>;
  updateParam: (field: string, value: number) => void;
  globalLfo: Record<GlobalLfoTargetId, LfoValue>;
  setGlobalLfo: (target: GlobalLfoTargetId, value: LfoValue) => void;
  /** eq3/filterLPF/filterHPF's own Rate/Depth Drift sliders, rendered directly beneath the
   *  shared display — the only groups with a per-group drift control today. */
  driftContent?: ReactNode;
}

/**
 * One shared LFO display for a block whose params are all LFO-tied (docs/specs/
 * LFO_CONSOLIDATED_DISPLAY.md) — replaces the old per-param nested "Modulation" accordion.
 * A separate component (not inlined in AudioRigDrawer's own per-block loop) so
 * useLfoTargetGroup is called unconditionally per this component's own instance, never
 * conditionally inside AUDIO_RIG_CONFIG.map() itself (Rules of Hooks) — AudioRigDrawer instead
 * conditionally *renders* this whole component only for blocks that have any lfoTarget param
 * (eq3/filterLPF/filterHPF), which is the legal way to make LFO wiring optional per block.
 */
function AudioRigLfoGroup({ groupId, params, effect, updateParam, globalLfo, setGlobalLfo, driftContent }: AudioRigLfoGroupProps) {
  const fields = params.map((p) => ({ field: p.field, label: p.schema.humanLabel ?? p.field, lfoValue: globalLfo[p.lfoTarget!] }));
  const { selected, transitioning, select, isTargeted, displayValue, displayLabel } = useLfoTargetGroup({ groupId, fields });
  const selectedTarget = params.find((p) => p.field === selected)!.lfoTarget!;

  return (
    <>
      {params.map((param) => (
        <div
          key={param.field}
          className={withActiveClass('audio-rig-drawer__param-row sc-lfo-target-group__row', isTargeted(param.field))}
          onClick={() => select(param.field)}
          onFocus={() => select(param.field)}
        >
          {renderParamControl(param, effect[param.field], (v) => updateParam(param.field, v))}
        </div>
      ))}
      <div className={withActiveClass('sc-lfo-target-group__display', transitioning)}>
        <Lfo
          schema={{ id: `${groupId}.lfo`, type: 'lfo', humanLabel: displayLabel }}
          value={displayValue}
          onChange={(v) => setGlobalLfo(selectedTarget, v)}
          disabled={transitioning}
        />
      </div>
      {driftContent}
    </>
  );
}

/**
 * Live Audio Rig console — resolves docs/tasks/AUDIO_RIG.md Task 10/11 (V1:
 * bypass + params + nested LFO accordions) and docs/tasks/AUDIO_RIG_V2.md
 * Task 11 (V2: Decay control — the rest of V2 needed no drawer-specific
 * change at all, purely a consequence of AUDIO_RIG_CONFIG being schema-
 * driven). Renders purely from AUDIO_RIG_CONFIG, wired to audioStore's
 * setGlobalAudio/setCompressorBeforeDelay — every control here is live, not
 * presentational. The rig-wide bypass switch and each effect's own Enabled
 * toggle were removed: every effect's "off" state is fully expressible
 * through its own sliders (wet=0, a filter's passthrough frequency, etc.),
 * so a separate on/off flag was redundant. The Decay Mode radio isn't part
 * of AUDIO_RIG_CONFIG's per-effect params (it binds a top-level
 * GlobalAudioSettings field, compressorBeforeDelay, not one nested under
 * `compressor`) — it's a special case rendered inside the Compressor
 * block's own accordion, under its other params.
 */
export function AudioRigDrawer() {
  const globalAudio = useAudioStore((s) => s.globalAudio);
  const globalLfo = useAudioStore((s) => s.globalLfo);
  const setGlobalAudio = useAudioStore((s) => s.setGlobalAudio);
  const setGlobalLfo = useAudioStore((s) => s.setGlobalLfo);
  const setCompressorBeforeDelay = useAudioStore((s) => s.setCompressorBeforeDelay);
  const setGlobalLfoDrift = useAudioStore((s) => s.setGlobalLfoDrift);
  const pingVarianceAutomation = useAudioStore((s) => s.pingVarianceAutomation);
  const setPingVarianceAutomation = useAudioStore((s) => s.setPingVarianceAutomation);
  const bpm = useAudioStore((s) => s.bpm);
  const setBPM = useAudioStore((s) => s.setBPM);

  return (
    <div className="audio-rig-drawer">
      {AUDIO_RIG_CONFIG.map((block) => {
        // Every param field on every effect is a number (GLOBAL_CHAIN_GRID.md has
        // no string/boolean params) — this cast is read-only and narrow, matching
        // audioStore.ts's own GLOBAL_SETTER cast for the same "dynamic key against
        // a closed-but-varying settings shape" situation.
        const effect = globalAudio[block.key] as unknown as Record<string, number>;
        const lfoFields = block.params.filter((p) => p.lfoTarget);
        const driftGroup = LFO_DRIFT_GROUPS.find((g) => g.group === block.key); // undefined for non-LFO blocks

        function updateParam(field: string, value: number) {
          setGlobalAudio(block.key as AudioRigEffectKey, { [field]: value } as Partial<GlobalAudioSettings[AudioRigEffectKey]>);
        }

        return (
          <div className="audio-rig-drawer__effect-block" key={block.key}>
            <AccordionContainer schema={block.accordion}>
              {lfoFields.length > 0 ? (
                <AudioRigLfoGroup
                  groupId={`audioRig.${block.key}`}
                  params={lfoFields}
                  effect={effect}
                  updateParam={updateParam}
                  globalLfo={globalLfo}
                  setGlobalLfo={setGlobalLfo}
                  driftContent={driftGroup && (
                    <>
                      <div className="audio-rig-drawer__param-row">
                        <SliderCenteredZero
                          schema={driftGroup.rateSchema}
                          value={globalAudio.lfoDrift[driftGroup.group].rateDrift * 100}
                          onChange={(v) => setGlobalLfoDrift(driftGroup.group, { rateDrift: v / 100 })}
                        />
                      </div>
                      <div className="audio-rig-drawer__param-row">
                        <SliderCenteredZero
                          schema={driftGroup.depthSchema}
                          value={globalAudio.lfoDrift[driftGroup.group].depthDrift * 100}
                          onChange={(v) => setGlobalLfoDrift(driftGroup.group, { depthDrift: v / 100 })}
                        />
                      </div>
                    </>
                  )}
                />
              ) : (
                block.params.map((param) => (
                  <div className="audio-rig-drawer__param-row" key={param.field}>
                    {renderParamControl(param, effect[param.field], (v) => updateParam(param.field, v))}
                  </div>
                ))
              )}
              {block.key === 'compressor' && (
                <div className="audio-rig-drawer__param-row">
                  <RadioButton
                    schema={DECAY_MODE_SCHEMA}
                    value={globalAudio.compressorBeforeDelay ? 'controlled' : 'natural'}
                    onChange={(v) => setCompressorBeforeDelay(v === 'controlled')}
                  />
                </div>
              )}
            </AccordionContainer>
          </div>
        );
      })}
      {/* eq3/filterLPF/filterHPF's own drift entries now render inside their own block above
          (driftContent, via AudioRigLfoGroup) — 'robots' isn't scoped to any one effect block,
          so it's the only entry that stays here as its own standalone accordion. */}
      {LFO_DRIFT_GROUPS.filter((g) => g.group === 'robots').map((driftGroup) => {
        const groupSettings = globalAudio.lfoDrift[driftGroup.group];
        return (
          <div className="audio-rig-drawer__effect-block" key={driftGroup.group}>
            <AccordionContainer
              schema={driftGroup.accordion}
              contentActive={groupSettings.rateDrift !== 0 || groupSettings.depthDrift !== 0}
            >
              <div className="audio-rig-drawer__param-row">
                <SliderCenteredZero
                  schema={driftGroup.rateSchema}
                  value={groupSettings.rateDrift * 100}
                  onChange={(v) => setGlobalLfoDrift(driftGroup.group, { rateDrift: v / 100 })}
                />
              </div>
              <div className="audio-rig-drawer__param-row">
                <SliderCenteredZero
                  schema={driftGroup.depthSchema}
                  value={groupSettings.depthDrift * 100}
                  onChange={(v) => setGlobalLfoDrift(driftGroup.group, { depthDrift: v / 100 })}
                />
              </div>
            </AccordionContainer>
          </div>
        );
      })}
      <div className="audio-rig-drawer__master-row">
        <SliderLinear
          schema={PING_VARIANCE_AUTOMATION_SCHEMA}
          value={pingVarianceAutomation * 100}
          onChange={(v) => setPingVarianceAutomation(v / 100)}
        />
      </div>
      <div className="audio-rig-drawer__master-row">
        <SliderLinear
          schema={BPM_SCHEMA}
          value={bpm}
          onChange={setBPM}
        />
      </div>
    </div>
  );
}

export default AudioRigDrawer;
