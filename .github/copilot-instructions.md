# Pelagos-7 — Concise Copilot Instructions

Purpose: a short, focused guidance file for Copilot-style assistants and contributors. Full implementation and examples live in the linked docs; use this file for quick rules and pointers.

TL;DR (critical rules)
- All audio: `AudioEngine` only (singleton). No local Tone.js synths in components.
	- All timing: `Tone.Transport` / `BeatClock` (measure-based). No `setTimeout`/`setInterval`/`requestAnimationFrame`/`queueMicrotask` for musical timing.
- All animation: GSAP timelines only; store timelines in `timelineMap`, not in React/Zustand state.
- State: Zustand only; store JSON-serializable data only.
- Polyphony: default `MAX_POLYPHONY = 16`.
- Lookahead: apply `MIN_LEAD ≈ 50–100ms` when scheduling audio.

Absolutely forbidden (quick list)
- Creating Tone synths in React components.
- Storing GSAP timelines, DOM refs, or synth instances in state.
- Using `requestAnimationFrame` loops for game timing or animation (use GSAP ticker when needed).
- Calling audio scheduling inside GSAP timeline callbacks (use semantic callbacks).

Critical architecture rules (short)
- Audio: `AudioEngine` owns synth pools, scheduling, and voice management. Use `AudioEngine.scheduleNote()` and voice reservation APIs.
- Timing: Initialize `BeatClock` with a transport-like instance via `initBeatClock(transport)` (AudioEngine provides this). Prefer `Transport.scheduleRepeat` / `scheduleOnce` and apply `MIN_LEAD` when scheduling.
- Animation: Use `useGSAP` in components and store references in `timelineMap` (`setTimeline`, `killTimeline`, `killAllTimelines`). Register top-level SVG refs with `setRef(key, el)` and read them from animation modules with `getRef(key)`.
- State: Keep only serialisable primitives/objects/arrays in Zustand. Derived values and complex objects belong in helpers or modules (e.g., timelines, synths, DOM refs).

Guardrails (must not be relaxed)
- Melody Logic: "Melodies must store note indices (0..7), never literal pitch strings; 96 measures = 1 day cycle."
- Visual Mapping: "Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."
- Strict Separation: "GSAP timelines must only trigger semantic state changes, never call AudioEngine directly."
- UI Shell: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only — never in the decorative SleeveContainer."

Where to find the full guidance (read these)
- Animation patterns: docs/ANIMATION_SYSTEM.md
- Audio architecture & scheduling: docs/AUDIO_SYSTEM.md
- Beat clock & scheduling: docs/BEAT_CLOCK.md
- Melody & harmony rules: docs/MELODY_SYSTEM.md, docs/HARMONY_SYSTEM.md
- Polyphony & voice management: docs/POLYPHONY_GUIDE.md
- Factory & placement: docs/BUILDING_DESIGN.md

Quick checklist for PRs
- [ ] No synths created in components
- [ ] No timelines or refs stored in Zustand or component state
- [ ] All scheduling is beat-based (BeatClock/Transport) with `MIN_LEAD` applied for audio
- [ ] Timelines are killed on unmount and registered in `timelineMap`
- [ ] State remains JSON-serialisable

Recommended repo expectations (suggested additions)
- **CI:** Ensure continuous integration is set up for automated testing and linting.
- **Lint:** Use ESLint with the recommended configuration for code quality.
- **Testing:** Write unit and integration tests for all components and utilities.
- **TS rules:** Follow TypeScript best practices and ensure type safety across the codebase.
- **PR process:** All PRs should be reviewed by at least one other contributor before merging.
- **Examples:** Provide clear examples in the documentation for common use cases.
- **Accessibility & performance:** For audio, avoid autoplay without user intent; provide UI mute/volume controls. For animations, prefer GSAP for performant transforms and avoid large layout thrashing. Add basic a11y checks to PRs (focus/keyboard navigation, reduced-motion preference).

Minimal commands
```bash
npm install
npm run dev
npm test
```

See also (short pointers)
- `docs/AUDIO_SYSTEM.md`: AudioEngine architecture, MIN_LEAD, polyphony rules, and scheduling examples.
- `docs/BEAT_CLOCK.md`: How to initialize and use the BeatClock/Transport for measure-based scheduling.
- `docs/MELODY_SYSTEM.md`: Melody generation rules and step/registry semantics for robot melodies.
- `docs/HARMONY_SYSTEM.md`: Harmony progression rules and chord selection used by the systems.
- `docs/POLYPHONY_GUIDE.md`: Voice management, pool sizing, and voice-stealing policies.
- `docs/ANIMATION_SYSTEM.md`: GSAP timeline patterns, `timelineMap` lifecycle, and ref registry usage.
- `docs/BUILDING_DESIGN.md`: Factory and placement rules, production cooldowns, and placement algorithms.
- `docs/ROBOT_DESIGN.md`: Robot visual design, audio→visual attribute mapping (synth/ADSR/phase/detune), and SVG generation rules.
- `docs/CONTRIBUTION_GUIDE.md`: PR process, testing expectations, and where to record exceptions.
- `docs/poc_guides/UI_GUIDES/UI_ISSUE_OVERVIEW.md`: Sleeve & Glass UI architecture, store responsibilities, and milestone issue breakdown.
