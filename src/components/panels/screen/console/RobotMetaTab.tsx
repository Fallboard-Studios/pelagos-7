import { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { hasCycle } from '@/stores/localeStore';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';

// Minimal preset type for UI usage — mirrors stored preset shape used by RobotMetaTab
type RobotPreset = {
  id: string;
  name?: string;
  audioAttributes?: Robot['audioAttributes'];
  melody?: Robot['melody'];
  [key: string]: unknown;
};

import './RobotMetaTab.css';

export default function RobotMetaTab() {
  const localeId = getActiveLocaleId();
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  const robot = useLocaleStore((s) => {
    if (!localeId || !selectedRobotId) return undefined;
    return s.locales[localeId]?.robots?.find((r) => r.id === selectedRobotId);
  });

  const localeRobots = useLocaleStore((s) => (localeId ? s.locales[localeId]?.robots ?? [] : []));

  // Name editing (commit on blur or Enter)
  const [name, setName] = useState(robot?.name ?? '');
  useEffect(() => setName(robot?.name ?? ''), [robot?.name]);

  const commitName = () => {
    if (!robot || !localeId) return;
    const newName = name.trim();
    if (!newName) {
      setName(robot.name ?? '');
      return;
    }
    if (newName !== robot.name) {
      useLocaleStore.getState().updateRobot(localeId, robot.id, { name: newName });
    }
  };

  // Age display — update once per minute
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const formatAge = (createdAt?: number) => {
    if (!createdAt) return 'Unknown';
    const diff = Math.max(0, now - createdAt);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s old`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m old`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h old`;
    const d = Math.floor(h / 24);
    return `${d}d old`;
  };

  // Persist toggle (uses `persists` property)
  const currentPersists = robot ? (robot.persists ?? false) : false;
  const [persists, setPersists] = useState<boolean>(currentPersists);
  useEffect(() => setPersists(currentPersists), [currentPersists]);

  const togglePersists = (value: boolean) => {
    if (!robot || !localeId) return;
    setPersists(value);
    useLocaleStore.getState().updateRobot(localeId, robot.id, { persists: value });
  };

  // Copy robot targets (other robots in the same locale)
  const otherRobots = localeRobots.filter((r) => robot && r.id !== robot.id);
  const [copyTarget, setCopyTarget] = useState<string | null>(null);
  // Backup for undoing a copy operation
  const [lastBackup, setLastBackup] = useState<Partial<Robot> | null>(null);

  // Clear transient backup when selection or locale changes
  useEffect(() => {
    setLastBackup(null);
  }, [selectedRobotId, localeId]);

  // Perform copy: overwrite the currently selected robot with attributes from
  // the chosen target robot (same-locale). Do not copy `id` or `name`.
  const performCopyFromTarget = () => {
    if (!robot || !copyTarget || !localeId) return;
    const target = localeRobots.find((r) => r.id === copyTarget);
    if (!target) return;

    // Build updates from target (only copy audio/compositional attributes)
    const updates: Partial<Robot> = {};
    if (target.audioAttributes) updates.audioAttributes = target.audioAttributes;
    if (target.melody) updates.melody = target.melody;
    if (target.octaveRange) updates.octaveRange = target.octaveRange;
    if (typeof target.masterVolume === 'number') updates.masterVolume = target.masterVolume;
    // Optional fields — copy if present on the target
    // Generic helper is required so TypeScript can correlate key K between src and dst.
    const copyIfPresent = <K extends 'rhythmicDensity' | 'rhythmicMotifLength' | 'noteVariance' | 'audioMode'>(
      src: Robot, dst: Partial<Robot>, k: K
    ) => { if (src[k] !== undefined) dst[k] = src[k]; };
    const optFields = ['rhythmicDensity', 'rhythmicMotifLength', 'noteVariance', 'audioMode'] as const;
    for (const f of optFields) copyIfPresent(target, updates, f);

    // Backup current values for undo
    const backup = Object.fromEntries(
      (Object.keys(updates) as Array<keyof Robot>).map((k) => [k, robot[k]])
    ) as Partial<Robot>;
    setLastBackup(backup);

    // Apply updates to the selected robot
    useLocaleStore.getState().updateRobot(localeId, robot.id, updates as Partial<Robot>);

    // Update AudioEngine to reflect the new attributes immediately.
    // Zustand is synchronous so updateRobot has already committed; AudioEngine calls
    // are main-thread safe and require no deferral.
    try {
      AudioEngine.unregisterRobotMelody(robot.id);
      if (updates.melody && updates.melody.length > 0) {
        AudioEngine.registerRobotMelody(robot.id, updates.melody);
      }
    } catch (err) {
      console.warn('[RobotMetaTab] AudioEngine melody update error', err);
    }

    try {
      AudioEngine.releaseVoice(robot.id);
      const audioAttr = (updates.audioAttributes ?? robot.audioAttributes) as unknown as { layers?: OscillatorLayer[]; phase?: number; detune?: number };
      const layers = audioAttr?.layers;
      const phase = audioAttr?.phase ?? robot.audioAttributes?.phase;
      const detune = audioAttr?.detune ?? robot.audioAttributes?.detune;
      if (Array.isArray(layers) && layers.length > 0) {
        AudioEngine.reserveVoice(robot.id, layers, phase, detune);
      }
    } catch (err) {
      console.warn('[RobotMetaTab] AudioEngine voice re-reservation error', err);
    }

    // Clear selection so user must re-select for further copies
    setCopyTarget(null);
  };

  const undoCopy = () => {
    if (!robot || !localeId || !lastBackup) return;
    useLocaleStore.getState().updateRobot(localeId, robot.id, lastBackup as Partial<Robot>);

    try {
      AudioEngine.unregisterRobotMelody(robot.id);
      if (lastBackup.melody && lastBackup.melody.length > 0) {
        AudioEngine.registerRobotMelody(robot.id, lastBackup.melody);
      }
    } catch (err) {
      console.warn('[RobotMetaTab] AudioEngine melody undo error', err);
    }

    try {
      AudioEngine.releaseVoice(robot.id);
      const audioAttr = lastBackup.audioAttributes ?? robot.audioAttributes;
      const layers = (audioAttr as unknown as { layers?: OscillatorLayer[] })?.layers;
      const phase = (audioAttr as unknown as { phase?: number })?.phase;
      const detune = (audioAttr as unknown as { detune?: number })?.detune;
      if (Array.isArray(layers) && layers.length > 0) AudioEngine.reserveVoice(robot.id, layers, phase, detune);
    } catch (err) {
      console.warn('[RobotMetaTab] AudioEngine voice re-reservation undo error', err);
    }

    setLastBackup(null);
  };

  // Link-to-robot — use linkRobot (validates same-locale + cycle check)
  const [linkTarget, setLinkTarget] = useState<string | null>(null);

  // Reset the pending link target when the selected robot changes
  useEffect(() => setLinkTarget(null), [selectedRobotId]);

  // Robots eligible to be a parent: same locale, not self, and linking them
  // would not create a cycle (i.e. they are not descendants of the current robot).
  const linkableRobots = otherRobots.filter(
    (r) => !hasCycle(localeRobots, r.id, robot?.id ?? '')
  );

  const currentParent = robot?.linkedRobotId
    ? localeRobots.find((r) => r.id === robot.linkedRobotId)
    : null;

  const linkToRobot = () => {
    if (!robot || !localeId || !linkTarget) return;
    useLocaleStore.getState().linkRobot(localeId, robot.id, linkTarget);
    setLinkTarget(null);
  };

  const unlinkRobot = () => {
    if (!robot || !localeId) return;
    useLocaleStore.getState().unlinkRobot(localeId, robot.id);
  };

  // Preset handling — read from locale if available; otherwise empty list
  const presets = (useLocaleStore.getState().getLocaleById(localeId) as { robotPresets?: RobotPreset[] } | undefined)?.robotPresets ?? [];
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const applyPreset = () => {
    if (!robot || !localeId || !selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    const updates: Partial<Robot> = {};
    if (preset.audioAttributes) updates.audioAttributes = preset.audioAttributes;
    if (preset.melody) updates.melody = preset.melody;
    useLocaleStore.getState().updateRobot(localeId, robot.id, updates);
    setSelectedPresetId(null);
  };

  if (!selectedRobotId) return <div className="robot-meta-empty">Select a robot to edit its meta.</div>;
  if (!robot) return <div className="robot-meta-empty">Robot not found</div>;

  return (
    <div className="robot-meta-container">
      <div className="row">
        <label className="label">Name</label>
        <input
          className="text-input"
          type="text"
          value={name}
          maxLength={32}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          aria-label="Robot name"
        />
      </div>

      <div className="row">
        <label className="label">Age</label>
        <div className="age">{formatAge(robot.createdAt)}</div>
      </div>

      <div className="row control-row">
        <label className="label">Persist</label>
        <div className="control">
          <Switch.Root className="switch-root" checked={persists} onCheckedChange={togglePersists} aria-label="Persist robot">
            <Switch.Thumb className="switch-thumb" />
          </Switch.Root>
        </div>
      </div>

      <div className="row">
        <label className="label">Preset</label>
        <div className="control preset-control">
          <Select.Root value={selectedPresetId ?? ''} onValueChange={(v) => setSelectedPresetId(v || null)}>
            <Select.Trigger className="select-trigger" aria-label="Preset select">
              <Select.Value placeholder="Select preset" />
            </Select.Trigger>
            <Select.Content className="select-content">
              <Select.Viewport>
                {presets.length === 0 ? (
                  <div className="select-empty">No presets available</div>
                ) : (
                  presets.map((p) => (
                    <Select.Item key={p.id} value={p.id} className="select-item">
                      <Select.ItemText>{p.name}</Select.ItemText>
                    </Select.Item>
                  ))
                )}
              </Select.Viewport>
            </Select.Content>
          </Select.Root>

          <AlertDialog.Root>
            <AlertDialog.Trigger className="btn" disabled={!selectedPresetId}>
              Load Preset
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="dialog-overlay" />
              <AlertDialog.Content className="dialog-content">
                <AlertDialog.Title>Load Preset</AlertDialog.Title>
                <AlertDialog.Description>
                  Loading a preset will overwrite the current robot's settings. This action cannot be undone.
                </AlertDialog.Description>
                <div className="dialog-actions">
                  <AlertDialog.Cancel className="btn">Cancel</AlertDialog.Cancel>
                  <AlertDialog.Action className="btn destructive" onClick={applyPreset}>
                    Confirm
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </div>

      <div className="row">
        <label className="label">Copy Robot</label>
        <div className="control">
          <select className="native-select" value={copyTarget ?? ''} onChange={(e) => setCopyTarget(e.target.value || null)} aria-label="Copy robot target">
            <option value="">Select target</option>
            {otherRobots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
          <AlertDialog.Root>
            <AlertDialog.Trigger className="btn" disabled={!copyTarget}>
              Copy
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="dialog-overlay" />
              <AlertDialog.Content className="dialog-content">
                <AlertDialog.Title>Copy Robot</AlertDialog.Title>
                <AlertDialog.Description>
                  Replace the current robot's audio and composition with the selected robot's settings. This will overwrite audio attributes, melody, and compositional fields. This action can be undone.
                </AlertDialog.Description>
                <div className="dialog-actions">
                  <AlertDialog.Cancel className="btn">Cancel</AlertDialog.Cancel>
                  <AlertDialog.Action className="btn destructive" onClick={performCopyFromTarget}>
                    Confirm
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </div>

      {lastBackup && (
        <div className="row">
          <label className="label">Undo</label>
          <div className="control">
            <button className="btn" onClick={undoCopy}>
              Undo Copy
            </button>
          </div>
        </div>
      )}

      <div className="row">
        <label className="label">Link To Robot</label>
        <div className="control link-control">
          {currentParent ? (
            <span className="link-indicator" aria-label={`Linked to ${currentParent.name ?? currentParent.id}`}>
              → {currentParent.name ?? currentParent.id}
            </span>
          ) : null}
          {!currentParent && (
            <>
              <select
                className="native-select"
                value={linkTarget ?? ''}
                onChange={(e) => setLinkTarget(e.target.value || null)}
                aria-label="Link to parent robot"
              >
                <option value="">Select parent</option>
                {linkableRobots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? r.id}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={linkToRobot} disabled={!linkTarget}>
                Link
              </button>
            </>
          )}
          {currentParent && (
            <button className="btn" onClick={unlinkRobot}>
              Unlink
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
