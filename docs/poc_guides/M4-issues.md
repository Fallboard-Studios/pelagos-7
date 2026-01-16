# M4: Interactions & Systems Issues

**Milestone:** M4 - Interactions & Systems  
**Timeline:** Week 4  
**Goal:** Robots interact with each other and create musical moments

---

## M4.1: Implement Collision Detection System

**Title:** [M4.1] Implement collision detection system

**Labels:** feature, system: state, size: L, priority: high

### Feature Description
Create a collision detection system that checks for proximity between robots and triggers interaction events.

### Implementation Details
- Create `src/systems/collisionSystem.ts`
- Use gsap.ticker for collision checks (NOT requestAnimationFrame)
- Check distance between all robot pairs
- Trigger interaction when distance < INTERACTION_DISTANCE
- Respect interaction cooldowns
- Only check robots in 'idle' or 'swimming' states

**Collision detection:**
```typescript
const INTERACTION_DISTANCE = 150;  // pixels

export function startCollisionDetection(): void {
  gsap.ticker.add(() => {
    const robots = useOceanStore.getState().robots;
    
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const robotA = robots[i];
        const robotB = robots[j];
        
        // Skip if either on cooldown or wrong state
        if (!canInteract(robotA) || !canInteract(robotB)) continue;
        
        const distance = calculateDistance(robotA.position, robotB.position);
        
        if (distance < INTERACTION_DISTANCE) {
          triggerInteraction(robotA.id, robotB.id);
        }
      }
    }
  });
}

function canInteract(robot: Robot): boolean {
  return (
    (robot.state === 'idle' || robot.state === 'swimming') &&
    !robot.interactionCooldown
  );
}
```

### Acceptance Criteria
- [ ] Collision detection uses gsap.ticker
- [ ] Distance calculated between all pairs
- [ ] Interaction triggered when robots close
- [ ] Cooldowns respected
- [ ] No performance issues (60 FPS with 12 robots)
- [ ] Detection stops when system paused

### Reference
- Oceanic: `src/systems/collisionSystem.ts`

---

## M4.2: Implement Robot-Robot Interaction Logic

**Title:** [M4.2] Implement robot-robot interaction with note flurry

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Implement the interaction logic that triggers audio and visual effects when two robots collide.

### Implementation Details
- Create `src/systems/interactionSystem.ts`
- Implement `triggerInteraction(robotAId, robotBId)` function
- Play note flurry (3-5 rapid notes from both robot melodies)
- Update robot states to 'interacting'
- Apply interaction cooldown (measure-based)
- Trigger visual effects (scale pulse, particles)

**Interaction logic:**
```typescript
export function triggerInteraction(robotAId: string, robotBId: string): void {
  const robotA = useOceanStore.getState().getRobotById(robotAId);
  const robotB = useOceanStore.getState().getRobotById(robotBId);
  
  if (!robotA || !robotB) return;
  
  // Update states
  useOceanStore.getState().updateRobot(robotAId, {
    state: 'interacting',
    interactionCooldown: true,
  });
  useOceanStore.getState().updateRobot(robotBId, {
    state: 'interacting',
    interactionCooldown: true,
  });
  
  // Play audio flurry
  playInteractionFlurry(robotA, robotB);
  
  // Trigger visual effects
  playInteractionAnimation(robotAId, robotBId);
  
  // Return to previous state after 0.5 seconds
  setTimeout(() => {
    useOceanStore.getState().updateRobot(robotAId, { state: 'idle' });
    useOceanStore.getState().updateRobot(robotBId, { state: 'idle' });
  }, 500);
}
```

### Acceptance Criteria
- [ ] Interaction triggers on collision
- [ ] Both robots enter 'interacting' state
- [ ] Audio flurry plays (3-5 notes)
- [ ] Visual effects triggered
- [ ] States return to idle after 0.5s
- [ ] Cooldown applied

### Reference
- Oceanic: `src/systems/interactionSystem.ts`

---

## M4.3: Implement Interaction Audio Flurry

**Title:** [M4.3] Implement interaction audio flurry (rapid note sequence)

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Create the audio flurry system that plays rapid note sequences when robots interact.

### Implementation Details
- Update `src/engine/AudioEngine.ts`
- Add `playInteractionFlurry(robotA, robotB)` function
- Play 3-5 notes from each robot's melody
- Stagger timing (50-100ms apart)
- Use higher velocity for emphasis
- Respect polyphony limits

**Flurry implementation:**
```typescript
export function playInteractionFlurry(robotA: Robot, robotB: Robot): void {
  const notes = getAvailableNotes();
  
  // Pick 3 random notes from each robot's melody
  const notesA = robotA.melody
    .slice(0, 3)
    .map(e => notes[e.noteIndex]);
  const notesB = robotB.melody
    .slice(0, 3)
    .map(e => notes[e.noteIndex]);
  
  // Play notes with staggered timing
  [...notesA, ...notesB].forEach((note, i) => {
    const delay = i * 0.08;  // 80ms stagger
    
    triggerWithCap(
      note,
      '16n',  // Short duration
      Tone.now() + delay,
      robotA.audioAttributes.synthType,
      0.8  // Higher velocity
    );
  });
  
  if (DEV_TUNING) {
    console.log(`[Interaction] Flurry: ${notesA.length + notesB.length} notes`);
  }
}
```

### Acceptance Criteria
- [ ] 3-5 notes play from each robot
- [ ] Notes staggered (not simultaneous)
- [ ] Higher velocity applied
- [ ] Polyphony limit respected
- [ ] Flurry completes in < 1 second
- [ ] Audibly distinct from regular melody

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#common-patterns`

---

## M4.4: Implement Interaction Visual Effects

**Title:** [M4.4] Implement interaction visual effects (scale pulse, particles)

**Labels:** feature, system: animation, size: M, priority: high

### Feature Description
Create visual effects that play when robots interact (scale pulse, rotation, optional particles).

### Implementation Details
- Create `src/animation/interactionEffects.ts`
- Implement `playInteractionAnimation(robotAId, robotBId)` function
- Scale pulse both robots (1.0 → 1.2 → 1.0)
- Slight rotation wobble
- Optional: particle burst at midpoint
- Use GSAP timeline

**Visual effects:**
```typescript
export function playInteractionAnimation(robotAId: string, robotBId: string): void {
  const refA = getRef(`robot-${robotAId}`);
  const refB = getRef(`robot-${robotBId}`);
  
  if (!refA || !refB) return;
  
  const tl = gsap.timeline();
  
  // Scale pulse (both robots)
  tl.to([refA, refB], {
    scale: 1.2,
    duration: 0.15,
    ease: 'back.out(2)',
  });
  
  tl.to([refA, refB], {
    scale: 1.0,
    duration: 0.2,
    ease: 'elastic.out(1, 0.5)',
  });
  
  // Rotation wobble
  tl.to([refA, refB], {
    rotation: '+=10',
    duration: 0.1,
    yoyo: true,
    repeat: 1,
  }, 0);
  
  // Optional: Create particle burst at midpoint
  // createParticleBurst(midpoint);
}
```

### Acceptance Criteria
- [ ] Scale pulse plays on both robots
- [ ] Smooth animation (back.out ease)
- [ ] Rotation wobble applied
- [ ] Animation completes in ~0.5s
- [ ] No timeline leaks
- [ ] Visually satisfying feedback

### Reference
- Oceanic: `src/animation/interactionEffects.ts`

---

## M4.5: Implement Interaction Cooldown System

**Title:** [M4.5] Implement measure-based interaction cooldown

**Labels:** feature, system: state, size: M, priority: high

### Feature Description
Implement a cooldown system that prevents robots from interacting too frequently (measure-based timing).

### Implementation Details
- Add `interactionCooldown: boolean` to Robot type
- Add `lastInteractionMeasure: number` to Robot type
- Set cooldown duration: 8 measures (2 "hours")
- Use BeatClock to track measure count
- Clear cooldown after duration

**Cooldown management:**
```typescript
export function applyInteractionCooldown(robotId: string): void {
  const currentMeasure = BeatClock.getCurrentMeasure().measure;
  
  useOceanStore.getState().updateRobot(robotId, {
    interactionCooldown: true,
    lastInteractionMeasure: currentMeasure,
  });
  
  // Schedule cooldown clear
  BeatClock.scheduleAfterBeats(8 * 4, () => {  // 8 measures = 32 beats
    useOceanStore.getState().updateRobot(robotId, {
      interactionCooldown: false,
    });
    
    if (DEV_TUNING) {
      console.log(`[Cooldown] Robot ${robotId} cooldown cleared`);
    }
  });
}

export function canInteract(robot: Robot): boolean {
  if (!robot.interactionCooldown) return true;
  
  const currentMeasure = BeatClock.getCurrentMeasure().measure;
  const elapsed = currentMeasure - (robot.lastInteractionMeasure ?? 0);
  
  return elapsed >= 8;  // 8 measures
}
```

### Acceptance Criteria
- [ ] Cooldown applied after interaction
- [ ] Cooldown duration: 8 measures
- [ ] Cooldown cleared automatically
- [ ] canInteract() respects cooldown
- [ ] Multiple interactions don't interfere
- [ ] BeatClock used (not setTimeout)

### Reference
- Docs: `docs/BEAT_CLOCK.md#scheduling-reliability`

---

## M4.6: Add Interaction Debug Display

**Title:** [M4.6] Add interaction debug display (collision count, cooldown status)

**Labels:** feature, system: ui, size: S, priority: low

### Feature Description
Add debug overlay showing interaction statistics (collision count, robots on cooldown).

### Implementation Details
- Create `src/components/debug/InteractionStatus.tsx`
- Show total interaction count
- Show robots currently on cooldown
- Show collision checks per second
- Gate behind DEV_TUNING flag

**Status component:**
```tsx
export function InteractionStatus() {
  const robots = useOceanStore(s => s.robots);
  const [stats, setStats] = useState({ interactions: 0, cooldowns: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      const cooldownCount = robots.filter(r => r.interactionCooldown).length;
      setStats(prev => ({ 
        interactions: prev.interactions,
        cooldowns: cooldownCount 
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [robots]);
  
  if (!DEV_TUNING) return null;
  
  return (
    <div className="interaction-status">
      <div>Interactions: {stats.interactions}</div>
      <div>Cooldowns: {stats.cooldowns}/{robots.length}</div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Status overlay renders in dev mode
- [ ] Interaction count tracks total
- [ ] Cooldown count shows active cooldowns
- [ ] Updates in real-time
- [ ] Hidden in production
- [ ] Non-intrusive positioning

### Reference
- Similar to AudioStatus component

---

## M4.7: Test Interaction System End-to-End

**Title:** [M4.7] Test interaction system end-to-end

**Labels:** testing, system: audio, size: M, priority: high

### Feature Description
Comprehensive testing of the complete interaction system from collision detection to cooldown management.

### Implementation Details
- Manual test: Spawn 2 robots, move close, verify interaction
- Manual test: Verify audio flurry plays
- Manual test: Verify visual effects trigger
- Manual test: Verify cooldown prevents repeat interactions
- Manual test: Spawn 8 robots, verify multiple interactions
- Check performance (60 FPS during interactions)

**Test checklist:**
```markdown
- [ ] 2 robots collide → interaction triggers
- [ ] Audio flurry plays (3-5 notes each)
- [ ] Visual effects play (scale pulse, rotation)
- [ ] Both robots enter 'interacting' state
- [ ] Cooldown applied (8 measures)
- [ ] Robots can't interact again during cooldown
- [ ] Multiple pairs can interact simultaneously
- [ ] No performance degradation (60 FPS)
- [ ] No console errors
- [ ] Collision detection stops when paused
```

### Acceptance Criteria
- [ ] All manual tests pass
- [ ] Interaction system works reliably
- [ ] Audio/visual effects synchronized
- [ ] Cooldowns work correctly
- [ ] Performance maintained (60 FPS)
- [ ] No errors or memory leaks
- [ ] System can be paused/resumed

### Reference
- Docs: `docs/AUDIO_SYSTEM.md#troubleshooting`
