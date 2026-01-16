---
name: debug-audio
description: Diagnose audio timing and playback issues
agent: agent
tools:
  - read_file
  - grep_search
---

Audio isn't playing correctly - ${input:symptom:notes seem out of sync with animation}.

Based on [AUDIO_SYSTEM.md](../../docs/AUDIO_SYSTEM.md) troubleshooting guide, help diagnose this issue.

## Common Audio Issues

### 1. No Sound / Suspended AudioContext
**Symptoms:** Audio doesn't play after clicking Play button

**Check:**
- Is `AudioEngine.start()` called from user gesture?
- Is `Tone.context.state === 'running'`?
- Are there console errors about autoplay?

### 2. Timing Drift / Out of Sync
**Symptoms:** Notes play at wrong times, drift from visual animation

**Check:**
- Using `Tone.Transport.schedule()` with lookahead?
- No `setTimeout` or `Date.now()` for timing?
- MIN_LEAD constant applied correctly?
- Using `time` parameter in Transport callbacks (not `Tone.now()`)?

### 3. Audio Crackling / Distortion
**Symptoms:** Pops, clicks, or distortion during playback

**Check:**
- Too many simultaneous voices (polyphony exceeded)?
- Is `MAX_POLYPHONY` enforced in AudioEngine?
- Are voices being released properly?

### 4. Notes Don't Play
**Symptoms:** Some notes missing, skipped randomly

**Check:**
- Polyphony limit reached?
- Melody registry properly populated?
- Note indices within bounds (0-7)?
- AudioEngine.scheduleNote called correctly?

### 5. Wrong Notes After Harmony Change
**Symptoms:** Robots play incorrect pitches after hour change

**Check:**
- Melodies using indices (0-7) not literal notes?
- `getAvailableNotes()` called at playback time?
- Harmony palette updating correctly every 4 measures?

## Diagnostic Steps

1. Read the relevant code file: ${file}
2. Check for forbidden patterns:
   - ❌ setTimeout/setInterval for audio timing
   - ❌ Tone.js imports outside src/engine/
   - ❌ Audio scheduling in GSAP callbacks
   - ❌ Missing MIN_LEAD lookahead
3. Verify correct patterns:
   - ✅ Transport.schedule with time parameter
   - ✅ AudioEngine.scheduleNote for all audio
   - ✅ BeatClock for musical timing
4. Show diagnostic findings and recommended fixes

Reference [AUDIO_SYSTEM.md troubleshooting section](../../docs/AUDIO_SYSTEM.md#troubleshooting) for detailed solutions.
