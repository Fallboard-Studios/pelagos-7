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

## M7.1: Audio → Visual: split proposals

**Overview:** The original M7.1 proposal is split into smaller, focused issues to make implementation and review easier. Below are the suggested sub-issues (pick any to open):

### M7.1a — Color System: Continuous HSL

**Title:** [M7.1a] Replace palette-bucket `generateColors()` with continuous HSL mapping

**Labels:** feature, system: ui, size: M

**What:** Replace the static palette buckets with a deterministic HSL color generator that uses full `AudioAttributes`. Export small helpers: `hueOffset(adsr)`, `toSaturation(attack)`, `toLuminance(sustain)` and a `generateColors(audioAttributes: AudioAttributes): RobotColors` that returns `primary`, `secondary`, and `accent` as HSL strings.

**Acceptance criteria:**
- `generateColors(audioAttributes)` implemented and typed
- Uses `BASE_HUE` per `synthType` and a `MIN_DENOMINATOR` guard to avoid division-by-zero
- Returns `primary`, `secondary`, `accent` as HSL strings
- Removes unused hex palette constants
- Call sites updated and TypeScript compiles

**Files:**
- `src/components/robot/robotVisualHelpers.ts`
- `src/components/robot/RobotBody.tsx`

### M7.1b — Shape Parameters & Micro-Variants

**Title:** [M7.1b] Deterministic shape params from `AudioAttributes`

**What:** Keep the `synthType` → hull variant mapping but expose `shapeParamsFromAudio(audioAttributes)` to compute proportions (torso aspect, appendage length), `microVariant` flags (waveform-driven SVG treatments), and any scale biases driven by `pitchRange` and `octaveOffset`.

**Acceptance criteria:**
- `shapeParamsFromAudio()` exported and typed
- Shapes accept `shapeParams` and `microVariant` props and render deterministically
- `pitchRange` and `octaveOffset` meaningfully affect proportions

**Files:**
- `src/components/robot/robotVisualHelpers.ts`
- `src/components/robot/RobotSleek.tsx`, `RobotAngular.tsx`, `RobotOrganic.tsx`, `RobotIndustrial.tsx`

### M7.1c — Greebles & Detail System

**Title:** [M7.1c] Continuous greeble generation driven by `filterFreq`/`detailLevel`

**What:** Replace threshold buckets with continuous greeble generation driven by `filterFreq`, `detailLevel`, `adsr.sustain`, `adsr.release`, and `waveform`. Export `calculateGreebleCount(filterFreq, detailLevel, waveform, adsr)` and deterministic `greeble` sizing/placement formulas.

**Acceptance criteria:**
- `calculateGreebleCount()` returns deterministic counts (capped ≤ 16)
- `size` and `persistence` formulas tied to `sustain`/`release`
- Placement bias uses `decay/release` ratio
- Greebles remain visual-only (no Zustand)

**Files:**
- `src/components/robot/robotVisualHelpers.ts`
- `src/components/robot/RobotBody.tsx`

### M7.1d — Robot API / Integration

**Title:** [M7.1d] Update consumers to use full `audioAttributes` and new visual props

**What:** Update `RobotBody.tsx`/`Robot.tsx` to compute `colors = generateColors(audioAttributes)`, `shapeParams = shapeParamsFromAudio(audioAttributes)`, and `greebleCount = calculateGreebleCount(...)` and pass the new props into shape components. Keep GSAP-driven animations unchanged.

**Acceptance criteria:**
- `RobotBody.tsx` computes and passes new props
- Shape components accept new props and compile
- No GSAP/state regressions

**Files:**
- `src/components/robot/RobotBody.tsx`, `Robot.tsx`

### M7.1e — Tests & Visual QA

**Title:** [M7.1e] Unit tests and a visual QA grid for audio→visual mappings

**What:** Add unit tests for color helpers and greeble calculations, and create a visual QA grid (screenshot or story) that renders representative robots across synth types and ADSR corners for manual review.

**Acceptance criteria:**
- Unit tests for `hueOffset`, `toSaturation`, `toLuminance`, and `calculateGreebleCount`
- Visual QA artifacts (grid of samples) saved under `docs/` or `scripts/`

**Files:**
- `src/components/robot/robotVisualHelpers.test.ts`
- `docs/` or `scripts/` (visual QA outputs)

---

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
