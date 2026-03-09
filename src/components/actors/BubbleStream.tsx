import React, { useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { setTimeline, killTimeline, timelineMap } from '../../animation/timelineMap';

// ----------------------------------------
// TYPES
// ----------------------------------------

export interface BubbleStreamProps {
  /** ID of the parent actor; used to key the GSAP timeline. */
  actorId: string;
  /** SVG x position of the vent (scene pixels). */
  ventX: number;
  /** SVG y position of the vent top (scene pixels). */
  ventY: number;
  /** Deterministic seed for sizing and timing variation. */
  seed: number;
  /** When false the animation is paused and bubbles are hidden. */
  isActive: boolean;
  /** Current transport BPM; used to convert measures to seconds. */
  bpm: number;
  /**
   * Hue (0–360) of the parent building's body colour. A small fraction of
   * this is mixed into the bubble fill so each factory has subtly tinted
   * bubbles while still looking aquatic.
   */
  bodyHue: number;
  /**
   * Depth scale factor derived from the factory's row layer.
   * foreground = 1 (default), midground = 0.5, background = 1/3.
   * Applied to bubble radius and minimum rise height.
   */
  depthScale?: number;
}

// ----------------------------------------
// CONSTANTS
// ----------------------------------------

/** Measures between each bubble burst. */
const MEASURES_BETWEEN_BURSTS = 96;

/** Minimum pixels each bubble rises before popping. */
const MIN_RISE_PX = 100;

/** Maximum pixels each bubble rises before popping (can go off-screen). */
const MAX_RISE_PX = 500;

/** Fraction of the rise covered during the float phase before the pop. */
const RISE_FRACTION = 0.85;

/** Rise speed range in px/s; used to derive duration from distance. */
const MIN_RISE_SPEED = 40; // px/s
const MAX_RISE_SPEED = 70; // px/s

// ----------------------------------------
// HELPERS
// ----------------------------------------

/**
 * Simple LCG pseudo-random number generator.
 * Returns a function yielding deterministic floats in [0, 1).
 * Constants from Numerical Recipes.
 */
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ----------------------------------------
// COMPONENT
// ----------------------------------------

/**
 * Renders a periodic burst of animated bubbles rising from a factory vent.
 *
 * Each burst fires every ~MEASURES_BETWEEN_BURSTS measures, releasing 5–10
 * bubbles that each rise 100–500 px before popping (some will travel off-screen).
 * Rise duration scales with distance so all bubbles move at a consistent speed.
 * On mount every factory gets a random initial phase offset so bursts are
 * staggered across the world.
 */
export const BubbleStream: React.FC<BubbleStreamProps> = ({
  actorId,
  ventX,
  ventY,
  seed,
  isActive,
  bpm,
  bodyHue,
  depthScale = 1,
}) => {
  const config = React.useMemo(() => {
    const rand = makeLcg(seed);
    const radius = (8 + rand() * 2) * depthScale;            // 8–10 px scaled by depth
    const burstStagger = 0.2 + rand() * 0.2;   // 0.20–0.40 s between bubbles (1–4 s total spread)
    const count = 5 + Math.floor(rand() * 6);  // 5–10 bubbles per burst
    const secondsPerMeasure = (60 / bpm) * 4;
    const burstInterval = MEASURES_BETWEEN_BURSTS * secondsPerMeasure;
    // Scatter initial burst so factories don't all fire at the same time.
    const initialDelay = rand() * burstInterval;
    return { radius, burstStagger, count, burstInterval, initialDelay };
  }, [seed, bpm, depthScale]);

  const circleRefs = React.useMemo(
    () => Array.from({ length: config.count }, () => React.createRef<SVGCircleElement>()),
    // count is derived from seed and won't change after mount
    [config.count],
  );

  useGSAP(() => {
    const { radius, burstStagger, count, burstInterval, initialDelay } = config;

    // Per-bubble RNG: different seed space so values don't correlate with config.
    const bubbleRand = makeLcg(seed ^ 0xb0bb1e5);
    const bubbleParams = Array.from({ length: count }, () => {
      const scaledMinRise = MIN_RISE_PX * depthScale;
      const risePx = scaledMinRise + bubbleRand() * (MAX_RISE_PX - scaledMinRise);
      const riseSpeed = MIN_RISE_SPEED + bubbleRand() * (MAX_RISE_SPEED - MIN_RISE_SPEED);
      const wobbleAmp = (8 + bubbleRand() * 12) * depthScale; // 8–20 px side-to-side, scaled by depth
      const wobblePeriod = 0.4 + bubbleRand() * 0.4; // 0.4–0.8 s per half-oscillation
      const wobbleDir = bubbleRand() > 0.5 ? 1 : -1; // random initial direction
      return { risePx, riseDuration: risePx / riseSpeed, wobbleAmp, wobblePeriod, wobbleDir };
    });

    const maxDuration = Math.max(...bubbleParams.map(p => p.riseDuration));
    const totalBurstDuration = (count - 1) * burstStagger + maxDuration;
    const repeatDelay = Math.max(0, burstInterval - totalBurstDuration);

    const tl = gsap.timeline({ repeat: -1, repeatDelay, delay: initialDelay });

    circleRefs.forEach((ref, i) => {
      const { risePx, riseDuration, wobbleAmp, wobblePeriod, wobbleDir } = bubbleParams[i];
      const bubbleTl = gsap.timeline();

      // Reset to start position before each burst replay.
      bubbleTl.set(ref.current, { attr: { cx: ventX, cy: ventY, r: radius }, opacity: 0 });

      // Wobble: oscillate cx for the full rise duration (concurrent at t=0).
      const wobbleRepeats = Math.ceil(riseDuration / wobblePeriod);
      bubbleTl.to(
        ref.current,
        {
          attr: { cx: ventX + wobbleDir * wobbleAmp },
          duration: wobblePeriod,
          repeat: wobbleRepeats,
          yoyo: true,
          ease: 'sine.inOut',
        },
        0,
      );

      // Continuous cy rise: runs for the full duration so the bubble never
      // stops moving upward, even during the pop phase (concurrent at t=0).
      bubbleTl.to(
        ref.current,
        { attr: { cy: ventY - risePx }, duration: riseDuration, ease: 'power1.in' },
        0,
      );

      // Fade in during the rise phase (concurrent at t=0).
      bubbleTl.to(
        ref.current,
        { opacity: 0.6, duration: riseDuration * RISE_FRACTION, ease: 'none' },
        0,
      );

      // Pop phase: radius expands and opacity fades while bubble keeps rising.
      bubbleTl.to(
        ref.current,
        {
          attr: { r: radius * 2.5 },
          opacity: 0,
          duration: riseDuration * (1 - RISE_FRACTION),
          ease: 'power2.in',
        },
        riseDuration * RISE_FRACTION,
      );

      tl.add(bubbleTl, i * burstStagger);
    });

    setTimeline(`bubble-${actorId}`, tl);
    return () => killTimeline(`bubble-${actorId}`);
  }, { dependencies: [config, ventX, ventY, depthScale], revertOnUpdate: true });

  // Pause / resume when isActive changes.
  useEffect(() => {
    const tl = timelineMap.get(`bubble-${actorId}`);
    if (!tl) return;
    if (isActive) {
      tl.play();
    } else {
      tl.pause();
      circleRefs.forEach(ref => {
        if (ref.current) ref.current.setAttribute('opacity', '0');
      });
    }
  }, [actorId, isActive, circleRefs]);

  // Compute bubble fill color with subtle tint from bodyHue.
  const bubbleFill = React.useMemo(() => {
    const hsl = `hsl(${bodyHue}, 30%, 70%)`;
    return hsl;
  }, [bodyHue]);

  return (
    <>
      {circleRefs.map((ref, idx) => (
        <circle
          key={idx}
          ref={ref}
          cx={ventX}
          cy={ventY}
          r={config.radius}
          fill={bubbleFill}
          opacity={0}
        />
      ))}
    </>
  );
};

export default BubbleStream;
