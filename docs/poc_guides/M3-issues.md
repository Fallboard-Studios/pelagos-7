# M3: Audio Integration Issues

**Milestone:** M3 - Audio Integration  
**Timeline:** Week 3  
**Goal:** Connect robot melodies to audio playback with proper lifecycle management

---

## M3.1: Integrate Melody Registration with Robot Spawner

**Title:** [M3.1] Integrate melody registration with robot spawner

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Connect the melody generation system (from M1) with the robot spawning system (from M2) so melodies are automatically registered with AudioEngine when robots spawn.

### Implementation Details
- Update `src/systems/spawnSystem.ts`
- Call `AudioEngine.registerRobotMelody()` immediately after adding robot to store
- Ensure melody is registered before any playback attempts
- Log registration for debugging

**Updated spawn logic:**
```typescript
export function spawnRobot(): void {
  const { robots, maxRobots } = useOceanStore.getState();
  if (robots.length >= maxRobots) return;
  
  const robot: Robot = {
    id: crypto.randomUUID(),
    state: 'idle',
    position: generateSpawnPosition(),
    destination: null,
    melody: generateMelodyForRobot(),  // From M1
    audioAttributes: generateAudioAttributes(),
    svgParts: generateSVGParts(),
  };
  
  useOceanStore.getState().addRobot(robot);
  
  // NEW: Register melody with AudioEngine
  AudioEngine.registerRobotMelody(robot.id, robot.melody);
  
  if (DEV_TUNING) {
    console.log(`[Spawn] Robot ${robot.id} spawned with ${robot.melody.length} melody events`);
  }
}
```

### Acceptance Criteria
- [ ] Melody registered immediately after spawn
- [ ] Registration happens before playback
- [ ] Step registry updated correctly
- [ ] Multiple robots can spawn without conflicts
- [ ] Console logs show registration (dev mode)
- [ ] No errors on spawn

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#melody-registration`
- Docs: `docs/MELODY_SYSTEM.md#integration-at-spawn`

---

## M3.2: Implement Melody Cleanup on Robot Removal

**Title:** [M3.2] Implement melody cleanup on robot removal

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Ensure melodies are properly unregistered from AudioEngine when robots are removed to prevent memory leaks and orphaned audio events.

### Implementation Details
- Update `src/stores/oceanStore.ts` `removeRobot()` action
- Call `AudioEngine.unregisterRobotMelody()` before removing from array
- Call `killTimeline()` to stop animation
- Ensure cleanup happens in correct order

**Updated removeRobot action:**
```typescript
removeRobot: (id: string) => {
  set(state => {
    // Clean up audio first
    AudioEngine.unregisterRobotMelody(id);
    
    // Clean up animation
    killTimeline(`swim-${id}`);
    
    // Remove from state
    return {
      robots: state.robots.filter(r => r.id !== id),
    };
  });
  
  if (DEV_TUNING) {
    console.log(`[Cleanup] Robot ${id} removed and cleaned up`);
  }
},
```

### Acceptance Criteria
- [ ] Melody unregistered before removal
- [ ] Timeline killed before removal
- [ ] No audio plays after removal
- [ ] Step registry cleaned correctly
- [ ] No memory leaks (verify with multiple spawns/removals)
- [ ] Cleanup order is correct (audio → animation → state)

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#melody-removal`

---

## M3.3: Implement Synth Pool Creation

**Title:** [M3] Implement synth pool creation in AudioEngine

**Labels:** feature, system: audio, size: L, priority: high

### Feature Description
Create the synth pool in AudioEngine that provides reusable PolySynth instances for all robots.

### Implementation Details
- Extend `src/engine/AudioEngine.ts`
- Create `loadInstruments()` function
- Initialize 4 PolySynth instances (default, fm, am, membrane)
- Add global compressor for output leveling
- Call `loadInstruments()` in `start()` method
- Add `getSynth(type)` helper for selecting synth

**Synth pool:**
```typescript
interface SynthPool {
  default: Tone.PolySynth;
  fm: Tone.PolySynth<Tone.FMSynth>;
  am: Tone.PolySynth<Tone.AMSynth>;
  membrane: Tone.PolySynth<Tone.MembraneSynth>;
}

let synthPool: SynthPool | null = null;

async function loadInstruments(): Promise<void> {
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 8,
    attack: 0.003,
    release: 0.25,
  }).toDestination();
  
  synthPool = {
    default: new Tone.PolySynth(Tone.Synth).connect(compressor),
    fm: new Tone.PolySynth(Tone.FMSynth).connect(compressor),
    am: new Tone.PolySynth(Tone.AMSynth).connect(compressor),
    membrane: new Tone.PolySynth(Tone.MembraneSynth).connect(compressor),
  };
}
```

### Acceptance Criteria
- [ ] 4 synth types created
- [ ] Compressor applied to output
- [ ] loadInstruments() called in start()
- [ ] getSynth() returns correct synth
- [ ] Synths ready before first note
- [ ] No audio distortion at normal levels

### Reference
- Docs: `docs/POLYPHONY_GUIDE.md#synth-pool-architecture`

---

## M3.4: Implement Polyphony Management

**Title:** [M3] Implement polyphony management with skip-based limiting

**Labels:** feature, system: audio, size: L, priority: high

### Feature Description
Implement polyphony limiting in AudioEngine to prevent audio distortion and CPU overload by skipping notes when the maximum voice count is exceeded.

### Implementation Details
- Update `src/engine/AudioEngine.ts`
- Add `MAX_POLYPHONY` constant (16 voices)
- Add `activeVoices` counter
- Implement `triggerWithCap()` function (checks limit before triggering)
- Implement `scheduleVoiceRelease()` using Transport.scheduleOnce
- Update `scheduleNote()` to use triggerWithCap
- Add debug logging for voice count

**Polyphony logic:**
```typescript
const MAX_POLYPHONY = 16;
let activeVoices = 0;

function triggerWithCap(
  note: string,
  duration: string,
  time?: number,
  synthType?: string
): boolean {
  // Check limit
  if (activeVoices >= MAX_POLYPHONY) {
    if (DEV_TUNING) {
      console.debug(`[Audio] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`);
    }
    return false;  // Skip note
  }
  
  // Increment before triggering
  activeVoices++;
  
  try {
    const synth = getSynth(synthType);
    synth.triggerAttackRelease(note, duration, time ?? Tone.now());
    
    // Schedule voice release
    scheduleVoiceRelease(duration, time);
    
    return true;
  } catch (err) {
    activeVoices = Math.max(0, activeVoices - 1);
    throw err;
  }
}

function scheduleVoiceRelease(duration: string, time?: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  const releaseTime = (time ?? Tone.now()) + durSec + 0.04;
  
  Tone.getTransport().scheduleOnce(() => {
    activeVoices = Math.max(0, activeVoices - 1);
  }, releaseTime);
}
```

### Acceptance Criteria
- [ ] MAX_POLYPHONY limit enforced
- [ ] Notes skipped when limit exceeded (not crashed)
- [ ] Voice counter increments before trigger
- [ ] Voice counter decrements after note ends
- [ ] Voice release scheduled with Transport
- [ ] No audio distortion at high activity
- [ ] Debug logs show voice count

### Reference
- Docs: `docs/POLYPHONY_GUIDE.md#voice-lifecycle`
- Docs: `docs/POLYPHONY_GUIDE.md#implementation`

---

## M3.5: Implement 8n Tick Melody Playback

**Title:** [M3] Implement 8n tick melody playback loop

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Implement the main melody playback loop that triggers notes from the step registry on every 8th note tick.

### Implementation Details
- Update `src/engine/AudioEngine.ts`
- Add `stepCounter` variable to track current step (1-16)
- Schedule Transport.scheduleRepeat('8n') in start() method
- On each tick: lookup step registry, trigger notes
- Map note indices to availableNotes palette
- Apply MIN_LEAD lookahead for scheduling

**Playback loop:**
```typescript
let stepCounter = 0;
const MIN_LEAD = 0.05;  // 50ms lookahead

function startMelodyPlayback(): void {
  Tone.getTransport().scheduleRepeat((time) => {
    const currentStep = (stepCounter % 16) + 1;  // 1..16
    const events = stepRegistry.get(currentStep) || [];
    const notes = getAvailableNotes();  // From harmony system
    
    events.forEach(({ robotId, event }) => {
      const note = notes[event.noteIndex];  // Map index → pitch
      const robot = useOceanStore.getState().getRobotById(robotId);
      
      if (robot) {
        triggerWithCap(
          note,
          event.length,
          time + MIN_LEAD,
          robot.audioAttributes.synthType
        );
      }
    });
    
    stepCounter++;
  }, '8n');
}
```

### Acceptance Criteria
- [ ] 8n tick scheduled with Transport
- [ ] Step registry queried on each tick
- [ ] Note indices mapped to harmony palette
- [ ] MIN_LEAD lookahead applied
- [ ] Polyphony limit respected
- [ ] Melodies play in time with BPM
- [ ] Harmony changes automatically update playback

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#scheduling-patterns`
- Docs: `docs/MELODY_SYSTEM.md#playback-integration`

---

## M3.6: Add Audio Status Display (Dev UI)

**Title:** [M3] Add audio status display showing voice/robot counts

**Labels:** feature, system: ui, size: S, priority: medium

### Feature Description
Create a debug overlay that shows current audio status (active voices, registered robots, polyphony cap).

### Implementation Details
- Create `src/components/debug/AudioStatus.tsx`
- Show activeVoices / MAX_POLYPHONY
- Show registered robot count
- Show current step number
- Gate behind DEV_TUNING flag
- Position in corner (top-right)

**Status component:**
```tsx
export function AudioStatus() {
  const robots = useOceanStore(s => s.robots);
  const [stats, setStats] = useState({ voices: 0, maxVoices: 0, step: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(AudioEngine.getPolyphonyStats());
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!DEV_TUNING) return null;
  
  return (
    <div className="audio-status">
      <div>Voices: {stats.voices}/{stats.maxVoices}</div>
      <div>Robots: {robots.length}</div>
      <div>Step: {stats.step}/16</div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Status overlay renders in dev mode
- [ ] Voice count updates in real-time
- [ ] Robot count matches store
- [ ] Step number shows 1-16 loop
- [ ] Hidden in production build
- [ ] Positioned in corner (non-intrusive)

### Reference
- Docs: `docs/POLYPHONY_GUIDE.md#monitoring-debugging`

---

## M3.7: Test Melody Lifecycle End-to-End

**Title:** [M3] Test melody lifecycle end-to-end (spawn/play/remove)

**Labels:** testing, system: audio, size: M, priority: high

### Feature Description
Create comprehensive tests and manual validation for the complete melody lifecycle from robot spawn to removal.

### Implementation Details
- Manual test: Spawn 3 robots, verify melodies play
- Manual test: Remove 1 robot, verify melody stops
- Manual test: Spawn 12 robots (max), verify polyphony limiting
- Check for memory leaks (spawn/remove 20 times)
- Verify no orphaned audio events
- Check step registry cleanup

**Test checklist:**
```markdown
- [ ] Spawn robot → melody plays within 1 measure
- [ ] Multiple robots → different melodies audible
- [ ] Remove robot → melody stops immediately
- [ ] Harmony change → melodies adapt (indices stay same)
- [ ] Max robots → polyphony cap enforced
- [ ] Spawn/remove 20x → no memory leaks
- [ ] Console clean (no errors/warnings)
- [ ] Step registry matches robot count
```

### Acceptance Criteria
- [ ] All manual tests pass
- [ ] No memory leaks after 20 spawn/remove cycles
- [ ] Polyphony limiting works under load
- [ ] Melody playback synchronized to beat
- [ ] Harmony changes reflected in playback
- [ ] No orphaned events in step registry
- [ ] Clean console output

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#troubleshooting`
- Docs: `docs/MELODY_SYSTEM.md#integration-at-spawn`
