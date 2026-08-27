import type { KeyboardEvent, ReactEventHandler } from 'react';
import { AudioStatusBadge } from './AudioStatusBadge';
import { RobotBody } from '@/components/robot/RobotBody';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { Select } from '@/components/ui/controls/Select';
import { useUIStore } from '@/stores/uiStore';
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
import './RobotSelectionCard.css';

interface RobotSelectionCardProps {
  robot: Robot;
}

/**
 * Stops a click/keydown from reaching the card's own onClick/onKeyDown. React re-propagates a
 * portal's events along the *React component tree*, not the DOM tree (see the React docs on
 * portal event bubbling) — so a `target.closest()` DOM check would miss clicks on the company
 * Select's dropdown items, which Radix renders into a portal outside this card's DOM subtree
 * entirely. Stopping propagation here, one level above the Select in the React tree, works
 * regardless of where Radix physically mounts the dropdown.
 */
const stopBubble: ReactEventHandler = (event) => event.stopPropagation();

/**
 * One robot's card in the Robot Selection hub tile (Roadmap Phase 8) — a native clickable
 * element, not the Button primitive, since Button accepts no children and can't hold a card's
 * worth of content. role="button"/tabIndex/onKeyDown give it the same activation contract a real
 * <button> gets for free. The company-assignment Select (Roadmap Phase 10) is this card's first
 * nested interactive element — its wrapper's stopBubble handlers keep it from also firing the
 * card's own selectRobot activation.
 */
export function RobotSelectionCard({ robot }: RobotSelectionCardProps) {
  const selectRobot = useUIStore((s) => s.selectRobot);
  const localeId = getActiveLocaleId();
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const companySelectSchema = buildCompanySelectSchema(companies);
  const displayName = robot.name || robot.id;
  const jobLabel = robot.job ? JOB_TYPE_LABELS[robot.job.type] : UNASSIGNED_JOB_LABEL;
  const dockingLabel = DOCKING_STATE_LABELS[robot.docking];

  function handleActivate() {
    selectRobot(robot.id);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  }

  function handleCompanyChange(value: string) {
    useLocaleStore.getState().assignRobotToCompany(localeId, robot.id, value === FREELANCE_VALUE ? null : value);
  }

  return (
    <li
      className="robot-selection-card"
      role="button"
      tabIndex={0}
      aria-label={displayName}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <svg className="robot-selection-card__avatar" viewBox="-80 -80 160 160" aria-hidden="true">
        <RobotBody robot={robot} ignoreDaylight />
      </svg>

      <div className="robot-selection-card__row robot-selection-card__row--name">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.name} />
        <span className="robot-selection-card__value">{displayName}</span>
      </div>

      <div
        className="robot-selection-card__row robot-selection-card__row--company"
        onClick={stopBubble}
        onKeyDown={stopBubble}
      >
        <Select schema={companySelectSchema} value={robot.companyId ?? FREELANCE_VALUE} onChange={handleCompanyChange} />
      </div>

      <div className="robot-selection-card__meta-grid">
        <div className="robot-selection-card__field">
          <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.job} />
          <span className="robot-selection-card__value">{jobLabel.humanLabel}</span>
        </div>

        <div className="robot-selection-card__field">
          <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.battery} />
          <span className="robot-selection-card__value">{Math.round(robot.batteryLevel)}%</span>
        </div>

        <div className="robot-selection-card__field">
          <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.docking} />
          <span className="robot-selection-card__value">{dockingLabel.humanLabel}</span>
        </div>

        <div className="robot-selection-card__field">
          <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.audio} />
          <AudioStatusBadge audioMode={robot.audioMode ?? 'none'} />
        </div>
      </div>
    </li>
  );
}

export default RobotSelectionCard;
