# Pelagos-7 Development Roadmap

**Timeline:** 4-6 weeks to v1.0  
**Methodology:** Incremental milestones with AI-assisted development

---

## Milestone Overview

| Milestone | Timeline | Focus |
|-----------|----------|-------|
| M0 | Week 1 (Days 1-2) | Repository foundation |
| M1 | Week 1 (Days 3-5) | Core architecture |
| M2 | Week 2 | Robot basics |
| M3 | Week 3 | Audio integration |
| M4 | Week 4 | Interactions & systems |
| M5 | Week 5 | Environment & actors |
| M6 | Week 6 | Polish & launch |

---

## M0: Repository Foundation ✅ (Current)

**Goal:** Professional repo structure with AI guidance ready

**Deliverables:**
- GitHub organization & repository
- Issue/PR templates
- Vite + React + TypeScript scaffold
- ESLint, Prettier, TypeScript configs
- Folder structure
- Professional README & documentation
- Clean git history

**Time:** 4-6 hours

---

## M1: Core Architecture

**Goal:** Three Pillars operational (Audio / Animation / State)

**Key Features:**
- AudioEngine singleton (Tone.js wrapper)
- BeatClock (musical timing system)
- OceanStore (Zustand state)
- Timeline management system
- Beat-synchronized scheduling

**Time:** 1-2 days

---

## M2: Robot Basics

**Goal:** Robots spawn, swim, and can be selected

**Key Features:**
- Robot spawning system
- GSAP swim animations
- Robot selection/deselection
- Basic SVG rendering
- State management integration

**Time:** 2-3 days

---

## M3: Audio Integration

**Goal:** Robots play melodies synchronized to beat clock

**Key Features:**
- Melody generation system (16-step loops)
- Harmony palette system (8-note scales)
- Melody playback via AudioEngine
- Note scheduling on BeatClock
- Multiple synth types

**Time:** 2-3 days

---

## M4: Interactions & Systems

**Goal:** Robots interact and create musical moments

**Key Features:**
- Collision detection system
- Interaction audio/visual bursts
- Interaction cooldowns
- Enhanced melody playback
- Robot-robot interactions

**Time:** 2-3 days

---

## M5: Environment & Actors

**Goal:** Rich underwater world with factories

**Key Features:**
- Factory actors (spawn robots)
- Environmental actors (ruins, machinery)
- Camera pan/zoom system
- Depth layers (parallax)
- Procedural actor generation

**Time:** 3-4 days

---

## M6: Polish & Launch

**Goal:** Production-ready, deployed, portfolio-ready

**Key Features:**
- Mobile responsiveness
- Touch controls
- Performance optimization
- UI/UX polish
- Deployment to GitHub Pages
- Portfolio documentation

**Time:** 2-3 days

---

## Post-Launch (v1.1+)

**Potential Features:**
- Save/load system
- Robot breeding/reproduction
- Hunger/fullness mechanics
- Day/night cycles
- Additional instrument types
- Custom melody editing
- Social sharing

---

## Development Principles

1. **Incremental Progress** - Each milestone fully functional
2. **Test Early** - Validate architecture at each step
3. **Document Decisions** - Capture rationale for portfolio
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

[View detailed phase documentation](./)