---
name: debug-memory
description: Investigate memory leaks and performance degradation
agent: agent
tools:
  - read_file
  - grep_search
---

The app slows down after ${input:duration:5-10 minutes}. Help investigate potential memory leaks.

Based on Pelagos-7 architecture, check for common leak sources.

## Common Memory Leak Causes

### 1. GSAP Timelines Not Killed
**Symptom:** Timelines continue playing after component unmount

**Check for:**
- ❌ Missing `timeline.kill()` in cleanup
- ❌ Timeline refs not removed from timelineMap
- ❌ Timelines created but never stored/tracked

**Look for:**
```typescript
useEffect(() => {
  const tl = gsap.timeline();
  // ... animate
  
  return () => {
    tl.kill(); // ← Must be present
    removeTimeline(robotId); // ← Must cleanup map
  };
}, [robotId]);
```

### 2. Tone.js Scheduled Events Not Cleared
**Symptom:** Audio events continue firing after robots removed

**Check for:**
- ❌ Scheduled events not cancelled on unmount
- ❌ `AudioEngine.unregisterRobotMelody()` not called
- ❌ Transport schedules not cleared

**Look for:**
```typescript
useEffect(() => {
  AudioEngine.registerRobotMelody(robotId, melody);
  
  return () => {
    AudioEngine.unregisterRobotMelody(robotId); // ← Must be present
  };
}, [robotId, melody]);
```

### 3. Store Subscriptions Not Cleaned Up
**Symptom:** Old components continue reacting to state changes

**Check for:**
- ❌ Zustand subscriptions without unsubscribe
- ❌ Event listeners not removed

**Look for:**
```typescript
useEffect(() => {
  const unsubscribe = store.subscribe(callback);
  
  return () => {
    unsubscribe(); // ← Must be present
  };
}, []);
```

### 4. Robot Melodies Not Unregistered
**Symptom:** Memory grows as robots spawn/despawn

**Check for:**
- ❌ Melody registry entries not cleared
- ❌ Step registry not cleaned up

### 5. Timelines Stored in State
**Symptom:** React can't garbage collect timeline references

**Check for:**
- ❌ `useState<Timeline>()` or timeline in Zustand
- ❌ Timeline objects in serializable state

## Diagnostic Process

1. Read the specified file: ${file}
2. Search for cleanup patterns
3. Identify missing cleanup in:
   - useEffect return functions
   - Component unmount handlers
   - Robot removal logic
   - Store actions
4. Check timelineMap usage (should store/remove properly)
5. Verify AudioEngine unregister calls
6. List all findings with code locations and fixes

Show diagnostic results and recommended cleanup additions.
