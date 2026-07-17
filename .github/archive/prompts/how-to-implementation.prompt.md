---
name: how-to-implementation
description: Implementation patterns and "how-to" reference for audio scheduling and animation in Pelagos-7
agent: ask
tools:
  - read_file
  - grep_search
---

This consolidated how-to prompt provides canonical, repo‑specific implementation patterns for two frequently used domains:
- audio scheduling (BeatClock + AudioEngine)
- visual animation (GSAP timelines + useGSAP)

Use `mode` to focus the answer on `audio` or `animation` (or omit for both).

How do I implement: ${input:task:robot audio scheduling or robot animation}? (mode: ${input:mode:audio|animation})

---

## Audio (BeatClock + AudioEngine)

Key rules (short):
- All audio lives in `AudioEngine` (Tone.js only in `src/engine`)
- Use `BeatClock` / `Tone.Transport` for musical timing — never setTimeout/rAF/queueMicrotask
- Use `AudioEngine.scheduleNote()` or `AudioEngine.registerRobotMelody()` for playback
- Apply MIN_LEAD lookahead when scheduling
- Melodies use note indices (0..7); harmony palettes are looked up at playback time

Example patterns:
```ts
// Schedule immediate note
AudioEngine.scheduleNote({ robotId, noteIndex: 2, length: '8n' });

// Schedule after N beats (musical time)
BeatClock.scheduleAfterBeats(16, () => {
  AudioEngine.scheduleNote({ robotId, noteIndex: 4, length: '4n' });
});

// Repeating schedule (use Transport/BeatClock)
BeatClock.scheduleRepeat('4m', (time) => {
  AudioEngine.scheduleNote({ robotId, noteIndex: 0, time: time + MIN_LEAD });
});
```

Where to look in repo:
- `src/engine/AudioEngine.ts`
- `src/engine/BeatClock.ts`
- Melody system files: `src/engine/melodyGenerator.ts`

Reference docs: `docs/AUDIO_SYSTEM.md`, `docs/BEAT_CLOCK.md`.

---

## Animation (GSAP + timelineMap)

Key rules (short):
- Use `useGSAP` hook for component timelines
- Store timelines in `timelineMap` (never in React or Zustand state)
- Timeline callbacks must be semantic events only (e.g., `onComplete: () => onRobotArrived(id)`)
- Kill timelines on unmount / state change
- Do not schedule audio from inside GSAP callbacks — use semantic handlers

Example pattern:
```tsx
useGSAP(() => {
  const tl = gsap.timeline({ onComplete: () => onRobotArrived(robot.id) });
  tl.to(ref.current, { x: dest.x, y: dest.y, duration: 3 });
  setTimeline(robot.id, tl);
  return () => { tl.kill(); removeTimeline(robot.id); };
}, [robot.destination]);
```

Where to look in repo:
- `src/animation/timelineMap.ts`
- `src/components/robot/*` components

Reference docs: `.github/copilot-instructions.md` (animation section), `docs/ANIMATION_SYSTEM.md`.

---

## Quick troubleshooting checks (both domains)
- Ensure you are not importing Tone.js outside `AudioEngine`
- Ensure `BeatClock` is used for timing (no setInterval/setTimeout/rAF/queueMicrotask)
- Ensure GSAP timelines are cleaned up and not stored in state
- Verify state remains serializable (no timelines, synths, refs in Zustand)

---

If you want, show me a file path and I'll extract an in-repo example and a minimal copy-paste snippet.