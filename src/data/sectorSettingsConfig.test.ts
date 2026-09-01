// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import {
  ATTENUATION_STYLE_SCHEMA,
  COORDS_SCHEMA,
  RETRANSMIT_SCHEMA,
  STATUS_HEADER_SCHEMA,
  ATTENUATION_STYLE_PRESETS,
  COORDINATE_PRESETS,
} from './sectorSettingsConfig';
import * as sectorSettingsConfigModule from './sectorSettingsConfig';

// ========================================
// TESTS
// ========================================

describe('sectorSettingsConfig', () => {
  describe('schemas', () => {
    it('ATTENUATION_STYLE_SCHEMA is a textInput with both label fields populated', () => {
      expect(ATTENUATION_STYLE_SCHEMA.type).toBe('textInput');
      expect(ATTENUATION_STYLE_SCHEMA.loreLabel).toBeTruthy();
      expect(ATTENUATION_STYLE_SCHEMA.humanLabel).toBeTruthy();
    });

    it('ATTENUATION_STYLE_SCHEMA caps entry length — unbounded end-to-end otherwise (stored in state, hashed into a seed, rendered in the status line)', () => {
      expect(ATTENUATION_STYLE_SCHEMA.maxLength).toBe(128);
    });

    it('ATTENUATION_STYLE_SCHEMA uses Attenuation Style copy, per docs/specs/ATTENUATION_STYLE.md §4', () => {
      expect(ATTENUATION_STYLE_SCHEMA.loreLabel).toBe('ATTENUATION SEED');
      expect(ATTENUATION_STYLE_SCHEMA.humanLabel).toBe('Attenuation Style');
      expect(ATTENUATION_STYLE_SCHEMA.placeholder).toBe('Enter a new attenuation style…');
    });

    it('COORDS_SCHEMA is a coordsInput with both label fields populated', () => {
      expect(COORDS_SCHEMA.type).toBe('coordsInput');
      expect(COORDS_SCHEMA.loreLabel).toBeTruthy();
      expect(COORDS_SCHEMA.humanLabel).toBeTruthy();
    });

    it('RETRANSMIT_SCHEMA is a button with both label fields populated', () => {
      expect(RETRANSMIT_SCHEMA.type).toBe('button');
      expect(RETRANSMIT_SCHEMA.loreLabel).toBeTruthy();
      expect(RETRANSMIT_SCHEMA.humanLabel).toBeTruthy();
    });

    it('STATUS_HEADER_SCHEMA is a dualLabel with both label fields populated', () => {
      expect(STATUS_HEADER_SCHEMA.type).toBe('dualLabel');
      expect(STATUS_HEADER_SCHEMA.loreLabel).toBeTruthy();
      expect(STATUS_HEADER_SCHEMA.humanLabel).toBeTruthy();
    });

    it('every schema has a distinct, non-empty id', () => {
      const ids = [ATTENUATION_STYLE_SCHEMA, COORDS_SCHEMA, RETRANSMIT_SCHEMA, STATUS_HEADER_SCHEMA].map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toBeTruthy();
    });

    it('no longer exports AUDIO_SWELLS_ENABLED_SCHEMA — replaced by audioRigConfig.ts\'s PING_VARIANCE_AUTOMATION_SCHEMA (docs/tasks/PING-VARIANCE-AUTOMATION.md Task 7)', () => {
      expect('AUDIO_SWELLS_ENABLED_SCHEMA' in sectorSettingsConfigModule).toBe(false);
    });
  });

  describe('ATTENUATION_STYLE_PRESETS', () => {
    it('has exactly 4 entries', () => {
      expect(ATTENUATION_STYLE_PRESETS).toHaveLength(4);
    });

    it('every entry has a non-empty label and a non-empty string value', () => {
      for (const preset of ATTENUATION_STYLE_PRESETS) {
        expect(preset.label).toBeTruthy();
        expect(typeof preset.value).toBe('string');
        expect(preset.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('COORDINATE_PRESETS', () => {
    it('has exactly 4 entries', () => {
      expect(COORDINATE_PRESETS).toHaveLength(4);
    });

    it('every entry has a non-empty label and integer x/y values', () => {
      for (const preset of COORDINATE_PRESETS) {
        expect(preset.label).toBeTruthy();
        expect(Number.isInteger(preset.value.x)).toBe(true);
        expect(Number.isInteger(preset.value.y)).toBe(true);
      }
    });

    it('includes the (0, 0) "Null Basin" preset — the pre-decoupling dead-zone worst case, now safe', () => {
      const nullBasin = COORDINATE_PRESETS.find((p) => p.value.x === 0 && p.value.y === 0);
      expect(nullBasin).toBeDefined();
      expect(nullBasin?.label).toBe('Null Basin');
    });
  });
});
