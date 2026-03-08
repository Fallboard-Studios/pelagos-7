import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { setTimeline, killTimeline, timelineMap } from '../../animation/timelineMap';

// ----------------------------------------
// TYPES
// ----------------------------------------

export interface BubbleStreamProps {
  actorId: string;
  ventX: number; // SVG x position of the vent (pixels)
  ventY: number; // SVG y position of the vent (top of building, pixels)
  seed: number; // for deterministic sizing / stagger
  isActive: boolean; // false when building is offline
}

// ----------------------------------------
// HELPERS
// ----------------------------------------

// simple LCG for deterministic floats [0,1)
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // values chosen from Numerical Recipes
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ----------------------------------------
// COMPONENT
// ----------------------------------------

export const BubbleStream: React.FC<BubbleStreamProps> = ({
  actorId,
  ventX,
  ventY,
  seed,
  isActive,
}) => {
  const circleRef = useRef<SVGCircleElement>(null);

  // derive constants once per mount
  const {
    radius,
    riseDistance,
    riseDuration,
    staggerDelay,
    repeatDelay,
  } = React.useMemo(() => {
    const rand = makeLcg(seed);
    const radius = 2 + rand() * 2; // 2–4 px
    const riseDistance = 20 + rand() * 20; // 20–40 px
    const riseDuration = 2.5 + rand() * 2; // 2.5–4.5 s
    const staggerDelay = rand() * 2; // 0–2 s
    const repeatDelay = 0.4 + rand() * 0.8; // 0.4–1.2 s
    return { radius, riseDistance, riseDuration, staggerDelay, repeatDelay };
  }, [seed]);

  // create and register timeline once
  useGSAP(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay, delay: staggerDelay });
    tl.fromTo(
      circleRef.current,
      { cx: ventX, cy: ventY, opacity: 0.55 },
      {
        cx: ventX,
        cy: ventY - riseDistance,
        opacity: 0,
        duration: riseDuration,
        ease: 'power1.out',
      }
    );
    setTimeline(`bubble-${actorId}`, tl);

    // cleanup when hook torn down (component unmount)
    return () => killTimeline(`bubble-${actorId}`);
  });

  // pause/resume on isActive changes
  useEffect(() => {
    const tl = timelineMap.get(`bubble-${actorId}`);
    if (!tl) return;
    if (isActive) {
      tl.play();
    } else {
      tl.pause();
      if (circleRef.current) {
        circleRef.current.style.opacity = '0';
      }
    }
  }, [actorId, isActive]);

  // unmount cleanup double-check (should be covered by GSAP hook)
  useEffect(() => {
    return () => {
      killTimeline(`bubble-${actorId}`);
    };
  }, [actorId]);

  return (
    <circle
      ref={circleRef}
      cx={ventX}
      cy={ventY}
      r={radius}
      fill="hsl(200,40%,75%)"
      opacity={0.55}
    />
  );
};

export default BubbleStream;
