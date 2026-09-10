import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import gsap from 'gsap';

import { CabinetBox } from './CabinetBox';
import { CABINET_TOGGLE_BOX_SIZE } from './Toggle';
import { DualLabel } from './DualLabel';
import { getAccordionDuration } from './accordionAnimation';
import { withActiveClass } from './activeClass';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import type { AccordionSchema } from '@/types/controls';
import './AccordionContainer.css';

interface AccordionContainerProps {
  schema: AccordionSchema;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Row-natural facade height for the trigger's outer, permanently-popped
 *  CabinetBox (roadmap Phase 11.1.7) — not Button's breakpoint-driven
 *  32/40/48px tiles. Sized to fit DualLabel's own 2-line stack (every real
 *  AccordionContainer schema sets both loreLabel and humanLabel) plus the
 *  original trigger's own 8px top/bottom padding, now expressed as box
 *  height instead of literal padding. See
 *  docs/specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md §1.5. */
export const CABINET_ACCORDION_TRIGGER_HEIGHT = 56;

const cabinetTokens = {
  '--cabinet-accordion-toggle-size': `${CABINET_TOGGLE_BOX_SIZE}px`,
} as CSSProperties;

/**
 * A single independent collapsible section — wraps exactly one Radix
 * Accordion.Root (type="single" collapsible) + one Item, not a group
 * coordinator. A drawer wanting several independently-open sections renders
 * multiple AccordionContainer instances side by side. Open/closed is local
 * ephemeral UI state (spec §3) — presentational, not a domain value.
 * Expand/collapse animates via a GSAP timeline registered in timelineMap,
 * following PowerRockerSwitch.tsx's pattern, and respects
 * prefers-reduced-motion the same way PowerRockerSwitch.css does.
 *
 * Renders through 2 nested CabinetBoxes (roadmap Phase 11.1.7) — an outer,
 * permanently-popped facade wrapping the whole row (popped={true} +
 * skipMountAnimation, so it never actually tweens — see
 * docs/specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md §1.2) giving the
 * trigger the Oblique Cabinetry look, and an inner, genuinely-animated
 * CabinetBox in place of the old plain +/- text — state-keyed off `open`
 * exactly like Toggle (§1.3), reusing Toggle's own CABINET_TOGGLE_BOX_SIZE
 * constant rather than a new tuned size. This is the first Cabinetry item to
 * nest one CabinetBox inside another's front face; see §1.1/§1.4 for why
 * that's safe and how the two fronts stay independently styleable.
 */
export function AccordionContainer({ schema, children, defaultOpen = false }: AccordionContainerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineKey = `accordion-${schema.id}`;

  useEffect(() => {
    return () => killTimeline(timelineKey);
  }, [timelineKey]);

  // If mounted already-open, the content still needs its height freed from
  // the CSS default (height: 0) — animateTo() only runs from user
  // interaction (handleValueChange), so without this the section renders
  // visually collapsed despite aria-expanded="true" on mount.
  useEffect(() => {
    if (defaultOpen && contentRef.current) {
      contentRef.current.style.height = 'auto';
    }
    // Intentionally mount-only: defaultOpen only describes the initial
    // state: post-mount opens/closes go through animateTo() instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function animateTo(nextOpen: boolean) {
    const el = contentRef.current;
    if (!el) return;
    killTimeline(timelineKey);

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = getAccordionDuration(prefersReducedMotion);
    const targetHeight = nextOpen ? el.scrollHeight : 0;

    const tl = gsap.timeline();
    tl.to(el, {
      height: targetHeight,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        if (nextOpen) el.style.height = 'auto';
      },
    });
    setTimeline(timelineKey, tl);
  }

  function handleValueChange(value: string) {
    const nextOpen = value === schema.id;
    setOpen(nextOpen);
    animateTo(nextOpen);
  }

  return (
    <Accordion.Root
      type="single"
      collapsible
      className={withActiveClass('sc-accordion', open)}
      value={open ? schema.id : ''}
      onValueChange={handleValueChange}
    >
      <Accordion.Item value={schema.id} className="sc-accordion__item">
        <Accordion.Header className="sc-accordion__header">
          <Accordion.Trigger className="sc-accordion__trigger" style={cabinetTokens}>
            <CabinetBox
              popped
              skipMountAnimation
              boxHeight={CABINET_ACCORDION_TRIGGER_HEIGHT}
              timelineKey={`cabinet-accordion-facade-${schema.id}`}
            >
              <span className="sc-accordion__row">
                <CabinetBox
                  popped={open}
                  boxHeight={CABINET_TOGGLE_BOX_SIZE}
                  timelineKey={`cabinet-accordion-toggle-${schema.id}`}
                >
                  {/* Decorative — the open/closed affordance itself.
                      aria-expanded already carries the real state
                      accessibly; this (plus the box's own pop/flat) is
                      purely so a sighted user can tell at a glance the
                      section can be opened. Driven directly by the same
                      `open` state as everything else here, not a separate
                      Radix data-state hook. */}
                  <span className="sc-accordion__indicator" aria-hidden="true">{open ? '−' : '+'}</span>
                </CabinetBox>
                <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
              </span>
            </CabinetBox>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content ref={contentRef} className="sc-accordion__content" forceMount>
          <div className="sc-accordion__content-inner">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
