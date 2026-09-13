import type { KeyboardEvent } from 'react';
import { RobotBody } from '@/components/robot/RobotBody';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { isRobotAudible } from '@/utils/robotAudibility';
import {
  BATTERY_READOUT_SCHEMA,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
  AUDIBILITY_LABELS,
} from '@/data/robotSelectionConfig';
import { FREELANCE_VALUE, buildCompanyAssignmentSchema } from '@/data/companyConfig';
import { getRobotColorStyle } from '@/utils/traitColors';
import type { Robot } from '@/types/Robot';
import './RobotSelectionCard.css';

interface RobotSelectionCardProps {
  robot: Robot;
}

/**
 * One robot's card in the Robot Selection hub tile (Roadmap Phase 8, redesigned Phase 15.2) —
 * two sibling regions inside the outer `<li>` (which itself carries only the robot-color scoping
 * style, no role/handlers of its own): `.robot-selection-card__top`, a native clickable element
 * (not the `Button` primitive — it has no children-slot to hold a card's worth of content) that
 * now holds the activation contract (role="button"/tabIndex/onKeyDown) the `<li>` used to carry,
 * and `.robot-selection-card__bottom`, a plain sibling holding only the company-assignment
 * `RadioButton`. Because the company section is a sibling of the clickable region rather than a
 * descendant of it, there's no nested-interactive-element bubbling concern left to guard against
 * — no `stopBubble` (see docs/specs/ROBOT_CARDS_REDESIGN.md §1.1 for the full before/after).
 */
export function RobotSelectionCard({ robot }: RobotSelectionCardProps) {
  const selectRobot = useUIStore((s) => s.selectRobot);
  const localeId = getActiveLocaleId();
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const localeRobots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const companyAssignmentSchema = buildCompanyAssignmentSchema(companies);
  const displayName = robot.name || robot.id;
  const jobLabel = robot.job ? JOB_TYPE_LABELS[robot.job.type] : UNASSIGNED_JOB_LABEL;
  const dockingLabel = DOCKING_STATE_LABELS[robot.docking];
  const statusLabel = isRobotAudible(robot.audioMode, localeRobots)
    ? AUDIBILITY_LABELS.emitting
    : AUDIBILITY_LABELS.disabled;

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
    <li className="robot-selection-card" style={getRobotColorStyle(robot.identityColor)}>
      <div
        className="robot-selection-card__top"
        role="button"
        tabIndex={0}
        aria-label={displayName}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        <div className="robot-selection-card__meta-row">
          <svg className="robot-selection-card__avatar" viewBox="-80 -80 160 160" aria-hidden="true">
            <RobotBody robot={robot} ignoreDaylight />
          </svg>

          <div className="robot-selection-card__meta-text">
            <span className="robot-selection-card__name">{displayName}</span>
            <span className="robot-selection-card__job">{jobLabel.humanLabel}</span>
            <span className="robot-selection-card__status-line">
              {dockingLabel.humanLabel} · {statusLabel.humanLabel}
            </span>
          </div>
        </div>

        <SliderLinear
          schema={BATTERY_READOUT_SCHEMA}
          value={Math.round(robot.batteryLevel)}
          onChange={() => {}}
          readOnly
        />
      </div>

      <div className="robot-selection-card__bottom">
        <RadioButton
          schema={companyAssignmentSchema}
          value={robot.companyId ?? FREELANCE_VALUE}
          onChange={handleCompanyChange}
        />
      </div>
    </li>
  );
}

export default RobotSelectionCard;
