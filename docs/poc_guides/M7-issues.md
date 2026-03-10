# M7: Robot Appearance Issues

**Milestone:** M7 - Robot Appearance  
**Timeline:** Week 7  
**Goal:** Every robot looks visually distinct in a way that reflects its sound

---

## Full Audio → Visual Mapping Reference

| Audio Attribute | Visual Effect |
|---|---|
| `synthType` | Body shape variant + base hue family |
| `adsr.attack` | Color saturation (fast attack → vivid; slow → muted) |
| `adsr.sustain` | Color luminance (high sustain → bright; low → dark) |
| `adsr.decay` + `adsr.release` | Hue offset via `(D/R)` component of formula |
| `adsr.attack` + `adsr.sustain` | Hue offset via `(A/S)` component of formula |
| `pitchRange` | Overall scale / size |
| `filterFreq` | Detail level / greeble count |
| `octaveOffset` | Swim speed (0 = fastest, 2 = slowest) |
| `adsr.release` | Trailing particle wake duration |

---

## M7.1: Audio-Derived HSL Color System

**Title:** [M7.1] Replace hex palette buckets with continuous HSL color derivation

**Labels:** feature, system: ui, size: M

### Feature Description
Replace the current `generateColors()` function in `robotVisualHelpers.ts`, which assigns robots to one of four static hex palettes. The new system derives a continuous HSL color from audio attributes, giving each robot a genuinely unique tint. Each `synthType` anchors a base hue; the ADSR envelope then shifts that hue, controls saturation, and controls luminance.

### Implementation Details

**Base hue by synthType (anchor values):**
```typescript
const BASE_HUE: Record<SynthType, number> = {
  AMSynth:       210,  // blue-cyan family (Sleek)
  FMSynth:       280,  // purple family    (Angular)
  PolySynth:     135,  // green family     (Organic)
  MembraneSynth:  25,  // orange family    (Industrial)
};
```

**Hue offset formula:**
The raw hue offset is `(A / S) + (D / R)` where A, D, S, R are the ADSR seconds/ratio values. Both terms can produce very large numbers when the denominator is near zero, so clamp each ratio individually before summing, then multiply by a scale constant to keep the offset inside a musically useful arc (~0–180°):

```typescript
const MIN_DENOMINATOR = 0.05; // prevent division by zero

function hueOffset(adsr: ADSREnvelope): number {
  const aOverS = adsr.attack  / Math.max(adsr.sustain, MIN_DENOMINATOR);
  const dOverR = adsr.decay   / Math.max(adsr.release, MIN_DENOMINATOR);
  const raw    = Math.min(aOverS, 10) + Math.min(dOverR, 10); // clamp each to 0-10
  return (raw / 20) * 180; // normalise 0-20 → 0-180 degrees
}
```

**Saturation from attack:** Fast attack (≤0.01 s) = 90%; slow attack (≥2.0 s) = 30%. Linear interpolation:
```typescript
function toSaturation(attack: number): number {
  return Math.round(90 - clamp((attack / 2.0), 0, 1) * 60); // 90% → 30%
}
```

**Luminance from sustain:** High sustain = brighter. Range kept to 25–65% to avoid pure white or pure black:
```typescript
function toLuminance(sustain: number): number {
  return Math.round(25 + clamp(sustain, 0, 1) * 40); // 25% → 65%
}
```

**Final color assembly:**
```typescript
export function generateColors(audioAttributes: AudioAttributes): RobotColors {
  const { synthType, adsr } = audioAttributes;
  const h = (BASE_HUE[synthType] + hueOffset(adsr)) % 360;
  const s = toSaturation(adsr.attack);
  const l = toLuminance(adsr.sustain);

  const primary   = `hsl(${h}, ${s}%, ${l}%)`;
  const secondary = `hsl(${h}, ${Math.max(10, s - 20)}%, ${Math.min(75, l + 10)}%)`;
  const accent    = `hsl(${(h + 45) % 360}, ${s}%, ${Math.min(80, l + 15)}%)`;

  return { primary, secondary, accent };
}
```

- `secondary` is a lighter / less saturated version of the primary (structural elements)
- `accent` shifts hue +45° for complementary sensors / lights
- Update `generateColors` signature to accept full `AudioAttributes` instead of just `adsr` (needed to read `synthType`)
- Remove `RUSTY_COLORS`, `CORRODED_COLORS`, `NEON_COLORS`, `INDUSTRIAL_COLORS` constants and threshold constants that are no longer used
- Update all call sites (primarily `Robot.tsx`) to pass `audioAttributes` rather than `audioAttributes.adsr`

### Acceptance Criteria
- [ ] `generateColors()` accepts `AudioAttributes` and returns `RobotColors` with HSL strings
- [ ] Each `synthType` produces a visibly different hue family
- [ ] Two robots with identical `synthType` but different ADSR values produce different tints
- [ ] Saturation tracks `adsr.attack` (fast = vivid, slow = muted)
- [ ] Luminance tracks `adsr.sustain` (high = bright, low = dark)
- [ ] No hex palette constants remain
- [ ] No division-by-zero possible (MIN_DENOMINATOR guard in place)
- [ ] Existing `robotVisualHelpers.test.ts` updated/extended to cover new formula
- [ ] All call sites compile without TypeScript errors

### Reference
- `src/components/robot/robotVisualHelpers.ts` — `generateColors()`, palette constants
- `src/components/robot/Robot.tsx` — call site
- `src/types/Robot.ts` — `AudioAttributes`, `ADSREnvelope`, `SynthType`

---

## M7.2: Swim Speed from Octave Offset

**Title:** [M7.2] Derive robot swim speed from octaveOffset attribute

**Labels:** feature, system: animation, size: S

### Feature Description
Robots with `octaveOffset = 0` (highest pitch) are the quickest swimmers; those with `octaveOffset = 2` (most transposed down) are the slowest. This keeps the visual pace correlated with the sonic register — bass robots lumber, treble robots dart.

### Implementation Details
- Add `calculateSwimSpeed(octaveOffset: 0 | 1 | 2): number` to `robotVisualHelpers.ts`; returns a **pixels-per-second** value used by the GSAP movement tween
- Recommended speed band (tune during QA):

```typescript
const SWIM_SPEED_PX_PER_SEC: Record<0 | 1 | 2, number> = {
  0: 120,  // fastest — octave offset 0
  1:  75,  // medium
  2:  40,  // slowest — octave offset 2
};

export function calculateSwimSpeed(octaveOffset: 0 | 1 | 2): number {
  return SWIM_SPEED_PX_PER_SEC[octaveOffset];
}
```

- In the swim animation (wherever the GSAP movement tween is built — likely `swimAnimation.ts`), replace any hardcoded duration with a distance-based calculation:
  ```typescript
  const distance = Math.hypot(dest.x - pos.x, dest.y - pos.y);
  const speed    = calculateSwimSpeed(robot.octaveOffset);
  const duration = distance / speed; // seconds
  ```
- `octaveOffset` must be added to the `Robot` type (covered in M6.2); this ticket assumes that is done first

### Acceptance Criteria
- [ ] `calculateSwimSpeed()` exported from `robotVisualHelpers.ts`
- [ ] GSAP movement tween duration derived from `distance / speed` (not a constant)
- [ ] `octaveOffset = 0` robots visibly outpace `octaveOffset = 2` robots
- [ ] Speed constants extracted to named constants (not magic numbers)
- [ ] Unit test: `calculateSwimSpeed(0) > calculateSwimSpeed(1) > calculateSwimSpeed(2)`
- [ ] No `requestAnimationFrame` or `setTimeout` introduced

### Reference
- `src/animation/swimAnimation.ts` — movement tween construction
- `src/components/robot/robotVisualHelpers.ts` — helper function home
- `src/types/Robot.ts` — `octaveOffset` field (added in M6.2)

---

## M7.3: Trailing Particle Wake from adsr.release

**Title:** [M7.3] Render a trailing particle wake whose duration matches adsr.release

**Labels:** feature, system: animation, size: M

### Feature Description
While a robot is swimming, it emits a trail of small fading particles behind it. The `adsr.release` value determines how long each particle persists before fully fading out — a robot with a long release hangs a lingering, reverberant-looking wake; a robot with a short release leaves only a brief flicker.

### Implementation Details

**New component — `RobotWake.tsx`:**
- Accepts `robotId`, `releaseTime` (seconds), `color` (the robot's `accent` color)
- Renders up to `MAX_WAKE_PARTICLES` (recommended: 8) small circles in an SVG `<g>`
- Each particle is positioned relative to the robot's current ref position (read from `robotRef` via `getRef()`)
- Particles should be rendered in the same SVG layer as the robot, just behind it (lower `z` / earlier in DOM order)

**GSAP particle lifecycle:**
```typescript
// Called on each new movement tick — e.g., from a GSAP onUpdate callback on the swim tween
function emitWakeParticle(robotId: string, x: number, y: number, release: number, color: string): void {
  const particle = /* acquire from particle pool or create <circle> */;
  gsap.fromTo(particle,
    { opacity: 0.6, r: 4, x, y },
    { opacity: 0, r: 1, duration: release, ease: 'power2.out' }
  );
}
```

- Use a **small fixed-size pool** of SVG `<circle>` elements (DOM nodes recycled, not created per particle) to avoid GC pressure
- Emit one particle per N pixels of travel (recommended: every 20px) or on a GSAP `onUpdate` with a distance gate
- Wake only emits when robot `state === 'moving'`; pool is cleared immediately when robot stops
- Do NOT call `AudioEngine` or store particle state in Zustand — particles are purely visual and ephemeral
- `releaseTime` range: `adsr.release` values are typically 0.05 s (staccato) to 3.0 s (ambient pad); clamp to `0.1..3.0` for visual safety

**Integration point:**
- Add `<RobotWake>` inside `Robot.tsx`, rendered just before the robot SVG body in the same `<g>` so it naturally sits behind
- Pass `releaseTime={robot.audioAttributes.adsr.release}` and `color={colors.accent}`

### Acceptance Criteria
- [ ] Wake particles visible while robot is in `moving` state
- [ ] No particles emitted when robot is `idle`
- [ ] Wake duration visibly longer for robots with high `adsr.release` vs low
- [ ] Particle pool capped at `MAX_WAKE_PARTICLES` (no unbounded DOM growth)
- [ ] No Zustand state updated for particle positions
- [ ] No `setTimeout`/`setInterval`/`requestAnimationFrame` — GSAP only
- [ ] Particles cleared (opacity 0 / pool reset) when robot stops moving
- [ ] `RobotWake` component accepts typed props and renders valid SVG

### Reference
- `src/components/robot/Robot.tsx` — integration point
- `src/animation/swimAnimation.ts` — `onUpdate` hook for position sampling
- `src/types/Robot.ts` — `adsr.release`, `RobotState`
- `src/utils/refs.ts` — `getRef()` for robot DOM position
