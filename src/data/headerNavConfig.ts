/**
 * Header row 3's nav group (docs/intent/header-hub-consolidation.md,
 * docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4) — replaced the old
 * src/data/hubNavConfig.ts's HUB_NAV_ITEMS/HubNavItem, now deleted along
 * with the HubNav tile grid it fed. option.value IS the HubTile string
 * directly — no separate target field, since RadioButton's value/onChange
 * already round-trips through activeHubTile one-for-one.
 *
 * No schema-level loreLabel/humanLabel (DualLabel renders nothing above the
 * group as a result) — matches the old tile grid's own lack of a group
 * heading, at the cost of the group root's own aria-label falling back to
 * schema.id ('headerHubNav') rather than a real phrase. Flagged, not
 * silently decided — see docs/specs/HEADER_HUB_CONSOLIDATION.md §7 item #2.
 */
import type { RadioButtonSchema } from '@/types/controls';

export const HEADER_NAV_SCHEMA: RadioButtonSchema = {
  id: 'headerHubNav',
  type: 'radio',
  options: [
    { value: 'robots', label: 'Robots' },
    { value: 'audioRig', label: 'Audio Rig' },
    { value: 'settings', label: 'Sector Settings' },
  ],
};
