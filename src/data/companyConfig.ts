// ========================================
// IMPORTS
// ========================================
import type { SelectSchema, RadioButtonSchema, ButtonSchema, TextInputSchema, DualLabelSchema } from '../types/controls';
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

/** Distinct sentinel from FREELANCE_VALUE — two different UI surfaces (the robot-to-company
 *  assignment Select vs. this row's "view/edit this company's options" RadioButton), each with
 *  its own "nothing selected" meaning. RadioButton has no Radix empty-string restriction the way
 *  Select does, but a non-empty sentinel is kept for the same defensive reason and for symmetry. */
export const NONE_VALUE = '__none__';

/** Distinct sentinel from both NONE_VALUE and FREELANCE_VALUE — "highlight every robot
 *  regardless of company," not "no company"/"unaffiliated." Never reaches uiStore directly
 *  (translated to the selectAllRobots action at the CompanyButtonRow boundary, same as
 *  NONE_VALUE is translated to selectCompany(null)) — see uiStore.ts's allRobotsSelected. */
export const ALL_VALUE = '__all__';

/** CompanyButtonRow reuses the RadioButton primitive — a company button row is exactly "one
 *  active among many, click to select," which RadioButton already implements (including the
 *  active-state styling), rather than reinventing that with a list of independent Buttons.
 *  None and All come first (in that order) so the two "no single company" meta-options aren't
 *  separated by the (possibly long, user-generated) per-company list. */
export function buildCompanyButtonRowSchema(companies: Company[]): RadioButtonSchema {
  return {
    id: 'company.buttonRow',
    type: 'radio',
    loreLabel: 'UNIT ROSTER',
    humanLabel: 'Companies',
    options: [
      { value: NONE_VALUE, label: 'None' },
      { value: ALL_VALUE, label: 'All' },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
  };
}

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
