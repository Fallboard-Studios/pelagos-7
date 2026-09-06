import { RobotBody } from '@/components/robot/RobotBody';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { Select } from '@/components/ui/controls/Select';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import {
  ROBOT_SELECTION_ROW_SCHEMAS,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
} from '@/data/robotSelectionConfig';
import { FREELANCE_VALUE, buildCompanySelectSchema } from '@/data/companyConfig';
import type { Robot } from '@/types/Robot';

import './RobotDisplaySection.css';

interface RobotDisplaySectionProps {
  robot: Robot;
}

/**
 * Robot Options' always-visible header block (not an AccordionContainer — see
 * docs/specs/ROBOT_OPTIONS.md §1). The avatar and Name/Job/Battery/Docking rows all reuse the
 * exact display pattern Phase 8's RobotSelectionCard already established — same sunlight/time-
 * agnostic RobotBody rendering (ignoreDaylight, so the portrait reads consistently regardless of
 * the active locale's time of day), same read-only DualLabel rows, no job reassignment, no
 * docking-state override (both stay fully system-driven), plus the company picker. Audio Setting
 * and Volume were rendered here via AudioSettingSection through Roadmap Phase 10, then extracted
 * out to RobotOptionsTab/CompanyOptionsSection as their own top-level Output panel
 * (docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 5) — this component is now pure read-only meta-
 * data display plus the company `Select`, nothing editable beyond that.
 */
export function RobotDisplaySection({ robot }: RobotDisplaySectionProps) {
  const localeId = getActiveLocaleId();
  const jobLabel = robot.job ? JOB_TYPE_LABELS[robot.job.type] : UNASSIGNED_JOB_LABEL;
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const companySelectSchema = buildCompanySelectSchema(companies);

  const handleCompanyChange = (value: string) => {
    useLocaleStore.getState().assignRobotToCompany(localeId, robot.id, value === FREELANCE_VALUE ? null : value);
  };

  return (
    <div className="robot-display-section">
      <svg className="robot-display-section__avatar" viewBox="-80 -80 160 160" aria-hidden="true">
        <RobotBody robot={robot} ignoreDaylight />
      </svg>

      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.name} />
        <span className="robot-display-section__value">{robot.name || robot.id}</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.job} />
        <span className="robot-display-section__value">{jobLabel.humanLabel}</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.battery} />
        <span className="robot-display-section__value">{Math.round(robot.batteryLevel)}%</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.docking} />
        <span className="robot-display-section__value">{DOCKING_STATE_LABELS[robot.docking].humanLabel}</span>
      </div>

      <div className="robot-display-section__row">
        <Select
          schema={companySelectSchema}
          value={robot.companyId ?? FREELANCE_VALUE}
          onChange={handleCompanyChange}
        />
      </div>
    </div>
  );
}

export default RobotDisplaySection;
