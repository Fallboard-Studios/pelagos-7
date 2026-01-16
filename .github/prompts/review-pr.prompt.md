---
name: review-pr
description: Generate PR self-review checklist for feature changes
argument-hint: featureName
agent: agent
tools:
  - get_changed_files
  - read_file
---

Generate a PR self-review checklist for ${input:featureName:this feature}.

Review changed files against Pelagos-7 architectural patterns and generate a comprehensive checklist.

## Analysis Steps

1. Get changed files using #tool:get_changed_files
2. For each changed file, check against:
   - [AUDIO_SYSTEM.md](../../docs/AUDIO_SYSTEM.md) forbidden patterns
   - Animation system rules (no timelines in state)
   - State management (serializable only)
   - File structure standards from [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md)

## Checklist Format

### Architectural Compliance
- [ ] No Tone.js imports outside `src/engine/`
- [ ] No GSAP timelines stored in state
- [ ] No setTimeout/setInterval for timing
- [ ] All state is JSON-serializable
- [ ] Audio uses AudioEngine only
- [ ] Animation uses GSAP only
- [ ] Timing uses BeatClock/Transport only

### Code Quality
- [ ] Import ordering follows CONTRIBUTION_GUIDE.md
- [ ] Type annotations on exported functions
- [ ] Magic numbers extracted to constants
- [ ] Props interfaces for complex components
- [ ] JSDoc comments for non-obvious logic

### Testing
- [ ] Tests added for new utility functions
- [ ] Tests updated for changed logic
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Audio/animation working correctly

### Documentation
- [ ] Comments explain "why" not "what"
- [ ] System docs updated if patterns changed
- [ ] README updated if user-facing changes
- [ ] Commit message follows conventions

### Files Changed
[List each changed file with summary of changes]

---

**Next Steps:**
1. Review each item in the checklist
2. Fix any violations
3. Run tests: `npm test`
4. Manual testing in browser
5. Generate commit message with `/commit-message`
6. Generate PR description with `/pr-description`
