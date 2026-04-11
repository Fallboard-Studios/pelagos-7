// ========================================
// IMPORTS
// ========================================
import { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import * as Dialog from '@radix-ui/react-dialog';
import gsap from 'gsap';

import { useUIStore } from '../../stores/uiStore';

import { powerController } from '../../systems/powerController';
import { setTimeline, killTimeline } from '../../animation/timelineMap';

import { useGlassPortal } from '../layout/GlassViewportContext';
import './PowerRockerSwitch.css';

// ========================================
// COMPONENT
// ========================================

export function PowerRockerSwitch() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const rockerRef = useRef<SVGSVGElement>(null);
  const dialogContainer = useGlassPortal();

  // Set initial SVG attribute state via GSAP so it fully owns these attrs —
  // React has no points/y values in JSX to reconcile back on re-renders.
  useGSAP(() => {
    if (!rockerRef.current) return;
    const sel = gsap.utils.selector(rockerRef.current);
    gsap.set(sel('.rocker-top-edge'), { attr: { points: '0,5   100,5   94,15  6,15' } });
    gsap.set(sel('.rocker-top'), { attr: { points: '6,15  94,15   97,44  3,44' } });
    gsap.set(sel('.rocker-top-left'), { attr: { points: '0,5   6,15    3,44   0,44' } });
    gsap.set(sel('.rocker-top-right'), { attr: { points: '94,15 100,5   100,44 97,44' } });
    gsap.set(sel('.rocker-bottom-edge'), { attr: { points: '0,85  100,85  100,85 0,85' } });
    gsap.set(sel('.rocker-bottom'), { attr: { points: '3,44  97,44   97,85  3,85' } });
    gsap.set(sel('.rocker-bottom-left'), { attr: { points: '0,44  3,44    3,85   0,85' } });
    gsap.set(sel('.rocker-bottom-right'), { attr: { points: '97,44 100,44  100,85 97,85' } });
    gsap.set(sel('.rocker-power-svg'), { attr: { y: 54 }, scaleY: 1 });
  }, { scope: rockerRef, dependencies: [] });

  // Kill rocker timeline on unmount to prevent leaks
  useEffect(() => {
    return () => {
      killTimeline('power-rocker');
      killTimeline('power-rocker-return');
      killTimeline('tablet-power-on');
      killTimeline('tablet-power-off');
    };
  }, []);

  // ----------------------------------------
  // Rocker rock animation — fires on every
  // click as physical feedback, independent
  // of the modal outcome.
  // ----------------------------------------
  function animateRockerPress() {
    if (!rockerRef.current) return;
    killTimeline('power-rocker-return');
    killTimeline('power-rocker');
    const sel = gsap.utils.selector(rockerRef.current);
    const tl = gsap.timeline();
    const THUNK = 0.06;
    const HOLD = 0.12;

    tl
      // ── Thunk: top slams flush ─────────────────────────────────────────────
      .to(sel('.rocker-top-edge'), { attr: { points: '0,5   100,5   100,5  0,5' }, duration: THUNK, ease: 'power4.in' })
      .to(sel('.rocker-top'), { attr: { points: '3,5   97,5    97,44  3,44' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-top-left'), { attr: { points: '0,5   3,5     3,44   0,44' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-top-right'), { attr: { points: '97,5  100,5   100,44 97,44' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-bottom-edge'), { attr: { points: '0,85  100,85  94,75  6,75' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-bottom'), { attr: { points: '3,44  97,44   94,75  6,75' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-bottom-left'), { attr: { points: '0,44  3,44    6,75   0,85' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-bottom-right'), { attr: { points: '97,44 100,44  100,85 94,75' }, duration: THUNK, ease: 'power4.in' }, '<')
      .to(sel('.rocker-power-svg'), { attr: { y: 50 }, scaleY: 0.76, transformOrigin: '50% 50%', duration: THUNK, ease: 'power4.in' }, '<')
      // ── Hold (button stays depressed until dialog resolves) ────────────────
      .to({}, { duration: HOLD });
    setTimeline('power-rocker', tl);
  }

  function returnRocker() {
    if (!rockerRef.current) return;
    killTimeline('power-rocker');
    killTimeline('power-rocker-return');
    const sel = gsap.utils.selector(rockerRef.current);
    const tl = gsap.timeline();
    const MOTOR = 1.0;

    // Use fromTo with hardcoded pressed-state FROM values so this tween is
    // immune to React reconciliation writing resting-state JSX attrs back to
    // the DOM mid-animation (which would cause GSAP to read resting as FROM
    // and produce an instant snap).
    tl
      .fromTo(sel('.rocker-top-edge'),
        { attr: { points: '0,5   100,5   100,5  0,5' } },
        { attr: { points: '0,5   100,5   94,15  6,15' }, duration: MOTOR, ease: 'none' })
      .fromTo(sel('.rocker-top'),
        { attr: { points: '3,5   97,5    97,44  3,44' } },
        { attr: { points: '6,15  94,15   97,44  3,44' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-top-left'),
        { attr: { points: '0,5   3,5     3,44   0,44' } },
        { attr: { points: '0,5   6,15    3,44   0,44' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-top-right'),
        { attr: { points: '97,5  100,5   100,44 97,44' } },
        { attr: { points: '94,15 100,5   100,44 97,44' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-bottom-edge'),
        { attr: { points: '0,85  100,85  94,75  6,75' } },
        { attr: { points: '0,85  100,85  100,85 0,85' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-bottom'),
        { attr: { points: '3,44  97,44   94,75  6,75' } },
        { attr: { points: '3,44  97,44   97,85  3,85' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-bottom-left'),
        { attr: { points: '0,44  3,44    6,75   0,85' } },
        { attr: { points: '0,44  3,44    3,85   0,85' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-bottom-right'),
        { attr: { points: '97,44 100,44  100,85 94,75' } },
        { attr: { points: '97,44 100,44  100,85 97,85' }, duration: MOTOR, ease: 'none' }, '<')
      .fromTo(sel('.rocker-power-svg'),
        { attr: { y: 50 }, scaleY: 0.74 },
        { attr: { y: 54 }, scaleY: 1, transformOrigin: '50% 50%', duration: MOTOR, ease: 'none' }, '<')
      .call(() => setIsTransitioning(false));
    setTimeline('power-rocker-return', tl);
  }

  // ----------------------------------------
  // Power On
  // ----------------------------------------
  async function handlePowerOn() {
    // Centralized power startup — powerController handles audio/system init
    await powerController.start();

    // Defer mount to next paint frame so the GSAP return animation can paint
    requestAnimationFrame(() => {
      useUIStore.getState().setPowerOn();

      // GSAP wake-up timeline: brighten transport display area
      killTimeline('tablet-power-on');
      const tl = gsap.timeline();
      tl.fromTo(
        '.transport-bar__displays',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' }
      ).fromTo(
        '.transport-bar__btn',
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power1.out', stagger: 0.05, clearProps: 'opacity' },
        '-=0.2'
      );
      setTimeline('tablet-power-on', tl);
    });
  }

  // ----------------------------------------
  // Power Off confirm
  // ----------------------------------------
  async function handlePowerOffConfirm() {
    setShowConfirm(false);
    // Return rocker immediately for UI feedback
    returnRocker();
    // Delegate orchestrated shutdown (plays sleeve drain, stops systems,
    // and runs the tablet power-off UI animation).
    await powerController.shutdownWithAnimation();
  }

  // ----------------------------------------
  // Rocker click — animation fires immediately,
  // then branch on power state.
  // ----------------------------------------
  function handleRockerClick() {
    setIsTransitioning(true);
    animateRockerPress();
    if (isPoweredOn) {
      // Show modal once the button is fully depressed (THUNK + HOLD)
      const confirmTl = gsap.timeline({ onComplete: () => setShowConfirm(true) });
      // short delay matching the previous timing (≈180ms)
      confirmTl.to({}, { duration: 0.18 });
      setTimeline('power-rocker-confirm-delay', confirmTl);
    } else {
      // Orchestrate the power-on and return sequence with a timeline so timings
      // are centralized and cancelable instead of using setTimeout.
      const seq = gsap.timeline();
      // hold phase (~180ms)
      seq.to({}, { duration: 0.18, onComplete: () => { void handlePowerOn(); } });
      // extra delay before returnRocker (previously 500ms after hold)
      seq.to({}, { duration: 0.5, onComplete: () => returnRocker() });
      setTimeline('power-rocker-sequence', seq);
    }
  }

  const powerState = isPoweredOn ? 'on' : 'off';

  return (
    <>
      <div className="rocker-panel" aria-label="Device power controls">
        {/* Indicator light — rectangular lens in a recessed housing */}
        <div className="rocker-light-housing">
          <div
            className="rocker-light"
            role="status"
            aria-label={isPoweredOn ? 'Power on' : 'Power off'}
            data-power-state={powerState}
            data-transitioning={isTransitioning ? 'true' : undefined}
          />
        </div>

        {/* Rocker in its molded bezel */}
        <div className="rocker-bezel">
          <button
            className="rocker-el"
            aria-label={isPoweredOn ? 'Power off' : 'Power on'}
            onClick={handleRockerClick}
          >
            {/*
              viewBox 0 0 100 90, ridge at y=44.
              Resting: top is a wide-at-top trapezoid (0,5 → 100,5 → 93,44 → 7,44).
              The diverging sides ARE the visual "bend" — they show the surface
              angled toward the viewer. GSAP attr-tweens the points on click.
            */}
            <svg
              ref={rockerRef}
              className="rocker-svg"
              viewBox="0 0 100 90"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                {/* Body fill — gradientUnits userSpaceOnUse so shading
                    tracks absolute y regardless of polygon bounds */}
                <linearGradient id="rockerGrad" x1="0" y1="0" x2="0" y2="90" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#525252" />
                  <stop offset="44%" stopColor="#3a3a3a" />
                  <stop offset="56%" stopColor="#2b2b2b" />
                  <stop offset="100%" stopColor="#444444" />
                </linearGradient>
                {/* Ridge fill — fades to transparent at both ends */}
                <linearGradient id="rockerRidgeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="12%" stopColor="rgba(0,0,0,0.65)" />
                  <stop offset="88%" stopColor="rgba(0,0,0,0.65)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
              </defs>

              {/*
                Geometry overview (viewBox 0 0 100 90, ridge y=44):

                Resting — top protrudes:
                  top-edge  : lip strip at top, visible from above (10 units tall)
                  top face  : main face, below the lip strip
                  top side L/R: "a little bit" visible (~6 units at free end, ~12 at ridge)
                  bottom-edge : COLLAPSED (zero-height, flush — nothing sticks out)
                  bottom face : nearly full-width (3px inset only)
                  bottom side L/R: "barely" visible (3 units wide)
              */}

              {/* ─ Top half ─ */}
              {/* Points set via gsap.set in useGSAP — GSAP owns these attrs */}
              <polygon className="rocker-top-edge" />
              <polygon className="rocker-top" />
              <polygon className="rocker-top-left" />
              <polygon className="rocker-top-right" />

              {/* ─ Bottom half ─ */}
              <polygon className="rocker-bottom-edge" />
              <polygon className="rocker-bottom" />
              <polygon className="rocker-bottom-left" />
              <polygon className="rocker-bottom-right" />

              {/*
                Power symbol — nested SVG so it has its own coordinate system
                with preserveAspectRatio="xMidYMid meet". Renders undistorted
                despite the outer SVG using preserveAspectRatio="none".
                51×23 outer units → 27×27 screen px (square).
                preserveAspectRatio="none" + pre-compensated h ensures each
                inner-viewBox unit maps equally in both axes (≈0.27px/unit).
                GSAP attr-tweens `y`: 54 at rest, 50 when pressed.
                Sits before rocker-ridge so the ridge shadow paints over it.
              */}
              <svg
                className="rocker-power-svg"
                x="25"
                width="51"
                height="23"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <g fill="none" stroke="rgba(185,185,185,0.45)" strokeWidth="12" strokeLinecap="round">
                  {/* Circle arc: 300°, gap at top (±30° from 12 o'clock) */}
                  <path d="M 68,20 A 35,35 0 1,1 32,20" />
                  {/* Vertical line through gap, from above arc top down */}
                  <line x1="50" y1="4" x2="50" y2="30" />
                </g>
              </svg>

              {/* Center ridge — paints over icon so shadow falls on the surface */}
              <rect className="rocker-ridge" x="0" y="43" width="100" height="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Power-off confirmation modal */}
      <Dialog.Root
        open={showConfirm}
        onOpenChange={(open) => {
          setShowConfirm(open);
          // Always return the rocker when the dialog closes, regardless of
          // how it was dismissed. returnRocker kills any in-flight timeline
          // first so calling it more than once is safe.
          if (!open) returnRocker();
        }}
      >
        <Dialog.Portal container={dialogContainer ?? undefined}>
          <Dialog.Overlay className="power-confirm__overlay" />
          <Dialog.Content className="power-confirm__content">
            <Dialog.Title className="power-confirm__title">Power off?</Dialog.Title>
            <Dialog.Description className="power-confirm__description">
              All audio will stop.
            </Dialog.Description>
            <div className="power-confirm__actions">
              <button
                className="power-confirm__btn power-confirm__btn--confirm"
                onClick={handlePowerOffConfirm}
              >
                Confirm
              </button>
              <Dialog.Close asChild>
                <button className="power-confirm__btn">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
