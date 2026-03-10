# Pelagos-7

**Interactive ambient robot symphony generator**

_A browser-based musical experience where autonomous robots swim through a post-apocalyptic underwater world, creating evolving compositions through their movements and interactions._

**Status:** In Active Development — M5 in progress

---

## What it does

Pelagos-7 is a generative music system. Autonomous robots swim through a post-apocalyptic ocean floor, each carrying a procedurally generated 16-step melody loop. Industrial factory structures periodically build new robots. Every robot looks and sounds unique — their synth type, ADSR envelope, and pitch range drive both their appearance and their sonic character. All audio and animation are locked to a shared musical beat clock, so the scene always sounds intentional.

---

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Tone.js** — Web Audio synthesis and beat-clock scheduling
- **GSAP** — All animation and motion (no `requestAnimationFrame`)
- **Zustand** — Serializable application state
- **Vite** — Build tooling
- **Vitest** — Unit tests

---

## Architecture Highlights

- **Single global `AudioEngine`** — one synth pool shared across all robots; no per-robot Tone.js instances, polyphony capped at 16 voices
- **`timelineMap` pattern** — all GSAP timelines stored in a `Map<id, Timeline>`, never in React or Zustand state
- **`Tone.Transport` as the only clock** — scheduling uses `scheduleRepeat` and `scheduleOnce`; `setTimeout` and `requestAnimationFrame` are forbidden
- **Audio → Visual mapping** — synth type drives body shape, ADSR derives HSL color, pitch range sets scale, filter frequency controls greeble detail

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for full design decisions.

---

## Key Features

**Built (M0–M4):**
- Beat-synchronized musical clock (`BeatClock` / `Tone.Transport`)
- Procedural 16-step melody generation with 8-note harmony palettes
- Dynamic harmony cycles (chord changes every 4 measures)
- Robot swim animation via GSAP timelines
- Factory actors with depth layers and deterministic SVG generation
- Robot spawning scheduler (beat-aligned, off-screen entry)

**In Progress (M5–M9):**
- Audio-driven robot appearance (HSL colors, body shape, scale)
- Per-robot synth types, ADSR, octave offset, volume, and stereo panning
- Trailing particle wake animations
- Persistent HUD: play/pause, volume slider, BPM control, robot editor
- GitHub Pages deployment

---

## Local Development

```bash
git clone https://github.com/fallboard-studios/pelagos-7.git
cd pelagos-7
npm install
npm run dev
```

Open http://localhost:5173

```bash
npm test          # run unit tests
npm run build     # production build
npm run preview   # preview production build locally
```

---

## Project Structure

```
src/
├── animation/      # GSAP timelines and swimAnimation
├── engine/         # AudioEngine, BeatClock, harmonySystem, melodyGenerator
├── components/     # React components
│   ├── actors/     # Factory, BubbleStream
│   ├── robot/      # Robot SVG variants and visual helpers
│   ├── hud/        # HUD overlay and controls (M8)
│   └── debug/      # Dev-only overlays (DEV_TUNING gated)
├── stores/         # Zustand store (oceanStore)
├── systems/        # Game logic (spawn, factory, collision)
├── types/          # TypeScript interfaces
└── constants/      # App-wide constants and color theme
```

---

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Audio System](docs/AUDIO_SYSTEM.md)
- [Beat Clock](docs/BEAT_CLOCK.md)
- [Harmony System](docs/HARMONY_SYSTEM.md)
- [Melody System](docs/MELODY_SYSTEM.md)
- [Robot Design](docs/ROBOT_DESIGN.md)
- [Roadmap](docs/ROADMAP.md)
- [Contribution Guide](docs/CONTRIBUTION_GUIDE.md) - Coding standards
- [Roadmap](docs/ROADMAP.md) - Development plan and milestones

---

## Development Workflow

1. Check [GitHub Project](https://github.com/orgs/fallboard-studios/projects/1) for tickets
2. Create feature branch: `git checkout -b feature/M1-description`
3. Implement changes following architecture guidelines
4. Test locally: `npm run lint && npm run build:types`
5. Create PR referencing issue number
6. Merge after review

---

## Roadmap to v1.0

**Current Phase:** M0 - Foundation Setup

- [x] M0: Repository foundation
- [ ] M1: Core architecture (AudioEngine, BeatClock, stores)
- [ ] M2: Robot basics (spawning, movement, selection, unit testing)
- [ ] M3: Audio integration (melody generation, playback)
- [ ] M4: Interactions (collision system, bursts)
- [ ] M5: Environment (actors, camera, depth)
- [ ] M6: Polish & launch (UI, mobile, deployment)

[View full roadmap](docs/ROADMAP.md)

---

## Testing

```bash
# Run unit tests (Vitest)
npm test

# Lint code
npm run lint

# Type check
npm run build:types

# Architecture audit (checks for violations)
npm run audit:patterns

# Build for production
npm run build
```

---

## License

MIT (to be added)

---

## About Fallboard Studios

Fallboard Studios creates interactive musical experiences at the intersection of code and creativity.
 
**GitHub Org:** [fallboard-studios](https://github.com/fallboard-studios)

---

## Acknowledgments

Inspired by generative music systems, procedural generation, and the ambient genre.

Built with love for interactive audio experiences.