# Phase 1: AI Documentation - Detailed Steps

**Timeline:** Week 1, Days 2-3 (6-8 hours)  
**Goal:** Write comprehensive AI instruction documentation that will guide all future development and prevent architectural drift.

---

## Prerequisites

- [x] Phase 0 complete (repository exists and is cloned locally)
- [x] Oceanic codebase available for reference (current workspace)
- [x] Understanding of the three pillars architecture (Audio/Animation/State)
- [x] Decision on robot theme vs biological systems

---

## Why This Phase Matters

**AI-assisted development requires explicit rules.** Without clear documentation:
- AI will make inconsistent architectural choices
- You'll repeat the same corrections constantly
- Code quality will drift over time
- Portfolio reviewers won't understand your thinking

**Write these docs ONCE at the start**, not mid-development. They become portfolio artifacts showing architectural planning and serve as onboarding for future contributors.

---

## Step 1: Master AI Instructions (3 hours)

### 1.1 Create Copilot Instructions File

**File: `.github/copilot-instructions.md`**

This is the master document that GitHub Copilot reads automatically. It should contain:

**Structure:**
```markdown
# Pelagos-7 - GitHub Copilot Instructions

## TL;DR for Copilot
[5-line summary of critical rules]

## Absolutely Forbidden
[List of things AI must NEVER do]

## Project Overview
[Brief description, tech stack, purpose]

## Critical Architecture Rules

## Tech Stack Details
[How each technology is used]

## Domain-Specific Concepts

## Coding Conventions

## Common Tasks

## Anti-Patterns to Avoid

## Code Organization Standards

```

**Content to adapt from Oceanic:**

**Section 1: TL;DR**
```markdown
## TL;DR for Copilot
- All audio = AudioEngine (singleton)
- All animation = GSAP (timelines in timelineMap, NOT state)
- All state = Zustand (serializable only)
- All timing = BeatClock/Transport (NO setTimeout/setInterval/rAF)
- NO synths in React components
- NO GSAP timelines in state
- NO main loop
```

**Section 2: Absolutely Forbidden**
Port from Oceanic, remove hunger/reproduction references:
```markdown
## Absolutely Forbidden (Copilot Read First)
- requestAnimationFrame loops (use GSAP ticker or BeatClock only)
- Local Tone.js synths (AudioEngine only)
- useEffect-triggered audio (BeatClock scheduling only)
- setTimeout/setInterval (use Transport.schedule)
- DOM manipulation without refs
- React-driven animations
- GSAP timelines stored in React/Zustand state
- JS classes (use functions unless absolutely necessary)
```

**Section 3: Project Overview**
```markdown
## Project Overview
Pelagos-7 is a browser-based ambient music generator where robot fish swim autonomously through a post-apocalyptic underwater environment. Robots interact with each other and factory actors, creating evolving musical compositions synchronized to musical beats.

## Tech Stack
- **React** with **TypeScript**
- **Zustand** for state management
- **Tone.js** for audio synthesis and scheduling
- **GSAP** for all animations and pathing
- **SVG** for all visual assets
- **Vite** as build tool
- Hosted on **GitHub Pages**
```

**Section 4: Critical Architecture Rules**

Port Audio/Animation/State separation sections from Oceanic's copilot-instructions.md, but update:
- Remove hunger system references
- Remove reproduction/courtship references
- Add factory actor spawning
- Simplify complexity notes

**Section 5: Robot-Specific Concepts**

```markdown
## Robot Design
- Robots composed of 5 swappable SVG parts: chassis, head, propeller, top antenna, bottom antenna
- SVGs grouped in `<g>` tags for CSS color class application
- Musical attributes determine visual appearance (synth shape → head shape, ADSR → colors)

## Factory Actors
- Factories spawn new robots periodically (measure-based timing)
- Factory production cooldown: configurable (default 120 measures)
- No proximity required - factory just produces on timer
- Factory type determines robot blueprint (visual + audio attributes)
```

**Section 6: Melody System Requirements**

Port the entire "Melody System Requirements" section from Oceanic copilot-instructions.md - this is critical and proven.

**Section 7: Beat-Based World Time**

Port the entire "Beat-Based World Time" section - the timing architecture is core to the project.

**Time estimate for this file:** 2-3 hours

---

### 1.2 Validation Checklist

After completing Section 1.1, verify that your `.github/copilot-instructions.md` file meets all requirements:

#### Terminology Transformation
- [X] All "Fish" → "Robot" (uppercase)
- [X] All "fish" → "robot" (lowercase)
- [X] All "FishMelodyEvent" → "RobotMelodyEvent"
- [X] All "fishRefs" → "robotRefs"
- [X] All "useFishAnimation" → "useRobotAnimation"
- [X] All "MAX_FISH" → "MAX_ROBOTS"

#### Content Verification
- [x] TL;DR section present (5-line summary)
- [x] Absolutely Forbidden section present (no biological systems)
- [x] Project Overview describes robot-based music generation
- [x] Critical Architecture Rules section complete:
  - [x] Audio Architecture (6 rules)
  - [x] Animation Architecture (6 rules + Robot Pathing Pipeline)
  - [x] State Management (8 rules + example store)
- [x] Melody System Requirements section complete (all subsections)
- [x] Beat-Based World Time section complete (all subsections)
- [x] Coding Conventions section complete
- [x] Common Tasks section complete (4 workflows)
- [x] Anti-Patterns to Avoid section complete (7 examples)
- [x] Code Organization Standards section complete

#### Biological Systems Removed
- [x] No "Hunger System" sections
- [x] No "Food System" sections
- [x] No "Reproduction & Courtship" sections
- [x] No "Maturity Points" sections (or simplified if kept)
- [x] No "fullness" or "calorie" references
- [x] No breeding/spawning from two parents

#### Factory Actor Concepts Added
- [x] Factory actors spawn robots periodically
- [x] Factory production cooldown documented
- [x] Factory types determine robot blueprints
- [x] No proximity-based spawning (timer-based only)

#### Code Examples Updated
- [x] All TypeScript examples use Robot types
- [x] All component examples use robot terminology
- [x] All hook examples use robot terminology
- [x] All timeline examples reference robots
- [x] All AudioEngine examples reference robotId

#### Architecture Compliance
- [x] No Tone.js outside engine/ in examples
- [x] No timelines in state examples
- [x] No setTimeout/setInterval in timing examples
- [x] All scheduling uses BeatClock/Transport
- [x] GSAP timeline examples show timelineMap usage

#### File Structure Examples
- [x] Import ordering rules documented (7 groups)
- [x] Props interface guidelines present
- [x] Return type guidelines present
- [x] Constant extraction examples present
- [x] React component example complete
- [x] Utility module example complete

#### Final Review
- [x] Read through entire file start to finish
- [x] No placeholder text remaining (no "[TODO]" or "[Port from...]")
- [x] All code examples are syntactically valid
- [x] No contradictory instructions
- [x] File is ready to guide AI-assisted development

**If any checklist item fails**: Return to Section 1.1 and fix before proceeding to Step 2.

---

## Step 2: Architecture Documentation (1.5 hours)

### 2.1 Create Architecture Guide

**File: `docs/ARCHITECTURE.md`**

**Time estimate:** 1 hour to write, 30 min to review

---

### 2.2 Create Robot Design Guide

**File: `docs/ROBOT_DESIGN.md`**


**Time estimate:** 1 hour

---

## Step 3: System-Specific Guides (2 hours)

### 3.1 Audio System Guide

**File: `docs/AUDIO_SYSTEM.md`**


**Time estimate:** 45 minutes (mostly porting)

**Note:** Full AUDIO_SYSTEM.md content has been created. See [AUDIO_SYSTEM.md](../AUDIO_SYSTEM.md) for the complete guide covering Tone.js best practices, scheduling patterns, troubleshooting, and more.

---

### 3.2 Animation System Guide

**File: `docs/ANIMATION_SYSTEM.md`**

**Purpose:** Comprehensive guide to GSAP animation patterns, timeline management, and performance optimization.

**Key sections to include:**
- Timeline Map pattern (setTimeline, getTimeline, killTimeline)
- React integration with useGSAP hook
- Common animation types:
  - Swim animation (movement + propeller + tilt)
  - Idle animation (bob + sway)
  - Interaction burst (scale + rotation)
  - Propeller spin (state-based speeds)
- Performance best practices
- Forbidden patterns (timeline in state, rAF loops, layout properties)
- Audit checklist

**See the created file:** [docs/ANIMATION_SYSTEM.md](../ANIMATION_SYSTEM.md)

**Time estimate:** 45 minutes

**Note:** Full ANIMATION_SYSTEM.md content has been created. See [ANIMATION_SYSTEM.md](../ANIMATION_SYSTEM.md) for the complete guide.

---

### 3.3 Forbidden Patterns Document

SKIPPED

---

## Step 4: Contribution Guide (1 hour)

### 4.1 Create Contribution Guide

**File: `docs/CONTRIBUTION_GUIDE.md`**

**Purpose:** Establish code standards, commit conventions, and PR workflow for consistent development.

**Key sections to include:**
- File structure standard (React components vs non-components)
- Import ordering rules (7 groups: React → types → components → hooks → utils → constants → stores)
- Type declaration guidelines (when to use Props interfaces, return types)
- Commit conventions (conventional commits format)
- Branch naming patterns (feature/, fix/, docs/, etc.)
- PR workflow (self-review checklist, PR template, review process)
- Common patterns (DO vs DON'T examples)
- Architecture rules (audio, animation, state, timing)

**See the created file:** [docs/CONTRIBUTION_GUIDE.md](../CONTRIBUTION_GUIDE.md)

**Time estimate:** 45 minutes (mostly porting from CODE_STANDARDS_IMPLEMENTATION.md)

---

## Step 5: Create Quick Reference (30 minutes)

SKIPPING

---

## Step 6: Review and Commit (30 minutes)

### 6.1 Review All Docs

Checklist:
- [x] All terminology updated
- [x] Hunger/reproduction removed
- [x] Factory actors mentioned
- [x] Examples use correct imports
- [x] Links between docs work
- [x] Code examples compile

### 6.2 Commit Documentation

```bash
git checkout -b docs/ai-documentation

# Commit each doc separately
git add .github/copilot-instructions.md
git commit -m "docs: add comprehensive AI instructions"

git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture guide (three pillars)"

git add docs/ROBOT_DESIGN.md
git commit -m "docs: add robot visual design system"

git add docs/AUDIO_SYSTEM.md
git commit -m "docs: add audio system guide (overview and patterns)"

git add docs/ANIMATION_SYSTEM.md
git commit -m "docs: add animation system guide (GSAP patterns)"

git add docs/BEAT_CLOCK.md
git commit -m "docs: add beat clock timing system guide"

git add docs/HARMONY_SYSTEM.md
git commit -m "docs: add harmony system guide (dynamic note palettes)"

git add docs/MELODY_SYSTEM.md
git commit -m "docs: add melody generation system guide"

git add docs/POLYPHONY_GUIDE.md
git commit -m "docs: add polyphony management guide"

git add docs/CONTRIBUTION_GUIDE.md
git commit -m "docs: add contribution guide"

git add README.md
git commit -m "docs: update main README with project overview"

git push origin docs/ai-documentation
```

### 6.3 Create PR

Create PR with description:
```markdown
## AI Documentation Complete

Adds comprehensive documentation for AI-assisted development:

**Core Documentation:**
- Master Copilot instructions (architecture rules)
- Three pillars architecture guide (Audio/Animation/State)
- Robot visual design system (SVG parts, color mapping)
- Contribution guidelines (code standards, PR workflow)
- Updated README with project overview

**Audio System Guides:**
- Audio system overview and patterns (Tone.js integration)
- BeatClock timing system (96-measure cycle)
- Harmony system (dynamic 8-note palettes)
- Melody generation system (procedural patterns)
- Polyphony management guide (voice pooling)

**Animation System Guides:**
- GSAP animation patterns and timeline management
- Swim, idle, and interaction animations
- timelineMap architecture (no timelines in state)

**Key Features:**
- Robot-themed terminology throughout
- Factory-based spawning (no biological systems)
- Beat-based timing (musical, not clock-based)
- Index-based melodies (adapt to harmony changes)
- Clear architectural separation (Audio/Animation/State)
- Forbidden patterns catalog for common pitfalls

**Adapted from:** Oceanic POC codebase
**Changes:** Robot terminology, removed biological systems, added factory actors, split audio documentation into focused guides, enhanced animation patterns

Closes #[issue number]
```

Adds comprehensive documentation for AI-assisted development:

- Master Copilot instructions (architecture rules)
- Three pillars architecture guide
- Robot visual design system
- Audio system patterns (Tone.js)
- Animation system patterns (GSAP)
- Forbidden patterns reference
- Contribution guidelines
- Quick reference cheat sheet

This documentation will guide all future development and prevent architectural drift.

**Adapted from:** Oceanic POC codebase
**Changes:** Robot terminology, removed biological systems, added factory actors

Closes #[issue number]
```

---

## Phase 1 Complete! ✅

**What You've Accomplished:**
- ✅ Comprehensive AI instruction docs
- ✅ Architecture guide with three pillars explained
- ✅ Robot design system documented
- ✅ Audio/animation system guides
- ✅ Forbidden patterns catalog
- ✅ Contribution guidelines
- ✅ Quick reference cheat sheet
- ✅ All docs committed with clean history

**What You Can Show:**
- Professional documentation structure
- Clear architectural thinking
- Thorough planning before coding
- AI-friendly development setup

**Portfolio Value:**
- Demonstrates architectural planning skills
- Shows documentation ability
- Proves systematic approach
- Ready for team collaboration

**Next Phase:** [Phase 2: GitHub Project Setup](phase-2-github-project-setup.md)

Create project board, milestones, and 30-40 tickets for all planned work.

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Copilot instructions | 3 hours | |
| Architecture guide | 1 hour | |
| Robot design guide | 1 hour | |
| Audio/animation guides | 1.5 hours | |
| Forbidden patterns | 30 min | |
| Contribution guide | 45 min | |
| Quick reference | 30 min | |
| Review & commit | 30 min | |
| **Total** | **~8 hours** | |

---

## Tips for AI Collaboration

When working with AI assistants during this phase:

**Good prompts:**
- "Port the melody system section from Oceanic copilot-instructions.md, update terminology to robots"
- "Write the Audio System Guide following the structure in the outline, include code examples"

**Bad prompts:**
- "Write all the docs" (too vague)
- "Make it good" (no specifics)
- "Copy everything from Oceanic" (loses robot theme)

**Verification:**
After AI generates docs, manually check:
- Terminology consistency
- Code examples compile
- Links work
- No biological system references remain
