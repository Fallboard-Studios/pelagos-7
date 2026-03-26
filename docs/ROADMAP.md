# Pelagos-7 Development Roadmap

**Target:** v1.0 deployed to GitHub Pages  
**Methodology:** Incremental milestones with AI-assisted development

---

## Milestone Overview

| Milestone | Status | Focus |
|-----------|--------|-------|
| M0 | ✅ Complete | Repository foundation |
| M1 | ✅ Complete | Core architecture |
| M2 | ✅ Complete | Robot basics |
| M3 | ✅ Complete | Audio integration |
| M4 | ✅ Complete | Interactions & systems |
| M5 | 🔄 In Progress | Animation & world polish |
| M6 | ⏳ Planned | Audio depth |
| M7 | ⏳ Planned | Robot appearance |
| M8 | ⏳ Planned | UI / HUD |
| M9 | ⏳ Planned | Polish & launch |

---

## M0: Repository Foundation ✅

**Goal:** Professional repo structure with AI guidance ready

**Delivered:**
- GitHub repository, issue/PR templates
- Vite + React + TypeScript scaffold
- ESLint, Prettier, TypeScript strict mode
- Folder structure and documentation skeleton

---

## M1: Core Architecture ✅

**Goal:** Three Pillars operational — Audio / Animation / State

**Delivered:**
- `AudioEngine` singleton (Tone.js wrapper, synth pool)
- `BeatClock` (musical timing via `Tone.Transport`)
- `oceanStore` (Zustand, serializable-only state)
- `timelineMap` (GSAP timeline registry, never in state)
- Beat-synchronized scheduling patterns established

---

## M2: Robot Basics ✅

**Goal:** Robots spawn, swim, and can be selected

**Delivered:**
- Vitest unit testing infrastructure
- Robot spawning system with off-screen entry
- GSAP swim animations with propeller and tilt
- Robot SVG variants (Sleek, Angular, Organic, Industrial)
- Robot selection / deselection

---

## M3: Audio Integration ✅

**Goal:** Robots play melodies synchronized to the beat clock

**Delivered:**
- 16-step melody generation (note indices, not pitch strings)
- 8-note harmony palette with dynamic chord cycles (every 4 measures)
- Melody playback via step registry in `AudioEngine`
- Polyphony cap (16 voices) with voice tracking
- Multiple synth pool entries (PolySynth, FMSynth, AMSynth, MembraneSynth)

---

## M4: Interactions & Systems ✅

**Goal:** Collision-based robot interactions

**Delivered:**
- Collision detection via `gsap.ticker`
- Robot-robot interaction logic and audio flurry
- Interaction cooldowns (measure-based)
- Factory actor type, SVG generation (Monolith / Spire / Refinery variants)
- Factory production scheduling via `BeatClock`
- Depth layers with parallax (background / midground / foreground)

---

## M5: Animation & World Polish 🔄

**Goal:** Cohesive underwater world feel; remove unused systems

**Key work:**
 - Factory placement rows (`FACTORY_ROWS`) and deterministic placement algorithm
 - Beat-aligned factory production (`PRODUCTION_INTERVAL = 60` measures) and autonomous spawn scheduler (measure-based)
 - GSAP swim timelines with orientation/flip, propulsion overlap, and speed derived from `SWIM_SPEED`
 - `BubbleStream` implemented for periodic vent bursts (seeded, `MEASURES_BETWEEN_BURSTS = 96`)
 - Timeline registry (`timelineMap`) and ref registry (`setRef` / `getRef`) patterns standardized
 - Population management: at `settings.maxRobots` the oldest robot is removed before spawning to avoid unbounded growth

See [M5-issues.md](poc_guides/M5-issues.md)

---

## M6: Audio Depth ⏳

**Goal:** Each robot becomes a distinct, spatially placed voice

**Key work:**
- Per-robot synth type and ADSR wired into `AudioEngine` playback
- Octave offset attribute (0–2, weighted toward 0) subtracted at scheduling time
- Master volume attribute with ±15% per-note velocity variance
- Rhythmic variance — occasional ±1/2 step shifts to melody `startStep`
- Tonal variance — occasional ±1 shifts to melody `noteIndex`
- Position-based stereo panning from robot x coordinate

See [M6-issues.md](poc_guides/M6-issues.md)

---

## M7: Robot Appearance ⏳

**Goal:** Audio attributes drive every visual property

**Key work:**
- HSL color system: `synthType` → base hue family; ADSR formula shifts hue, attack → saturation, sustain → luminance
- Swim speed derived from `octaveOffset` (0 = fastest, 2 = slowest)
- Trailing particle wake — GSAP fixed pool of circles, duration = `adsr.release`

See [M7-issues.md](poc_guides/M7-issues.md)

---

## M8: UI / HUD ⏳

**Goal:** Minimal in-world controls for playback, audio, and robot management

**Key work:**
- Design spike and component library selection (Radix UI recommended)
- Persistent HUD shell overlay with pointer-event passthrough
- Play / Pause toggle (absorbs Web Audio unlock from `PlayButton`)
- Global volume slider (dB scale, Tone.js Destination)
- Main menu panel with BPM slider (60–180) and GSAP slide-in
- Robot editor sub-menu — live CRUD of all audio attributes
- FAQ overlay — Radix Dialog with GSAP fade

See [M8-issues.md](poc_guides/M8-issues.md)

---

## M9: Polish & Launch ⏳

**Goal:** Production build deployed, debug scaffolding removed, portfolio-ready

**Key work:**
- Gate `<AudioStatus>` / `<InteractionStatus>` and all `console.log` behind `DEV_TUNING`
- GitHub Actions CI/CD deploy workflow + Vite `base: '/pelagos-7/'`
- Performance profile at `MAX_ROBOTS` — 60 FPS, stable memory, no audio glitches
- Visual polish pass — color tokens, 8px grid, `:focus-visible` states, narrow viewport
- README rewrite with live demo link, GIF, and architecture highlights

See [M9-issues.md](poc_guides/M9-issues.md)

---

## Post-Launch (v1.1+)

- Save / load world state (JSON export — state is already serializable)
- URL-based world sharing (shareable seeds)
- Camera follow mode (track selected robot)
- Factory customization (production rates, robot blueprints)
- Additional environmental actors (ruins, machinery variants)

---

## Development Principles

1. **Serializable state only** — Zustand stores JSON-compatible data; GSAP timelines live in `timelineMap`
2. **One clock** — all timing routes through `Tone.Transport`; no `setTimeout` / `setInterval`
3. **One audio owner** — only `AudioEngine` touches Tone.js
4. **Test utilities, skip visuals** — Vitest for engine logic and store actions; skip GSAP/Tone integration tests
4. **AI-Assisted** - Use Copilot for implementation, Claude for planning
5. **Quality Over Speed** - Portfolio-grade code matters

---

## Success Metrics

By v1.0 completion:
- ✅ Fully functional generative music system
- ✅ Clean, maintainable architecture
- ✅ Demonstrable for portfolio
- ✅ Mobile-responsive
- ✅ Comprehensive documentation
- ✅ No critical bugs

---

**Current Status:** M0 Complete → Starting M1

**Current Status:** M0..M4 Complete → M5 In Progress (placement, animation polish, docs)

[View detailed phase documentation](./)