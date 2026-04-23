import { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import type { Robot } from '@/types/Robot';

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

  const copyToTarget = () => {
    if (!robot || !copyTarget || !localeId) return;
    useLocaleStore.getState().updateRobot(localeId, copyTarget, {
      audioAttributes: robot.audioAttributes,
      melody: robot.melody,
      octaveRange: robot.octaveRange,
      masterVolume: robot.masterVolume,
    });
  };

  // Link-to-robot
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const linkToRobot = () => {
    if (!robot || !localeId) return;
    useLocaleStore.getState().updateRobot(localeId, robot.id, { linkedRobotId: linkTarget ?? null });
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
          <button className="btn" onClick={copyToTarget} disabled={!copyTarget}>
            Copy
          </button>
        </div>
      </div>

      <div className="row">
        <label className="label">Link To Robot</label>
        <div className="control">
          <select className="native-select" value={linkTarget ?? ''} onChange={(e) => setLinkTarget(e.target.value || null)} aria-label="Link to robot target">
            <option value="">Select target</option>
            {otherRobots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name ?? r.id}
              </option>
            ))}
          </select>
          <button className="btn" onClick={linkToRobot} disabled={!linkTarget}>
            Link
          </button>
        </div>
      </div>
    </div>
  );
}
