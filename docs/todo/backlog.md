# Backlog

Tracks todos, bug fixes, and cleanup items that aren't part of a roadmap phase — usually
surfaced by a `/code-review-and-quality` pass (or similar) on unrelated feature work, not
planned as work in their own right. Distinct from `docs/roadmap/roadmap.md`, which only
tracks features/phases with their own Create/Restructure/About/Docs shape.

Not a spec — this is a review-output backlog. Each item gets its own `/interview-me` or
spec pass (as warranted by its size) when picked up; check it off here once merged. Not
itself one of CLAUDE.md's Reference docs.

See also [docs/DUPLICATE_VALUE_AUDIT.md](DUPLICATE_VALUE_AUDIT.md) — a dedicated sibling
backlog for one specific bug class (independently-declared duplicate values) rather than a
duplicate of this doc.

## Open items

### 1. Header Nav: Single-Instance Responsive RadioButton

Found during `/code-review-and-quality` on the Header & Hub Consolidation work
(2026-09-12). Moved here from roadmap item 14 (2026-09-11) — not a correctness bug, no
other Header work in flight, and no urgency; queued until something else legitimately
touches Header's layout so the CSS-restructuring risk gets amortized into work already
happening.

`Header.tsx` currently renders the nav `RadioButton` group twice — `.primary` (inside
`.header__row--status-nav`, shown ≥430px) and `.secondary` (its own row, shown below that)
— both fully mounted at all times, CSS `display: none` hiding whichever doesn't apply for
the current breakpoint. This duplication was the root cause of a real bug (fixed via
`useId()` in `RadioButton.tsx`, `bug/header-radio-fix`): two simultaneously-mounted
instances of the identical `HEADER_NAV_SCHEMA` collided in the shared, module-level
`timelineMap`, one instance's GSAP tween killing the other's mid-animation. `useId()`
stops the collision but doesn't remove the duplication itself — every render still carries
two full `CabinetBox` trees (6 backing/wall/front DOM nodes, 6 `ResizeObserver`s, 6 sets of
mouse listeners) for a control only ever visually needed once.

Not a correctness bug on its own — today's `useId()` fix already makes the duplication
safe. A standing architecture/performance cost worth removing rather than living with
indefinitely, and a precedent worth not repeating the next time a control needs to
reposition responsively.

**Fix shape (not yet built):** restructure so a single `RadioButton` instance can occupy
either visual position depending on breakpoint — e.g. reshape the surrounding layout so
both target positions are named areas of one shared CSS Grid the single instance moves
between, rather than duplicating the component tree. `.rocker-spacer` (holding `.primary`)
and the top-level `.secondary` row sit at different DOM nesting depths today, not siblings
in one grid — scope that restructuring before starting. A JS/media-query conditional swap
was considered and rejected: it would remount the `RadioButton`'s 3 `CabinetBox` trees on
every breakpoint crossing (worse than today's always-mounted-but-hidden state) and
reintroduces the JS-driven responsive layout `Header.css`'s own top comment says this file
deliberately moved away from. Some groundwork already sits unused in `Header.css`:
`.header__row--nav`/`.header__row--status`/`.header__row--volume` already declare a
`grid-area`, currently inert since no ancestor is `display: grid` — likely a leftover from
an earlier grid-based layout attempt, and a plausible starting point for the real fix.
`Header.test.tsx`'s "renders 3 nav options, once per responsive nav group (.primary +
.secondary)" assertion will need to become "once" when this ships.
