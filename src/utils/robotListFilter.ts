import type { Robot } from '@/types/Robot';

/**
 * Filters the robot list down to just one company's members (Roadmap: Robot Selection Filter
 * Panel) — replaces the earlier reorder-only `sortRobotsByCompanyFocus` (which sank a selected
 * company's members to the bottom rather than hiding everyone else). `companyId === null` — both
 * "All" and "Reset", mutually exclusive with a real selectedCompanyId per uiStore.ts's own
 * selectCompany/selectAllRobots — returns `robots` completely unfiltered, exactly as before.
 *
 * Lives here rather than inline in RobotsTab.tsx (its only real consumer) because exporting a
 * bare function alongside a component from the same file trips this codebase's
 * react-refresh/only-export-components lint rule — not because of a second consumer the way
 * isRobotAudible (docs/specs/ROBOT_CARDS_REDESIGN.md) needed one.
 */
export function filterRobotsByCompanyFocus(robots: Robot[], companyId: string | null): Robot[] {
  if (!companyId) return robots;
  return robots.filter((r) => r.companyId === companyId);
}
