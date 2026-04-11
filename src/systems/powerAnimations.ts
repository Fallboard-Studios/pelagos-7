import gsap from 'gsap';
import { setTimeline, killTimeline } from '../animation/timelineMap';

/** Brighten transport UI on power-on. */
export function playTabletPowerOn(): void {
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
}

/** Dim transport UI on power-off. */
export function playTabletPowerOff(): void {
  killTimeline('tablet-power-off');
  const tl = gsap.timeline();
  tl.to('.transport-bar__displays', { opacity: 0.25, duration: 0.5, ease: 'power2.in' })
    .to(
      '.transport-bar__btn',
      { opacity: 0.35, duration: 0.4, ease: 'power1.in', stagger: 0.04, clearProps: 'opacity' },
      '-=0.3'
    );
  setTimeline('tablet-power-off', tl);
}
