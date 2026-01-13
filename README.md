# Pelagos-7

**Interactive ambient robot symphony generator**

_A browser-based musical experience where autonomous robots swim through a post-apocalyptic underwater world, creating evolving compositions through their movements and interactions._

---

## What is Pelagos-7?

Pelagos-7 is a generative music system where:
- Autonomous robots move and interact in real-time
- Each robot carries a unique melody synchronized to a global musical clock
- Factory actors periodically build new robots
- All audio and visuals are beat-synchronized for perfect harmony
- The environment creates an ambient, ever-changing soundscape

**Status:** In Active Development

---

## Tech Stack

- **React** + **TypeScript** - Component architecture
- **Tone.js** - Web Audio synthesis and scheduling
- **GSAP** - High-performance animation
- **Zustand** - State management
- **Vite** - Build tooling

**Architecture:** Strict separation of concerns (Audio / Animation / State)

---

## Key Features (Planned)

- [ ] Beat-synchronized timing system (musical alignment)
- [ ] Procedurally generated robot visuals (modular SVG parts)
- [ ] Melody generation system (16-step loops, harmony palettes)
- [ ] Collision-based interactions (audio/visual bursts)
- [ ] Factory actors (automated robot spawning)
- [ ] Camera pan/zoom (navigate the world)
- [ ] Environmental actors (ruins, machinery)
- [ ] Mobile-responsive (touch controls)

---

## Installation (For Developers)

```bash
# Clone repository
git clone https://github.com/fallboard-studios/pelagos-7.git
cd pelagos-7

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:5173

---

## Project Structure

```
src/
├── animation/      # GSAP timelines and motion control
├── engine/         # AudioEngine, BeatClock, harmony system
├── components/     # React components (UI only)
├── stores/         # Zustand state management
├── types/          # TypeScript type definitions
├── hooks/          # Custom React hooks
├── systems/        # Game logic (collision, spawning)
└── constants/      # Configuration values
```

---

## Architecture Principles

**Three Pillars:**
1. **Audio** - Only `AudioEngine` touches Tone.js
2. **Animation** - Only GSAP timelines (stored in `timelineMap`, never state)
3. **State** - Only Zustand (serializable data only)

**Forbidden:**
- Tone.js calls outside AudioEngine
- GSAP timelines in React/Zustand state
- `setTimeout`/`setInterval` (use BeatClock/Transport)
- `requestAnimationFrame` loops (use GSAP ticker)

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design patterns
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