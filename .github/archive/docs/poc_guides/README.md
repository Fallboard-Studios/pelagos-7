# Development Process Guides

This directory contains the phase-by-phase development plan used to build Pelagos-7. These guides demonstrate the project planning methodology, architectural decision-making process, and systematic approach to building complex interactive applications.

## Purpose

These documents serve as:
- **Planning artifacts** showing how the project was broken down into manageable phases
- **Architectural context** explaining WHY certain technical decisions were made
- **Process documentation** demonstrating professional project management practices
- **Reference material** for understanding the development timeline and priorities

## For Different Audiences

**Users:** See the main [README](../../README.md) for setup, usage, and live demo.

**Developers:** See [CONTRIBUTION_GUIDE](../CONTRIBUTION_GUIDE.md) for coding standards and PR workflow.

**Portfolio Reviewers:** These guides showcase systematic planning, architectural thinking, and professional development practices.

**Future Contributors:** Use these guides to understand the project's evolution and design decisions.

## Guide Overview

### Master Plan
- **[NEW_APP_STEPS_OVERVIEW.md](NEW_APP_STEPS_OVERVIEW.md)** - High-level roadmap covering all 9 phases from foundation to launch

### Phase Guides
Each phase has a detailed guide with step-by-step instructions, time estimates, and deliverables:

0. **[phase-0-repository-foundation.md](phase-0-repository-foundation.md)** - GitHub organization, repo setup, scaffolding
1. **[phase-1-ai-documentation.md](phase-1-ai-documentation.md)** - Comprehensive AI instructions and architecture docs
2. **[phase-2-github-project-setup.md](phase-2-github-project-setup.md)** - Project board, milestones, issue creation
3. **[phase-3-foundation.md](phase-3-foundation.md)** - Core scaffolding, Play button, empty canvas
4. **[phase-4-core-architecture.md](phase-4-core-architecture.md)** - AudioEngine, BeatClock, GSAP timelines, Zustand state
5. **[phase-5-robot-basics.md](phase-5-robot-basics.md)** - Robot rendering, autonomous swimming, selection system
6. **[phase-6-audio-integration.md](phase-6-audio-integration.md)** - Melody playback, polyphony management
7. **[phase-7-interactions.md](phase-7-interactions.md)** - Collision detection, robot-robot interactions, factory actors
8. **[phase-8-environment.md](phase-8-environment.md)** - Camera pan/zoom, environmental actors, depth layers
9. **[phase-9-polish-launch.md](phase-9-polish-launch.md)** - UI panels, mobile optimization, deployment

## Key Architectural Decisions

These guides document important technical choices:
- **Three Pillars Architecture**: Separation of Audio/Animation/State concerns
- **Beat-Based Timing**: Musical time (measures/beats) instead of wall-clock time
- **Factory-Based Spawning**: Simplified robot creation vs. biological systems
- **Index-Based Melodies**: Dynamic harmony adaptation without melody regeneration
- **Singleton Pattern**: Global AudioEngine for centralized audio management

## Development Philosophy

The guides embody these principles:
- **Plan before coding**: Write comprehensive specs first
- **AI-assisted development**: Clear architectural rules prevent drift
- **Incremental progress**: Small PRs, frequent commits, visible milestones
- **Portfolio-ready**: Every phase produces demonstrable value

## Context

These guides were created during the planning phase to:
1. Transform lessons learned from the Oceanic proof-of-concept
2. Adapt the aquarium simulation concept to a robot/post-apocalyptic theme
3. Simplify complexity by removing biological systems (hunger, reproduction)
4. Establish professional development workflow for portfolio presentation

## Usage

While these guides reference building the project from scratch, they remain valuable for:
- Understanding the rationale behind current architecture
- Planning future features using the same methodology
- Onboarding new contributors to the project's philosophy
- Demonstrating systematic thinking to employers/reviewers

---

**Note:** References to "Oceanic" refer to the proof-of-concept project that validated these patterns before Pelagos-7 was built.
