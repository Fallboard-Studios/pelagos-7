import type { ReactNode } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
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
  AUDIO_RIG_ACCORDION_GROUPS,
  TRANSPORT_COMPOSITION_ACCORDION_SCHEMA,
  SPEED_AUTOMATION_PANEL_SCHEMA,
  EQ_FILTERS_ROW_PANEL_SCHEMA,
  FILTERS_COLUMN_PANEL_SCHEMA,
  TIME_SPACE_COLUMN_PANEL_SCHEMA,
  DECAY_MODE_SCHEMA,
  LFO_DRIFT_GROUPS,
  PING_VARIANCE_AUTOMATION_SCHEMA,
  BPM_SCHEMA,
  type AudioRigParamSchema,
  type AudioRigEffectKey,
} from '@/data/audioRigConfig';
import type { LfoValue, PanelOrientation } from '@/types/controls';
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

/** Wraps one param's control in the shared `.audio-rig-drawer__param-row` div — the plain,
 *  non-LFO rendering shape every block's params without an lfoTarget use (see renderBlock()). */
function paramRow(param: AudioRigParamSchema, effect: Record<string, number>, updateParam: (field: string, value: number) => void) {
  return (
    <div className="audio-rig-drawer__param-row" key={param.field}>
      {renderParamControl(param, effect[param.field], (v) => updateParam(param.field, v))}
    </div>
  );
}

/** Looks up one param by its field name — used by renderBlock()'s hand-composed delay/reverb
 *  layouts below to pull a specific control out of block.params by name, rather than mapping the
 *  array in bulk. Non-null assertion is safe: both call sites name fields that AUDIO_RIG_CONFIG's
 *  own delay/reverb blocks are guaranteed to carry (audioRigConfig.test.ts guards the field list). */
function findParam(params: AudioRigParamSchema[], field: string): AudioRigParamSchema {
  return params.find((p) => p.field === field)!;
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
 *
 * Renders as column[sliders-panel, Lfo, driftContent] (docs/tasks/DIRECTIONAL_PANEL_WIRING.md
 * follow-up fix) — its own single DirectionalPanel root, always column, so the shared Lfo
 * display and Drift sliders always stack beneath the params regardless of the caller's own
 * block.panel orientation (eq3's is 'row', which used to squeeze the display/drift sliders into
 * the same row as Low/Mid/High). The params themselves render inside a nested inner panel whose
 * own orientation is "taken from slider children" — row if any param's own ControlSchema is
 * `orientation: 'vertical'` (eq3 today), column otherwise (filterLPF/filterHPF) — the same rule
 * VERTICAL_SLIDERS.md's classification already uses. Being a single root element, this
 * component's own wrapper renders as one flex item inside block.panel's content regardless of
 * block.panel's own orientation, which is why that orientation no longer needs to change.
 */
function AudioRigLfoGroup({ groupId, params, effect, updateParam, globalLfo, setGlobalLfo, driftContent }: AudioRigLfoGroupProps) {
  const fields = params.map((p) => ({ field: p.field, label: p.schema.humanLabel ?? p.field, lfoValue: globalLfo[p.lfoTarget!] }));
  const { selected, transitioning, select, isTargeted, displayValue, displayLabel } = useLfoTargetGroup({ groupId, fields });
  const selectedTarget = params.find((p) => p.field === selected)!.lfoTarget!;

  // "Taken from slider children" (docs/tasks/DIRECTIONAL_PANEL_WIRING.md follow-up fix): any
  // vertical-oriented slider in the group renders its own row (eq3's Low/Mid/High today, per
  // VERTICAL_SLIDERS.md's classification) — every other LFO-bearing block's sliders are 'auto',
  // which resolves to column here just like everywhere else.
  const slidersOrientation: PanelOrientation = params.some(
    (p) => 'orientation' in p.schema && p.schema.orientation === 'vertical',
  ) ? 'row' : 'column';

  return (
    <DirectionalPanel schema={{ id: `${groupId}.group`, type: 'directionalPanel', orientation: 'column' }}>
      <DirectionalPanel schema={{ id: `${groupId}.sliders`, type: 'directionalPanel', orientation: slidersOrientation }}>
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
      </DirectionalPanel>
      <div className={withActiveClass('sc-lfo-target-group__display', transitioning)}>
        <Lfo
          schema={{ id: `${groupId}.lfo`, type: 'lfo', humanLabel: displayLabel }}
          value={displayValue}
          onChange={(v) => setGlobalLfo(selectedTarget, v)}
          disabled={transitioning}
        />
      </div>
      {driftContent}
    </DirectionalPanel>
  );
}

/**
 * Live Audio Rig console — resolves docs/tasks/AUDIO_RIG.md Task 10/11 (V1:
 * bypass + params + nested LFO accordions), docs/tasks/AUDIO_RIG_V2.md Task
 * 11 (V2: Decay control), and docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 2
 * (regrouping into 4 top-level accordions of nested DirectionalPanels).
 * Renders purely from AUDIO_RIG_CONFIG/AUDIO_RIG_ACCORDION_GROUPS, wired to
 * audioStore's setGlobalAudio/setCompressorBeforeDelay — every control here
 * is live, not presentational. The rig-wide bypass switch and each effect's
 * own Enabled toggle were removed: every effect's "off" state is fully
 * expressible through its own sliders (wet=0, a filter's passthrough
 * frequency, etc.), so a separate on/off flag was redundant. The Decay Mode
 * radio isn't part of AUDIO_RIG_CONFIG's per-effect params (it binds a
 * top-level GlobalAudioSettings field, compressorBeforeDelay, not one
 * nested under `compressor`) — it's a special case rendered inside the
 * Compressor block's own panel, under its other params.
 *
 * Structure: Transport & Composition (Speed & Automation panel — Tempo +
 * Automatic Effects) as its own top-level accordion, then
 * AUDIO_RIG_ACCORDION_GROUPS' 3 accordions (EQ & Filters, Time & Space,
 * Output), each wrapping its blockKeys' blocks via the shared renderBlock()
 * helper — its wrapper changed from its own AccordionContainer to a
 * DirectionalPanel nested inside its group's shared accordion. Delay and
 * Reverb are hand-composed by block.key (findParam() pulls each named param
 * out of block.params) into a nested row — Time+Feedback / Decay+Pre-Delay —
 * with Mix stacked below it inside block.panel's own column; this is a
 * literal, per-block layout, not a rule derived from param count or
 * orientation, matching a caller-supplied panel shape directly. Compressor/
 * Limiter keep the original flat params-map. EQ & Filters is special-cased
 * (by AUDIO_RIG_ACCORDION_GROUPS' own `key` field, not its raw accordion id)
 * into its own row-when-there's-room layout — 3-Band EQ beside Low-Pass and
 * High-Pass, which now share their own row too, not a stacked column
 * (EQ_FILTERS_ROW_PANEL_SCHEMA/FILTERS_COLUMN_PANEL_SCHEMA — the latter's
 * name predates this, kept as-is); Time & Space
 * wraps its own blockKeys in a shared row (TIME_SPACE_COLUMN_PANEL_SCHEMA),
 * while Output still stacks its blockKeys flat. The 'robots'
 * LFO_DRIFT_GROUPS entry (Robot Drift) no longer renders here — it moved to
 * SignatureArrayDrawer's own Source accordion, since it's a robot-facing
 * control even though the value it edits (globalAudio.lfoDrift.robots) is
 * still global, not per-robot.
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
      <AccordionContainer schema={TRANSPORT_COMPOSITION_ACCORDION_SCHEMA}>
        <DirectionalPanel schema={SPEED_AUTOMATION_PANEL_SCHEMA}>
          <SliderLinear
            schema={BPM_SCHEMA}
            value={bpm}
            onChange={setBPM}
          />
          <SliderLinear
            schema={PING_VARIANCE_AUTOMATION_SCHEMA}
            value={pingVarianceAutomation * 100}
            onChange={(v) => setPingVarianceAutomation(v / 100)}
          />
        </DirectionalPanel>
      </AccordionContainer>

      {AUDIO_RIG_ACCORDION_GROUPS.map((group) => (
        <AccordionContainer key={group.accordion.id} schema={group.accordion}>
          {group.key === 'eqFilters' ? (
            // Row-when-there's-room follow-up: 3-Band EQ beside Low-Pass and High-Pass (which
            // share their own row too), instead of all 3 blocks stacking flat like every other
            // group.
            <DirectionalPanel schema={EQ_FILTERS_ROW_PANEL_SCHEMA}>
              {renderBlock('eq3')}
              <DirectionalPanel schema={FILTERS_COLUMN_PANEL_SCHEMA}>
                {renderBlock('filterLPF')}
                {renderBlock('filterHPF')}
              </DirectionalPanel>
            </DirectionalPanel>
          ) : group.key === 'timeSpace' ? (
            <DirectionalPanel schema={TIME_SPACE_COLUMN_PANEL_SCHEMA}>
              {group.blockKeys.map((key) => renderBlock(key))}
            </DirectionalPanel>
          ) : (
            group.blockKeys.map((key) => renderBlock(key))
          )}
        </AccordionContainer>
      ))}
    </div>
  );

  /** Every effect block's own body (AudioRigLfoGroup-or-plain-params-map, plus the
   *  compressor-only Decay Mode radio) — shared by every AUDIO_RIG_ACCORDION_GROUPS entry's
   *  flat stack and EQ & Filters' own special-cased row/column layout above. */
  function renderBlock(key: AudioRigEffectKey) {
    const block = AUDIO_RIG_CONFIG.find((b) => b.key === key)!;
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
        <DirectionalPanel schema={block.panel}>
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
          ) : block.key === 'delay' ? (
            // Hand-composed, not derived: Time+Feedback share a nested row, Mix sits below it,
            // both inside block.panel's own column — matching the user-supplied layout directly
            // rather than inferring a grouping rule from param count/orientation.
            <>
              <DirectionalPanel schema={{ id: 'audioRig.delay.topRow', type: 'directionalPanel', orientation: 'row' }}>
                {paramRow(findParam(block.params, 'delayTime'), effect, updateParam)}
                {paramRow(findParam(block.params, 'feedback'), effect, updateParam)}
              </DirectionalPanel>
              {paramRow(findParam(block.params, 'wet'), effect, updateParam)}
            </>
          ) : block.key === 'reverb' ? (
            // Same hand-composed shape as delay above: Decay+Pre-Delay share a nested row, Mix
            // sits below it.
            <>
              <DirectionalPanel schema={{ id: 'audioRig.reverb.topRow', type: 'directionalPanel', orientation: 'row' }}>
                {paramRow(findParam(block.params, 'decay'), effect, updateParam)}
                {paramRow(findParam(block.params, 'preDelay'), effect, updateParam)}
              </DirectionalPanel>
              {paramRow(findParam(block.params, 'wet'), effect, updateParam)}
            </>
          ) : block.key === 'compressor' ? (
            <>
              <DirectionalPanel schema={{ id: 'audioRig.compressor.topRow', type: 'directionalPanel', orientation: 'row' }}>
                {paramRow(findParam(block.params, 'threshold'), effect, updateParam)}
                {paramRow(findParam(block.params, 'ratio'), effect, updateParam)}
              </DirectionalPanel>
              <DirectionalPanel schema={{ id: 'audioRig.compressor.bottomRow', type: 'directionalPanel', orientation: 'row' }}>
                {paramRow(findParam(block.params, 'attack'), effect, updateParam)}
                {paramRow(findParam(block.params, 'release'), effect, updateParam)}
              </DirectionalPanel>
              <DirectionalPanel schema={{ id: 'audioRig.compressor.bottomRow', type: 'directionalPanel', orientation: 'row' }}>
                {paramRow(findParam(block.params, 'knee'), effect, updateParam)}
                <div className="audio-rig-drawer__param-row">
                  <RadioButton
                    schema={DECAY_MODE_SCHEMA}
                    value={globalAudio.compressorBeforeDelay ? 'controlled' : 'natural'}
                    onChange={(v) => setCompressorBeforeDelay(v === 'controlled')}
                  />
                </div>
              </DirectionalPanel>


            </>
          ) : (
            block.params.map((param) => paramRow(param, effect, updateParam))
          )}
        </DirectionalPanel>
      </div>
    );
  }
}

export default AudioRigDrawer;
