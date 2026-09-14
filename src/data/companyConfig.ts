// ========================================
// IMPORTS
// ========================================
import type { RadioButtonSchema, ButtonSchema, TextInputSchema, DualLabelSchema } from '../types/controls';
import type { Company } from '../types/Company';
import { ACCENT_COLORS } from '../constants/accentColors';

// ========================================
// COMPANY ASSIGNMENT (RadioButton)
// ========================================

/** Radix ToggleGroup (RadioButton's own underlying primitive) emits '' on a deselect-to-empty
 *  click, which RadioButton.tsx already guards against (never calls onChange with it) — this
 *  sentinel isn't load-bearing against that the way it was for Radix Select.Item's own
 *  empty-string rejection back when this schema built a Select. Kept non-empty anyway, for the
 *  same defensive-and-symmetry reason NONE_VALUE documents below, and because every consumer
 *  already branches on it (value === FREELANCE_VALUE ? null : value). */
export const FREELANCE_VALUE = '__freelance__';

/**
 * Dynamic — unlike every other schema in this file (and every other *Config.ts file in the
 * codebase), this one depends on runtime data (the current company list), so it's a function,
 * not a static export. Used for the robot-to-company assignment RadioButton in both
 * RobotSelectionCard and RobotDisplaySection. Named/typed for a Select (buildCompanySelectSchema,
 * SelectSchema) through Roadmap Phase 10; renamed and retyped to RadioButtonSchema by 10.5 when
 * Select was removed entirely — see docs/specs/COMPANY_ASSIGNMENT_RADIO.md. Each company option
 * now also carries that company's own `color` (docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.3);
 * Freelance omits it, keeping RadioButton's ambient-accent fallback.
 */
export function buildCompanyAssignmentSchema(companies: Company[]): RadioButtonSchema {
  return {
    id: 'company.assign',
    type: 'radio',
    loreLabel: 'UNIT AFFILIATION',
    humanLabel: 'Company',
    options: [
      // No color — ambient fallback (the robot card's own identityColor, cascaded from its <li>).
      { value: FREELANCE_VALUE, label: 'Freelance' },
      ...companies.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    ],
  };
}

// ========================================
// COMPANY MANAGER — BUTTON ROW / CRUD
// ========================================

/** Distinct sentinel from FREELANCE_VALUE — two different UI surfaces (the robot-to-company
 *  assignment RadioButton vs. this row's own "view/edit this company's options" RadioButton),
 *  each with its own "nothing selected" meaning. Both are RadioButton today (Roadmap 10.5) — this
 *  sentinel predates that and was already distinct from FREELANCE_VALUE for the same reason. */
export const NONE_VALUE = '__none__';

/** Distinct sentinel from both NONE_VALUE and FREELANCE_VALUE — "highlight every robot
 *  regardless of company," not "no company"/"unaffiliated." Never reaches uiStore directly
 *  (translated to the selectAllRobots action at the CompanyButtonRow boundary, same as
 *  NONE_VALUE is translated to selectCompany(null)) — see uiStore.ts's allRobotsSelected. */
export const ALL_VALUE = '__all__';

/** CompanyButtonRow reuses the RadioButton primitive — a company button row is exactly "one
 *  active among many, click to select," which RadioButton already implements (including the
 *  active-state styling), rather than reinventing that with a list of independent Buttons.
 *
 *  Order is All, then the per-company list, then Reset last (Roadmap: Robot Selection Filter
 *  Panel) — the two "no single company" meta-options deliberately sandwich the (possibly long,
 *  user-generated) company list rather than both preceding it. All shows every robot including
 *  freelancers and keeps bulk-edit armed for the whole roster (CompanyOptionsSection's own
 *  `allRobotsSelected` branch, unchanged); Reset (this schema's own NONE_VALUE sentinel, renamed
 *  from "None") shows every robot with bulk-edit disabled. Each gets its own fixed accent color —
 *  green for All, red for Reset — same as every company option's own `color`
 *  (docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.3); unlike that history, there is no longer an
 *  "ambient fallback, no color" option anywhere in this row. */
export function buildCompanyButtonRowSchema(companies: Company[]): RadioButtonSchema {
  return {
    id: 'company.buttonRow',
    type: 'radio',
    loreLabel: 'UNIT ROSTER',
    humanLabel: 'Companies',
    options: [
      { value: ALL_VALUE, label: 'All', color: ACCENT_COLORS.green },
      ...companies.map((c) => ({ value: c.id, label: c.name, color: c.color })),
      { value: NONE_VALUE, label: 'Reset', color: ACCENT_COLORS.red },
    ],
  };
}

export const COMPANY_SELECTION_HEADER_SCHEMA: DualLabelSchema = {
  id: 'company.selectionHeader',
  type: 'dualLabel',
  loreLabel: 'UNIT ROSTER',
  humanLabel: 'Companies',
};

/** Shared by both Create and Rename — both are locally-staged draft values, not committed to the
 *  store until their own button is clicked (Rename's own Submit button, added alongside Create's
 *  Commission button, matching request — was bound live to the selected company's name before). */
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

export const RENAME_COMPANY_SCHEMA: ButtonSchema = {
  id: 'company.rename',
  type: 'button',
  loreLabel: 'REDESIGNATE UNIT',
  humanLabel: 'Rename',
};

export const DELETE_COMPANY_SCHEMA: ButtonSchema = {
  id: 'company.delete',
  type: 'button',
  loreLabel: 'DECOMMISSION UNIT',
  humanLabel: 'Delete',
};
