import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import gsap from 'gsap';

import { DualLabel } from './DualLabel';
import { getAccordionDuration } from './accordionAnimation';
import { withActiveClass } from './activeClass';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import { getStatusLightColor } from '@/utils/statusLightColors';
import type { AccordionSchema } from '@/types/controls';
import './AccordionContainer.css';

interface AccordionContainerProps {
  schema: AccordionSchema;
  children: ReactNode;
  defaultOpen?: boolean;
  /**
   * Drives the trigger's status light — green when true, red when false, a
   * plain unlit dot when omitted (this accordion has no domain concept of
   * "active" to show). Deliberately independent of the accordion's own
   * open/closed state: a caller passes its own domain value here (e.g. an
   * effect's own Enabled toggle, or an LFO's Active toggle) — the light
   * never reflects expand/collapse, which aria-expanded already carries
   * accessibly.
   */
  contentActive?: boolean;
}

/**
 * A single independent collapsible section — wraps exactly one Radix
 * Accordion.Root (type="single" collapsible) + one Item, not a group
 * coordinator. A drawer wanting several independently-open sections renders
 * multiple AccordionContainer instances side by side. Open/closed is local
 * ephemeral UI state (spec §3) — presentational, not a domain value.
 * Expand/collapse animates via a GSAP timeline registered in timelineMap,
 * following PowerRockerSwitch.tsx's pattern, and respects
 * prefers-reduced-motion the same way PowerRockerSwitch.css does.
 */
export function AccordionContainer({ schema, children, defaultOpen = false, contentActive }: AccordionContainerProps) {
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

  // Color is JS-owned (computed from the single statusLightColors source), motion stays
  // CSS-owned (the pulse animation in AccordionContainer.css) — same split PowerRockerSwitch
  // uses. contentActive === undefined means "no domain active concept" — unlit dot, no inline
  // style at all, matching the plain currentColor default in CSS.
  const light = contentActive === undefined
    ? null
    : getStatusLightColor(contentActive ? 'green' : 'red');

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
          <Accordion.Trigger className="sc-accordion__trigger">
            {/* Decorative — the open/closed affordance itself. aria-expanded
                already carries the real state accessibly; this is purely so
                a sighted user can tell at a glance the section can be
                opened. Driven directly by the same `open` state as
                everything else here, not a separate Radix data-state hook. */}
            <span className="sc-accordion__indicator" aria-hidden="true">{open ? '−' : '+'}</span>
            <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
            {/* Decorative — reflects contentActive, a domain concept the
                caller supplies (e.g. this effect's own Enabled toggle, or an
                LFO's Active toggle), never the accordion's own open/closed
                state, which aria-expanded already carries accessibly. */}
            <span
              className="sc-accordion__light"
              aria-hidden="true"
              data-content-active={contentActive === undefined ? undefined : String(contentActive)}
              style={light ? { color: light.color, boxShadow: `0 0 4px 1px ${light.glow}` } : undefined}
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content ref={contentRef} className="sc-accordion__content" forceMount>
          <div className="sc-accordion__content-inner">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
