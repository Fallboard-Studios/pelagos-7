import { useRef } from 'react';
import { RobotFilterPanel } from './RobotFilterPanel';
import { RobotSelectionCard } from '@/components/selection/RobotSelectionCard';
import { CompanyOptionsSection } from '@/components/company/CompanyOptionsSection';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { filterRobotsByCompanyFocus } from '@/utils/robotListFilter';
import './RobotsTab.css';

interface RosterEntry {
  id: string;
  companyId?: string;
}

function rosterEqual(a: RosterEntry[], b: RosterEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].companyId !== b[i].companyId) return false;
  }
  return true;
}

// Custom-equality selector (docs/todo/backlog.md #27 follow-up, 2026-09-15) — same ref-caching
// technique zustand's own `useShallow` (zustand/react/shallow) uses internally, swapping in
// `rosterEqual` in place of `shallow`: Zustand v5's store hook has no second `equalityFn`
// parameter (that was a v4 API, replaced by wrapper selectors like `useShallow`), so a custom
// comparator has to be implemented as a *wrapping selector*, not passed as a second argument.
//
// Why this is needed at all: `robots.map()` below always allocates a fresh array, and
// `updateRobot` (localeStore.ts) hands back a new top-level `robots` array reference on *every*
// write to *any* robot in the locale (battery ticks, audio swells, field edits) even though it
// preserves each untouched robot's own object reference — so a plain selector here would force
// this whole tile to re-render on every one of those writes, even ones that don't add/remove/
// reassign anyone. This narrows what "changed" means for this component to just the two things
// it actually cares about for building the filtered/ordered id list: which robots exist, and
// which company each is in. Individual cards get their own robot data independently
// (RobotSelectionCard.tsx's own by-id lookup), so this roster never needs to carry battery/audio/
// job/docking data at all.
function useRobotRoster(localeId: string): RosterEntry[] {
  const prevRef = useRef<RosterEntry[]>([]);
  return useLocaleStore((s) => {
    const next = (s.locales[localeId]?.robots ?? []).map((r) => ({ id: r.id, companyId: r.companyId }));
    if (rosterEqual(prevRef.current, next)) return prevRef.current;
    prevRef.current = next;
    return next;
  });
}

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
  const roster = useRobotRoster(localeId);
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const filteredRoster = filterRobotsByCompanyFocus(roster, selectedCompanyId);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="robots-tab" role="region" aria-label="Robots">
      <div className="robots-tab__body">
        <RobotFilterPanel />
        {filteredRoster.length === 0 && selectedCompany ? (
          // A real company selected, filtered down to zero members — explain the empty space
          // rather than rendering a bare, unexplained empty list. All/Reset never filters, so
          // there's no company name to name here in that case (and the fixed 12-robot roster
          // means they're never empty anyway).
          <p className="robots-tab__empty">{selectedCompany.name} currently has no assigned robots</p>
        ) : (
          <ul className="robots-tab__list">
            {filteredRoster.map((entry) => (
              <RobotSelectionCard key={entry.id} robotId={entry.id} />
            ))}
          </ul>
        )}
      </div>
      <CompanyOptionsSection />
    </div>
  );
}

export default RobotsTab;
