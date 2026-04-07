# Polyphony Management Guide

## Oscillator Limit Per Robot

**maxOscillatorsPerRobot = 2**

To ensure musical clarity, fair polyphony distribution, and predictable performance, each robot is limited to a maximum of 2 oscillators by default.

- This prevents a single robot from monopolizing the global polyphony budget.
- 2 oscillators per robot (e.g., detuned or layered) provide rich timbres without muddying the mix.
- With 16 robots × 2 oscillators = 32 voices at peak, MAX_POLYPHONY can be set to 32 to guarantee all robots are always heard.
- This limit simplifies the user experience and avoids the need for users to manage oscillator counts across robots.

Advanced/experimental options may allow more oscillators per robot, but the default and recommended setting is 2.

Polyphony management controls the maximum number of simultaneous audio voices to prevent audio distortion, CPU overload, and maintain musical clarity.

## Core Principles

1. **Global Voice Budget**: Single `MAX_POLYPHONY` limit (typically 8-16 voices)
2. **Synth Pooling**: Reuse `Tone.PolySynth` instances across all robots
3. **Fail-Fast Skipping**: When limit exceeded, skip notes (no voice stealing)
4. **Automatic Release**: Track voice lifecycle with precise timing
5. **Centralized Enforcement**: All polyphony logic in AudioEngine

## Why Polyphony Limits Matter

**Without limits:**
- Audio distortion when too many synths play simultaneously
- CPU spikes causing frame drops
- Web Audio context crashes on mobile devices
- Muddy, indistinct sound (too much simultaneous activity)

**With proper limiting:**
- Clean, clear audio output
- Stable performance across devices
- Musical space for important notes
- Graceful degradation under load

## Implementation

**File: `src/engine/AudioEngine.ts`**

```typescript
// Global voice tracking
const MAX_POLYPHONY = 16;  // Configurable: 8-16 recommended
let activeVoices = 0;

// Synth pool (reused by all robots)
interface SynthPool {
  default: Tone.PolySynth;
  fm: Tone.PolySynth;
  am: Tone.PolySynth;
  membrane: Tone.PolySynth;
}

let synthPool: SynthPool | null = null;
```

## Voice Lifecycle

### 1. Voice Request (triggerWithCap)

```typescript
function triggerWithCap(
  note: string,
  duration: string,
  time?: number,
  velocity?: number,
  synthType?: string,
  envelope?: ADSREnvelope
): boolean {
  // Guard: Check polyphony limit
  if (activeVoices >= MAX_POLYPHONY) {
    if (DEV_TUNING) {
      console.debug(
        `[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`
      );
    }
    return false;  // Reject note, skip gracefully
  }
  
  // Select synth from pool
  const synth = synthType
    ? (synthPool[synthType as keyof SynthPool] ?? synthPool.default)
    : synthPool.default;
  
  // Increment voice counter BEFORE triggering
  activeVoices++;
  
  try {
    // Apply per-robot envelope if provided
    if (envelope) {
      applySynthEnvelope(synth, envelope);
    }
    
    // Trigger note
    synth.triggerAttackRelease(note, duration, time ?? Tone.now(), velocity);
    
    // Schedule voice release (see below)
    scheduleVoiceRelease(duration, time);
    
    return true;  // Note accepted
  } catch (err) {
    // If trigger fails, restore voice counter
    activeVoices = Math.max(0, activeVoices - 1);
    throw err;
  }
}
```

### 2. Voice Release Scheduling

Critical: Release voices at the exact time notes end, not immediately.

```typescript
function scheduleVoiceRelease(duration: string, time?: number): void {
  // Convert Tone.js duration to seconds
  const durSec = Tone.Time(duration).toSeconds();
  
  // Calculate exact release time
  const noteStartTime = time ?? Tone.now();
  const noteEndTime = noteStartTime + durSec;
  const releaseTime = noteEndTime + 0.04;  // Small buffer
  
  // Use Transport.scheduleOnce for precise timing
  Tone.getTransport().scheduleOnce(() => {
    activeVoices = Math.max(0, activeVoices - 1);
    
    if (DEV_TUNING) {
      console.debug(
        `[AudioEngine] Voice released: ${activeVoices}/${MAX_POLYPHONY}`
      );
    }
  }, releaseTime);
}
```

**Why Transport.scheduleOnce?**
- Maintains audio-only architecture (no GSAP coupling)
- Sample-accurate timing aligned with Transport
- Automatically adjusts for tempo changes
- Cancels cleanly when Transport stops

### 3. Fallback Release

If Transport scheduling fails (rare), fall back to immediate release:

```typescript
try {
  scheduleVoiceRelease(duration, time);
} catch (err) {
  console.warn('[AudioEngine] Failed to schedule voice release:', err);
  // Immediate fallback (loses precise timing)
  activeVoices = Math.max(0, activeVoices - 1);
}
```

## Synth Pool Architecture

### Initialization (loadInstruments)

```typescript
async function loadInstruments(): Promise<void> {
  // Create global compressor
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 8,
    attack: 0.003,
    release: 0.25,
  }).toDestination();
  
  // Create synth pool (4 types for timbral variety)
  synthPool = {
    default: new Tone.PolySynth(Tone.Synth).connect(compressor),
    fm: new Tone.PolySynth(Tone.FMSynth).connect(compressor),
    am: new Tone.PolySynth(Tone.AMSynth).connect(compressor),
    membrane: new Tone.PolySynth(Tone.MembraneSynth).connect(compressor),
  };
}
```

### Benefits of Pooling

- **Memory efficiency**: 4 synths total vs. 1 per robot (12+ robots = huge savings)
- **CPU efficiency**: Fewer audio nodes in Web Audio graph
- **Instant availability**: No spawn-time latency for synth creation
- **Consistent timbre**: All robots of same type share sonic characteristics

### Synth Selection by Robot Type

```typescript
// In scheduleNote call
const synthType = robot.audio.synthType;  // 'default' | 'fm' | 'am' | 'membrane'
const synth = synthPool[synthType] ?? synthPool.default;

// Each PolySynth has internal voice allocation (typically 32 voices)
// Our MAX_POLYPHONY limit applies ACROSS all synths
```

## Polyphony Budget Guidelines

**Choosing MAX_POLYPHONY:**

| Value | Use Case | Trade-offs |
|-------|----------|------------|
| 8 | Mobile, low-power devices | Very safe, may skip notes during busy moments |
| 12 | Balanced default | Good for most scenarios, occasional skips at peak |
| 16 | Desktop, high-power | Rich soundscape, higher CPU/memory usage |
| 20+ | Not recommended | Diminishing returns, audio muddiness, performance risk |

**Factors to consider:**
- **Robot count**: More robots = more concurrent melodies
- **Melody density**: Melodies with many 8n notes = higher peak polyphony
- **Device target**: Mobile browsers have lower audio processing limits
- **Musical clarity**: Too many voices = indistinct, muddy sound

## Monitoring & Debugging

### Dev Overlay Display

## Robot Destruction & Voice Cleanup

When a robot is destroyed or removed:

- Always call `AudioEngine.releaseVoice(robotId)` to release the reserved synth/voice and decrement the active voice count.
- If the robot used a composite or custom voice, ensure all Tone.js objects are disposed via `.dispose()`.
- Never store synths or voices in Zustand or React state; AudioEngine manages all synth lifecycles.
- If a robot is replaced or respawned with the same ID, release the old voice before reserving a new one.

## Oscillator Parameter Application

- **At Reservation:** When reserving a voice for a robot, apply all oscillator parameters (waveform, detune, phase, ADSR) from the robot's `visualAudioMap` or audio attributes. This ensures the synth is configured before any notes are triggered.
- **On Update:** If a robot's audio parameters change, call `AudioEngine.updateVoiceParams(robotId, newParams)` to update the reserved synth's oscillator and envelope parameters.
- **Never** mutate synths directly in components or outside AudioEngine. All parameter changes must go through AudioEngine APIs.

**Lifecycle Summary:**

| Event         | AudioEngine Call(s)                  | Effect                                  |
|-------------- |--------------------------------------|------------------------------------------|
| Spawn         | reserveVoice, registerRobotMelody     | Allocates synth, applies params, melody  |
| Update Params | updateVoiceParams                    | Updates synth oscillator/ADSR            |
| Destroy       | unregisterRobotMelody, releaseVoice   | Releases synth, cleans up Tone objects   |

```typescript
if (DEV_TUNING) {
  // Show polyphony metrics
  console.log(`Active Voices: ${activeVoices}/${MAX_POLYPHONY}`);
  console.log(`Skip Rate: ${skippedNotes}/${totalNoteRequests}`);
  console.log(`Synth Pool Size: ${Object.keys(synthPool).length}`);
}
```

### UI Indicator (Optional)

```typescript
// Show polyphony bar in debug panel
<div className="polyphony-meter">
  <div 
    className="polyphony-fill"
    style={{ 
      width: `${(activeVoices / MAX_POLYPHONY) * 100}%`,
      backgroundColor: activeVoices >= MAX_POLYPHONY ? 'red' : 'green'
    }}
  />
  <span>{activeVoices}/{MAX_POLYPHONY}</span>
</div>
```

### Telemetry Tracking

```typescript
// Track skip statistics
let totalNoteRequests = 0;
let skippedNotes = 0;

function triggerWithCap(...args): boolean {
  totalNoteRequests++;
  
  if (activeVoices >= MAX_POLYPHONY) {
    skippedNotes++;
    return false;
  }
  
  // ... rest of function
}

// Export metrics
export function getPolyphonyStats() {
  return {
    activeVoices,
    maxPolyphony: MAX_POLYPHONY,
    totalRequests: totalNoteRequests,
    skippedNotes,
    skipRate: totalNoteRequests > 0 ? skippedNotes / totalNoteRequests : 0,
  };
}
```

## Voice Stealing (Alternative Approach)

**Note:** Current implementation uses **skip-based limiting** (simpler, more predictable). Voice stealing is an advanced alternative.

**Voice stealing logic (not currently implemented):**

```typescript
interface ActiveVoice {
  id: string;
  startTime: number;
  priority: number;  // Lower = less important
  releaseTime: number;
}

const activeVoiceRegistry = new Map<string, ActiveVoice>();

function triggerWithVoiceStealing(...args): void {
  if (activeVoices >= MAX_POLYPHONY) {
    // Find lowest-priority voice
    const victim = findLowestPriorityVoice(activeVoiceRegistry);
    
    if (victim) {
      // Force release victim voice
      stopVoice(victim.id);
      activeVoiceRegistry.delete(victim.id);
      activeVoices--;
    }
  }
  
  // Trigger new voice...
}
```

**Trade-offs:**
- **Pro**: No skipped notes, always plays something
- **Con**: More CPU (force-stop voices early)
- **Con**: Less predictable (which voices get cut?)
- **Con**: More complex (voice tracking, priority system)

**Recommendation**: Stick with skip-based limiting unless musical requirements demand voice stealing.

## Performance Optimization

### 1. Pre-allocation at Startup

```typescript
// Warm up synths on AudioEngine.start()
synthPool.default.triggerAttackRelease('C4', '32n', '+0.1', 0.01);
synthPool.fm.triggerAttackRelease('C4', '32n', '+0.2', 0.01);
// ... (silent test notes to initialize audio graph)
```

### 2. Envelope Caching

```typescript
// Cache computed envelope settings to avoid re-applying
const envelopeCache = new Map<string, ADSREnvelope>();

function applySynthEnvelope(synth: Tone.PolySynth, envelope: ADSREnvelope) {
  const key = JSON.stringify(envelope);
  if (envelopeCache.has(key)) return;  // Already applied
  
  // Apply to synth voices...
  envelopeCache.set(key, envelope);
}
```

### 3. Reduce Voice Release Overhead

```typescript
// Batch voice releases when many notes end simultaneously
let pendingReleases = 0;

function scheduleVoiceRelease(duration: string, time?: number): void {
  pendingReleases++;
  
  Tone.getTransport().scheduleOnce(() => {
    pendingReleases--;
    activeVoices = Math.max(0, activeVoices - 1);
  }, releaseTime);
}
```

## Common Pitfalls

**❌ DON'T: Increment voice counter after triggering**

```typescript
// BAD: Counter increment happens too late
synth.triggerAttackRelease(...);
activeVoices++;  // Voice already playing!
```

**✅ DO: Increment before triggering**

```typescript
// GOOD: Reserve voice slot first
activeVoices++;
try {
  synth.triggerAttackRelease(...);
} catch (err) {
  activeVoices--;  // Restore on failure
}
```

**❌ DON'T: Use setTimeout for voice release**

```typescript
// BAD: setTimeout not aligned with musical timing
setTimeout(() => {
  activeVoices--;
}, durationMs);
```

**✅ DO: Use Transport.scheduleOnce**

```typescript
// GOOD: Sample-accurate timing
Tone.getTransport().scheduleOnce(() => {
  activeVoices--;
}, releaseTime);
```

**❌ DON'T: Create per-robot synths**

```typescript
// BAD: Memory/CPU waste
interface Robot {
  synth: Tone.Synth;  // ❌ One synth per robot
}
```

**✅ DO: Use shared synth pool**

```typescript
// GOOD: Shared pool
const synth = synthPool[robot.audio.synthType];
synth.triggerAttackRelease(...);
```

## Testing

**Unit test examples** (see [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md#testing) for full patterns):

```typescript
describe('Polyphony Management', () => {
  it('should reject notes when limit exceeded', () => {
    // Fill polyphony budget
    for (let i = 0; i < MAX_POLYPHONY; i++) {
      const result = triggerWithCap('C4', '1n');
      expect(result).toBe(true);
    }
    
    // Next note should be rejected
    const overflow = triggerWithCap('C4', '1n');
    expect(overflow).toBe(false);
  });
  
  it('should release voices after note duration', async () => {
    triggerWithCap('C4', '4n');  // activeVoices = 1
    
    await Tone.Transport.start();
    await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for release
    
    expect(activeVoices).toBe(0);
  });
});
```

**Load testing:**

```typescript
// Stress test: Spawn many robots and trigger all melodies
async function stressTestPolyphony() {
  const robots = Array(20).fill(0).map(() => spawnRobot());
  
  // Trigger all melodies simultaneously
  robots.forEach(r => {
    r.melody.forEach(event => {
      scheduleNote({ robotId: r.id, note: 'C4', duration: event.length });
    });
  });
  
  // Monitor skip rate
  console.log('Polyphony Stats:', getPolyphonyStats());
}
```

## Integration with Other Systems

### Melody Playback

```typescript
BeatClock.scheduleRepeat('8n', (time) => {
  const entries = stepRegistry.get(currentStep) || [];
  
  entries.forEach(({ robotId, event }) => {
    const success = triggerWithCap(
      note,
      event.length,
      time + MIN_LEAD,
      velocity,
      robot.audio.synthType
    );
    
    if (!success && DEV_TUNING) {
      console.debug(`[AudioEngine] Skipped note for ${robotId} (polyphony limit)`);
    }
  });
});
```

### Interaction Bursts

```typescript
function playInteractionFlurry(robotA: Robot, robotB: Robot) {
  const notes = [robotA.currentNote, robotB.currentNote];
  // Use AudioEngine scheduling and musical spacing (16th-note spacing)
  const SPACING_SEC = 0.125; // 16th note spacing in seconds

  notes.forEach((note, i) => {
    const delay = i * SPACING_SEC;
    // Schedule for both robots with a slight offset to avoid exact simultaneity
    AudioEngine.scheduleNote({
      robotId: robotA.id,
      note,
      duration: '16n',
      time: AudioEngine.now() + delay,
      velocity: 0.8,
    });

    AudioEngine.scheduleNote({
      robotId: robotB.id,
      note,
      duration: '16n',
      time: AudioEngine.now() + delay + 0.02,
      velocity: 0.8,
    });
  });
}
```
## Steps for creating robot pools:
Todo — Per‑Robot Voice Reservation

### 1
Design pool & sizing
Decide: voices-per-robot (recommend 1) and total pool size (<= MAX_POLYPHONY).
Map: synth-type → voice count distribution.
Constants: add config in AudioEngine.ts:1 (e.g., RESERVE_VOICES_PER_ROBOT, POOL_SIZING).

### 2
AudioEngine changes (core)
Pool shape: change synthPool → Record<string, Tone.PolySynth[]> (arrays of slots).
Reservation map: add reservedVoices: Map<string,{type:string,index:number,reservedAt:number}>.
APIs: implement reserveVoice(robotId: string, synthType: string): boolean, releaseVoice(robotId: string): void, getVoiceForRobot(robotId: string).
Scheduling: update scheduleNote / triggerWithCap to prefer getVoiceForRobot() and apply adsr on that reserved instance.
Policy: implement fallback behavior (shared pool) and an optional LRU eviction/steal policy.

### 3
Spawn/teardown wiring
Register on spawn: call AudioEngine.registerRobotMelody(robot.id, robot.melody) in spawnSystem.ts when creating a robot.
Unregister on remove: call AudioEngine.unregisterRobotMelody(robotId) when a robot is removed (store removal hooks / spawn cleanup).

### 4
Maintain architectural rules
No synths in state: keep reservation metadata inside AudioEngine only (do NOT put synth objects into Zustand).
Single AudioEngine: all synth creation & lifecycle remain centralized in AudioEngine.

### 5
Tests
Unit tests: add tests for reserveVoice/releaseVoice allocation, double-allocation prevention, and fallback behavior.
Integration tests: spawn many robots to validate distinctive timbres when reserved and correct behavior when pool exhausted. Update/extend AudioEngine.test.ts and spawnSystem.test.ts.
Polyphony: assert global cap still enforced.

### 6
Docs & observability
JSDoc: document new APIs (reserveVoice, releaseVoice, semantics).
Dev tooling: optional debug hooks (e.g., AudioEngine.getReservations()) for dev-only overlays. Update copilot-instructions.md if necessary.

### 7
Validation & rollout
Run tests: npm test and fix regressions.
Manual check: run app, spawn robots, listen for distinct timbres.
Tweak: adjust pool sizing or eviction policy based on CPU/polyphony behavior.
