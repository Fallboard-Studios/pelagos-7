// ========================================
// IMPORTS
// ========================================
import type { SelectSchema, ButtonSchema, TextInputSchema, DualLabelSchema } from '../types/controls';
import type { Company } from '../types/Company';

// ========================================
// COMPANY ASSIGNMENT (Select)
// ========================================

/** Radix Select.Item rejects an empty-string value — this sentinel stands in for "no company"
 *  (Freelance) so the assignment dropdown never passes '' through onValueChange. */
export const FREELANCE_VALUE = '__freelance__';

/**
 * Dynamic — unlike every other schema in this file (and every other *Config.ts file in the
 * codebase), this one depends on runtime data (the current company list), so it's a function,
 * not a static export. Used for the robot-to-company assignment dropdown in both
 * RobotSelectionCard and RobotDisplaySection.
 */
export function buildCompanySelectSchema(companies: Company[]): SelectSchema {
  return {
    id: 'company.assign',
    type: 'select',
    loreLabel: 'UNIT AFFILIATION',
    humanLabel: 'Company',
    options: [
      { value: FREELANCE_VALUE, label: 'Freelance' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
  };
}

// ========================================
// COMPANY MANAGER — BUTTON ROW / CRUD
// ========================================

export const COMPANY_SELECTION_HEADER_SCHEMA: DualLabelSchema = {
  id: 'company.selectionHeader',
  type: 'dualLabel',
  loreLabel: 'UNIT ROSTER',
  humanLabel: 'Companies',
};

/** Shared by both Create (a staging value, not yet committed) and Rename (bound live to the
 *  selected company's name) — same schema, different data binding at the component layer. */
export const COMPANY_NAME_INPUT_SCHEMA: TextInputSchema = {
  id: 'company.name',
  type: 'textInput',
  loreLabel: 'DESIGNATION',
  humanLabel: 'Company Name',
  placeholder: 'Enter a company name…',
  maxLength: 128,
};

export const CREATE_COMPANY_SCHEMA: ButtonSchema = {
  id: 'company.create',
  type: 'button',
  loreLabel: 'COMMISSION UNIT',
  humanLabel: 'Create',
};

export const DELETE_COMPANY_SCHEMA: ButtonSchema = {
  id: 'company.delete',
  type: 'button',
  loreLabel: 'DECOMMISSION UNIT',
  humanLabel: 'Delete',
};
