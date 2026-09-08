import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';

import { getCabinetPopDuration } from './cabinetAnimation';
import { useCabinetBoxHeight } from './useCabinetBoxHeight';
import { computeCabinetGeometry, CABINET_POP_DISTANCE } from '@/utils/cabinetGeometry';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import './CabinetBox.css';

interface CabinetBoxProps {
  /** Whether/how far the box should be popped. `true`/`1` is fully popped,
   *  `false`/`0` is flat — Button and Toggle pass a boolean (no intermediate
   *  state, per 11.1.1 §3/11.1.2). VoxelTrack (roadmap 11.1.3) is the first
   *  consumer needing a genuine fractional value, for extrusion-falloff's
   *  per-box step-down. Normalized to a 0-1 number immediately on entry —
   *  everything downstream uses that normalized value only. See
   *  docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.1. */
  popped: boolean | number;
  /** Unique timelineMap key for this instance, e.g. `cabinet-button-${schema.id}`
   *  or `cabinet-toggle-${schema.id}`. */
  timelineKey: string;
  /** Optional fixed box height, overriding the breakpoint-driven 32/40/48px
   *  default from useCabinetBoxHeight(). Toggle (roadmap Phase 11.1.2) passes
   *  a fixed 32 regardless of viewport — it sits inline next to its own
   *  DualLabel row rather than filling a hub tile, so there's no content to
   *  accommodate at a larger size on wider breakpoints. See
   *  docs/specs/OBLIQUE_CABINETRY_TOGGLE.md §1.2. */
  boxHeight?: number;
  /** Optional — Button nests its own DualLabel here; Toggle renders a bare,
   *  textless box and omits this entirely. See
   *  docs/specs/OBLIQUE_CABINETRY_TOGGLE.md §1.3. */
  children?: ReactNode;
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
export function CabinetBox({ popped, timelineKey, boxHeight: boxHeightOverride, children }: CabinetBoxProps) {
  // Normalized once, here — everything downstream (the isTransition
  // comparison, the geometry calls, the glow tween, the effect's own
  // dependency array) uses this 0-1 number only, never the raw prop. See
  // docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.1.
  const poppedT = typeof popped === 'number' ? popped : (popped ? 1 : 0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const topFaceRef = useRef<SVGPolygonElement>(null);
  const leftFaceRef = useRef<SVGPolygonElement>(null);
  const [width, setWidth] = useState(0);
  // Always called (Rules of Hooks), even when boxHeightOverride is supplied —
  // its result is simply unused in that case.
  const responsiveBoxHeight = useCabinetBoxHeight();
  const boxHeight = boxHeightOverride ?? responsiveBoxHeight;
  // Tracks the poppedT value the geometry effect last actually ran for —
  // null means "hasn't run yet". Lets the effect tell a real popped
  // transition apart from a width/boxHeight-only re-run (e.g. a
  // breakpoint-crossing resize while already popped), which must reposition
  // instantly rather than replay the pop/flat animation from the opposite
  // state — see the effect below.
  const prevPoppedRef = useRef<number | null>(null);

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

    // A real transition only when poppedT itself changed since the last
    // time this effect ran — never on the very first run (prevPoppedRef
    // still null), which always transitions in from the numeric opposite,
    // same as before this distinction existed.
    const previousPopped = prevPoppedRef.current; // captured before being overwritten below
    const isTransition = previousPopped === null || previousPopped !== poppedT;
    prevPoppedRef.current = poppedT;

    const target = computeCabinetGeometry(width, boxHeight, poppedT);

    if (!isTransition) {
      // width/boxHeight changed while poppedT stayed the same (e.g. a
      // breakpoint-crossing resize while hovered/focused) — reposition
      // instantly to the same target state. Replaying the pop/flat tween
      // here would incorrectly assume the box is coming from the *opposite*
      // state and visibly flatten-then-re-pop an already-popped box.
      gsap.set(topFaceRef.current, { attr: { points: target.topFacePoints } });
      gsap.set(leftFaceRef.current, { attr: { points: target.leftFacePoints } });
      gsap.set(frontRef.current, { x: target.frontFaceOffsetX, y: target.frontFaceOffsetY });
      gsap.set(wrapperRef.current, { '--cabinet-glow': poppedT });
      return;
    }

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = getCabinetPopDuration(prefersReducedMotion);
    // On the very first run (previousPopped === null), animate in from the
    // numeric opposite — reproduces the old binary "opposite of popped"
    // behavior exactly when poppedT is 0 or 1 (1-0=1, 1-1=0), and
    // generalizes sensibly for a fractional starting value. See
    // docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.1.
    const from = computeCabinetGeometry(width, boxHeight, previousPopped ?? (1 - poppedT));
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
      // --cabinet-glow tweens alongside the offset, set on the shared
      // wrapper (not the front face) so the walls — a sibling of the front
      // face, not its descendant — can also inherit it via CSS custom
      // property inheritance. Drives CabinetBox.css's drop-shadow on the
      // walls (the "back" of the box, not the moving front), tracking the
      // exact same t as the pop distance rather than a separately-eased
      // transition — now genuinely continuous, not just 0/1, once a
      // fractional poppedT is in play (roadmap 11.1.3).
      .fromTo(wrapperRef.current,
        { '--cabinet-glow': previousPopped ?? (1 - poppedT) },
        { '--cabinet-glow': poppedT, duration, ease: 'power2.out' }, 0);
    setTimeline(timelineKey, tl);
  }, [poppedT, width, boxHeight, timelineKey]);

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
