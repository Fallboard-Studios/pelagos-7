import { describe, it, expect } from 'vitest';

import {
  FREELANCE_VALUE,
  buildCompanySelectSchema,
  CREATE_COMPANY_SCHEMA,
  COMPANY_NAME_INPUT_SCHEMA,
  DELETE_COMPANY_SCHEMA,
} from './companyConfig';
import { CONTROL_SCHEMA_TYPES } from '@/types/controls';
import type { Company } from '@/types/Company';

const ALL_SCHEMAS = [CREATE_COMPANY_SCHEMA, COMPANY_NAME_INPUT_SCHEMA, DELETE_COMPANY_SCHEMA];

describe('companyConfig', () => {
  it('every schema type is one of the 14 closed-set ControlSchema variants', () => {
    ALL_SCHEMAS.forEach((schema) => {
      expect(CONTROL_SCHEMA_TYPES).toContain(schema.type);
    });
  });

  it('every schema id is namespaced under "company." — never colliding with robotOptionsConfig\'s "robotOptions." namespace', () => {
    ALL_SCHEMAS.forEach((schema) => {
      expect(schema.id.startsWith('company.')).toBe(true);
    });
  });

  describe('FREELANCE_VALUE', () => {
    it('is a non-empty string — Radix Select.Item rejects an empty-string value', () => {
      expect(typeof FREELANCE_VALUE).toBe('string');
      expect(FREELANCE_VALUE.length).toBeGreaterThan(0);
    });
  });

  describe('buildCompanySelectSchema', () => {
    it('starts with the Freelance option, followed by one entry per company', () => {
      const companies: Company[] = [
        { id: 'c1', name: 'Iron Consortium', robotIds: [] },
        { id: 'c2', name: 'Null Syndicate', robotIds: [] },
      ];

      const schema = buildCompanySelectSchema(companies);

      expect(schema.type).toBe('select');
      expect(schema.options[0]).toEqual({ value: FREELANCE_VALUE, label: 'Freelance' });
      expect(schema.options[1]).toEqual({ value: 'c1', label: 'Iron Consortium' });
      expect(schema.options[2]).toEqual({ value: 'c2', label: 'Null Syndicate' });
      expect(schema.options).toHaveLength(3);
    });

    it('returns just the Freelance option when there are no companies yet', () => {
      const schema = buildCompanySelectSchema([]);
      expect(schema.options).toEqual([{ value: FREELANCE_VALUE, label: 'Freelance' }]);
    });

    it('is namespaced under "company." like every other schema in this file', () => {
      expect(buildCompanySelectSchema([]).id.startsWith('company.')).toBe(true);
    });
  });
});
