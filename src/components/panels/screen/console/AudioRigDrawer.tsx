import { useAudioStore } from '@/stores/audioStore';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Toggle } from '@/components/ui/controls/Toggle';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderLog } from '@/components/ui/controls/SliderLog';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { Stepper } from '@/components/ui/controls/Stepper';
import { Lfo } from '@/components/ui/controls/Lfo';
import { AUDIO_RIG_CONFIG, DECAY_MODE_SCHEMA, type AudioRigParamSchema, type AudioRigEffectKey } from '@/data/audioRigConfig';
import type { ToggleSchema } from '@/types/controls';
import type { GlobalAudioSettings } from '@/types/globalAudio';
import './AudioRigDrawer.css';

const GLOBAL_BYPASS_SCHEMA: ToggleSchema = { id: 'audioRig.globalBypass', type: 'toggle', humanLabel: 'Bypass (this may be loud or distorted)' };

/** Dispatches a param's ControlSchema to its matching primitive. Covers only
 *  the 4 variants GLOBAL_CHAIN_GRID.md's UI column actually uses for this
 *  drawer — audioRigConfig.test.ts is what guards the closed set in practice. */
function renderParamControl(param: AudioRigParamSchema, value: number, onChange: (v: number) => void, disabled: boolean) {
  switch (param.schema.type) {
    case 'sliderLinear':
      return <SliderLinear schema={param.schema} value={value} onChange={onChange} disabled={disabled} />;
    case 'sliderLog':
      return <SliderLog schema={param.schema} value={value} onChange={onChange} disabled={disabled} />;
    case 'sliderCenteredZero':
      return <SliderCenteredZero schema={param.schema} value={value} onChange={onChange} disabled={disabled} />;
    case 'stepper':
      return <Stepper schema={param.schema} value={value} onChange={onChange} disabled={disabled} />;
    default:
      return null;
  }
}

/**
 * Live Audio Rig console — resolves docs/tasks/AUDIO_RIG.md Task 10/11 (V1:
 * bypass + params + nested LFO accordions) and docs/tasks/AUDIO_RIG_V2.md
 * Task 11 (V2: Decay control — the rest of V2 needed no drawer-specific
 * change at all, purely a consequence of AUDIO_RIG_CONFIG being schema-
 * driven). Renders purely from AUDIO_RIG_CONFIG, wired to audioStore's
 * setGlobalAudio/setEffectEnabled/setGlobalBypassEnabled/
 * setCompressorBeforeDelay — every control here is live, not presentational.
 * The Decay Mode radio isn't part of AUDIO_RIG_CONFIG's per-effect params
 * (it binds a top-level GlobalAudioSettings field, compressorBeforeDelay,
 * not one nested under `compressor`) — it's a special case rendered inside
 * the Compressor block's own accordion, under its other params, sharing
 * that block's disabled state.
 */
export function AudioRigDrawer() {
  const globalAudio = useAudioStore((s) => s.globalAudio);
  const globalLfo = useAudioStore((s) => s.globalLfo);
  const setGlobalAudio = useAudioStore((s) => s.setGlobalAudio);
  const setEffectEnabled = useAudioStore((s) => s.setEffectEnabled);
  const setGlobalBypassEnabled = useAudioStore((s) => s.setGlobalBypassEnabled);
  const setGlobalLfo = useAudioStore((s) => s.setGlobalLfo);
  const setCompressorBeforeDelay = useAudioStore((s) => s.setCompressorBeforeDelay);

  const rigDisabled = globalAudio.globalBypass;

  return (
    <div className="audio-rig-drawer">
      <div className="audio-rig-drawer__master-row">
        <Toggle schema={GLOBAL_BYPASS_SCHEMA} value={globalAudio.globalBypass} onChange={setGlobalBypassEnabled} />
      </div>
      {AUDIO_RIG_CONFIG.map((block) => {
        // Every param field on every effect is a number (GLOBAL_CHAIN_GRID.md has
        // no string/boolean params) — this cast is read-only and narrow, matching
        // audioStore.ts's own GLOBAL_SETTER cast for the same "dynamic key against
        // a closed-but-varying settings shape" situation.
        const effect = globalAudio[block.key] as unknown as Record<string, number> & { enabled: boolean };
        const blockDisabled = rigDisabled || !effect.enabled;

        function updateParam(field: string, value: number) {
          setGlobalAudio(block.key as AudioRigEffectKey, { [field]: value } as Partial<GlobalAudioSettings[AudioRigEffectKey]>);
        }

        return (
          <div className="audio-rig-drawer__effect-block" key={block.key}>
            <div className="audio-rig-drawer__effect-header">
              <Toggle
                schema={block.enabledSchema}
                value={effect.enabled}
                onChange={(enabled) => setEffectEnabled(block.key, enabled)}
                disabled={rigDisabled}
              />
            </div>
            <AccordionContainer schema={block.accordion} contentActive={effect.enabled}>
              {block.params.map((param) => (
                <div className="audio-rig-drawer__param-row" key={param.field}>
                  {renderParamControl(param, effect[param.field], (v) => updateParam(param.field, v), blockDisabled)}
                  {param.lfoTarget && param.lfoAccordion && (
                    <AccordionContainer
                      schema={param.lfoAccordion}
                      defaultOpen={globalLfo[param.lfoTarget].active}
                      contentActive={globalLfo[param.lfoTarget].active}
                    >
                      <Lfo
                        schema={{ id: `${param.schema.id}.lfo`, type: 'lfo' }}
                        value={globalLfo[param.lfoTarget]}
                        onChange={(v) => setGlobalLfo(param.lfoTarget!, v)}
                      />
                    </AccordionContainer>
                  )}
                </div>
              ))}
              {block.key === 'compressor' && (
                <div className="audio-rig-drawer__param-row">
                  <RadioButton
                    schema={DECAY_MODE_SCHEMA}
                    value={globalAudio.compressorBeforeDelay ? 'controlled' : 'natural'}
                    onChange={(v) => setCompressorBeforeDelay(v === 'controlled')}
                    disabled={blockDisabled}
                  />
                </div>
              )}
            </AccordionContainer>
          </div>
        );
      })}
    </div>
  );
}

export default AudioRigDrawer;
