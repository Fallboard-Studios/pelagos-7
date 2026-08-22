import { Button } from '@/components/ui/controls/Button';
import { HUB_NAV_ITEMS } from '@/data/hubNavConfig';
import { useUIStore } from '@/stores/uiStore';
import './HubNav.css';

/**
 * The hub's tile grid, resolving docs/tasks/HUB.md Task 6 — replaces
 * ConsoleNavigation's Tabs.Root bar. Maps HUB_NAV_ITEMS to the existing
 * Button primitive; no hardcoded labels, no inline routing logic.
 */
export function HubNav() {
  const setActiveHubTile = useUIStore((s) => s.setActiveHubTile);

  return (
    <div className="hub-nav" role="region" aria-label="Hub Navigation">
      <div className="hub-nav__grid">
        {HUB_NAV_ITEMS.map((item) => (
          <Button
            key={item.schema.id}
            schema={item.schema}
            onClick={() => setActiveHubTile(item.target)}
          />
        ))}
      </div>
    </div>
  );
}

export default HubNav;
