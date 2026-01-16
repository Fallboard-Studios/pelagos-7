---
name: overview
description: Overview of available AI prompts for Pelagos-7 development
agent: ask
---

# AI Agent Prompts for Pelagos-7

This workspace provides specialized prompt files for common development tasks. Type `/` in chat to see all available prompts.

**See Also:**
- [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) - Architectural rules and patterns
- [`CONTRIBUTION_GUIDE.md`](../../docs/CONTRIBUTION_GUIDE.md) - Code standards and conventions
- [`AUDIO_SYSTEM.md`](../../docs/AUDIO_SYSTEM.md) - Audio architecture and patterns

## Available Prompts

### Project Planning
- `/manage-milestone-issues` - Create or review M*-issues.md milestone specifications

### Code Review
- `/review-architecture` - Check code for architectural violations
- `/review-pr` - Generate PR self-review checklist

### Git/GitHub Workflow
- `/commit-message` - Generate commit message following conventions
- `/pr-description` - Create PR description with template

### Testing
- `/generate-tests` - Create Vitest tests following project patterns

### Debugging
- `/debug-audio` - Diagnose audio timing and playback issues
- `/debug-memory` - Investigate memory leaks and performance issues

### Learning & Patterns
- `/how-schedule-audio` - Learn audio scheduling patterns
- `/how-animate` - Learn animation patterns with GSAP

## Quick Reference

**Key Documentation:**
- Architecture rules: `.github/copilot-instructions.md`
- Audio patterns: `docs/AUDIO_SYSTEM.md`
- Timing: `docs/BEAT_CLOCK.md`
- Testing: `docs/CONTRIBUTION_GUIDE.md`
- Code style: `docs/CONTRIBUTION_GUIDE.md`

**Key Principles:**
- AudioEngine for ALL audio (no Tone.js elsewhere)
- GSAP for ALL animation (no state-driven motion)
- BeatClock for ALL timing (no setTimeout/setInterval)
- State is ONLY serializable data
- Timelines stored in timelineMap, NEVER in state

**Forbidden Patterns:**
- `import * as Tone` outside `src/engine/`
- GSAP timelines in state
- setTimeout/setInterval for game/audio timing
- Synths in React components
- Audio calls in GSAP callbacks

## Usage Tips

1. **Type `/` in chat** to see all available prompts
2. **Use argument hints** - Many prompts accept parameters like `/new-interaction echo`
3. **Reference docs explicitly** - Prompts automatically link to relevant documentation
4. **Iterate on responses** - If the first response isn't quite right, provide specific feedback
5. **Check examples first** - Use `/how-*` prompts to learn patterns before implementing

For detailed prompt examples and best practices, see individual prompt files in this directory.
