/**
 * Hub navigation types, resolving docs/tasks/HUB.md Task 1. Defined once here
 * so both src/stores/uiStore.ts and src/data/hubNavConfig.ts import from a
 * shared source instead of one reaching into the other.
 */
import type { ButtonSchema } from './controls';

/**
 * The four hub tiles surviving Roadmap Phase 3 (Session and Composition are
 * dropped outright). `robotOptions`/`robotEditor` are removed/replaced in
 * Phases 7-9; `audioRig`/`settings` get real content in Phases 4-5.
 */
export type HubTile = 'robotOptions' | 'robotEditor' | 'audioRig' | 'settings';

/**
 * One entry in HUB_NAV_ITEMS (src/data/hubNavConfig.ts) — a HubNav tile
 * renders via the existing Button primitive, no HubNavButtonSchema variant.
 */
export interface HubNavItem {
  schema: ButtonSchema;
  target: HubTile;
}
