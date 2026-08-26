import { describe, it, expect } from 'vitest';

import {
  ROBOT_SELECTION_ROW_SCHEMAS,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
  AUDIO_MODE_LABELS,
  AUDIO_STATUS_COLOR_MAP,
} from './robotSelectionConfig';
import { JobType, DockingState } from '@/types/Robot';

// Every Robot['audioMode'] value per its own type comment (Robot.ts) — no const-object export
// exists for this union today, unlike JobType/DockingState, so the literal list is spelled out
// here rather than derived.
const AUDIO_MODES = ['none', 'mute', 'solo', 'highlight'] as const;

describe('robotSelectionConfig', () => {
  describe('ROBOT_SELECTION_ROW_SCHEMAS', () => {
    it('matches ROBOT_DATA_GRID.md\'s exact lore/human pairs for the five card rows', () => {
      expect(ROBOT_SELECTION_ROW_SCHEMAS.name).toMatchObject({ loreLabel: 'ROBOT IDENTIFIER', humanLabel: 'Robot Name' });
      expect(ROBOT_SELECTION_ROW_SCHEMAS.job).toMatchObject({ loreLabel: 'ASSIGNED PROTOCOL', humanLabel: 'Job Data' });
      expect(ROBOT_SELECTION_ROW_SCHEMAS.battery).toMatchObject({ loreLabel: 'POWER CELL STATUS', humanLabel: 'Battery Data' });
      expect(ROBOT_SELECTION_ROW_SCHEMAS.docking).toMatchObject({ loreLabel: 'DOCKING STATE', humanLabel: 'Docked Status' });
      expect(ROBOT_SELECTION_ROW_SCHEMAS.audio).toMatchObject({ loreLabel: 'PROBE DIAGNOSTICS', humanLabel: 'Audio Setting' });
    });

    it('every row schema is a dualLabel-typed ControlSchema with a unique id', () => {
      const rows = Object.values(ROBOT_SELECTION_ROW_SCHEMAS);
      for (const row of rows) {
        expect(row.type).toBe('dualLabel');
        expect(row.id).toBeTruthy();
      }
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    });
  });

  describe('JOB_TYPE_LABELS', () => {
    it('covers every JobType member with a loreLabel and humanLabel', () => {
      for (const type of Object.values(JobType)) {
        expect(JOB_TYPE_LABELS[type]).toBeDefined();
        expect(JOB_TYPE_LABELS[type].loreLabel).toBeTruthy();
        expect(JOB_TYPE_LABELS[type].humanLabel).toBeTruthy();
      }
    });
  });

  describe('UNASSIGNED_JOB_LABEL', () => {
    it('provides a loreLabel and humanLabel for a robot with no job', () => {
      expect(UNASSIGNED_JOB_LABEL.loreLabel).toBeTruthy();
      expect(UNASSIGNED_JOB_LABEL.humanLabel).toBeTruthy();
    });
  });

  describe('DOCKING_STATE_LABELS', () => {
    it('covers every DockingState member with a loreLabel and humanLabel', () => {
      for (const state of Object.values(DockingState)) {
        expect(DOCKING_STATE_LABELS[state]).toBeDefined();
        expect(DOCKING_STATE_LABELS[state].loreLabel).toBeTruthy();
        expect(DOCKING_STATE_LABELS[state].humanLabel).toBeTruthy();
      }
    });
  });

  describe('AUDIO_MODE_LABELS', () => {
    it('covers every audioMode value with a loreLabel and humanLabel', () => {
      for (const mode of AUDIO_MODES) {
        expect(AUDIO_MODE_LABELS[mode]).toBeDefined();
        expect(AUDIO_MODE_LABELS[mode].loreLabel).toBeTruthy();
        expect(AUDIO_MODE_LABELS[mode].humanLabel).toBeTruthy();
      }
    });
  });

  describe('AUDIO_STATUS_COLOR_MAP', () => {
    it('maps none/mute/solo/highlight to purple/red/green/amber, per confirmed intake', () => {
      expect(AUDIO_STATUS_COLOR_MAP.none).toBe('purple');
      expect(AUDIO_STATUS_COLOR_MAP.mute).toBe('red');
      expect(AUDIO_STATUS_COLOR_MAP.solo).toBe('green');
      expect(AUDIO_STATUS_COLOR_MAP.highlight).toBe('amber');
    });

    it('covers every audioMode value', () => {
      for (const mode of AUDIO_MODES) {
        expect(AUDIO_STATUS_COLOR_MAP[mode]).toBeDefined();
      }
    });
  });
});
