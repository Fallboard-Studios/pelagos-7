import type { Robot } from '@/types/Robot';

/**
 * Stable two-block partition (docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.4): every robot NOT
 * in `companyId` first (original roster order preserved within the block), that company's
 * members last (original roster order preserved within their own block too). `companyId === null`
 * — both "None" and "All", mutually exclusive with a real selectedCompanyId per uiStore.ts's own
 * selectCompany/selectAllRobots — returns `robots` completely unsorted.
 *
 * Lives here rather than inline in RobotsTab.tsx (its only real consumer) because exporting a
 * bare function alongside a component from the same file trips this codebase's
 * react-refresh/only-export-components lint rule — not because of a second consumer the way
 * isRobotAudible (docs/specs/ROBOT_CARDS_REDESIGN.md) needed one.
 */
export function sortRobotsByCompanyFocus(robots: Robot[], companyId: string | null): Robot[] {
  if (!companyId) return robots;
  const others = robots.filter((r) => r.companyId !== companyId);
  const members = robots.filter((r) => r.companyId === companyId);
  return [...others, ...members];
}
