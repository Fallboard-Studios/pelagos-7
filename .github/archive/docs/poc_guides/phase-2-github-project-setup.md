# Phase 2: GitHub Project Setup - Detailed Steps

**Timeline:** Week 1, Day 4 (3-4 hours)  
**Goal:** Create project board, milestones, and initial 30-40 tickets for all planned work.

---

## Prerequisites

- [x] Phase 0 complete (repository exists)
- [x] Phase 1 complete (documentation written)
- [x] Clear understanding of project scope (see NEW_APP_STEPS_OVERVIEW.md)
- [x] GitHub organization admin access

---

## Why This Phase Matters

**Project management demonstrates professional practices.** Having all tickets written upfront:
- Prevents scope creep (clear boundary of v1.0)
- Shows planning ability to portfolio reviewers
- Enables consistent velocity tracking
- Provides clear stopping points
- Makes the development arc visible

**Portfolio value:** Reviewers can see your entire thought process from planning to execution.

---

## Step 1: Create GitHub Project (30 minutes)

### 1.1 Create Project

1. Navigate to https://github.com/orgs/fallboard-studios
2. Click "Projects" tab
3. Click "New project"
4. Choose "Board" template
5. **Project name:** Pelagos-7 Development
6. **Description:** 4-6 week development roadmap for robot symphony generator
7. Click "Create project"

### 1.2 Configure Project Views

**Board View (default):**
- Rename columns:
  - "Todo" → "Backlog"
  - "In Progress" → "In Progress"
  - "Done" → "Done"
- Add column: "Review" (between In Progress and Done)
- Drag to order: Backlog → In Progress → Review → Done

**Add Roadmap View:**
1. Click "+ New view"
2. Choose "Roadmap" layout
3. Name: "Timeline"
4. Group by: Milestone
5. Configure date range: Today → 6 weeks out

**Add Table View (optional):**
1. Click "+ New view"
2. Choose "Table" layout
3. Name: "All Issues"
4. Show columns: Title, Status, Milestone, Labels, Assignee

### 1.3 Configure Project Settings

**Settings → Manage access:**
- Organization members: Write access (if you add contributors later)

**Settings → Custom fields:**
Add custom field:
- **Field name:** "Estimated Hours"
- **Type:** Number
- **Description:** Rough time estimate for planning

---

## Step 2: Create Milestones (20 minutes)

### 2.1 Navigate to Milestones

1. Go to repository: https://github.com/fallboard-studios/pelagos-7
2. Click "Issues" tab
3. Click "Milestones" link (near search bar)
4. Click "New milestone"

### 2.2 Create Each Milestone

**Milestone 1: M0 - Repository Foundation**
- **Title:** M0: Repository Foundation
- **Due date:** Week 1, Days 1-2 (or specific date if known)
- **Description:**
  ```
  Professional repo structure with AI guidance ready.
  
  Deliverables:
  - GitHub organization & repository
  - Issue/PR templates
  - Vite + React + TypeScript scaffold
  - ESLint, Prettier, TypeScript configs
  - Folder structure
  - Professional README & comprehensive documentation
  - Clean git history
  
  Time: 4-6 hours
  ```

**Milestone 2: M1 - Core Architecture**
- **Title:** M1: Core Architecture
- **Due date:** Week 1, Days 3-5
- **Description:**
  ```
  Three Pillars operational (Audio / Animation / State).
  
  Deliverables:
  - AudioEngine singleton (Tone.js wrapper)
  - BeatClock (musical timing system) with 16-step loop
  - Harmony system (8-note palettes, 24-hour cycle)
  - Melody generation system (procedural 16-step loops)
  - Timeline management (timelineMap)
  - Complete Zustand oceanStore
  - Beat-synchronized scheduling
  
  Time: 1-2 days
  ```

**Milestone 3: M2 - Robot Basics**
- **Title:** M2: Robot Basics
- **Due date:** Week 2
- **Description:**
  ```
  Robots spawn, move autonomously, and can be selected.
  
  Deliverables:
  - Unit testing infrastructure (Vitest)
  - Initial test suite for M1 utilities (BeatClock, harmony, store)
  - Robot spawning system
  - Robot SVG components (chassis, head, propeller, antennae)
  - GSAP move animations (movement + propeller + rotation)
  - Idle state and destination picking
  - Selection/deselection system
  - State management integration
  
  Time: 2-3 days
  ```

**Milestone 4: M3 - Audio Integration**
- **Title:** M3: Audio Integration
- **Due date:** Week 3
- **Description:**
  ```
  Connect robot melodies to audio playback. Lifecycle management and polyphony.
  
  Deliverables:
  - Robot melody lifecycle (register/unregister with AudioEngine)
  - Melody playback synchronized to Transport
  - Polyphony management system (voice limiting, 8-16 voices)
  - Audio status display (active voice/robot count)
  - Clean lifecycle (no memory leaks on robot removal)
  
  Note: Melody generation & harmony system implemented in M1
  
  Time: 2-3 days
  ```

**Milestone 5: M4 - Interactions & Systems**
- **Title:** M4: Interactions & Systems
- **Due date:** Week 4
- **Description:**
  ```
  Robots interact and create musical moments.
  
  Deliverables:
  - Collision detection system (gsap.ticker based)
  - Robot-robot interaction logic
  - Interaction audio bursts (note flurries)
  - Interaction visual effects (scale animations, particles)
  - Interaction cooldown system (measure-based)
  
  Time: 2-3 days
  ```

**Milestone 6: M5 - Environment & Actors**
- **Title:** M5: Environment & Actors
- **Due date:** Week 5
- **Description:**
  ```
  Rich underwater world with factories and environmental detail.
  
  Deliverables:
  - Factory actors (spawn robots on measure-based timers)
  - Environmental actors (ruins, machinery, scrap)
  - Camera pan/zoom system
  - Depth layers with parallax effect
  - Procedural actor generation
  - Bubble system (ambient particles)
  
  Time: 3-4 days
  ```

**Milestone 7: M6 - Polish & Launch**
- **Title:** M6: Polish & Launch
- **Due date:** Week 6
- **Description:**
  ```
  Production-ready, deployed, and portfolio-ready.
  
  Deliverables:
  - Robot editor panel (view/edit attributes)
  - Settings panel (volume, BPM, visual options)
  - Mobile responsiveness and touch controls
  - Performance optimization (60 FPS target)
  - GitHub Pages deployment
  - Portfolio materials (PORTFOLIO.md, screenshots)
  - Architecture diagram
  - Demo mode
  
  Time: 2-3 days
  ```

---

## Step 3: Create Issue Labels (15 minutes)

### 3.1 Navigate to Labels

1. Go to repository
2. Click "Issues" tab
3. Click "Labels" link
4. Delete default labels you won't use (keep "bug", "documentation")

### 3.2 Create Custom Labels

**Type Labels (what kind of work):**
- `feature` - Green (#0E8A16) - "New feature or capability"
- `bug` - Red (#D73A4A) - "Something isn't working"
- `refactor` - Blue (#0075CA) - "Code improvement without behavior change"
- `documentation` - Light blue (#1D76DB) - "Documentation changes"
- `chore` - Gray (#6C757D) - "Maintenance, configs, dependencies"
- `testing` - Orange (#D93F0B) - "Test infrastructure or test files"

**Priority Labels:**
- `priority: high` - Red (#D93F0B) - "Must complete for milestone"
- `priority: medium` - Orange (#FBCA04) - "Important but not blocking"
- `priority: low` - Yellow (#FEF2C0) - "Nice to have"

**System Labels (which pillar):**
- `system: audio` - Purple (#7057FF) - "AudioEngine, Tone.js, melody"
- `system: animation` - Pink (#E99695) - "GSAP, timelines, motion"
- `system: state` - Teal (#008672) - "Zustand, store, data"
- `system: ui` - Light green (#C5DEF5) - "React components, UI"

**Size Labels (effort):**
- `size: XS` - Very light gray (#F3F4F6) - "< 1 hour"
- `size: S` - Light gray (#E5E7EB) - "1-2 hours"
- `size: M` - Medium gray (#D1D5DB) - "2-4 hours"
- `size: L` - Dark gray (#9CA3AF) - "4-8 hours"
- `size: XL` - Very dark gray (#6B7280) - "> 8 hours"

**Status Labels (optional):**
- `status: blocked` - Red (#B60205) - "Waiting on something"
- `status: needs-review` - Yellow (#FEF2C0) - "Ready for review"

---

## Step 4: Write M0 Issues (30 minutes)

Create 6 issues for M0 (Foundation) milestone. Full issue templates with acceptance criteria are maintained in separate files for easy reference and issue creation.

**See: [M0-issues.md](M0-issues.md)** for complete issue templates.

**M0 Issue Summary:**
- M0.1: Create AudioEngine singleton pattern
- M0.2: Create BeatClock with Transport integration
- M0.3: Create Zustand oceanStore with robots array
- M0.4: Create empty OceanScene component with SVG canvas
- M0.5: Create PlayButton that initializes AudioEngine
- M0.6: Wire up App.tsx with PlayButton → OceanScene flow

---

## Step 5: Write M1 Issues (45 minutes)

Create 6 issues for M1 (Core Architecture) milestone. Full issue templates with acceptance criteria are maintained in separate files.

**See: [M1-issues.md](M1-issues.md)** for complete issue templates.

**M1 Issue Summary:**
- M1.1: Implement harmony system with 8-note palettes
- M1.2: Implement melody generator with weighted note selection
- M1.3: Implement AudioEngine note scheduling with melody playback
- M1.4: Implement timeline management (timelineMap utilities)
- M1.5: Add Robot type and related type definitions
- M1.6: Complete Zustand store with all robot actions

---

## Step 6: Write M2 Issues (30 minutes)

Create 7 issues for M2 (Robot Basics) milestone. Full issue templates with acceptance criteria are maintained in separate files.

**See: [M2-issues.md](M2-issues.md)** for complete issue templates.

**M2 Issue Summary:**
- M2.0: Setup Vitest testing infrastructure
- M2.1: Create Robot SVG components (chassis, head, propeller, antennae)
- M2.2: Create RobotBody component that assembles parts
- M2.3: Create Robot component with position and selection
- M2.4: Implement robot spawning system
- M2.5: Implement GSAP move animation (point-to-point)
- M2.6: Implement idle state and destination picking
- M2.7: Integrate robots into OceanScene component

---

## Step 7: Write M3-M6 Issues (60 minutes)

### Step 7a: Write M3 Issues (Audio Integration)

Create 7 issues for M3 (Audio Integration) milestone. Full issue templates maintained in separate file.

**See: [M3-issues.md](M3-issues.md)** for complete issue templates.

**M3 Issue Summary:**
- M3.1: Integrate melody registration with robot spawner
- M3.2: Implement melody cleanup on robot removal
- M3.3: Implement synth pool creation in AudioEngine
- M3.4: Implement polyphony management with skip-based limiting
- M3.5: Implement 8n tick melody playback loop
- M3.6: Add audio status display (dev UI)
- M3.7: Test melody lifecycle end-to-end

---

### Step 7b: Write M4 Issues (Interactions & Systems)

Create 7 issues for M4 (Interactions & Systems) milestone. Full issue templates maintained in separate file.

**See: [M4-issues.md](M4-issues.md)** for complete issue templates.

**M4 Issue Summary:**
- M4.1: Implement collision detection system
- M4.2: Implement robot-robot interaction logic
- M4.3: Implement interaction audio flurry
- M4.4: Implement interaction visual effects
- M4.5: Implement measure-based interaction cooldown
- M4.6: Add interaction debug display
- M4.7: Test interaction system end-to-end

---

### Step 7c: Write M5 Issues (Environment & Actors)

Create 8 issues for M5 (Environment & Actors) milestone. Full issue templates maintained in separate file.

**See: [M5-issues.md](M5-issues.md)** for complete issue templates.

**M5 Issue Summary:**
- M5.1: Create Factory actor type and SVG components
- M5.2: Implement factory robot spawning on measure timers
- M5.3: Create environmental actor components (ruins, machinery, scrap)
- M5.4: Implement procedural environmental actor placement
- M5.5: Implement camera pan/zoom system
- M5.6: Implement depth layers with parallax scrolling
- M5.7: Add factory spawn animation for robots
- M5.8: Test environment and actors system end-to-end

---

### Step 7d: Write M6 Issues (Polish & Launch)

Create 9 issues for M6 (Polish & Launch) milestone. Full issue templates maintained in separate file.

**See: [M6-issues.md](M6-issues.md)** for complete issue templates.

**M6 Issue Summary:**
- M6.1: Create robot info panel showing attributes
- M6.2: Create settings panel for BPM and audio controls
- M6.3: Add time display (measures/hours)
- M6.4: Implement mobile touch controls
- M6.5: Implement responsive layout for mobile devices
- M6.6: Performance optimization pass (target 60 FPS)
- M6.7: Configure GitHub Pages deployment
- M6.8: Write portfolio documentation (PORTFOLIO.md, screenshots)
- M6.9: Final testing and polish pass

---

## Step 8: Add Issues to Project (30 minutes)

### 8.1 Create Issues in Repository

For each issue:
1. Click "New issue"
2. Copy template content from the appropriate Mx-issues.md file
3. Assign to milestone
4. Add labels
5. Create issue
6. Repeat ~50 times

**Tip:** Use GitHub CLI to speed this up:
```bash
# Extract individual issue content from M0-issues.md, M1-issues.md, etc.
# Then create issues programmatically:
gh issue create --title "[M0] Create AudioEngine singleton" \
  --body "See M0-issues.md - M0.1 for full template" \
  --milestone "M0: Foundation" \
  --label "feature,system: audio,size: M,priority: high"
```

**Note:** Issue templates are in M0-issues.md through M6-issues.md. Copy each issue section individually.

### 8.2 Add Issues to Project Board

1. Go to your project (Projects tab → Pelagos-7 Development)
2. Click "Add items"
3. Search for issues by milestone
4. Add all M0 issues → "Backlog" column
5. Add all M1 issues → "Backlog"
6. Repeat for all milestones

### 8.3 Organize Board

**Backlog column:**
- M0 issues at top (highest priority)
- M1 issues below
- M2-M6 issues below (lower priority)

**Leave empty:**
- In Progress (you'll move here when working)
- Review (move here when PR created)
- Done (automatically moved on PR merge)

---

## Step 9: Update Project Documentation (20 minutes)

### 9.1 Create Roadmap Document

**File: `docs/ROADMAP.md`**
```markdown
# Pelagos-7 Development Roadmap

## Vision
[Portfolio piece demonstrating architecture and music tech]

## Timeline
4-6 weeks to v1.0 (January 2026 - February 2026)

## Milestones

### M0: Foundation (Week 1) ✅
Status: Complete
- [ ] AudioEngine singleton
- [ ] BeatClock
- [ ] oceanStore
- [ ] OceanScene + PlayButton

### M1: Core Architecture (Week 1-2)
Status: Not started
- [ ] Harmony system
- [ ] Melody generator
- [ ] Timeline management
- [ ] Complete store actions

[Continue for all milestones]

## GitHub Project
Track progress: [Project Board](https://github.com/orgs/fallboard-studios/projects/1)

## Version Definition
v1.0 includes:
- 6-12 robots moving autonomously
- Musical generation from interactions
- Factory spawning
- Camera navigation
- Mobile-responsive
- Deployed to GitHub Pages
```

### 9.2 Update Main README

Add link to project board:
```markdown
## 🚀 Development Status

**Current Phase:** M0 - Foundation Setup

Track progress: [GitHub Project Board](link)

See [ROADMAP.md](docs/ROADMAP.md) for detailed timeline.
```

### 9.3 Commit Project Setup

```bash
git checkout -b project/initial-setup

git add docs/ROADMAP.md
git commit -m "docs: add development roadmap"

git add README.md
git commit -m "docs: add project board links to README"

git push origin project/initial-setup
```

Create PR: "Add roadmap documentation and project links"

---

## Step 10: Verify Setup (15 minutes)

### 10.1 Check Project Board

Visit project board and verify:
- [x] All milestones created (6 total)
- [x] All issues created (~35-40 total)
- [x] Issues assigned to correct milestones
- [x] Labels applied correctly
- [x] Issues in Backlog column
- [x] Roadmap view shows timeline
- [x] Table view shows all issues

### 10.2 Check Repository

Verify:
- [x] Milestones visible in Issues tab
- [x] Each milestone has description and due date
- [x] Issues are searchable and filterable
- [x] Labels are clear and consistent

### 10.3 Test Workflow

**Simulate starting work:**
1. Pick first issue (M0.1: AudioEngine)
2. Move to "In Progress" column
3. Create feature branch
4. Make small change
5. Create draft PR
6. Verify PR links to issue
7. Close PR (don't merge - just testing)
8. Move issue back to Backlog

---

## Phase 2 Complete! ✅

**What You've Accomplished:**
- ✅ GitHub Project created with board/roadmap views
- ✅ 6 milestones with descriptions and due dates
- ✅ Custom labels for organization
- ✅ 35-40 detailed issues written
- ✅ All issues assigned to milestones
- ✅ Project board organized
- ✅ Roadmap documentation written
- ✅ README updated with project links
- ✅ Workflow tested

**What You Can Show:**
- Complete project management setup
- Professional issue tracking
- Clear development plan
- Transparent progress visibility
- All work planned upfront

**Portfolio Value:**
- Demonstrates project planning skills
- Shows systematic approach
- Proves ability to scope work
- Ready for team collaboration
- Clear stopping points for phases

**Next Phase:** [Phase 3: Foundation (M0)](phase-3-foundation.md)

Start building! Pick first issue (M0.1), create feature branch, implement AudioEngine singleton.

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Create project | 30 min | |
| Create milestones | 20 min | |
| Create labels | 15 min | |
| Write M0 issues | 30 min | |
| Write M1 issues | 45 min | |
| Write M2-M5 issues | 60 min | |
| Add to project board | 30 min | |
| Documentation | 20 min | |
| Verification | 15 min | |
| **Total** | **~4 hours** | |

---

## Tips & Shortcuts

**GitHub CLI for bulk creation:**
```bash
# Install gh CLI: https://cli.github.com/

# Create issue from file
gh issue create --title "$TITLE" --body-file issue.md \
  --milestone "M0: Foundation" --label "feature,system: audio"

# List issues
gh issue list --milestone "M0: Foundation"

# Add to project
gh project item-add <project-id> --owner fallboard-studios --url <issue-url>
```

**Issue numbering convention:**
- M0.1, M0.2, M0.3... (milestone dot task number)
- Makes it easy to reference and sort

**Estimation guide:**
- XS (< 1 hour): Config changes, small additions
- S (1-2 hours): Single component, simple feature
- M (2-4 hours): System integration, moderate complexity
- L (4-8 hours): Major feature, multiple files
- XL (> 8 hours): Large refactor, architecture change (avoid these)

---

## Troubleshooting

**Issue: Can't create project**
- Ensure organization membership
- Check organization settings (projects enabled)

**Issue: Issues not showing in project**
- Manually add via "Add items" button
- Check project filters/settings

**Issue: Milestones not showing due dates**
- Edit milestone and add due date
- Refresh project roadmap view

**Issue: Too many issues (overwhelming)**
- Start with M0 and M1 only
- Add M2-M5 issues later as needed

---

**Questions?** Open a discussion in the repository.

**Ready to build?** Move to Phase 3: Foundation (M0)
