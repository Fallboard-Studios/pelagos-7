import type { KeyboardEvent } from 'react';
import { AudioStatusBadge } from './AudioStatusBadge';
import { RobotBody } from '@/components/robot/RobotBody';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { useUIStore } from '@/stores/uiStore';
import {
  ROBOT_SELECTION_ROW_SCHEMAS,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
} from '@/data/robotSelectionConfig';
import type { Robot } from '@/types/Robot';
import './RobotSelectionCard.css';

interface RobotSelectionCardProps {
  robot: Robot;
}

/**
 * One robot's card in the Robot Selection hub tile (Roadmap Phase 8) — a native clickable
 * element, not the Button primitive, since Button accepts no children and can't hold a card's
 * worth of content. role="button"/tabIndex/onKeyDown give it the same activation contract a real
 * <button> gets for free. There are no nested interactive elements today, so Enter/Space both
 * safely map to the same selectRobot call — a future nested interactive child (unlikely) would
 * need an event.target === event.currentTarget guard here.
 */
export function RobotSelectionCard({ robot }: RobotSelectionCardProps) {
  const selectRobot = useUIStore((s) => s.selectRobot);
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
