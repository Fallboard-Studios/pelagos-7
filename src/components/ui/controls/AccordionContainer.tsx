import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import gsap from 'gsap';

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
          <Accordion.Trigger className="sc-accordion__trigger">
            <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content ref={contentRef} className="sc-accordion__content" forceMount>
          <div className="sc-accordion__content-inner">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
