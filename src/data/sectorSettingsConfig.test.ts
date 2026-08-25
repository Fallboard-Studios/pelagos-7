// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import {
  PLANET_NAME_SCHEMA,
  COORDS_SCHEMA,
  RETRANSMIT_SCHEMA,
  STATUS_HEADER_SCHEMA,
  PLANET_NAME_PRESETS,
  COORDINATE_PRESETS,
} from './sectorSettingsConfig';

// ========================================
// TESTS
// ========================================

describe('sectorSettingsConfig', () => {
  describe('schemas', () => {
    it('PLANET_NAME_SCHEMA is a textInput with both label fields populated', () => {
      expect(PLANET_NAME_SCHEMA.type).toBe('textInput');
      expect(PLANET_NAME_SCHEMA.loreLabel).toBeTruthy();
      expect(PLANET_NAME_SCHEMA.humanLabel).toBeTruthy();
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
      const ids = [PLANET_NAME_SCHEMA, COORDS_SCHEMA, RETRANSMIT_SCHEMA, STATUS_HEADER_SCHEMA].map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toBeTruthy();
    });
  });

  describe('PLANET_NAME_PRESETS', () => {
    it('has exactly 4 entries', () => {
      expect(PLANET_NAME_PRESETS).toHaveLength(4);
    });

    it('every entry has a non-empty label and a non-empty string value', () => {
      for (const preset of PLANET_NAME_PRESETS) {
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
