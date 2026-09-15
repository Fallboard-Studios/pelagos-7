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
 *
 * Generic over `T` (docs/todo/backlog.md #27 follow-up, 2026-09-15) rather than hardcoded to
 * `Robot[]` — RobotsTab.tsx now calls this against a narrow `{ id, companyId }` roster (not full
 * `Robot` objects) as part of decoupling its own re-render from every robot's own field updates;
 * this function only ever reads `companyId`, so a full `Robot[]` still satisfies the constraint
 * unchanged (confirmed by robotListFilter.test.ts's own existing `Robot[]`-typed fixtures).
 */
export function filterRobotsByCompanyFocus<T extends { companyId?: string | null }>(robots: T[], companyId: string | null): T[] {
  if (!companyId) return robots;
  return robots.filter((r) => r.companyId === companyId);
}
