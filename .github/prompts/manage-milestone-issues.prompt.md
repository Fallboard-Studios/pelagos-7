---
name: manage-milestone-issues
description: Create or review GitHub issue specifications in M*-issues.md files
argument-hint: milestone action
agent: agent
tools:
  - file_search
  - read_file
  - replace_string_in_file
  - create_file
---

${input:action:Create} issue specifications for ${input:milestone:M0} milestone.

## M*-issues.md File Structure

These files break down project milestones (M0-M6) into individual GitHub issues with implementation details.

**File format:**
```markdown
# M[N]: Milestone Name

**Milestone:** M[N] - Milestone Name
**Timeline:** Week X (Days Y-Z)
**Goal:** Brief description of milestone objective

---

## M[N].[I]: Issue Title

**Title:** [M[N]] Brief GitHub issue title

**Labels:** feature/fix/chore, system: audio/animation/state, size: S/M/L/XL, priority: high/medium/low

### Feature Description
Clear description of what this issue implements.

### Implementation Details
- Step-by-step technical requirements
- File paths and functions to create
- Specific patterns to follow
- Code examples where helpful

### Acceptance Criteria
- [ ] Specific, testable criteria
- [ ] Each starting with action verb
- [ ] Include testing requirements
- [ ] Include lint/build passes

### Reference
- Oceanic: path/to/reference (if porting)
- Docs: relevant documentation
- Related issues: #XX
```

## Actions

### Create New Milestone Issues
When creating a new M*-issues.md file:

1. **Read existing milestone files** to understand format and detail level
2. **Understand milestone scope** from [ROADMAP.md](../../docs/ROADMAP.md)
3. **Break down into issues:**
   - Each issue should be completable in 1-4 hours
   - Group related changes into single issue
   - Order issues by dependency (what must be done first)
4. **For each issue include:**
   - Clear title following `[MN] Description` format
   - Appropriate labels (see label guide below)
   - Implementation details with file paths
   - Concrete acceptance criteria (checkboxes)
   - References to docs and related code

### Review Existing Issues
When reviewing M*-issues.md files:

1. **Check completeness:**
   - Are all steps in implementation details clear?
   - Are acceptance criteria specific and testable?
   - Are file paths and function names included?
   - Are references to docs included?

2. **Check architectural compliance:**
   - Does issue follow audio/animation/state separation?
   - Are forbidden patterns mentioned/avoided?
   - Does it reference relevant system docs?

3. **Check sizing:**
   - S (1-2 hours): Simple function, small component
   - M (2-4 hours): Module creation, component with state
   - L (4-8 hours): System integration, complex feature
   - XL (8+ hours): Break into smaller issues

4. **Check dependencies:**
   - Are issues ordered correctly?
   - Are blocking relationships noted?
   - Can issues be parallelized?

## Label Guide

**Type:**
- `feature` - New functionality
- `fix` - Bug fix
- `chore` - Tooling, setup, maintenance
- `docs` - Documentation only

**System:**
- `system: audio` - AudioEngine, Tone.js, harmony, melody
- `system: animation` - GSAP, timelines, motion
- `system: state` - Zustand stores, data management
- `system: ui` - React components, panels, controls

**Size:**
- `size: S` - 1-2 hours
- `size: M` - 2-4 hours
- `size: L` - 4-8 hours
- `size: XL` - 8+ hours (should be broken down)

**Priority:**
- `priority: high` - Blocking other work
- `priority: medium` - Important but not blocking
- `priority: low` - Nice to have

## Milestone Context

Reference [ROADMAP.md](../../docs/ROADMAP.md) for milestone definitions:

- **M0: Foundation** - Three pillars (Audio/Animation/State) scaffolding
- **M1: Core Architecture** - Systems operational
- **M2: Robot Basics** - Single robot spawn, movement, melody
- **M3: Audio Enhancement** - Synth pool, polyphony, harmony cycling
- **M4: Multi-Robot** - Spawning, collision, interactions
- **M5: Environment** - Factories, actors, day/night
- **M6: Polish** - UI, performance, mobile support

## Examples from Existing Issues

Search existing M*-issues.md files for patterns:
- Implementation detail specificity level
- Acceptance criteria formatting
- Code example usage
- Reference linking

## Output

When creating issues:
1. Show the proposed M*-issues.md content
2. Verify it follows the format
3. Check sizing and dependencies
4. Ask for approval before creating file

When reviewing:
1. List findings by issue number
2. Suggest improvements
3. Note any missing details or unclear steps
4. Verify architectural compliance
