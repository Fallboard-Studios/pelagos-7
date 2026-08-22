/**
 * Hub tile grid content, resolving docs/tasks/HUB.md Task 2. One entry per
 * surviving hub tile (Session/Composition are dropped, not represented here).
 * HubNav.tsx maps this array to Button primitives — no labels live in
 * component code.
 */
import type { HubNavItem } from '@/types/hub';

export const HUB_NAV_ITEMS: HubNavItem[] = [
  {
    schema: { id: 'robots', type: 'button', loreLabel: 'UNIT ROSTER', humanLabel: 'Robots' },
    target: 'robots',
  },
  {
    schema: { id: 'audioRig', type: 'button', loreLabel: 'SIGNAL CHAIN', humanLabel: 'Audio Rig' },
    target: 'audioRig',
  },
  {
    schema: { id: 'settings', type: 'button', loreLabel: 'SECTOR CONTROL', humanLabel: 'Settings' },
    target: 'settings',
  },
];
