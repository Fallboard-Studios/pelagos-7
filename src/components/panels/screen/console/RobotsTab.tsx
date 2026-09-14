import { RobotFilterPanel } from './RobotFilterPanel';
import { RobotSelectionCard } from '@/components/selection/RobotSelectionCard';
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
 * action. RobotFilterPanel (Roadmap: Robot Selection Filter Panel) renders alongside the card
 * list, inside .robots-tab__body — CompanyManager's own button row and CRUD controls, in a
 * responsive shell (always-visible sidebar on desktop, an off-canvas slide-over on mobile/tablet;
 * see that component's own doc comment). CompanyOptionsSection (the bulk-edit accordions) renders
 * directly here too, beneath .robots-tab__body — "too large to hold" inside the filter panel
 * alongside the button row/CRUD.
 *
 * Roadmap: Robot Selection Filter Panel — selecting a specific company in CompanyButtonRow
 * (inside RobotFilterPanel) filters the list above via filterRobotsByCompanyFocus, hiding every
 * robot not in that company (was a reorder-only sink-to-the-bottom before this). Reads only
 * selectedCompanyId, not allRobotsSelected, relying on uiStore.ts's own invariant that the two are
 * mutually exclusive.
 */
export function RobotsTab() {
  const localeId = getActiveLocaleId();
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const filteredRobots = filterRobotsByCompanyFocus(robots, selectedCompanyId);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
      <div className="robots-tab__body">
        <RobotFilterPanel />
        {filteredRobots.length === 0 && selectedCompany ? (
          // A real company selected, filtered down to zero members — explain the empty space
          // rather than rendering a bare, unexplained empty list. All/Reset never filters, so
          // there's no company name to name here in that case (and the fixed 12-robot roster
          // means they're never empty anyway).
          <p className="robots-tab__empty">{selectedCompany.name} currently has no assigned robots</p>
        ) : (
          <ul className="robots-tab__list">
            {filteredRobots.map((robot) => (
              <RobotSelectionCard key={robot.id} robot={robot} />
            ))}
          </ul>
        )}
      </div>
      <CompanyOptionsSection />
    </div>
  );
}

export default RobotsTab;
