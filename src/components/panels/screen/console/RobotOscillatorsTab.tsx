import { useState, useEffect } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';

import { useUIStore } from '@/stores/uiStore';
import { usePlanetStore } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot, WaveformType } from '@/types/Robot';
import type { OscillatorLayer, ADSTRaw } from '@/types/layeredAudio';

import './RobotOscillatorsTab.css';

// ========================================
// CONSTANTS
// ========================================

const WAVEFORM_OPTIONS: (WaveformType | 'noise')[] = [
  'sine', 'square', 'sawtooth', 'triangle', 'pulse', 'noise',
];

// ========================================
// TYPES & INTERFACES
// ========================================

interface NumericStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}

interface LayerRowProps {
  layer: OscillatorLayer;
  idx: number;
  robot: Robot;
  localeId: string;
  allLayers: OscillatorLayer[];
  updateRobot: (localeId: string, robotId: string, updates: Partial<Robot>) => void;
}

// ========================================
// HELPERS
// ========================================

/**
 * Two-tier update rule (applied at all commit sites):
 *   Continuous params (gain, detune, phase, pulseWidth):
 *     updateRobot + AudioEngine.updateVoiceLayerParams — instant, no audio gap.
 *   Structural changes (type, ADSR override add/edit/reset):
 *     updateRobot + AudioEngine.reReserveVoice — brief silence expected.
 * Pass the full audioAttributes object; updateRobot performs a shallow merge
 * on the robot and will not deep-patch nested arrays without a full replacement.
 */
function commitContinuous(
  robot: Robot,
  localeId: string,
  updatedLayers: OscillatorLayer[],
  updateRobot: (localeId: string, robotId: string, updates: Partial<Robot>) => void,
): void {
  updateRobot(localeId, robot.id, { audioAttributes: { ...robot.audioAttributes, layers: updatedLayers } });
  AudioEngine.updateVoiceLayerParams(robot.id, updatedLayers);
}

function commitStructural(
  robot: Robot,
  localeId: string,
  updatedLayers: OscillatorLayer[],
  updateRobot: (localeId: string, robotId: string, updates: Partial<Robot>) => void,
): void {
  updateRobot(localeId, robot.id, { audioAttributes: { ...robot.audioAttributes, layers: updatedLayers } });
  AudioEngine.reReserveVoice(robot.id);
}

// ========================================
// COMPONENTS
// ========================================

function NumericStepper({ label, value, min, max, step, onCommit }: NumericStepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div className="field">
      <label className="label">{label}</label>
      <input
        className="stepper-input"
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(draft);
          const clamped = Number.isFinite(parsed)
            ? Math.min(max, Math.max(min, parsed))
            : value;
          onCommit(clamped);
          setDraft(String(clamped));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

function LayerRow({ layer, idx, robot, localeId, allLayers, updateRobot }: LayerRowProps) {
  const withUpdatedLayer = (updated: OscillatorLayer) =>
    allLayers.map((l, i) => (i === idx ? updated : l));

  // Structural: waveform type change — brief audio gap expected
  const handleTypeChange = (newType: string) => {
    commitStructural(robot, localeId, withUpdatedLayer({ ...layer, type: newType as WaveformType | 'noise' }), updateRobot);
  };

  // Continuous: commit on blur/Enter
  const handleGainCommit = (v: number) => {
    commitContinuous(robot, localeId, withUpdatedLayer({ ...layer, gain: v }), updateRobot);
  };

  const handleDetuneCommit = (v: number) => {
    commitContinuous(robot, localeId, withUpdatedLayer({ ...layer, detune: v }), updateRobot);
  };

  const handlePhaseCommit = (v: number) => {
    commitContinuous(robot, localeId, withUpdatedLayer({ ...layer, phase: v }), updateRobot);
  };

  const handlePulseWidthCommit = (v: number) => {
    commitContinuous(robot, localeId, withUpdatedLayer({ ...layer, pulseWidth: v }), updateRobot);
  };

  // Structural: ADSR override enable — copies master ADSR as starting point
  const handleEnableAdsrOverride = () => {
    const masterAdsr = robot.audioAttributes.adsr;
    const initialAdsr: ADSTRaw = {
      attack: masterAdsr.attack,
      decay: masterAdsr.decay,
      sustain: masterAdsr.sustain,
      release: masterAdsr.release,
    };
    commitStructural(robot, localeId, withUpdatedLayer({ ...layer, adsr: initialAdsr }), updateRobot);
  };

  // Structural: ADSR override reset — removes layer.adsr, falls back to master
  const handleResetAdsr = () => {
    commitStructural(robot, localeId, withUpdatedLayer({ ...layer, adsr: undefined }), updateRobot);
  };

  // Structural: ADSR param edit — brief audio gap expected
  const handleAdsrParamCommit = (key: keyof ADSTRaw, v: number) => {
    const updatedAdsr: ADSTRaw = { ...layer.adsr, [key]: v };
    commitStructural(robot, localeId, withUpdatedLayer({ ...layer, adsr: updatedAdsr }), updateRobot);
  };

  const showPulseWidth = layer.type === 'pulse' || layer.type === 'square';

  return (
    <li className="layer-item">
      <details>
        <summary className="layer-summary">{`Layer ${idx + 1} — ${layer.type}`}</summary>
        <div className="layer-content">

          {/* Waveform type (structural) */}
          <div className="field">
            <label className="label" htmlFor={`waveform-${robot.id}-${idx}`}>Type</label>
            <Select.Root value={layer.type} onValueChange={handleTypeChange}>
              <Select.Trigger
                id={`waveform-${robot.id}-${idx}`}
                className="select-trigger"
                aria-label="Waveform type"
              >
                <Select.Value />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="select-content" position="popper">
                  <Select.Viewport>
                    {WAVEFORM_OPTIONS.map((w) => (
                      <Select.Item key={w} value={w} className="select-item">
                        <Select.ItemText>{w}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Continuous params */}
          <NumericStepper
            label="Gain"
            value={layer.gain}
            min={0}
            max={2}
            step={0.05}
            onCommit={handleGainCommit}
          />
          <NumericStepper
            label="Detune (cents)"
            value={layer.detune}
            min={-100}
            max={100}
            step={1}
            onCommit={handleDetuneCommit}
          />
          <NumericStepper
            label="Phase (°)"
            value={layer.phase}
            min={0}
            max={360}
            step={1}
            onCommit={handlePhaseCommit}
          />
          {showPulseWidth && (
            <NumericStepper
              label="Pulse Width"
              value={typeof layer.pulseWidth === 'number' ? layer.pulseWidth : 0.5}
              min={0}
              max={1}
              step={0.01}
              onCommit={handlePulseWidthCommit}
            />
          )}

          {/* Per-layer ADSR override (structural) */}
          <details className="adsr-details">
            <summary>Envelope Override</summary>
            <div className="adsr-content">
              {!layer.adsr ? (
                <div className="field adsr-toggle-row">
                  <label className="label" htmlFor={`adsr-toggle-${robot.id}-${idx}`}>
                    Use master
                  </label>
                  <Switch.Root
                    id={`adsr-toggle-${robot.id}-${idx}`}
                    className="switch-root"
                    checked={false}
                    onCheckedChange={(checked) => {
                      if (checked) handleEnableAdsrOverride();
                    }}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </div>
              ) : (
                <>
                  <NumericStepper
                    label="Attack (s)"
                    value={layer.adsr.attack ?? 0.01}
                    min={0.001}
                    max={4}
                    step={0.001}
                    onCommit={(v) => handleAdsrParamCommit('attack', v)}
                  />
                  <NumericStepper
                    label="Decay (s)"
                    value={layer.adsr.decay ?? 0.1}
                    min={0.001}
                    max={4}
                    step={0.001}
                    onCommit={(v) => handleAdsrParamCommit('decay', v)}
                  />
                  <NumericStepper
                    label="Sustain"
                    value={layer.adsr.sustain ?? 0.8}
                    min={0}
                    max={1}
                    step={0.01}
                    onCommit={(v) => handleAdsrParamCommit('sustain', v)}
                  />
                  <NumericStepper
                    label="Release (s)"
                    value={layer.adsr.release ?? 0.5}
                    min={0.001}
                    max={8}
                    step={0.001}
                    onCommit={(v) => handleAdsrParamCommit('release', v)}
                  />
                  <button
                    type="button"
                    className="reset-adsr-btn"
                    onClick={handleResetAdsr}
                  >
                    Reset to master
                  </button>
                </>
              )}
            </div>
          </details>

        </div>
      </details>
    </li>
  );
}

// ========================================
// COMPONENT
// ========================================

export default function RobotOscillatorsTab() {
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');
  const updateRobot = useLocaleStore((s) => s.updateRobot);

  const robot: Robot | undefined = useLocaleStore((s) => {
    if (!localeId || !selectedRobotId) return undefined;
    return s.locales[localeId]?.robots?.find((r) => r.id === selectedRobotId);
  });

  if (!selectedRobotId || !robot) {
    return (
      <div className="robot-oscillators-empty">
        <p>No robot selected. Select a robot to view oscillator settings.</p>
      </div>
    );
  }

  const layers = robot.audioAttributes?.layers ?? [];

  return (
    <div className="robot-oscillators">
      <div className="robot-oscillators-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="robot-oscillators-title">{robot.name ?? 'Unnamed Robot'}</h3>
          <span className="layer-count-badge" aria-hidden>
            {layers.length}
          </span>
        </div>
        <button className="add-layer-btn" disabled>
          Add Layer
        </button>
      </div>

      <ul className="layers-list" aria-label="Robot oscillator layers">
        {layers.length === 0 ? (
          <li className="layer-empty">No layers configured</li>
        ) : (
          layers.map((layer, idx) => (
            <LayerRow
              key={idx}
              layer={layer}
              idx={idx}
              robot={robot}
              localeId={localeId}
              allLayers={layers}
              updateRobot={updateRobot}
            />
          ))
        )}
      </ul>

      {/* TODO Issue 14: <RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} /> */}
      <div className="envelope-editor-mount" />
    </div>
  );
}
