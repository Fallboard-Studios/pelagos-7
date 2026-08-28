import { RobotSelectionCard } from '@/components/selection/RobotSelectionCard';
import { CompanyManager } from '@/components/company/CompanyManager';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useLocaleStore } from '@/stores/localeStore';
import './RobotsTab.css';

/**
 * The `robots` hub tile's list view, resolving docs/tasks/HUB.md Task 13 and
 * docs/tasks/ROBOT_SELECTION.md Task 9 (Roadmap Phase 8). Lists every robot in the active locale
 * as a RobotSelectionCard; selecting a card sets selectedRobotId (RobotSelectionCard's own job),
 * which ConsolePanel uses to switch to RobotOptionsTab within the same tile. Read-only — the
 * roster is fixed at 12, created once at locale load (Roadmap Phase 7); there is no manual spawn
 * action. CompanyManager (Roadmap Phase 10) renders beneath the card list — the company button
 * row, CRUD, and bulk-edit panel.
 */
export function RobotsTab() {
  const localeId = getActiveLocaleId();
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
      <ul className="robots-tab__list">
        {robots.map((robot) => (
          <RobotSelectionCard key={robot.id} robot={robot} />
        ))}
      </ul>
      <CompanyManager />
    </div>
  );
}

export default RobotsTab;
