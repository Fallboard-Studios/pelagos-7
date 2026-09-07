import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';

import { getCabinetPopDuration } from './cabinetAnimation';
import { useCabinetBoxHeight } from './useCabinetBoxHeight';
import { computeCabinetGeometry } from '@/utils/cabinetGeometry';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import './CabinetBox.css';

interface CabinetBoxProps {
  /** Whether the box should be fully popped (true) or flat (false). The
   *  caller decides *why* — hover/focus/press for Button, `active` for a
   *  future Toggle — CabinetBox only renders the resulting boolean. */
  popped: boolean;
  /** Unique timelineMap key for this instance, e.g. `cabinet-button-${schema.id}`. */
  timelineKey: string;
  children: ReactNode;
}

/**
 * The shared Oblique Cabinetry rendering primitive (roadmap Phase 11.1.1) —
 * an SVG wall overlay (pointer-events: none) plus an HTML front face holding
 * `children`, sliding along the fixed 2:1 oblique projection vector as
 * `popped` flips. The front face stays in normal document flow (its GSAP
 * x/y transform never affects layout); the wrapper reserves the popped
 * footprint via CSS padding. See docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md
 * §1 for the full derivation.
 */
export function CabinetBox({ popped, timelineKey, children }: CabinetBoxProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const topFaceRef = useRef<SVGPolygonElement>(null);
  const leftFaceRef = useRef<SVGPolygonElement>(null);
  const [width, setWidth] = useState(0);
  const boxHeight = useCabinetBoxHeight();

  useEffect(() => {
    const el = frontRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => killTimeline(timelineKey);
  }, [timelineKey]);

  useEffect(() => {
    if (!frontRef.current || !topFaceRef.current || !leftFaceRef.current || width === 0) return;
    killTimeline(timelineKey);

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = getCabinetPopDuration(prefersReducedMotion);

    const flat = computeCabinetGeometry(width, boxHeight, 0);
    const full = computeCabinetGeometry(width, boxHeight, 1);
    const from = popped ? flat : full;
    const to = popped ? full : flat;

    const tl = gsap.timeline();
    tl.fromTo(topFaceRef.current,
      { attr: { points: from.topFacePoints } },
      { attr: { points: to.topFacePoints }, duration, ease: 'power2.out' }, 0)
      .fromTo(leftFaceRef.current,
        { attr: { points: from.leftFacePoints } },
        { attr: { points: to.leftFacePoints }, duration, ease: 'power2.out' }, 0)
      .fromTo(frontRef.current,
        { x: from.frontFaceOffsetX, y: from.frontFaceOffsetY },
        { x: to.frontFaceOffsetX, y: to.frontFaceOffsetY, duration, ease: 'power2.out' }, 0);
    setTimeline(timelineKey, tl);
  }, [popped, width, boxHeight, timelineKey]);

  return (
    <div className="sc-cabinet-box">
      <svg className="sc-cabinet-box__walls" aria-hidden="true" focusable="false">
        <polygon ref={topFaceRef} className="sc-cabinet-box__top-face" />
        <polygon ref={leftFaceRef} className="sc-cabinet-box__left-face" />
      </svg>
      <div ref={frontRef} className="sc-cabinet-box__front">
        {children}
      </div>
    </div>
  );
}
