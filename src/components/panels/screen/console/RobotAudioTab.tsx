import { } from 'react';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { AudioEngine } from '@/engine/AudioEngine';
import { generateMelodyForRobot } from '@/engine/melodyGenerator';
import type { Robot } from '@/types/Robot';

import './RobotAudioTab.css';

export default function RobotAudioTab({ robot }: { robot: Robot }) {
  const localeId = getActiveLocaleId();
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  const commitUpdate = (updates: Partial<Robot>) => {
    if (!localeId || !selectedRobotId) return;
    useLocaleStore.getState().updateRobot(localeId, robot.id, updates);
  };

  const scheduleRegenerate = (robotId: string) => {
    queueMicrotask(() => {
      try {
        const state = useLocaleStore.getState();
        const current = state.getRobotById(localeId, robotId);
        if (!current) return;
        const events = current.rhythmicDensity ?? 8;
        const octaveRange = current.octaveRange ?? [3, 4];
        const melody = generateMelodyForRobot({ events, octaveRange });
        AudioEngine.unregisterRobotMelody(current.id);
        AudioEngine.registerRobotMelody(current.id, melody as never);
      } catch (err) {
        console.warn('[RobotAudioTab] regenerate error', err);
      }
    });
  };

  // Handlers
  const onDensityChange = (v: number) => {
    commitUpdate({ rhythmicDensity: v });
    scheduleRegenerate(robot.id);
  };

  const onMotifLengthChange = (v: number) => {
    commitUpdate({ rhythmicMotifLength: v });
    scheduleRegenerate(robot.id);
  };

  const onOctaveMinChange = (v: number) => {
    const max = robot.octaveRange?.[1] ?? 4;
    const min = Math.min(v, max);
    commitUpdate({ octaveRange: [min, max] });
  };

  const onOctaveMaxChange = (v: number) => {
    const min = robot.octaveRange?.[0] ?? 3;
    const max = Math.max(v, min);
    commitUpdate({ octaveRange: [min, max] });
  };

  const onAudioModeChange = (mode: string) => {
    commitUpdate({ audioMode: mode as Robot['audioMode'] });
  };

  return (
    <div className="robot-audio-tab">
      <div className="row">
        <label className="label">Density</label>
        <div className="control">
          <input
            aria-label="Rhythmic density"
            className="range"
            type="range"
            min={4}
            max={12}
            value={robot.rhythmicDensity ?? 8}
            onChange={(e) => onDensityChange(Number(e.target.value))}
          />
          <div className="value">{robot.rhythmicDensity ?? 8}</div>
        </div>
      </div>

      <div className="row">
        <label className="label">Motif Length</label>
        <div className="control">
          <input
            aria-label="Motif length"
            className="range"
            type="range"
            min={1}
            max={16}
            value={robot.rhythmicMotifLength ?? 8}
            onChange={(e) => onMotifLengthChange(Number(e.target.value))}
          />
          <div className="value">{robot.rhythmicMotifLength ?? 8}</div>
        </div>
      </div>

      <div className="row">
        <label className="label">Octave Range</label>
        <div className="control octave-range">
          <input
            aria-label="Octave min"
            className="small-number"
            type="number"
            min={1}
            max={8}
            value={robot.octaveRange?.[0] ?? 3}
            onChange={(e) => onOctaveMinChange(Number(e.target.value))}
          />
          <span className="sep">—</span>
          <input
            aria-label="Octave max"
            className="small-number"
            type="number"
            min={1}
            max={8}
            value={robot.octaveRange?.[1] ?? 4}
            onChange={(e) => onOctaveMaxChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="row control-row">
        <label className="label">Audio Mode</label>
        <div className="control radio-group" role="radiogroup" aria-label="Audio mode">
          {(['none', 'solo', 'mute', 'highlight'] as const).map((m) => (
            <label key={m} className={`radio-btn ${(robot.audioMode ?? 'none') === m ? 'active' : ''}`}>
              <input
                type="radio"
                name={`audio-mode-${robot.id}`}
                checked={(robot.audioMode ?? 'none') === m}
                onChange={() => onAudioModeChange(m)}
              />
              <span className="radio-label">{m}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
