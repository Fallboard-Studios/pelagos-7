import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';

import { getCabinetPopDuration } from './cabinetAnimation';
import { useCabinetBoxHeight } from './useCabinetBoxHeight';
import { computeCabinetGeometry, CABINET_POP_DISTANCE } from '@/utils/cabinetGeometry';
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
 * footprint via CSS padding, and carries the --cabinet-glow custom property
 * the walls' drop-shadow reads (CabinetBox.css) — the box glows more, the
 * further it's popped. See docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1
 * for the full derivation.
 */
export function CabinetBox({ popped, timelineKey, children }: CabinetBoxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const topFaceRef = useRef<SVGPolygonElement>(null);
  const leftFaceRef = useRef<SVGPolygonElement>(null);
  const [width, setWidth] = useState(0);
  const boxHeight = useCabinetBoxHeight();
  // Tracks the `popped` value the geometry effect last actually ran for —
  // null means "hasn't run yet". Lets the effect tell a real popped
  // transition apart from a width/boxHeight-only re-run (e.g. a
  // breakpoint-crossing resize while already popped), which must reposition
  // instantly rather than replay the pop/flat animation from the opposite
  // state — see the effect below.
  const prevPoppedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const el = frontRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      // The front face has its own horizontal padding (CabinetBox.css's
      // .sc-cabinet-box__front), so its real rendered width is the
      // border-box size, not the content box — `contentRect` always
      // reports content-box regardless of the `box` option below, so the
      // wall geometry must read `borderBoxSize` instead. Falls back to
      // contentRect.width only when borderBoxSize genuinely isn't
      // available (e.g. an older environment/mock).
      const borderBoxWidth = entry.borderBoxSize?.[0]?.inlineSize;
      setWidth(borderBoxWidth ?? entry.contentRect.width);
    });
    observer.observe(el, { box: 'border-box' });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => killTimeline(timelineKey);
  }, [timelineKey]);

  useEffect(() => {
    if (!frontRef.current || !topFaceRef.current || !leftFaceRef.current || !wrapperRef.current || width === 0) return;
    killTimeline(timelineKey);

    // A real transition only when `popped` itself changed since the last
    // time this effect ran — never on the very first run (prevPoppedRef
    // still null), which always transitions in from the opposite state,
    // same as before this distinction existed.
    const isTransition = prevPoppedRef.current === null || prevPoppedRef.current !== popped;
    prevPoppedRef.current = popped;

    const target = computeCabinetGeometry(width, boxHeight, popped ? 1 : 0);

    if (!isTransition) {
      // width/boxHeight changed while `popped` stayed the same (e.g. a
      // breakpoint-crossing resize while hovered/focused) — reposition
      // instantly to the same target state. Replaying the pop/flat tween
      // here would incorrectly assume the box is coming from the *opposite*
      // state and visibly flatten-then-re-pop an already-popped box.
      gsap.set(topFaceRef.current, { attr: { points: target.topFacePoints } });
      gsap.set(leftFaceRef.current, { attr: { points: target.leftFacePoints } });
      gsap.set(frontRef.current, { x: target.frontFaceOffsetX, y: target.frontFaceOffsetY });
      gsap.set(wrapperRef.current, { '--cabinet-glow': popped ? 1 : 0 });
      return;
    }

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = getCabinetPopDuration(prefersReducedMotion);
    const from = computeCabinetGeometry(width, boxHeight, popped ? 0 : 1);
    const to = target;

    const tl = gsap.timeline();
    tl.fromTo(topFaceRef.current,
      { attr: { points: from.topFacePoints } },
      { attr: { points: to.topFacePoints }, duration, ease: 'power2.out' }, 0)
      .fromTo(leftFaceRef.current,
        { attr: { points: from.leftFacePoints } },
        { attr: { points: to.leftFacePoints }, duration, ease: 'power2.out' }, 0)
      .fromTo(frontRef.current,
        { x: from.frontFaceOffsetX, y: from.frontFaceOffsetY },
        { x: to.frontFaceOffsetX, y: to.frontFaceOffsetY, duration, ease: 'power2.out' }, 0)
      // --cabinet-glow tweens 0→1 alongside the offset, set on the shared
      // wrapper (not the front face) so the walls — a sibling of the front
      // face, not its descendant — can also inherit it via CSS custom
      // property inheritance. Drives CabinetBox.css's drop-shadow on the
      // walls (the "back" of the box, not the moving front), tracking the
      // exact same t as the pop distance rather than a separately-eased
      // transition.
      .fromTo(wrapperRef.current,
        { '--cabinet-glow': popped ? 0 : 1 },
        { '--cabinet-glow': popped ? 1 : 0, duration, ease: 'power2.out' }, 0);
    setTimeline(timelineKey, tl);
  }, [popped, width, boxHeight, timelineKey]);

  // Both custom properties are computed here, in the one place that already
  // resolves the breakpoint tier for the geometry math (useCabinetBoxHeight)
  // and already imports CABINET_POP_DISTANCE — CSS reads them via var()
  // instead of independently re-deriving the same two numbers through its
  // own @media rules, collapsing what used to be two duplicated,
  // hand-synced sources down to this one. Same "JS-owned value applied as
  // an inline style" pattern App.tsx's own realWorldGradient already uses.
  const cabinetTokens = {
    '--cabinet-box-height': `${boxHeight}px`,
    '--cabinet-pop-distance': `${CABINET_POP_DISTANCE}px`,
  } as CSSProperties;

  return (
    <div ref={wrapperRef} className="sc-cabinet-box" style={cabinetTokens}>
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
