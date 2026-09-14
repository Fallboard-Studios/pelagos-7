import { useEffect, useRef, useState } from 'react';
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

// Plain schema constant, no domain config file — this is console-screen chrome (the panel's own
// open/close toggle), the same pattern ConsolePanel.tsx's own BACK_SCHEMA already uses, not a
// companyConfig.ts-owned schema.
const FILTER_TOGGLE_SCHEMA: ButtonSchema = { id: 'robotFilterPanel.toggle', type: 'button', humanLabel: 'Filters' };

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
 */
export function RobotFilterPanel() {
  const tier = useCabinetTier();
  const isDesktop = tier === 'desktop';
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const allRobotsSelected = useUIStore((s) => s.allRobotsSelected);

  useEffect(() => () => killTimeline(TIMELINE_KEY), []);

  function animateTo(nextOpen: boolean) {
    const el = panelRef.current;
    if (!el || isDesktop) return; // desktop never transforms — always laid out in flow
    killTimeline(TIMELINE_KEY);
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline();
    tl.to(el, { xPercent: nextOpen ? 0 : -100, duration: prefersReducedMotion ? 0 : SLIDE_DURATION, ease: 'power2.out' });
    setTimeline(TIMELINE_KEY, tl);
  }

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
        <CompanyManager />
      </div>
    </>
  );
}

export default RobotFilterPanel;
