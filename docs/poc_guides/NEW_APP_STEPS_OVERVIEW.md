# Pelagos-7 Development Plan - Master Overview

**Project:** Pelagos-7 (Robot Symphony Ambient Generator)  
**Organization:** Fallboard Studios  
**Repository:** `fallboard-studios/pelagos-7`  
**Timeline:** 4-6 weeks to v1.0  
**Purpose:** Portfolio-ready interactive musical experience featuring autonomous robots in a post-apocalyptic setting

**Current Context:** This document is written within the Oceanic codebase workspace. Oceanic serves as a proof-of-concept that we'll reference but NOT modify. Pelagos-7 will be a fresh repository under the Fallboard Studios organization with clean git history and professional workflow.

---

## Philosophy

**What We're Building:**
A browser-based ambient music generator where robots swim autonomously through a post-apocalyptic environment, creating evolving musical compositions through their movements and interactions. Factory actors periodically build new robots. All timing is synchronized to musical beats for perfect audio/visual harmony.

**What Makes This Portfolio-Worthy:**
- Clean architecture (Audio/Animation/State separation pattern)
- Beat-synchronized timing system (musical alignment)
- Procedural generation (robot parts, melodies, environment)
- Complex state management with simple rules
- Professional git workflow and documentation

**Key Simplification vs Oceanic:**
By removing hunger/reproduction/food systems (~900 lines), we eliminate biological complexity while keeping all the interesting technical challenges. Factory actors replace reproduction - much simpler, thematically appropriate.

---

## Phase Overview

### Phase 0: Repository Foundation (Week 1, Days 1-2)
**Goal:** Create GitHub organization and new repository with professional structure, templates, and initial scaffolding.

**Why This Phase:**
Start with a clean slate. Establish Fallboard Studios as a professional brand. Set up workflows that demonstrate professional practices for portfolio reviewers. Establish conventions before writing any feature code.

**Deliverables:**
- [ ] GitHub organization "fallboard-studios" created
- [ ] Organization profile configured (bio, website, profile README)
- [ ] New repository "pelagos-7" created under organization
- [ ] Branch protection rules configured (main requires PR)
- [ ] Issue/PR templates created (.github/ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md)
- [ ] Initial README.md with project vision
- [ ] Vite + React + TypeScript scaffold (empty)
- [ ] ESLint, Prettier, tsconfig configured
- [ ] Basic folder structure created (empty src/ dirs)
- [ ] Initial commit pushed to main

**Time Estimate:** 4-6 hours

**Prerequisites:** None

**Outputs:** 
- Fallboard Studios organization established on GitHub
- Clean repo ready for feature development
- Professional workflow established
- First 3-5 commits demonstrating commit conventions

**Reference:** Current `package.json`, `tsconfig.json`, `eslint.config.js` for proven configs

**Detailed Steps:** → `docs/phase-0-repository-foundation.md` (to be created)

---

### Phase 1: AI Documentation (Week 1, Days 2-3)
**Goal:** Write comprehensive AI instruction documentation that will guide all future development.

**Why This Phase:**
AI-assisted development requires explicit architectural rules. Write these ONCE at the start, not mid-development. These docs become portfolio artifacts showing architectural thinking.

**Deliverables:**
- [ ] `.github/copilot-instructions.md` - Master AI guide (adapted from Oceanic)
- [ ] `docs/ARCHITECTURE.md` - Three pillars pattern (Audio/Animation/State)
- [ ] `docs/ROBOT_DESIGN.md` - Visual design guide, SVG structure, theming
- [ ] `docs/AUDIO_SYSTEM.md` - Audio system overview, Tone.js best practices, troubleshooting
- [ ] `docs/BEAT_CLOCK.md` - Musical timing system, BeatClock API, scheduling patterns
- [ ] `docs/HARMONY_SYSTEM.md` - Dynamic note palettes, 24-hour cycle
- [ ] `docs/MELODY_SYSTEM.md` - Procedural melody generation, weighted distributions
- [ ] `docs/POLYPHONY_GUIDE.md` - Voice management, synth pooling
- [ ] `docs/ANIMATION_SYSTEM.md` - GSAP patterns, timeline management
- [ ] `docs/CONTRIBUTION_GUIDE.md` - Coding standards, commit conventions, testing

**Time Estimate:** 6-8 hours

**Prerequisites:** Phase 0 complete

**Outputs:** 
- Documentation that prevents architectural drift
- Reference material for AI assistants
- Portfolio evidence of architectural planning

**Reference:** Current `.github/copilot-instructions.md` - adapt for robot theme, remove hunger/reproduction sections

**Detailed Steps:** → `docs/phase-1-ai-documentation.md` (to be created)

---

### Phase 2: GitHub Project Setup (Week 1, Day 4)
**Goal:** Create project board, milestones, and initial 30-40 tickets for all planned work.

**Why This Phase:**
Demonstrates project management skills. Having tickets written upfront prevents scope creep and shows planning ability. Reviewers can see the full development arc.

**Deliverables:**
- [ ] GitHub Project created (board view + roadmap)
- [ ] 7 Milestones created (M0-M6)
- [ ] 30-40 issues created and assigned to milestones
- [ ] Initial issues labeled (feature/bug/refactor/docs)
- [ ] Roadmap timeline set (4-6 weeks)
- [ ] Project README.md updated with milestone links

**Time Estimate:** 3-4 hours

**Prerequisites:** Phase 1 complete (so tickets reference architecture docs)

**Outputs:**
- Complete development roadmap visible on GitHub
- Professional project management setup
- Clear path to v1.0

**Milestones:**
- M0: Repository Foundation (~5 tickets)
- M1: Core Architecture (~6 tickets)
- M2: Robot Basics (~6 tickets)
- M3: Audio Integration (~5 tickets)
- M4: Interactions & Systems (~6 tickets)
- M5: Environment & Actors (~6 tickets)
- M6: Polish & Launch (~8 tickets)

**Detailed Steps:** → `docs/phase-2-github-project-setup.md` (to be created)

---

### Phase 3: Foundation (M0) (Week 1-2, Days 5-7)
**Goal:** Build working scaffold with configs, basic UI shell, and Play button that initializes audio.

**Why This Phase:**
Get something running immediately. Verify toolchain works. Establish development workflow (branch → PR → merge). First portfolio-visible commits.

**Deliverables:**
- [ ] Vite dev server runs without errors
- [ ] Basic `<OceanScene>` component renders empty canvas
- [ ] `<PlayButton>` component triggers AudioEngine.start()
- [ ] AudioEngine singleton created (empty, just start/stop)
- [ ] BeatClock stub (returns current measure/beat)
- [ ] Zustand oceanStore created (empty robot array)
- [ ] ESLint passes, TypeScript compiles
- [ ] First 5 PRs merged with clean history

**Time Estimate:** 1-2 days (5-8 PRs)

**Prerequisites:** Phase 2 complete (tickets exist)

**Outputs:**
- Runnable app (empty canvas with Play button)
- Core singleton patterns established
- Professional git history started

**Key Files Created:**
- `src/engine/AudioEngine.ts`
- `src/engine/beatClock.ts`
- `src/stores/oceanStore.ts`
- `src/components/OceanScene.tsx`
- `src/components/PlayButton.tsx`

**Reference:** Port structure from current Oceanic files, but empty/minimal implementations

**Detailed Steps:** → `docs/phase-3-foundation.md` (to be created)

---

### Phase 4: Core Architecture (M1) (Week 2, Days 1-4)
**Goal:** Implement the three pillars fully: AudioEngine with Transport, GSAP timeline management, complete Zustand state.

**Why This Phase:**
This IS the portfolio piece. Audio/animation separation, beat-based timing, timeline management - these are the hard technical problems. Get them right early.

**Deliverables:**
- [ ] AudioEngine: Transport scheduling, synth pool, scheduleNote() working
- [ ] BeatClock: 16-step loop, measure/beat tracking, scheduleRepeat()
- [ ] Harmony system: 8-note palette that changes every 4 measures
- [ ] Timeline management: timelineMap, setTimeline/killTimeline utilities
- [ ] Store actions: addRobot, removeRobot, updateRobot
- [ ] Type definitions: Robot, RobotState, AudioAttributes, Vec2
- [ ] No visual output yet, but console logs show system working

**Time Estimate:** 3-4 days (6-8 PRs)

**Prerequisites:** Phase 3 complete

**Outputs:**
- Functional timing system (musical alignment works)
- Audio scheduling infrastructure
- State management patterns
- GSAP patterns established

**Key Concepts Implemented:**
- Tone.Transport as authoritative clock
- GSAP timelines stored in separate Map (not state)
- Zustand for serializable data only
- No setTimeout/setInterval/rAF for timing

**Reference:** 
- `src/engine/AudioEngine.ts` (port synth pooling, scheduleNote)
- `src/engine/beatClock.ts` (port timing logic)
- `src/engine/harmonySystem.ts` (port note palette system)
- `src/animation/timelineMap.ts` (port timeline management)

**Detailed Steps:** → `docs/phase-4-core-architecture.md` (to be created)

---

### Phase 5: Robot Basics (M2) (Week 2-3, Days 5-7)
**Goal:** Robots appear on screen, swim autonomously, can be selected/deselected. No audio yet.

**Why This Phase:**
First visual output! This is when the app becomes "real." GSAP animation patterns get proven. Establishes the core game loop without complexity.

**Deliverables:**
- [ ] Testing infrastructure setup (Vitest + jsdom)
- [ ] Initial test suite for Phase 4 utilities (BeatClock, harmonySystem, oceanStore)
- [ ] Robot type defined (position, state, destination, audio attributes, SVG parts)
- [ ] Robot SVG components created (chassis, head, propeller, 2 antennae)
- [ ] 2-3 visual variants (different chassis/head combinations)
- [ ] Robot spawning system (manual spawn button for now)
- [ ] GSAP swim animation (point-to-point with rotation)
- [ ] Idle state: robot picks new destination after arrival
- [ ] Selection system: click to select, shows outline
- [ ] Timeline cleanup on state changes

**Time Estimate:** 2-3 days (5-7 PRs)

**Prerequisites:** Phase 4 complete (timeline management works)

**Outputs:**
- Visible robots swimming autonomously
- GSAP animation working correctly
- Selection/state management proven
- Test suite covering core utilities

**Key Components:**
- `vite.config.ts` (test configuration)
- `src/engine/beatClock.test.ts` (new file)
- `src/engine/harmonySystem.test.ts` (new file)
- `src/stores/oceanStore.test.ts` (new file)
- `src/components/Robot.tsx`
- `src/components/RobotBody.tsx` (SVG parts)
- `src/animation/robotAnimation.ts` (swim timelines)
- `src/hooks/useRobotAnimation.ts`
- `src/systems/spawnerSystem.ts`

**Reference:**
- `src/components/Robot.tsx` → Robot.tsx structure
- `src/animation/robotAnimation.ts` → robotAnimation.ts patterns
- Current SVG structure (adapt parts to robot theme)

**Detailed Steps:** → `docs/phase-5-robot-basics.md` (to be created)

---

### Phase 6: Audio Integration (M3) (Week 3, Days 1-3)
**Goal:** Connect robot melodies to audio playback. Notes play synchronized to Transport. Polyphony prevents audio chaos.

**Why This Phase:**
This is where the "musical" part happens. Robots already have melodies (from M1), now they play them. Beat-synced playback demonstrates the timing system's value.

**Deliverables:**
- [ ] Robot lifecycle management (register/unregister melodies with AudioEngine)
- [ ] Melody playback triggered when robots swim
- [ ] Polyphony management system (internal AudioEngine logic, no UI)
- [ ] Voice limiting enforced (8-12 voices max)
- [ ] Audio status display (shows active robot/voice count)
- [ ] Clean lifecycle (no memory leaks on robot removal)

**Time Estimate:** 2-3 days (2 PRs)

**Prerequisites:** Phase 5 complete (robots exist and swim), Phase 4 complete (melody generator and harmony system working)

**Outputs:**
- Musical output synchronized to visuals
- Polyphony system working
- Audio/animation separation maintained

**Key Files:**
- `src/engine/AudioEngine.ts` (add lifecycle hooks)
- `src/engine/polyphonyManager.ts` (new file)
- `src/systems/spawner.ts` (register melodies)
- `src/stores/oceanStore.ts` (unregister on removal)
- `src/components/ui/AudioStatusDisplay.tsx` (new component)

**Reference:**
- Current AudioEngine structure (add register/unregister methods)
- Polyphony patterns from Oceanic
- Lifecycle management patterns

**Detailed Steps:** → `docs/phase-6-audio-integration.md` (to be created)

---

### Phase 7: Interactions (M4) (Week 3-4, Days 4-6)
**Goal:** Robots detect proximity, trigger interaction events with visual/audio effects. Factory actors spawn new robots.

**Why This Phase:**
Interactions create dynamic behavior. Collision system demonstrates spatial algorithms. Factory actors replace reproduction (much simpler).

**Deliverables:**
- [ ] Collision detection system (gsap.ticker based)
- [ ] Robot-robot interaction: note flurry + visual burst
- [ ] Interaction cooldown system (measure-based)
- [ ] Factory actor type defined
- [ ] 1-2 factory actor variants (different visual styles)
- [ ] Factory production: spawns robot every N measures
- [ ] Interaction bursts: particle effects or scale animations

**Time Estimate:** 2-3 days (4-6 PRs)

**Prerequisites:** Phase 6 complete (audio works)

**Outputs:**
- Dynamic system with emergent behavior
- Factory spawning mechanism
- Interaction visual polish

**Key Files:**
- `src/hooks/useCollisionSystem.ts`
- `src/animation/interactionBursts.ts`
- `src/components/actors/FactoryRenderer.tsx`
- `src/factory/actorFactory.ts`

**Reference:**
- `src/hooks/useCollisionSystem.ts` (port collision logic)
- `src/animation/interactionBursts.ts` (port burst patterns)
- Simplify: no hunger checks, no reproduction complexity

**Detailed Steps:** → `docs/phase-7-interactions.md` (to be created)

---

### Phase 8: Environment (M5) (Week 4, Days 1-3)
**Goal:** Add environmental actors (ruins, machinery, scrap), camera pan/zoom, depth layers, bubbles.

**Why This Phase:**
Visual polish. Environment actors add thematic richness. Camera system shows UX thinking. Depth/parallax demonstrates rendering sophistication.

**Deliverables:**
- [ ] Camera pan/zoom system (drag to pan, scroll to zoom)
- [ ] Viewport persistence (save/restore camera position)
- [ ] Environmental actor types: ruins, machinery, scrap piles
- [ ] 2-3 procedurally generated actor types (like current flora)
- [ ] Depth layers with parallax effect (3-4 z-indices)
- [ ] Bubble system (ambient particles)
- [ ] World bounds enforcement

**Time Estimate:** 2-3 days (4-6 PRs)

**Prerequisites:** Phase 7 complete (interactions work)

**Outputs:**
- Rich visual environment
- Navigable world space
- Atmospheric particle effects

**Key Files:**
- `src/hooks/useCameraPan.ts`
- `src/components/actors/RuinRenderer.tsx`
- `src/components/actors/MachineryRenderer.tsx` (procedural)
- `src/components/BubbleLayer.tsx`
- `src/hooks/useAmbientBubbles.ts`

**Reference:**
- `src/hooks/useCameraPan.ts` (port camera logic)
- `src/components/actors/FloraRenderer.tsx` → adapt to machinery
- `src/components/BubbleLayer.tsx` (port as-is)

**Detailed Steps:** → `docs/phase-8-environment.md` (to be created)

---

### Phase 9: Polish & Launch (M6) (Week 5-6)
**Goal:** UI panels, mobile optimization, performance tuning, deployment, portfolio presentation materials.

**Why This Phase:**
Final 20% that makes it portfolio-ready. Mobile support shows production thinking. Performance demonstrates optimization skills. Deployment proves it's real.

**Deliverables:**
- [ ] Robot editor panel (view/edit attributes when selected)
- [ ] Settings panel (volume, BPM, visual options)
- [ ] Time display (measures/hours indicator)
- [ ] Mobile-responsive layout (touch controls, UI scaling)
- [ ] Performance optimization pass (60 FPS target)
- [ ] GitHub Pages deployment configured
- [ ] README.md with screenshots, live demo link
- [ ] PORTFOLIO.md case study writeup
- [ ] Architecture diagram (visual)
- [ ] Demo mode (auto-spawns robots, showcases features)

**Time Estimate:** 1-2 weeks (8-12 PRs)

**Prerequisites:** Phase 8 complete (environment done)

**Outputs:**
- Live deployed application
- Portfolio presentation materials
- Professional README
- Case study documentation

**Key Files:**
- `src/components/panels/RobotEditorPanel.tsx`
- `src/components/panels/SettingsPanel.tsx`
- `src/components/TimeDisplay.tsx`
- `docs/PORTFOLIO.md`
- Performance profiling scripts

**Reference:**
- Current panel components (adapt UI patterns)
- `src/components/TimeDisplay.tsx` (port display logic)

**Detailed Steps:** → `docs/phase-9-polish-launch.md` (to be created)

---

## Post-Launch (Optional Enhancements)

**If time permits or for v1.1:**
- [ ] Save/load system (export/import world state)
- [ ] Per-robot mute/solo controls (audio management UI)
- [ ] Visual audio feedback (glow effects when robots play notes)
- [ ] More robot variants (10+ visual combinations)
- [ ] Energy system (visual dimming, charging stations)
- [ ] Audio presets (different musical modes)
- [ ] Advanced camera (follow selected robot)
- [ ] Sharing (URL params for world seed)

---

## What We're NOT Building

**Explicitly out of scope for v1.0:**
- ❌ Hunger/food system (complexity without portfolio value)
- ❌ Reproduction/courtship (replaced by factories)
- ❌ Maturity points (unnecessary complexity)
- ❌ User-placed food (not thematic)
- ❌ Biological life systems (wrong theme)

**Why:** These added 900+ lines of state management in Oceanic without improving the portfolio story. Factories are simpler and thematically appropriate.

---

## Success Metrics

**v1.0 is complete when:**
- ✅ 6-12 robots swimming autonomously
- ✅ Musical notes generated from robot movements
- ✅ Factories periodically spawn new robots
- ✅ Interactions produce audio/visual effects
- ✅ Environment actors provide thematic richness
- ✅ Camera pan/zoom works on desktop and mobile
- ✅ Deployed live on GitHub Pages
- ✅ Clean git history with 50+ meaningful commits
- ✅ Professional README with screenshots/demo link
- ✅ No console errors or warnings
- ✅ 60 FPS on modern hardware

**Portfolio presentation ready when:**
- ✅ PORTFOLIO.md case study written
- ✅ Architecture diagram created
- ✅ Live demo tested on multiple devices
- ✅ GitHub Project shows completed milestones
- ✅ Code standards enforced (audit scripts pass)

---

## Reference Materials

**From Current Oceanic Codebase:**
- `.github/copilot-instructions.md` - Architecture patterns (adapt)
- `src/engine/AudioEngine.ts` - Audio system structure (port)
- `src/engine/beatClock.ts` - Timing system (port)
- `src/engine/melodyGenerator.ts` - Melody algorithm (port)
- `src/animation/timelineMap.ts` - Timeline management (port)
- `src/hooks/useCollisionSystem.ts` - Collision detection (port)

**To Skip/Not Port:**
- `src/systems/hungerSystem.ts` - Not needed
- `src/systems/foodSystem.ts` - Not needed
- `src/animation/courshipFlourishes.ts` - Not needed
- Any fullness/maturity/reproduction logic - Not needed

---

## Next Steps

1. **Review this overview** - Confirm phases make sense
2. **Create detailed substep docs** - One doc per phase with ticket lists
3. **Execute Phase 0** - Create new repository
4. **Begin development** - Follow ticket-by-ticket workflow

This overview serves as the master plan. Each phase will get a detailed doc with specific tickets, code examples, and step-by-step instructions.

**Ready to proceed?** Next action: Write `docs/phase-0-repository-foundation.md` with detailed steps for repo creation.
