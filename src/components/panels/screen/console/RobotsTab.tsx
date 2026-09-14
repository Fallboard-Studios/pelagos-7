import { RobotSelectionCard } from '@/components/selection/RobotSelectionCard';
import { CompanyManager } from '@/components/company/CompanyManager';
import { CompanyOptionsSection } from '@/components/company/CompanyOptionsSection';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { filterRobotsByCompanyFocus } from '@/utils/robotListFilter';
import './RobotsTab.css';

/**
 * The `robots` hub tile's list view, resolving docs/tasks/HUB.md Task 13 and
 * docs/tasks/ROBOT_SELECTION.md Task 9 (Roadmap Phase 8). Lists every robot in the active locale
 * as a RobotSelectionCard; selecting a card sets selectedRobotId (RobotSelectionCard's own job),
 * which ConsolePanel uses to switch to RobotOptionsTab within the same tile. Read-only — the
 * roster is fixed at 12, created once at locale load (Roadmap Phase 7); there is no manual spawn
 * action. CompanyManager (Roadmap Phase 10) renders beneath the card list — the company button
 * row and CRUD controls. CompanyOptionsSection (the bulk-edit accordions) renders directly here
 * too, as CompanyManager's own sibling rather than its child (Roadmap: Robot Selection Filter
 * Panel) — "too large to hold" alongside the button row/CRUD once those move into a filter panel.
 *
 * Roadmap: Robot Selection Filter Panel — selecting a specific company in CompanyButtonRow
 * (below) filters the list above via filterRobotsByCompanyFocus, hiding every robot not in that
 * company (was a reorder-only sink-to-the-bottom before this). Reads only selectedCompanyId, not
 * allRobotsSelected, relying on uiStore.ts's own invariant that the two are mutually exclusive.
 */
export function RobotsTab() {
  const localeId = getActiveLocaleId();
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const filteredRobots = filterRobotsByCompanyFocus(robots, selectedCompanyId);

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
      <ul className="robots-tab__list">
        {filteredRobots.map((robot) => (
          <RobotSelectionCard key={robot.id} robot={robot} />
        ))}
      </ul>
      <CompanyManager />
      <CompanyOptionsSection />
    </div>
  );
}

export default RobotsTab;
