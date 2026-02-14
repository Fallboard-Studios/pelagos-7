# M3: Audio Integration - Manual Testing Guide

This document provides manual testing procedures for validating the complete melody lifecycle from robot spawn to removal.

## Prerequisites

- Run app in development mode: `npm run dev`
- Open browser console (F12) to monitor logs
- Audio should be enabled (click Play button)
- `DEV_TUNING` flag enabled (default in dev mode)
- Debug functions exposed on `window` object: `spawnRobot()`, `removeRobot(id)`, `oceanStore`

## Test Checklist

### Test 1: Basic Melody Playback
**Objective:** Verify robots play melodies after spawning

**Steps:**
1. Launch application
2. Click Play button to start audio
3. Observe initial 2 robots spawning
4. Wait 1-2 measures (4-8 beats)

**Expected Results:**
- [ ] Console shows: `[Spawn] Robot {id} spawned with N melody events`
- [ ] Console shows: `[AudioEngine] Registered melody for robot {id} (N events)`
- [ ] Melodies begin playing within 1 measure
- [ ] Audio is audible and musical (not distorted)
- [ ] AudioStatus overlay shows: Voices > 0, Robots: 2, Step: cycling 1-16

---

### Test 2: Multiple Robots - Distinct Melodies
**Objective:** Verify multiple robots produce different, overlapping melodies

**Steps:**
1. Continue from Test 1
2. Spawn additional robot via console: `spawnRobot()`
3. Observe audio with 3+ robots active

**Expected Results:**
- [ ] Multiple melodies audible simultaneously
- [ ] Melodies sound distinct (different rhythms/notes)
- [ ] No excessive distortion or clipping
- [ ] Voice count increases when multiple notes play
- [ ] AudioStatus shows correct robot count

---

### Test 3: Robot Removal - Melody Stops
**Objective:** Verify melody stops immediately when robot removed

**Steps:**
1. Note current robot count in AudioStatus
2. Get a robot ID from console: `oceanStore.getState().robots[0].id`
3. Remove robot via console: `removeRobot('robot-id-here')`
4. Observe audio and console

**Expected Results:**
- [ ] Console shows: `[AudioEngine] Unregistered melody for robot {id} (N events removed)`
- [ ] Melody for removed robot stops immediately
- [ ] Other robots continue playing unaffected
- [ ] AudioStatus shows decremented robot count
- [ ] No errors in console

---

### Test 4: Harmony Change - Melody Adaptation
**Objective:** Verify melodies adapt to harmony palette changes (every 4 measures)

**Steps:**
1. Spawn 2-3 robots
2. Wait for harmony change (every 4 measures = ~16 seconds at 120 BPM)
3. Listen carefully to pitch changes

**Expected Results:**
- [ ] Console shows: `[HarmonySystem] Harmony palette updated` (every 4 measures)
- [ ] Melody rhythms remain unchanged
- [ ] Pitches shift to new palette (note indices stay same, palette changes)
- [ ] Transitions are smooth (no gaps or glitches)

---

### Test 5: Polyphony Limiting Under Load
**Objective:** Verify polyphony cap enforced with many robots

**Steps:**
1. Spawn maximum robots (no UI limit, but test with 10+)
2. Observe voice count in AudioStatus
3. Listen for voice limiting behavior

**Expected Results:**
- [ ] Voice count never exceeds 16 (MAX_POLYPHONY)
- [ ] Console shows: `[AudioEngine] Polyphony capped: 16/16` when limit hit
- [ ] Audio remains clean (no distortion from over-triggering)
- [ ] Older notes may be skipped gracefully
- [ ] No crashes or freezing

---

### Test 6: Memory Leak Test - Spawn/Remove Cycles
**Objective:** Verify no memory leaks or orphaned events after repeated spawn/remove

**Steps:**
1. Open browser DevTools Performance/Memory tab
2. Take heap snapshot (baseline)
3. Run in console: `for(let i=0; i<20; i++) { spawnRobot(); const id = oceanStore.getState().robots[0]?.id; if(id) removeRobot(id); }`
4. Wait 10 seconds for cleanup
5. Take second heap snapshot
6. Force garbage collection (optional)
7. Compare snapshots

**Expected Results:**
- [ ] Memory returns to near-baseline after cycles
- [ ] No significant memory growth (< 5 MB drift acceptable)
- [ ] Console clean (no accumulating errors)
- [ ] AudioStatus shows 0 robots after all removed
- [ ] Step registry fully cleared (register/unregister console logs show 0 orphans)

---

### Test 7: Console Output Validation
**Objective:** Verify clean console output with no errors or warnings

**Steps:**
1. Perform Tests 1-6
2. Review browser console output

**Expected Results:**
- [ ] No red errors
- [ ] No yellow warnings (except expected Tone.js context warnings)
- [ ] DEV_TUNING logs are informational only:
  - `[Spawn] Robot {id} spawned...`
  - `[AudioEngine] Registered melody...`
  - `[AudioEngine] Unregistered melody...`
  - `[AudioEngine] Voice triggered/released: N/16`
  - `[AudioEngine] Polyphony capped: 16/16` (only when at limit)

---

### Test 8: Step Registry Integrity
**Objective:** Verify step registry matches active robot count

**Steps:**
1. Spawn 3 robots
2. Check console for registration logs
3. Remove 1 robot
4. Check console for unregistration logs
5. Verify counts match

**Expected Results:**
- [ ] Each spawn shows: `Registered melody for robot {id} (N events)`
- [ ] Each removal shows: `Unregistered melody for robot {id} (N events removed)`
- [ ] Event counts are consistent (same N for register/unregister per robot)
- [ ] No orphaned events remain after removal
- [ ] AudioStatus robot count matches spawn/remove actions

---

## Known Issues / Limitations

- Harmony palette changes occur every 4 measures (not configurable in M3)
- MAX_POLYPHONY is hardcoded to 16 (not exposed as constant yet)
- Robot spawning currently manual (factory actors in M4)
- AudioStatus overlay only visible in dev mode (DEV_TUNING flag)

## Debugging Tips

**If melodies don't play:**
- Check browser console for errors
- Verify audio context started (click Play button)
- Check AudioStatus shows Step: cycling 1-16
- Verify robot has melody events in spawn log

**If polyphony doesn't cap:**
- Check MAX_POLYPHONY in AudioEngine.ts (should be 16)
- Spawn 10+ robots and trigger many notes simultaneously
- Look for `Polyphony capped` console logs

**If memory leaks detected:**
- Check for orphaned timeline refs (separate from audio)
- Verify `unregisterRobotMelody()` called in `removeRobot()`
- Use Chrome DevTools Memory profiler to find retained objects

## Success Criteria

All 8 tests pass without errors or warnings. System demonstrates:
- ✅ Reliable melody playback
- ✅ Clean robot removal
- ✅ Polyphony limiting under load
- ✅ No memory leaks
- ✅ Harmony adaptation
- ✅ Step registry integrity
