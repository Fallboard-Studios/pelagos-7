import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';

import { getCabinetPopDuration, getCabinetPopEase } from './cabinetAnimation';
import { useCabinetBoxHeight } from './useCabinetBoxHeight';
import {
  computeCabinetFrontFaceOffset,
  CABINET_POP_DISTANCE,
  CABINET_TOP_FACE_SKEW_DEG,
  CABINET_LEFT_FACE_SKEW_DEG,
} from '@/utils/cabinetGeometry';
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
  /** Optional, overriding CABINET_POP_DISTANCE (cabinetGeometry.ts) — how
   *  far the front face slides at full pop. Button/Toggle omit this (their
   *  own single-box-in-isolation context reads right at the smaller
   *  default); VoxelTrack (roadmap 11.1.3) passes VOXEL_TRACK_POP_DISTANCE,
   *  since a row of many boxes read together benefits from a deeper,
   *  more visible protrusion than one isolated box does. */
  popDistance?: number;
  /** Optional per-instance front-face size overrides, applied as inline
   *  styles that win over any CSS-forced sizing (e.g. VoxelTrack.css's
   *  uniform --voxel-box-size square). Omit either/both to let CSS/content
   *  decide, as every existing consumer already relies on. The front
   *  face's own ResizeObserver measurement (below) picks up whatever the
   *  real rendered width ends up being either way — no separate geometry
   *  plumbing needed for these. VoxelTrack's own straddling box (roadmap
   *  11.1.3) is the only consumer that needs these, to physically shrink
   *  along the value axis instead of showing an internal fill gradient. */
  frontWidth?: number;
  frontHeight?: number;
  /** Optional inline z-index override for the wrapper (.sc-cabinet-box).
   *  Button/Toggle (single box, no siblings to compete with) omit this and
   *  keep CSS's own default (DOM order). VoxelTrack (roadmap 11.1.3) needs
   *  it: every box's walls extend along the fixed down-right 2:1 oblique
   *  vector regardless of position, so a box whose walls bleed into a
   *  neighbor's space must paint OVER that neighbor — not guaranteed by
   *  DOM order alone once pop distance varies per box. See
   *  voxelTrackMath.ts's computeVoxelBoxZIndex. */
  zIndex?: number;
  /** Optional — skips the animated pop-in/pop-out tween on this instance's
   *  very first render, positioning directly at the target geometry via
   *  gsap.set() instead (same instant path the dependency-only-rerun branch
   *  below already uses). Button/Toggle omit this: a genuinely new element
   *  appearing for the first time deserves the pop-in flourish. VoxelTrack
   *  passes it on every box it renders, because a "first mount" there is
   *  frequently NOT a box appearing for the first time — React remounts a
   *  box at the ordinary/straddling role boundary (element type changes at
   *  the same key: a plain CabinetBox vs. the straddling slot's two-piece
   *  wrapper) every time the straddling index moves, even though the box
   *  was already visible a frame earlier. Without this flag, that remount's
   *  reset prevPoppedRef (null) made every such boundary box replay a full
   *  flat↔popped tween from the numeric opposite — a spurious animation
   *  flash with no real transition behind it. A later REAL popped change on
   *  the same (still-mounted) instance is unaffected and animates normally
   *  regardless of this flag — see the effect below. */
  skipMountAnimation?: boolean;
  /** Optional — Button nests its own DualLabel here; Toggle renders a bare,
   *  textless box and omits this entirely. See
   *  docs/specs/OBLIQUE_CABINETRY_TOGGLE.md §1.3. */
  children?: ReactNode;
}

/**
 * The shared Oblique Cabinetry rendering primitive (roadmap Phase 11.1.1) —
 * a static backing rectangle, two wall divs (pointer-events: none, a fixed
 * CSS skew set once on mount plus an animated scaleY/scaleX — see the
 * one-time skew effect and the geometry effect below), and an HTML front
 * face holding `children`, sliding along the fixed 2:1 oblique projection
 * vector as `popped` flips. The front face stays in normal document flow
 * (its GSAP x/y transform never affects layout); the wrapper carries the
 * --cabinet-glow custom property both the walls' drop-shadow and the walls'
 * own opacity read (CabinetBox.css) — the box glows more AND fades toward
 * 50% opaque, the further it's popped, so the backing (always fully opaque,
 * always exactly the box's own resting footprint, never transformed) shows
 * through behind the popped facade. Confirmed via /interview-me, 2026-09-09.
 * See docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1 for the original
 * oblique-projection derivation, and
 * docs/specs/OBLIQUE_CABINETRY_WALL_RENDERING.md for why the walls are two
 * CSS-transformed divs rather than SVG polygons tweening a `points`
 * attribute (the latter is main-thread/paint-bound and visibly lagged the
 * front face's own compositor-driven transform under load).
 */
export function CabinetBox({ popped, timelineKey, boxHeight: boxHeightOverride, popDistance, frontWidth, frontHeight, zIndex, skipMountAnimation, children }: CabinetBoxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  // Both walls are plain <div>s (not SVG <polygon>s) — see
  // docs/specs/OBLIQUE_CABINETRY_WALL_RENDERING.md. A fixed CSS skew
  // (set once, below) plus an animated scale reproduces the same oblique
  // parallelogram the old points-attribute tweening did, entirely on the
  // compositor.
  const topFaceRef = useRef<HTMLDivElement>(null);
  const leftFaceRef = useRef<HTMLDivElement>(null);
  // Always called (Rules of Hooks), even when boxHeightOverride is supplied —
  // its result is simply unused in that case.
  const responsiveBoxHeight = useCabinetBoxHeight();
  const boxHeight = boxHeightOverride ?? responsiveBoxHeight;
  // Post-implementation correction, 2026-09-09: initialized from a real,
  // same-paint value instead of a hardcoded 0. The front face's real
  // rendered width is only known asynchronously (the ResizeObserver below),
  // but frontWidth (when given — every VoxelTrack box) IS that real width
  // already, and boxHeight is an exact match too whenever the front is
  // square (every VoxelTrack/Toggle box; a reasonable non-zero guess even
  // for Button, corrected moments later by the observer regardless). This
  // ONLY feeds the top-face div's own width style below — the geometry
  // effect stopped depending on width entirely in the wall-rendering
  // rewrite, so this doesn't change when either wall's pop animates.
  // Starting from a real value instead of 0 closes a flicker the earlier
  // width-gate fix (see the geometry effect's own comment below) didn't:
  // that fix made the WALL SCALE/POSITION instant on a fresh mount, but the
  // top-face's own WIDTH still rendered 0px until the observer's first
  // callback — a collapsed-to-nothing top wall for a frame, most visible on
  // VoxelTrack's constant straddle-boundary remounts (skipMountAnimation)
  // while dragging a slider. Found live, reported directly by Crawford.
  const [width, setWidth] = useState(frontWidth ?? boxHeight);
  const resolvedPopDistance = popDistance ?? CABINET_POP_DISTANCE;
  // Normalized once on entry — everything downstream (the geometry calls,
  // the isTransition comparison, the dependency array) uses this 0-1 number
  // only, never the raw boolean | number prop. See CabinetBoxProps.popped.
  const poppedT = typeof popped === 'number' ? popped : (popped ? 1 : 0);
  // Tracks the `poppedT` value the geometry effect last actually ran for —
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

  // `width` now feeds ONLY the top-face div's own inline style (below) —
  // sizing it to match the front face's real rendered width. It is
  // deliberately NOT a dependency of the geometry effect below: since the
  // wall-rendering rewrite (docs/specs/OBLIQUE_CABINETRY_WALL_RENDERING.md),
  // nothing that effect computes (the wall scales, the front-face offset)
  // depends on width at all — only the old SVG-polygon math did. See that
  // effect's own comment for the bug this caused before being fixed,
  // 2026-09-09.

  useEffect(() => {
    return () => killTimeline(timelineKey);
  }, [timelineKey]);

  // The wall skew is a fixed property of the 2:1 oblique projection —
  // independent of t, popDistance, or width/height — so it's set exactly
  // once, on mount, and never touched again. GSAP must own the whole
  // `transform` on these two elements (it fully replaces the inline style
  // on every write); never author `transform`/`skewX`/`skewY` as a CSS rule
  // on .sc-cabinet-box__top-face/__left-face, or it will be silently
  // dropped the first time the geometry effect below sets scaleY/scaleX.
  // See docs/specs/OBLIQUE_CABINETRY_WALL_RENDERING.md §1.4.
  useEffect(() => {
    if (!topFaceRef.current || !leftFaceRef.current) return;
    gsap.set(topFaceRef.current, { skewX: CABINET_TOP_FACE_SKEW_DEG });
    gsap.set(leftFaceRef.current, { skewY: CABINET_LEFT_FACE_SKEW_DEG });
  }, []);

  // Post-implementation correction, 2026-09-09: this effect's guard used to
  // also bail on `width === 0`, requiring the ResizeObserver above to have
  // fired at least once before running at all. That made sense under the
  // old SVG-polygon geometry (computeCabinetGeometry needed a real width to
  // compute wall points), but nothing this effect computes has depended on
  // width since the wall-rendering rewrite — the wall scales are poppedT
  // directly, and the front-face offset is width-independent. Gating on an
  // async measurement it no longer needed meant every fresh mount (e.g. a
  // VoxelTrack box remounting at the straddle-boundary) sat with NO scale
  // set on either wall for a real, if brief, window between paint and the
  // ResizeObserver's first callback — visible live as a flash/flicker
  // (found by Crawford: boxes briefly showing an incorrect intermediate
  // state while sliding past). Removing the width gate closes that window
  // entirely — the effect now runs synchronously with mount.
  useEffect(() => {
    if (!frontRef.current || !topFaceRef.current || !leftFaceRef.current || !wrapperRef.current) return;
    killTimeline(timelineKey);

    // A real transition only when `poppedT` itself changed since the last
    // time this effect ran — never on the very first run (prevPoppedRef
    // still null), which always transitions in from the opposite state,
    // same as before this distinction existed.
    const previousPopped = prevPoppedRef.current; // captured before being overwritten below
    const isFirstRun = previousPopped === null;
    const isTransition = isFirstRun || previousPopped !== poppedT;
    prevPoppedRef.current = poppedT;

    // The wall scale IS poppedT directly (§1.2's derivation) — no function
    // call needed for the walls. computeCabinetFrontFaceOffset is only
    // needed for the front face's own translate offset, which never
    // depended on width/height.
    const target = computeCabinetFrontFaceOffset(poppedT, resolvedPopDistance);

    if (!isTransition) {
      // width/boxHeight changed while `poppedT` stayed the same (e.g. a
      // breakpoint-crossing resize while hovered/focused) — reposition
      // instantly to the same target state. Replaying the pop/flat tween
      // here would incorrectly assume the box is coming from the *opposite*
      // state and visibly flatten-then-re-pop an already-popped box.
      gsap.set(topFaceRef.current, { scaleY: poppedT });
      gsap.set(leftFaceRef.current, { scaleX: poppedT });
      gsap.set(frontRef.current, { x: target.frontFaceOffsetX, y: target.frontFaceOffsetY });
      gsap.set(wrapperRef.current, { '--cabinet-glow': poppedT });
      return;
    }

    if (isFirstRun && skipMountAnimation) {
      // This instance's very first render, and the caller has told us not
      // to animate in — position directly at the target state instead of
      // tweening from the numeric opposite. No timeline to register: there
      // is no tween. See CabinetBoxProps.skipMountAnimation for why this
      // exists (VoxelTrack's straddle-boundary remounts).
      gsap.set(topFaceRef.current, { scaleY: poppedT });
      gsap.set(leftFaceRef.current, { scaleX: poppedT });
      gsap.set(frontRef.current, { x: target.frontFaceOffsetX, y: target.frontFaceOffsetY });
      gsap.set(wrapperRef.current, { '--cabinet-glow': poppedT });
      return;
    }

    // On the very first run (previousPopped === null), animate in from the
    // numeric opposite — reproduces today's Button/Toggle "opposite of the
    // binary state" behavior exactly when poppedT is 0 or 1 (1-0=1, 1-1=0,
    // matching the old ternary bit-for-bit), and generalizes sensibly for a
    // fractional starting value. Once a real prior value exists, animate
    // from that instead — never the numeric opposite of the new value.
    const fromPopped = previousPopped ?? (1 - poppedT);
    const from = computeCabinetFrontFaceOffset(fromPopped, resolvedPopDistance);
    const to = target;

    // Direction-dependent duration/ease: popping OUT (flattening) uses a
    // shorter duration and an accelerating ease, so the walls don't linger
    // at a small-but-visible size the way power2.out's own slow-approach
    // tail otherwise produces — see cabinetAnimation.ts's own comment.
    // Compared against `previousPopped`, never `fromPopped` — on the very
    // first mount, `fromPopped` is a fabricated numeric opposite (1 -
    // poppedT), not a real prior state the box is exiting from, and
    // whether that happens to be numerically larger or smaller than
    // poppedT is arbitrary (purely a function of which side of 0.5 the
    // starting value falls on). A genuine first appearance is always
    // "popping in," regardless of its starting poppedT.
    const direction = previousPopped !== null && poppedT < previousPopped ? 'out' : 'in';
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = getCabinetPopDuration(prefersReducedMotion, direction);
    const ease = getCabinetPopEase(direction);

    const tl = gsap.timeline();
    tl.fromTo(topFaceRef.current, { scaleY: fromPopped }, { scaleY: poppedT, duration, ease }, 0)
      .fromTo(leftFaceRef.current, { scaleX: fromPopped }, { scaleX: poppedT, duration, ease }, 0)
      .fromTo(frontRef.current,
        { x: from.frontFaceOffsetX, y: from.frontFaceOffsetY },
        { x: to.frontFaceOffsetX, y: to.frontFaceOffsetY, duration, ease }, 0)
      // --cabinet-glow tweens alongside the offset, set on the shared
      // wrapper (not the front face) so the walls — a sibling of the front
      // face, not its descendant — can also inherit it via CSS custom
      // property inheritance. Drives CabinetBox.css's drop-shadow on the
      // walls (the "back" of the box, not the moving front), tracking the
      // exact same t as the pop distance rather than a separately-eased
      // transition.
      .fromTo(wrapperRef.current,
        { '--cabinet-glow': fromPopped },
        { '--cabinet-glow': poppedT, duration, ease }, 0);
    setTimeline(timelineKey, tl);
  }, [poppedT, width, boxHeight, timelineKey, resolvedPopDistance, skipMountAnimation]);

  // Both custom properties are computed here, in the one place that already
  // resolves the breakpoint tier for the geometry math (useCabinetBoxHeight)
  // and already imports CABINET_POP_DISTANCE — CSS reads them via var()
  // instead of independently re-deriving the same two numbers through its
  // own @media rules, collapsing what used to be two duplicated,
  // hand-synced sources down to this one. Same "JS-owned value applied as
  // an inline style" pattern App.tsx's own realWorldGradient already uses.
  const cabinetTokens = {
    '--cabinet-box-height': `${boxHeight}px`,
    '--cabinet-pop-distance': `${resolvedPopDistance}px`,
    ...(zIndex !== undefined ? { zIndex } : {}),
  } as CSSProperties;

  const frontStyle: CSSProperties = {};
  if (frontWidth !== undefined) frontStyle.width = `${frontWidth}px`;
  if (frontHeight !== undefined) frontStyle.height = `${frontHeight}px`;

  return (
    <div ref={wrapperRef} className="sc-cabinet-box" style={cabinetTokens}>
      <div className="sc-cabinet-box__backing" aria-hidden="true" />
      <div className="sc-cabinet-box__walls" aria-hidden="true">
        <div
          ref={topFaceRef}
          className="sc-cabinet-box__top-face"
          style={{ width: `${width}px`, height: `${resolvedPopDistance}px` }}
        />
        <div
          ref={leftFaceRef}
          className="sc-cabinet-box__left-face"
          style={{ width: `${2 * resolvedPopDistance}px`, height: `${boxHeight}px` }}
        />
      </div>
      <div ref={frontRef} className="sc-cabinet-box__front" style={frontStyle}>
        {children}
      </div>
    </div>
  );
}
