// ========================================
// IMPORTS
// ========================================
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Slider from '@radix-ui/react-slider';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useLocaleStore } from '@/stores/localeStore';
import { AudioEngine } from '@/engine/AudioEngine';
import { generateMelodyForRobot } from '@/engine/melodyGenerator';
import type { Robot } from '@/types/Robot';

import './RobotAudioTab.css';

// ========================================
// TYPES
// ========================================
type AudioMode = 'none' | 'solo' | 'mute' | 'highlight';

// ========================================
// CONSTANTS
// ========================================
const DENSITY_MIN = 4;
const DENSITY_MAX = 12;
const MOTIF_MIN = 1;
const MOTIF_MAX = 16;
const OCTAVE_MIN = 1;
const OCTAVE_MAX = 7;

const AUDIO_MODES: AudioMode[] = ['none', 'solo', 'mute', 'highlight'];

// ========================================
// HELPERS
// ========================================

/**
 * Regenerate a robot's melody from its current attributes and register it with AudioEngine.
 * Runs synchronously — Tone.js transport callbacks are main-thread, Zustand is synchronous,
 * and AudioEngine methods are safe to call without any deferral.
 */
function regenerateMelody(robot: Robot, localeId: string): void {
  const newMelody = generateMelodyForRobot({
    events: robot.rhythmicDensity ?? 6,
    octaveRange: robot.octaveRange,
  });
  useLocaleStore.getState().updateRobot(localeId, robot.id, { melody: newMelody });
  AudioEngine.registerRobotMelody(robot.id, newMelody);
}

// ========================================
// COMPONENT
// ========================================

interface RobotAudioTabProps {
  robot: Robot;
}

export function RobotAudioTab({ robot }: RobotAudioTabProps) {
  const localeId = getActiveLocaleId();

  if (!localeId) {
    return <div className="rat-empty">No active locale.</div>;
  }

  const audioMode = (robot.audioMode ?? 'none') as AudioMode;
  const rhythmicDensity = robot.rhythmicDensity ?? 6;
  const rhythmicMotifLength = robot.rhythmicMotifLength ?? 8;
  const [octMin, octMax] = robot.octaveRange;

  const handleAudioModeChange = (value: string) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { audioMode: value as AudioMode });
  };

  const handleDensityChange = (values: number[]) => {
    const density = values[0];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicDensity: density });
    regenerateMelody({ ...robot, rhythmicDensity: density }, localeId);
  };

  const handleMotifLengthChange = (values: number[]) => {
    const length = values[0];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicMotifLength: length });
    regenerateMelody({ ...robot, rhythmicMotifLength: length }, localeId);
  };

  const handleOctaveRangeChange = (values: number[]) => {
    const newRange: [number, number] = [values[0], values[1]];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { octaveRange: newRange });
  };

  const handleConfirmNewMelody = () => {
    regenerateMelody(robot, localeId);
  };

  return (
    <div className="rat-container">

      {/* ── Audio Mode ──────────────────────────── */}
      <div className="rat-row">
        <span className="rat-label">Audio Mode</span>
        <ToggleGroup.Root
          type="single"
          className="rat-toggle-group"
          value={audioMode}
          onValueChange={(value) => { if (value) handleAudioModeChange(value); }}
          aria-label="Audio mode"
        >
          {AUDIO_MODES.map((mode) => (
            <ToggleGroup.Item
              key={mode}
              className="rat-toggle-item"
              value={mode}
              aria-label={mode.charAt(0).toUpperCase() + mode.slice(1)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      {/* ── Rhythmic Density ────────────────────── */}
      <div className="rat-row rat-row--column">
        <div className="rat-row-header">
          <span className="rat-label">Density</span>
          <span className="rat-value">{rhythmicDensity}</span>
        </div>
        {/* Accessible numeric input for testing and screen-readers; mirrors the slider value */}
        <input
          aria-label="Rhythmic density"
          className="rat-sr"
          type="number"
          min={DENSITY_MIN}
          max={DENSITY_MAX}
          value={rhythmicDensity}
          onChange={(e) => handleDensityChange([Number(e.target.value)])}
        />
        <Slider.Root
          className="rat-slider"
          min={DENSITY_MIN}
          max={DENSITY_MAX}
          step={1}
          value={[rhythmicDensity]}
          onValueChange={handleDensityChange}
        >
          <Slider.Track className="rat-slider-track">
            <Slider.Range className="rat-slider-range" />
          </Slider.Track>
          <Slider.Thumb className="rat-slider-thumb" aria-label="Density" />
        </Slider.Root>
      </div>

      {/* ── Motif Length ────────────────────────── */}
      <div className="rat-row rat-row--column">
        <div className="rat-row-header">
          <span className="rat-label">Motif Length</span>
          <span className="rat-value">{rhythmicMotifLength}</span>
        </div>
        {/* Accessible numeric input for testing and screen-readers; mirrors the slider value */}
        <input
          aria-label="Motif length"
          className="rat-sr"
          type="number"
          min={MOTIF_MIN}
          max={MOTIF_MAX}
          value={rhythmicMotifLength}
          onChange={(e) => handleMotifLengthChange([Number(e.target.value)])}
        />
        <Slider.Root
          className="rat-slider"
          min={MOTIF_MIN}
          max={MOTIF_MAX}
          step={1}
          value={[rhythmicMotifLength]}
          onValueChange={handleMotifLengthChange}
        >
          <Slider.Track className="rat-slider-track">
            <Slider.Range className="rat-slider-range" />
          </Slider.Track>
          <Slider.Thumb className="rat-slider-thumb" aria-label="Motif" />
        </Slider.Root>
      </div>

      {/* ── Octave Range ────────────────────────── */}
      <div className="rat-row rat-row--column">
        <div className="rat-row-header">
          <span className="rat-label">Octave Range</span>
          <span className="rat-value">{octMin}–{octMax}</span>
        </div>
        <Slider.Root
          className="rat-slider"
          min={OCTAVE_MIN}
          max={OCTAVE_MAX}
          step={1}
          value={[octMin, octMax]}
          minStepsBetweenThumbs={1}
          onValueChange={handleOctaveRangeChange}
        >
          <Slider.Track className="rat-slider-track">
            <Slider.Range className="rat-slider-range" />
          </Slider.Track>
          <Slider.Thumb className="rat-slider-thumb" aria-label="Minimum octave" />
          <Slider.Thumb className="rat-slider-thumb" aria-label="Maximum octave" />
        </Slider.Root>
      </div>

      {/* ── New Melody ──────────────────────────── */}
      <div className="rat-row">
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button className="rat-btn" type="button">
              New Melody
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="rat-dialog-overlay" />
            <AlertDialog.Content className="rat-dialog-content">
              <AlertDialog.Title className="rat-dialog-title">
                Regenerate melody?
              </AlertDialog.Title>
              <AlertDialog.Description className="rat-dialog-description">
                The current melody will be replaced.
              </AlertDialog.Description>
              <div className="rat-dialog-actions">
                <AlertDialog.Cancel asChild>
                  <button className="rat-btn rat-btn--secondary" type="button">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button className="rat-btn" type="button" onClick={handleConfirmNewMelody}>
                    Regenerate
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>

    </div>
  );
}

export default RobotAudioTab;
