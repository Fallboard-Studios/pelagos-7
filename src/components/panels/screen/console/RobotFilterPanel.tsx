import { memo, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { CompanyManager } from '@/components/company/CompanyManager';
import { Button } from '@/components/ui/controls/Button';
import { withActiveClass } from '@/components/ui/controls/activeClass';
import { useCabinetTier } from '@/components/ui/controls/useCabinetBoxHeight';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import { useUIStore } from '@/stores/uiStore';
import type { ButtonSchema } from '@/types/controls';
import './RobotFilterPanel.css';

const TIMELINE_KEY = 'robot-filter-panel';
const SLIDE_DURATION = 0.25;

// Plain schema constants, no domain config file — this is console-screen chrome (the panel's own
// open/close controls), the same pattern ConsolePanel.tsx's own BACK_SCHEMA already uses, not
// companyConfig.ts-owned schemas. humanLabel drives both the visible DualLabel text and the
// accessible name (resolveAccessibleName) — the state-changing label across these two distinct
// buttons is the only signal of open/closed state (Button.tsx has no aria-expanded passthrough).
const FILTER_TOGGLE_SCHEMA: ButtonSchema = { id: 'robotFilterPanel.toggle', type: 'button', loreLabel: 'ROSTER FILTER ACCESS [c]', humanLabel: 'Show Filters' };
const FILTER_CLOSE_SCHEMA: ButtonSchema = { id: 'robotFilterPanel.close', type: 'button', loreLabel: 'ROSTER FILTER DISMISSAL [c]', humanLabel: 'Hide Filters' };

/**
 * Responsive shell for the company filter panel (Roadmap: Robot Selection Filter Panel) — wraps
 * CompanyManager (the button row + CRUD controls) in a left-hand panel that's always visible on
 * desktop, and an off-canvas slide-over (behind a sticky toggle) on mobile/tablet. Rendered by
 * RobotsTab, to the left of the robot card list.
 *
 * Tier detection reuses useCabinetTier() (the same 3-tier mobile/tablet/desktop split
 * useResponsivePanelOrientation already groups mobile+tablet vs. desktop) — no new breakpoint
 * value. `open` is local, ephemeral UI state (the same category as AccordionContainer's own
 * `open`), starting false (off-screen) regardless of tier; it simply has no visible effect on
 * desktop, where the panel is never transformed (see RobotFilterPanel.css).
 *
 * The slide itself is a GSAP timeline registered in timelineMap, following AccordionContainer's
 * own animateTo()/setTimeline()/killTimeline() pattern exactly (a transform tween in place of a
 * height tween), respecting prefers-reduced-motion (snap instead of animate).
 *
 * Auto-closes whenever selectedCompanyId/allRobotsSelected changes post-mount — picking any
 * filter option (All, a company, or Reset) drops the user straight onto the now-filtered list,
 * confirmed in interview ("there aren't multiple options to select at once here, so we should
 * just present the results"). Skips the very first render (mount) via didMountRef, the same
 * "mount is special-cased" precedent AccordionContainer.tsx's own defaultOpen effect
 * establishes — without it, mounting with an already-selected company would otherwise fire a
 * pointless close/animate on load.
 *
 * Bugfix, found live (docs/todo/backlog.md #27 follow-up) — same class as CompanyManager's own
 * documented fix: RobotsTab (this component's own parent) re-renders on every audio-swell tick
 * (~8-9x/sec, see CompanyManager.tsx's own doc comment for the full mechanism), and this panel
 * takes zero props, so memo() is correct and sufficient (an empty prop list can never differ) —
 * it still re-renders normally whenever its own selectedCompanyId/allRobotsSelected/useCabinetTier
 * subscriptions actually change.
 */
export const RobotFilterPanel = memo(function RobotFilterPanel() {
  const tier = useCabinetTier();
  const isDesktop = tier === 'desktop';
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const allRobotsSelected = useUIStore((s) => s.allRobotsSelected);

  // Bugfix, found live: the CSS baseline (RobotFilterPanel.css) sets the closed-state resting
  // value via a stylesheet `transform: translateX(-100%)` rule, but GSAP never reads percentage
  // transforms off getComputedStyle — it resolves them to a pixel matrix and bakes that in as a
  // separate internal offset, distinct from the xPercent channel animateTo() below tweens. Left
  // unsynced, every subsequent xPercent tween composes on top of that baked-in pixel offset
  // instead of replacing it, so the panel never actually reaches its intended on/off-screen
  // position — it only ever "barely" moves. Calling gsap.set() once on mount establishes GSAP's
  // own xPercent state to match the CSS baseline before any tween runs, the same instant
  // "establish starting state via gsap.set()" pattern CabinetBox.tsx already uses for its own
  // skew setup.
  //
  // GSAP's own context.revert() (from useGSAP/contextSafe below) only kills the underlying GSAP
  // tween it tracked — it has no knowledge of our separate timelineMap registry, so this manual
  // cleanup is still required to keep that registry itself tidy on unmount (contextSafe is an
  // added safety net for the tween itself, not a replacement for this).
  useEffect(() => () => killTimeline(TIMELINE_KEY), []);

  // contextSafe wraps animateTo (called from handleToggle and the selection-change effect below,
  // not from this callback) so GSAP's own context — scoped to panelRef — tracks and reverts it
  // on unmount too, on top of the killTimeline dedup calls animateTo already makes.
  const { contextSafe } = useGSAP(() => {
    if (!panelRef.current || isDesktop) return;
    gsap.set(panelRef.current, { xPercent: -100 });
  }, { scope: panelRef, dependencies: [isDesktop] });

  const animateTo = contextSafe((nextOpen: boolean) => {
    const el = panelRef.current;
    if (!el || isDesktop) return; // desktop never transforms — always laid out in flow
    killTimeline(TIMELINE_KEY);
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline();
    tl.to(el, { xPercent: nextOpen ? 0 : -100, duration: prefersReducedMotion ? 0 : SLIDE_DURATION, ease: 'power2.out' });
    setTimeline(TIMELINE_KEY, tl);
  });

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (open) {
      setOpen(false);
      animateTo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, allRobotsSelected]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    animateTo(next);
  }

  return (
    <>
      {!isDesktop && (
        <div className="robot-filter-panel__toggle">
          <Button schema={FILTER_TOGGLE_SCHEMA} onClick={handleToggle} />
        </div>
      )}
      <div ref={panelRef} className={withActiveClass('robot-filter-panel', open)} data-tier={tier}>
        {!isDesktop && open && (
          <div className="robot-filter-panel__close">
            <Button schema={FILTER_CLOSE_SCHEMA} onClick={handleToggle} />
          </div>
        )}
        <CompanyManager />
      </div>
    </>
  );
});

export default RobotFilterPanel;
