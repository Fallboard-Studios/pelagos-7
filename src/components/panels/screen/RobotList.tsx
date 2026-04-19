// ========================================
// IMPORTS
// ========================================
import { memo } from 'react';

import type { Robot } from '../../../types/Robot';
import { RobotState } from '../../../types/Robot';
import { RobotBody } from '../../robot/RobotBody';

import { useLocaleStore } from '../../../stores/localeStore';
import { usePlanetStore } from '../../../stores/planetStore';
import { useUIStore } from '../../../stores/uiStore';

import './RobotList.css';

// ========================================
// TYPES
// ========================================
interface RobotListItemProps {
  robot: Robot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// ========================================
// CONSTANTS
// ========================================
const STATE_DOT_CLASS: Record<string, string> = {
  [RobotState.Idle]: 'dot--idle',
  [RobotState.Moving]: 'dot--moving',
  [RobotState.Selected]: 'dot--selected',
  [RobotState.Interacting]: 'dot--interacting',
  [RobotState.Leaving]: 'dot--leaving',
};

// ========================================
// SUB-COMPONENT
// ========================================
const RobotListItem = memo(function RobotListItem({ robot, isSelected, onSelect }: RobotListItemProps) {
  return (
    <button
      type="button"
      className={`robot-list-item${isSelected ? ' robot-list-item--selected' : ''}`}
      onClick={() => onSelect(robot.id)}
      aria-pressed={isSelected}
      aria-label={`Select ${robot.name ?? 'Robot'}`}
    >
      <span className="robot-list-item__preview" aria-hidden="true">
        <svg
          className="robot-list-item__preview-svg"
          viewBox="0 0 96 72"
          aria-hidden="true"
          focusable="false"
        >
          <RobotBody robot={robot} />
        </svg>
      </span>
      <span className="robot-list-item__name">{robot.name ?? 'Robot'}</span>
      <span className={`robot-list-item__dot ${STATE_DOT_CLASS[robot.state] ?? 'dot--idle'}`} aria-hidden="true" />
    </button>
  );
});

// ========================================
// COMPONENT
// ========================================
function RobotList() {
  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  function handleSelect(id: string) {
    useUIStore.getState().selectRobot(id);
    useUIStore.getState().setActiveConsoleTab('robotEditor');
  }

  return (
    <div className="robot-list">
      {robots.length === 0 ? (
        <p className="robot-list__empty">No robots</p>
      ) : (
        robots.map((robot) => (
          <RobotListItem
            key={robot.id}
            robot={robot}
            isSelected={robot.id === selectedRobotId}
            onSelect={handleSelect}
          />
        ))
      )}
    </div>
  );
}

export default RobotList;