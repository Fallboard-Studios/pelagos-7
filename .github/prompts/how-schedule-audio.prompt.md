---
name: how-schedule-audio
description: Learn how to schedule audio events correctly in this codebase
agent: ask
tools:
  - read_file
  - grep_search
---

How do I schedule a sound to play ${input:timing:4 measures from now} in this codebase?

Show me the correct pattern using BeatClock and AudioEngine with code examples from existing implementations.

## Architecture Overview

Pelagos-7 uses strict separation of concerns:
- **AudioEngine**: All Tone.js audio (singleton, only place Tone is imported)
- **BeatClock**: Musical timing authority (wraps Tone.Transport)
- **GSAP**: Visual animation only (no audio calls)

Reference [AUDIO_SYSTEM.md](../../docs/AUDIO_SYSTEM.md) and [BEAT_CLOCK.md](../../docs/BEAT_CLOCK.md) for details.

## Correct Pattern

```typescript
// Schedule immediate note
AudioEngine.scheduleNote({
  robotId: 'robot-123',
  note: 'C4',
  duration: '4n',
  velocity: 0.6,
});

// Schedule note after delay (musical time)
BeatClock.scheduleAfterBeats(16, () => { // 4 measures = 16 beats
  AudioEngine.scheduleNote({
    robotId: 'robot-123',
    note: 'E4',
    duration: '8n',
  });
});

// Schedule repeating event
BeatClock.scheduleRepeat('4m', (time) => {
  // Runs every 4 measures
  AudioEngine.scheduleNote({
    robotId: 'robot-123',
    note: 'G4',
    duration: '4n',
    time: time + MIN_LEAD, // Apply lookahead
  });
});
```

## Key Points

1. **Never import Tone.js** outside `src/engine/AudioEngine.ts`
2. **Use BeatClock** for all timing (no setTimeout/setInterval)
3. **Call AudioEngine.scheduleNote()** for all audio
4. **Apply MIN_LEAD lookahead** for reliability (~40-80ms)
5. **Express time in beats/measures**, not seconds

## Examples from Codebase

Search for existing patterns in:
- #file:src/engine/AudioEngine.ts - Audio scheduling implementation
- #file:src/engine/BeatClock.ts - Musical timing system
- Melody playback code - How notes are scheduled on 8th-note grid

Show relevant code examples and explain the pattern.
