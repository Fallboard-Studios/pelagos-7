/**
 * Hub navigation types, resolving docs/tasks/HUB.md Task 1. Defined once here
 * so both src/stores/uiStore.ts and src/data/hubNavConfig.ts import from a
 * shared source instead of one reaching into the other.
 */
import type { ButtonSchema } from './controls';

/**
 * The three hub tiles surviving Roadmap Phase 3 (Session and Composition are
 * dropped outright). `robots` shows a list of every robot in the active
 * locale; selecting one shows its editor within the same tile (tracked via
 * uiStore's existing selectedRobotId, not a separate HubTile value) — see
 * docs/intent/phase-3-hub.md's Amendment. `audioRig`/`settings` get real
 * content in Phases 4-5.
 */
export type HubTile = 'robots' | 'audioRig' | 'settings';

/**
 * One entry in HUB_NAV_ITEMS (src/data/hubNavConfig.ts) — a HubNav tile
 * renders via the existing Button primitive, no HubNavButtonSchema variant.
 */
export interface HubNavItem {
  schema: ButtonSchema;
  target: HubTile;
}
