# Polyphony Management Guide

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
  
  notes.forEach((note, i) => {
    // Stagger slightly to avoid all notes hitting polyphony limit at once
    const delay = i * 0.05;
    triggerWithCap(note, '8n', Tone.now() + delay);
  });
}
```
