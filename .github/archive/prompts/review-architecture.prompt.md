---
name: review-architecture
description: Check code for architectural violations and forbidden patterns
agent: agent
tools:
  - read_file
  - grep_search
---

Review ${file} for architectural violations based on Pelagos-7 patterns.

## Architectural Rules to Check

### Audio System (see [AUDIO_SYSTEM.md](../../docs/AUDIO_SYSTEM.md))
- ❌ No `import * as Tone` or `import { ... } from 'tone'` outside `src/engine/`
- ❌ No synth instantiation in components/hooks (`new Tone.Synth()`, `new Tone.PolySynth()`)
- ❌ No direct Tone.js calls outside AudioEngine
- ✅ Audio scheduling via `AudioEngine.scheduleNote()` only

### Animation System
- ❌ No GSAP timelines stored in state (`useState<Timeline>()`, timeline in Zustand)
- ❌ No animation loops using `requestAnimationFrame`, `setInterval`, `setTimeout`
- ❌ No position/transform updates via React state
- ✅ All animation via GSAP timelines stored in timelineMap
- ✅ Use `useGSAP` hook for React components

### Timing System (see [BEAT_CLOCK.md](../../docs/BEAT_CLOCK.md))
- ❌ No `setTimeout`/`setInterval` for game/audio timing
- ❌ No `requestAnimationFrame` for timed events
- ❌ No `Date.now()` or `performance.now()` for musical timing
- ✅ Use BeatClock/Transport for all timed events
- ✅ Express durations in beats/measures, not seconds

### State Management
- ❌ No non-serializable data in state (synths, timelines, refs, DOM nodes, functions)
- ❌ No complex objects that can't be JSON.stringify'd
- ✅ Only serializable data (strings, numbers, booleans, plain objects/arrays)

### Code Style (see [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md))
- Import ordering: React/external → types (with `type` keyword) → components → hooks → utils → constants → stores
- Type annotations on exported functions
- Props interface for components >50 lines
- Magic numbers extracted to UPPER_SNAKE_CASE constants

## Output Format

List violations with:
- Line number
- Rule violated
- Code snippet
- Recommended fix
- Reference to relevant documentation

If no violations found, confirm compliance and note any suggestions for improvement.
