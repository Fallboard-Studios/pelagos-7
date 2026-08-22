/**
 * Hub tile grid content, resolving docs/tasks/HUB.md Task 2. One entry per
 * surviving hub tile (Session/Composition are dropped, not represented here).
 * HubNav.tsx maps this array to Button primitives — no labels live in
 * component code.
 */
import type { HubNavItem } from '@/types/hub';

export const HUB_NAV_ITEMS: HubNavItem[] = [
  {
    schema: { id: 'robotOptions', type: 'button', loreLabel: 'UNIT ROSTER', humanLabel: 'Robot Options' },
    target: 'robotOptions',
  },
  {
    schema: { id: 'robotEditor', type: 'button', loreLabel: 'UNIT DIAGNOSTICS', humanLabel: 'Robot Editor' },
    target: 'robotEditor',
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
