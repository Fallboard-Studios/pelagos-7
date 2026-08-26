// ========================================
// IMPORTS
// ========================================
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Slider from '@radix-ui/react-slider';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useLocaleStore } from '@/stores/localeStore';
import { regenerateMelody } from '@/engine/regenerateMelody';
import type { Robot } from '@/types/Robot';
import {
  RHYTHMIC_DENSITY_MIN as DENSITY_MIN,
  RHYTHMIC_DENSITY_MAX as DENSITY_MAX,
  RHYTHMIC_MOTIF_LENGTH_MIN as MOTIF_MIN,
  RHYTHMIC_MOTIF_LENGTH_MAX as MOTIF_MAX,
  OCTAVE_RANGE_MIN as OCTAVE_MIN,
  OCTAVE_RANGE_MAX as OCTAVE_MAX,
  NOTE_VARIANCE_MIN,
  NOTE_VARIANCE_MAX,
} from '@/constants';

import './RobotAudioTab.css';

// ========================================
// TYPES
// ========================================
type AudioMode = 'none' | 'solo' | 'mute' | 'highlight';

const AUDIO_MODES: AudioMode[] = ['none', 'solo', 'mute', 'highlight'];

const AUDIO_MODE_LABELS: Record<AudioMode, { label: string; title: string }> = {
  none: { label: 'Off', title: 'No special audio routing' },
  solo: { label: 'Solo (isolate)', title: 'Isolate this robot; mute others' },
  mute: { label: 'Mute', title: 'Silence this robot' },
  highlight: { label: 'Highlight (attenuate others)', title: 'Make this robot prominent; attenuate others by ~50%' },
};

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
  const rhythmicDensity = robot.rhythmicDensity ?? 50;
  const rhythmicMotifLength = robot.rhythmicMotifLength ?? { active: true, value: 8 };
  const [octMin, octMax] = robot.octaveRange;
  const noteVariance = robot.noteVariance ?? { active: false, value: 1 };

  const handleAudioModeChange = (value: string) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { audioMode: value as AudioMode });
  };

  const handleDensityChange = (values: number[]) => {
    const density = values[0];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicDensity: density });
    regenerateMelody({ ...robot, rhythmicDensity: density }, localeId);
  };

  const handleMotifLengthActiveChange = (active: boolean) => {
    const next = { ...rhythmicMotifLength, active };
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicMotifLength: next });
    regenerateMelody({ ...robot, rhythmicMotifLength: next }, localeId);
  };

  const handleMotifLengthValueChange = (values: number[]) => {
    const next = { ...rhythmicMotifLength, value: values[0] };
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicMotifLength: next });
    regenerateMelody({ ...robot, rhythmicMotifLength: next }, localeId);
  };

  const handleNoteVarianceActiveChange = (active: boolean) => {
    const next = { ...noteVariance, active };
    useLocaleStore.getState().updateRobot(localeId, robot.id, { noteVariance: next });
    regenerateMelody({ ...robot, noteVariance: next }, localeId);
  };

  const handleNoteVarianceValueChange = (values: number[]) => {
    const next = { ...noteVariance, value: values[0] };
    useLocaleStore.getState().updateRobot(localeId, robot.id, { noteVariance: next });
    regenerateMelody({ ...robot, noteVariance: next }, localeId);
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
              aria-label={AUDIO_MODE_LABELS[mode].label}
              title={AUDIO_MODE_LABELS[mode].title}
            >
              {AUDIO_MODE_LABELS[mode].label}
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
          <span className="rat-value">{rhythmicMotifLength.value}</span>
        </div>
        <label className="rat-active-toggle">
          <input
            aria-label="Motif length active"
            type="checkbox"
            checked={rhythmicMotifLength.active}
            onChange={(e) => handleMotifLengthActiveChange(e.target.checked)}
          />
          Active
        </label>
        {/* Accessible numeric input for testing and screen-readers; mirrors the slider value */}
        <input
          aria-label="Motif length"
          className="rat-sr"
          type="number"
          min={MOTIF_MIN}
          max={MOTIF_MAX}
          value={rhythmicMotifLength.value}
          disabled={!rhythmicMotifLength.active}
          onChange={(e) => handleMotifLengthValueChange([Number(e.target.value)])}
        />
        <Slider.Root
          className="rat-slider"
          min={MOTIF_MIN}
          max={MOTIF_MAX}
          step={1}
          value={[rhythmicMotifLength.value]}
          disabled={!rhythmicMotifLength.active}
          onValueChange={handleMotifLengthValueChange}
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

      {/* ── Note Variance ───────────────────────── */}
      <div className="rat-row rat-row--column">
        <div className="rat-row-header">
          <span className="rat-label">Note Variance</span>
          <span className="rat-value">{noteVariance.value}</span>
        </div>
        <label className="rat-active-toggle">
          <input
            aria-label="Note variance active"
            type="checkbox"
            checked={noteVariance.active}
            onChange={(e) => handleNoteVarianceActiveChange(e.target.checked)}
          />
          Active
        </label>
        <input
          aria-label="Note variance"
          className="rat-sr"
          type="number"
          min={NOTE_VARIANCE_MIN}
          max={NOTE_VARIANCE_MAX}
          value={noteVariance.value}
          disabled={!noteVariance.active}
          onChange={(e) => handleNoteVarianceValueChange([Number(e.target.value)])}
        />
        <Slider.Root
          className="rat-slider"
          min={NOTE_VARIANCE_MIN}
          max={NOTE_VARIANCE_MAX}
          step={1}
          value={[noteVariance.value]}
          disabled={!noteVariance.active}
          onValueChange={handleNoteVarianceValueChange}
        >
          <Slider.Track className="rat-slider-track">
            <Slider.Range className="rat-slider-range" />
          </Slider.Track>
          <Slider.Thumb className="rat-slider-thumb" aria-label="Variance" />
        </Slider.Root>
      </div>
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
