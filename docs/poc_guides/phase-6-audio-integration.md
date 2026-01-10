# Phase 6: Audio Integration (M3) - Detailed Steps

**Timeline:** Week 3, Days 1-3 (2-3 days, ~12 hours)  
**Goal:** Connect audio to robot visuals, implement melody playback synchronized to Transport, and enforce polyphony limits internally.

---

## Prerequisites

- [ ] Phase 5 complete (M2 milestone done)
- [ ] Robots swimming autonomously
- [ ] Melody system working from M1
- [ ] Timeline management stable
- [ ] All M3 issues created in project backlog
- [ ] Understanding of audio scheduling and polyphony

---

## Why This Phase Matters

**The music becomes alive!** This phase transforms the project from "robots swimming with silence" to "robots creating an evolving musical composition."

**What makes this impressive:**
- Each robot has a unique 2-measure melody loop
- Melodies adapt to changing harmony every 4 measures
- Polyphony management prevents audio chaos (internal AudioEngine logic)
- Beat-synchronized scheduling demonstrates timing system
- Index-based melodies adapt to dynamic harmony without regeneration

**After Phase 6:** You have robots creating music as they swim. Phase 7 (M4) will add interactions between robots and environmental actors.

---

## Phase Overview

You'll implement 2 issues from Milestone M3:

1. **M3.1:** Connect Melody Playback to Robot Visibility
2. **M3.2:** Polyphony Management System (internal logic only)

**End state:** Robots swim and play their melodies. Harmony changes every 4 measures. Polyphony limit enforced internally by AudioEngine.

**Note:** UI controls (settings panel, volume, mute, solo, visual feedback) are deferred to Phase 9 (M6 - Polish & Launch).

---

## Milestone M3: Audio Integration

---

## Issue M3.1: Connect Melody Playback to Robot Visibility (2-3 hours)

### 1.1 Update AudioEngine with Robot Lifecycle Hooks

**File: `src/engine/AudioEngine.ts`** (update)

Add methods to manage robot-specific audio state:

```typescript
// Add to AudioEngineImpl class

private activeRobots = new Set<string>();

/**
 * Register robot for melody playback
 * Called when robot spawns or becomes visible
 */
registerRobot(robotId: string, melody: FishMelodyEvent[]): void {
  if (this.activeRobots.has(robotId)) {
    console.warn('[AudioEngine] Robot already registered:', robotId);
    return;
  }

  console.log('[AudioEngine] Registering robot:', robotId);
  this.activeRobots.add(robotId);
  this.registerFishMelody(robotId, melody); // Existing method from M1
}

/**
 * Unregister robot from melody playback
 * Called when robot is removed or leaves
 */
unregisterRobot(robotId: string): void {
  if (!this.activeRobots.has(robotId)) {
    console.warn('[AudioEngine] Robot not registered:', robotId);
    return;
  }

  console.log('[AudioEngine] Unregistering robot:', robotId);
  this.activeRobots.delete(robotId);
  this.unregisterFishMelody(robotId); // Existing method from M1
}

/**
 * Get count of active robots
 */
getActiveRobotCount(): number {
  return this.activeRobots.size;
}

/**
 * Check if robot is registered
 */
isRobotRegistered(robotId: string): boolean {
  return this.activeRobots.has(robotId);
}
```

### 1.2 Update Spawner to Register Melodies

**File: `src/systems/spawner.ts`** (update)

```typescript
import { AudioEngine } from '../engine/AudioEngine';

export function spawnRobotAtRandom(): ReturnType<typeof createRobot> {
  // ... existing spawn logic

  const robot = createRobot({
    position: { x, y },
    size,
    speed,
    svgParts: parts,
    melody,
  });

  // Register melody with AudioEngine
  AudioEngine.registerRobot(robot.id, melody);

  return robot;
}
```

### 1.3 Update Store to Unregister on Remove

**File: `src/stores/oceanStore.ts`** (update)

```typescript
import { AudioEngine } from '../engine/AudioEngine';

// Update removeRobot action
removeRobot: (id: string) => {
  set((state) => {
    // Unregister from audio engine
    AudioEngine.unregisterRobot(id);
    
    // Kill animation timeline
    killTimeline(id);
    
    // Remove from state
    return {
      robots: state.robots.filter((r) => r.id !== id),
    };
  });
},

// Update removeAllRobots action
removeAllRobots: () => {
  set((state) => {
    // Unregister all robots
    state.robots.forEach((robot) => {
      AudioEngine.unregisterRobot(robot.id);
      killTimeline(robot.id);
    });
    
    return { robots: [] };
  });
},
```

### 1.4 Create Audio Status Display

**File: `src/components/ui/AudioStatusDisplay.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { AudioEngine } from '../../engine/AudioEngine';
import './AudioStatusDisplay.css';

/**
 * Shows active robot count and audio status
 */
export function AudioStatusDisplay() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setActiveCount(AudioEngine.getActiveRobotCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="audio-status-display">
      <div className="audio-status-item">
        <span className="audio-status-label">Active Robots:</span>
        <span className="audio-status-value">{activeCount}</span>
      </div>
    </div>
  );
}
```

**File: `src/components/ui/AudioStatusDisplay.css`**

```css
.audio-status-display {
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 100;
  
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px 20px;
  
  font-family: 'Courier New', monospace;
  color: white;
}

.audio-status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.audio-status-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.audio-status-value {
  color: #4fc3f7;
  font-size: 18px;
  font-weight: bold;
}
```

### 1.5 Add to OceanScene

**Update `src/components/OceanScene.tsx`:**

```typescript
import { AudioStatusDisplay } from './ui/AudioStatusDisplay';

export function OceanScene() {
  // ... existing code

  return (
    <>
      <svg ...>...</svg>
      <SpawnButton />
      <AudioStatusDisplay />
    </>
  );
}
```

### 1.6 Test Registration

1. Start app, click Play
2. Spawn 3 robots
3. Verify AudioStatusDisplay shows "Active Robots: 3"
4. Check console for registration logs
5. Delete a robot (via console for now):
   ```javascript
   const id = useOceanStore.getState().robots[0].id;
   useOceanStore.getState().removeRobot(id);
   ```
6. Verify count decreases

### 1.7 Acceptance Criteria

- [ ] AudioEngine.registerRobot() adds to activeRobots set
- [ ] AudioEngine.unregisterRobot() removes from set
- [ ] Spawner registers melodies on spawn
- [ ] Store unregisters on robot removal
- [ ] AudioStatusDisplay shows accurate count
- [ ] Console logs confirm registration/unregistration
- [ ] No memory leaks (count matches robot count)

### 1.8 Commit, Push, PR

```bash
git checkout -b feature/m3-1-melody-lifecycle
git add src/engine/AudioEngine.ts src/systems/spawner.ts src/stores/oceanStore.ts src/components/ui/AudioStatusDisplay.tsx src/components/ui/AudioStatusDisplay.css src/components/OceanScene.tsx
git commit -m "feat(audio): connect melody playback to robot lifecycle

Implements M3.1: Robot melody lifecycle management

- registerRobot/unregisterRobot methods in AudioEngine
- Spawner registers melodies on creation
- Store unregisters on removal
- AudioStatusDisplay UI component
- activeRobots set tracking
- Console logging for debugging
- Cleanup prevents memory leaks

Closes #19"
git push origin feature/m3-1-melody-lifecycle
```

---

## Issue M3.2: Implement Polyphony Management (3-4 hours)

### 2.1 Add Polyphony Settings to Store

**File: `src/stores/oceanStore.ts`** (update)

```typescript
interface OceanSettings {
  // ... existing settings
  maxPolyphony: number;
  polyphonyStrategy: 'skip' | 'steal-oldest' | 'steal-quietest';
}

// Update defaultSettings
const defaultSettings: OceanSettings = {
  // ... existing
  maxPolyphony: 8,
  polyphonyStrategy: 'skip',
};
```

### 2.2 Implement Polyphony Manager

**File: `src/engine/polyphonyManager.ts`**

```typescript
interface VoiceInfo {
  robotId: string;
  note: string;
  startTime: number;
  velocity: number;
}

class PolyphonyManagerImpl {
  private activeVoices: VoiceInfo[] = [];
  private maxVoices = 8;
  private strategy: 'skip' | 'steal-oldest' | 'steal-quietest' = 'skip';

  /**
   * Set maximum concurrent voices
   */
  setMaxVoices(max: number): void {
    this.maxVoices = Math.max(1, Math.min(max, 16));
    console.log('[PolyphonyManager] Max voices set to:', this.maxVoices);
  }

  /**
   * Set voice stealing strategy
   */
  setStrategy(strategy: 'skip' | 'steal-oldest' | 'steal-quietest'): void {
    this.strategy = strategy;
    console.log('[PolyphonyManager] Strategy set to:', strategy);
  }

  /**
   * Request a voice for a note
   * Returns true if note should play, false if skipped
   */
  requestVoice(robotId: string, note: string, velocity = 0.5): boolean {
    const now = Date.now();

    // Remove voices that have completed (older than 2 seconds)
    this.activeVoices = this.activeVoices.filter(
      (voice) => now - voice.startTime < 2000
    );

    // Check if we have room
    if (this.activeVoices.length < this.maxVoices) {
      this.addVoice(robotId, note, velocity, now);
      return true;
    }

    // Apply strategy
    switch (this.strategy) {
      case 'skip':
        return false;

      case 'steal-oldest':
        this.activeVoices.shift(); // Remove oldest
        this.addVoice(robotId, note, velocity, now);
        return true;

      case 'steal-quietest':
        const quietestIdx = this.findQuietestVoice();
        this.activeVoices.splice(quietestIdx, 1);
        this.addVoice(robotId, note, velocity, now);
        return true;

      default:
        return false;
    }
  }

  /**
   * Add voice to active list
   */
  private addVoice(robotId: string, note: string, velocity: number, time: number): void {
    this.activeVoices.push({ robotId, note, startTime: time, velocity });
  }

  /**
   * Find quietest voice index
   */
  private findQuietestVoice(): number {
    let minVelocity = Infinity;
    let minIdx = 0;

    this.activeVoices.forEach((voice, idx) => {
      if (voice.velocity < minVelocity) {
        minVelocity = voice.velocity;
        minIdx = idx;
      }
    });

    return minIdx;
  }

  /**
   * Get current voice count
   */
  getActiveVoiceCount(): number {
    const now = Date.now();
    this.activeVoices = this.activeVoices.filter(
      (voice) => now - voice.startTime < 2000
    );
    return this.activeVoices.length;
  }

  /**
   * Clear all voices (for cleanup)
   */
  clearAll(): void {
    this.activeVoices = [];
  }
}

export const PolyphonyManager = new PolyphonyManagerImpl();
```

### 2.3 Integrate with AudioEngine

**File: `src/engine/AudioEngine.ts`** (update)

```typescript
import { PolyphonyManager } from './polyphonyManager';

// Update scheduleNote method
scheduleNote({ fishId, note, duration = '8n', velocity = 0.5, time }: NoteParams): void {
  // Check polyphony before scheduling
  if (!PolyphonyManager.requestVoice(fishId, note, velocity)) {
    console.log('[AudioEngine] Note skipped (polyphony limit):', note);
    return;
  }

  // ... existing scheduling logic
}

// Add method to update polyphony settings
updatePolyphonySettings(max: number, strategy: 'skip' | 'steal-oldest' | 'steal-quietest'): void {
  PolyphonyManager.setMaxVoices(max);
  PolyphonyManager.setStrategy(strategy);
}
```

### 2.4 Update AudioStatusDisplay

**File: `src/components/ui/AudioStatusDisplay.tsx`** (update)

```typescript
import { PolyphonyManager } from '../../engine/polyphonyManager';

export function AudioStatusDisplay() {
  const [activeCount, setActiveCount] = useState(0);
  const [voiceCount, setVoiceCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCount(AudioEngine.getActiveRobotCount());
      setVoiceCount(PolyphonyManager.getActiveVoiceCount());
    }, 100); // Update more frequently for voices

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="audio-status-display">
      <div className="audio-status-item">
        <span className="audio-status-label">Active Robots:</span>
        <span className="audio-status-value">{activeCount}</span>
      </div>
      <div className="audio-status-item">
        <span className="audio-status-label">Voices:</span>
        <span className="audio-status-value">{voiceCount}</span>
      </div>
    </div>
  );
}
```

### 2.5 Test Polyphony

1. Start app with 8+ robots
2. Watch AudioStatusDisplay
3. Verify voices never exceed max (8)
4. Test different strategies via console:
```javascript
import { AudioEngine } from './src/engine/AudioEngine.js';
AudioEngine.updatePolyphonySettings(4, 'steal-oldest');
```

### 2.6 Acceptance Criteria

- [ ] PolyphonyManager tracks active voices
- [ ] Max voices configurable (1-16)
- [ ] Three strategies implemented (skip, steal-oldest, steal-quietest)
- [ ] Voice cleanup after note duration
- [ ] AudioEngine checks polyphony before scheduling
- [ ] AudioStatusDisplay shows voice count
- [ ] No audio chaos with 12+ robots
- [ ] Settings updateable at runtime

### 2.7 Commit, Push, PR

```bash
git checkout -b feature/m3-2-polyphony
git add src/engine/polyphonyManager.ts src/engine/AudioEngine.ts src/stores/oceanStore.ts src/components/ui/AudioStatusDisplay.tsx
git commit -m "feat(audio): implement polyphony management system

Implements M3.2: Polyphony management

- PolyphonyManager class with voice tracking
- Three strategies: skip, steal-oldest, steal-quietest
- Configurable max voices (1-16, default 8)
- Voice cleanup after note duration
- AudioEngine integration
- Real-time voice count display
- Runtime settings updates

Closes #20"
git push origin feature/m3-2-polyphony
```

---

## Phase 6 Complete

**What you've built:**
- ✅ Robots play unique melodies as they swim
- ✅ Melody playback synchronized to Tone.Transport
- ✅ Harmony changes every 4 measures
- ✅ Polyphony management prevents audio chaos
- ✅ Index-based melodies adapt to dynamic harmony
- ✅ Clean audio/animation separation maintained

**What doesn't exist yet (Phase 9 - M6):**
- ❌ Audio settings panel (BPM, volume, polyphony UI)
- ❌ Per-robot mute/solo controls
- ❌ Visual audio feedback (glow effects)
- ❌ UI for adjusting polyphony strategy

**Note:** All UI polish features are intentionally deferred to Phase 9 (M6) to keep Phase 6 focused on core audio integration.

---

## Testing Phase 6

### Melody Playback Test

1. Start app, click Play button
2. Spawn 2-3 robots
3. Listen - each robot should play a unique melody
4. Melodies loop every 2 measures
5. Check console: "[AudioEngine] Scheduling note for robot..."

### Polyphony Test

1. Spawn 10+ robots
2. Listen - should hear max 8 concurrent notes (default polyphony limit)
3. No audio chaos or overwhelming sound
4. Check console: "[PolyphonyManager] Voice limit reached..."

### Harmony Change Test

1. Let app run for 16 seconds (4 measures at BPM 60)
2. Listen - harmony palette changes, melodies adapt
3. Notes sound different but rhythm stays same
4. Check console: "[HarmonySystem] Harmony updated..."

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M3.1: Melody Lifecycle | 2-3 hours | |
| M3.2: Polyphony | 3-4 hours | |
| **Total** | **5-7 hours** | |

---

## Troubleshooting

### Issue: No audio after clicking Play

**Symptoms:** Robots spawn but no sound

**Solutions:**
- Check browser console for audio context errors
- Verify AudioEngine.start() was called
- Check Tone.Transport.state === 'started'
- Try clicking Play again (some browsers block first attempt)
- Check browser audio permissions

### Issue: Polyphony not limiting

**Symptoms:** Hear more than 8 concurrent notes

**Solutions:**
- Verify PolyphonyManager.checkAndRegister() is called before scheduling
- Check maxPolyphony setting in store (default 8)
- Inspect activeVoices Map size in AudioEngine
- Verify voice cleanup after note duration

### Issue: Harmony changes but melodies don't adapt

**Symptoms:** Notes sound wrong after 4 measures

**Solutions:**
- Verify melodies store indices (0-7) not literal notes
- Check getAvailableNotes() returns current palette
- Inspect AudioEngine note mapping logic
- Verify harmony update is triggered by BeatClock
- Check currentMeasure increments correctly

---

## Portfolio Talking Points

**Audio Architecture:**
- "Polyphony management system with three voice-stealing strategies"
- "Beat-synchronized melody playback using Tone.Transport"
- "Index-based melody system adapts to dynamic harmony changes without regeneration"

**Timing System:**
- "Musical events scheduled using Transport, never setTimeout/setInterval"
- "Melody loops align perfectly with 2-measure boundaries"
- "Harmony palette changes every 4 measures (24 unique palettes per day cycle)"

**Separation of Concerns:**
- "AudioEngine singleton manages all Tone.js interactions"
- "Voice limiting prevents audio chaos with 12+ concurrent melodies"
- "Lifecycle management (register/unregister) prevents memory leaks"
- "No audio calls in React components - only through AudioEngine API"

---

## Next Steps

**You're ready for Phase 7: M4 (Interactions)**

Phase 7 will add:
- Robot-robot collision detection
- Interaction note flurries and visual bursts
- Factory actors (automated robot spawning)
- Interaction cooldown system

**Before continuing:**
1. Merge all M3 PRs (2 total)
2. Update project board (M3 milestone complete)
3. Test melody playback and polyphony
4. Verify harmony changes every 4 measures

---

**Questions?** Review audio system docs or open a discussion.

**Ready for interactions?** Phase 7 (M4) adds collision detection and factory spawning.
