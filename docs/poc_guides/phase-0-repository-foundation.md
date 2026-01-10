# Phase 0: Repository Foundation - Detailed Steps

**Timeline:** Week 1, Days 1-2 (4-6 hours)  
**Goal:** Create Fallboard Studios organization and pelagos-7 repository with professional structure, templates, and initial scaffolding.

---

## Prerequisites

- [ ] GitHub account active
- [ ] Git installed locally
- [ ] Node.js installed (v18+ recommended)
- [ ] VS Code or preferred editor
- [ ] Decision made on organization name (Fallboard Studios)
- [ ] Decision made on repo name (pelagos-7)

---

## Step 1: Create GitHub Organization (30 minutes)

### 1.1 Create Organization on GitHub

1. Go to https://github.com
2. Click profile icon → "Your organizations"
3. Click "New organization"
4. Choose "Free" plan
5. Organization name: `fallboard-studios`
6. Contact email: [your email]
7. Organization belongs to: "My personal account"
8. Click "Next" and complete setup

### 1.2 Configure Organization Profile

**Profile Settings:**
- **Display name:** Fallboard Studios
- **Bio (160 chars):** Interactive musical experiences powered by code. Building ambient generative systems in post-apocalyptic worlds.
- **Website:** [Your portfolio URL - can add later]
- **Location:** [Your location or leave blank]
- **Public email:** [Optional]

**Profile Picture Ideas:**
- Stylized piano fallboard icon
- Circuit board + piano keys hybrid
- Robot + musical note
- Keep simple/professional

### 1.3 Create Organization README (Optional but Recommended)

Create special repo: `fallboard-studios/.github`

**File: `.github/profile/README.md`**
```markdown
# Fallboard Studios

Interactive musical experiences at the intersection of code and creativity.

## Projects

🤖 **[Pelagos-7](https://github.com/fallboard-studios/pelagos-7)** - Ambient robot symphony generator (In Development)

_Building generative systems where autonomous agents create evolving musical compositions._

## Tech Stack
React • TypeScript • Tone.js • GSAP • Procedural Generation

## Connect
[Your Portfolio] • [Your Main GitHub] • [Other Links]
```

---

## Step 2: Create Repository (20 minutes)

### 2.1 Create Repository on GitHub

1. Navigate to https://github.com/orgs/fallboard-studios/repositories
2. Click "New repository"
3. **Owner:** fallboard-studios (not your personal account)
4. **Repository name:** pelagos-7
5. **Description:** Ambient robot symphony generator - Interactive musical experience in a post-apocalyptic underwater world
6. **Visibility:** Public
7. **Initialize repository:** 
   - ✅ Add a README file
   - ✅ Add .gitignore (Node template)
   - ⬜ Choose a license (can add later - MIT recommended)
8. Click "Create repository"

### 2.2 Configure Repository Settings

**Settings → General:**
- ✅ Allow merge commits
- ⬜ Allow squash merging (disable - prefer clean history)
- ⬜ Allow rebase merging (disable for simplicity)
- ✅ Automatically delete head branches (after PR merge)

**Settings → Branches:**
- Click "Add rule" for `main` branch
- Branch protection rule:
  - ✅ Require a pull request before merging
  - Required approvals: 0 (you're solo, but practice the flow)
  - ⬜ Require status checks (add later when CI setup)
  - ✅ Require conversation resolution before merging
  - ⬜ Require signed commits (optional - for security)

**Settings → Topics:**
Add relevant topics:
- `interactive-music`
- `procedural-generation`
- `ambient`
- `typescript`
- `react`
- `tonejs`
- `gsap`
- `generative-art`
- `portfolio-project`

### 2.3 Clone Repository Locally

```bash
# Navigate to your projects folder
cd c:/Code/Music

# Clone the repo
git clone https://github.com/fallboard-studios/pelagos-7.git
cd pelagos-7

# Verify remote
git remote -v
```

---

## Step 3: Issue & PR Templates (30 minutes)

### 3.1 Create Issue Template Directory

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

### 3.2 Feature Template

**File: `.github/ISSUE_TEMPLATE/feature.md`**
```markdown
---
name: Feature
about: New feature or enhancement
title: '[M0] '
labels: feature
assignees: ''
---

## Feature Description
[Clear description of what needs to be built]

## Motivation
[Why this feature is needed - user benefit or technical requirement]

## Source Reference (if porting from Oceanic)
- File: `src/[path]`
- Copilot instructions: [relevant section]
- Notes: [any gotchas or adaptations needed]

## Implementation Checklist
- [ ] Types defined in `src/types/`
- [ ] Core logic implemented
- [ ] Integration with existing systems tested
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)
- [ ] Documentation updated if needed

## Acceptance Criteria
- [ ] [Specific measurable criterion 1]
- [ ] [Specific measurable criterion 2]
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Technical Notes
[Architecture considerations, dependencies, potential challenges]

## Estimated Time
[hours or story points]
```

### 3.3 Bug Template

**File: `.github/ISSUE_TEMPLATE/bug.md`**
```markdown
---
name: Bug Report
about: Report a bug or issue
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
[Clear description of what's broken]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [See error]

## Environment
- Browser: [Chrome 120, Firefox, etc.]
- Device: [Desktop, Mobile, etc.]
- OS: [Windows 11, macOS, etc.]

## Console Errors
```
[Paste any console errors here]
```

## Screenshots
[If applicable]

## Possible Cause
[If you have insights]

## Related Issues
[Link to related issues if any]
```

### 3.4 Refactor Template

**File: `.github/ISSUE_TEMPLATE/refactor.md`**
```markdown
---
name: Refactor
about: Code improvement or restructuring
title: '[REFACTOR] '
labels: refactor
assignees: ''
---

## Refactor Goal
[What code needs to be improved and why]

## Current State
[Description of current implementation]

## Proposed Change
[How it should be restructured]

## Benefits
- [Benefit 1]
- [Benefit 2]

## Risks
- [Potential issue 1]
- [How to mitigate]

## Checklist
- [ ] Tests still pass
- [ ] No behavioral changes (unless intentional)
- [ ] Code standards maintained
- [ ] Documentation updated

## References
[Link to architecture docs, patterns, or discussions]
```

### 3.5 Documentation Template

**File: `.github/ISSUE_TEMPLATE/documentation.md`**
```markdown
---
name: Documentation
about: Add or update documentation
title: '[DOCS] '
labels: documentation
assignees: ''
---

## Documentation Needed
[What needs to be documented]

## Target Audience
- [ ] Developers (technical implementation)
- [ ] Contributors (how to contribute)
- [ ] End users (how to use the app)
- [ ] Portfolio reviewers (architecture/decisions)

## Content Outline
- [Section 1]
- [Section 2]

## Location
[Where this documentation should live]

## Related Code
[Files or systems this documentation covers]
```

### 3.6 Pull Request Template

**File: `.github/PULL_REQUEST_TEMPLATE.md`**
```markdown
## Summary
[Brief description of changes]

## Related Issues
Closes #[issue number]
Related to #[issue number]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Chore (dependencies, config, etc.)

## Implementation Details
[Key technical decisions or approach]

## Testing
- [ ] Tested locally (dev server runs)
- [ ] No console errors or warnings
- [ ] Tested on multiple viewports (if UI change)
- [ ] Audio works correctly (if audio change)
- [ ] Animation smooth (if animation change)

## Architecture Compliance
- [ ] Audio changes only in AudioEngine (no Tone.js elsewhere)
- [ ] Animation changes only in GSAP timelines (no timelines in state)
- [ ] State changes only in Zustand (no complex logic in components)
- [ ] No setTimeout/setInterval (used BeatClock/Transport)
- [ ] Types explicit (no `any`)
- [ ] Imports ordered correctly

## Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No new TypeScript errors
- [ ] Code follows standards (see CONTRIBUTION_GUIDE.md)

## Screenshots / Demo
[If UI change, add before/after screenshots or GIF]

## Reviewers
@[your-github-username]

## Notes
[Any additional context, decisions, or follow-up needed]
```

---

## Step 4: Initial Project Scaffold (1-2 hours)

### 4.1 Create Vite Project

```bash
# In pelagos-7 directory
npm create vite@latest . -- --template react-ts

# When prompted "Current directory is not empty":
# Choose "Ignore files and continue" 

# Choose "TypeScript + SWC"

# Install dependencies
npm install
```

### 4.2 Install Core Dependencies

```bash
# Audio
npm install tone

# Animation
npm install gsap @gsap/react

# State management
npm install zustand

# Dev dependencies
npm install -D @types/node
```

### 4.3 Install Linting/Formatting

```bash
npm install -D eslint typescript-eslint
npm install -D eslint-plugin-react-hooks eslint-plugin-react-refresh
npm install -D eslint-plugin-import globals
npm install -D prettier
```

### 4.4 Configure TypeScript

**File: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4.5 Configure ESLint

**File: `eslint.config.js`**
```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default [
  // Ignore build output
  { ignores: ['dist'] },
  
  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  
  // React-specific rules
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      
      // Import ordering
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index']
        ],
        'newlines-between': 'always',
      }],
      
      // Console rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

### 4.6 Configure Prettier

**File: `.prettierrc.json`**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### 4.7 Add NPM Scripts

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:types": "tsc --noEmit",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'",
    "audit:patterns": "node scripts/audit-patterns.mjs"
  }
}
```

### 4.8 Create VS Code Settings

**File: `.vscode/settings.json`**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.quoteStyle": "single",
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true
  }
}
```

---

## Step 5: Create Folder Structure (15 minutes)

### 5.1 Create Directory Tree

```bash
mkdir -p src/animation
mkdir -p src/app
mkdir -p src/assets
mkdir -p src/components/actors
mkdir -p src/components/panels
mkdir -p src/components/ui
mkdir -p src/constants
mkdir -p src/debug
mkdir -p src/engine
mkdir -p src/factory
mkdir -p src/features/robot
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/systems
mkdir -p src/types
mkdir -p src/utils
mkdir -p docs
mkdir -p scripts
```

### 5.2 Create Placeholder Files

**Create empty index files:**
```bash
# Constants
echo "export const MAX_ROBOTS = 12;" > src/constants/index.ts

# Utils
echo "export {};" > src/utils/math.ts
echo "export {};" > src/utils/refs.ts

# Types
echo "export type Vec2 = { x: number; y: number; z: number };" > src/types/Vec2.ts
```

---

## Step 6: Initial Documentation (45 minutes)

### 6.1 Create Project README

**File: `README.md`**
```markdown
# Pelagos-7

**Interactive ambient robot symphony generator**

_A browser-based musical experience where autonomous robot fish swim through a post-apocalyptic underwater world, creating evolving compositions through their movements and interactions._

---

## 🎵 What is Pelagos-7?

Pelagos-7 is a generative music system where:
- Autonomous robot fish swim and interact in real-time
- Each robot carries a unique melody synchronized to a global musical clock
- Factory actors periodically build new robots
- All audio and visuals are beat-synchronized for perfect harmony
- The environment creates an ambient, ever-changing soundscape

**Status:** 🚧 In Active Development (4-6 week timeline to v1.0)

---

## 🛠️ Tech Stack

- **React** + **TypeScript** - Component architecture
- **Tone.js** - Web Audio synthesis and scheduling
- **GSAP** - High-performance animation
- **Zustand** - State management
- **Vite** - Build tooling

**Architecture:** Strict separation of concerns (Audio / Animation / State)

---

## 🎯 Key Features (Planned)

- [ ] Beat-synchronized timing system (musical alignment)
- [ ] Procedurally generated robot visuals (modular SVG parts)
- [ ] Melody generation system (16-step loops, harmony palettes)
- [ ] Collision-based interactions (audio/visual bursts)
- [ ] Factory actors (automated robot spawning)
- [ ] Camera pan/zoom (navigate the world)
- [ ] Environmental actors (ruins, machinery)
- [ ] Mobile-responsive (touch controls)

---

## 📦 Installation (For Developers)

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

## 🏗️ Project Structure

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

## 🎨 Architecture Principles

**Three Pillars:**
1. **Audio** - Only `AudioEngine` touches Tone.js
2. **Animation** - Only GSAP timelines (stored in `timelineMap`, never state)
3. **State** - Only Zustand (serializable data only)

**Forbidden:**
- ❌ Tone.js calls outside AudioEngine
- ❌ GSAP timelines in React/Zustand state
- ❌ `setTimeout`/`setInterval` (use BeatClock/Transport)
- ❌ `requestAnimationFrame` loops (use GSAP ticker)

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design patterns
- [Contribution Guide](docs/CONTRIBUTION_GUIDE.md) - Coding standards
- [Roadmap](docs/ROADMAP.md) - Development plan and milestones

---

## 🚀 Development Workflow

1. Check [GitHub Project](https://github.com/orgs/fallboard-studios/projects/1) for tickets
2. Create feature branch: `git checkout -b feature/M1-description`
3. Implement changes following architecture guidelines
4. Test locally: `npm run lint && npm run build:types`
5. Create PR referencing issue number
6. Merge after review

---

## 🎯 Roadmap to v1.0

**Current Phase:** M0 - Foundation Setup

- [x] M0: Repository foundation
- [ ] M1: Core architecture (AudioEngine, BeatClock, stores)
- [ ] M2: Robot basics (spawning, swimming, selection)
- [ ] M3: Audio integration (melody generation, playback)
- [ ] M4: Interactions (collision system, bursts)
- [ ] M5: Environment (actors, camera, depth)
- [ ] M6: Polish & launch (UI, mobile, deployment)

[View full roadmap](docs/ROADMAP.md)

---

## 🧪 Testing

```bash
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

## 📄 License

MIT (to be added)

---

## 💼 About Fallboard Studios

Fallboard Studios creates interactive musical experiences at the intersection of code and creativity.

**Portfolio:** [Your site]  
**GitHub Org:** [fallboard-studios](https://github.com/fallboard-studios)

---

## 🙏 Acknowledgments

Inspired by generative music systems, procedural generation, and the ambient genre.

Built with love for interactive audio experiences.
```

### 6.2 Create ROADMAP.md

**File: `docs/ROADMAP.md`**
```markdown
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

[View detailed phase documentation](../pelagos/)
```

### 6.3 Create ARCHITECTURE.md (Placeholder)

**File: `docs/ARCHITECTURE.md`**
```markdown
# Pelagos-7 Architecture

**Status:** 🚧 This document will be expanded in Phase 1 (AI Documentation)

---

## Three Pillars

Pelagos-7 follows a strict separation of concerns:

### 1. Audio (Tone.js)
- **Only** `AudioEngine` touches Tone.js
- All audio scheduling through `BeatClock`/`Transport`
- No synths instantiated outside `AudioEngine`
- No `setTimeout`/`setInterval` for audio timing

### 2. Animation (GSAP)
- **Only** GSAP timelines for movement
- Timelines stored in `timelineMap` (never in React/Zustand state)
- No `requestAnimationFrame` loops
- No animation state in components

### 3. State (Zustand)
- **Only** Zustand for application state
- Serializable data only
- No business logic in components
- State drives renders, not animations

---

## Forbidden Patterns

❌ `Tone.*` calls outside AudioEngine  
❌ GSAP timelines in React state or Zustand  
❌ `setTimeout`/`setInterval` for timing  
❌ `requestAnimationFrame` loops  
❌ Animation values in state  
❌ Audio scheduling in components  

---

## Key Systems

### AudioEngine (`src/engine/AudioEngine.ts`)
- Singleton managing all Tone.js interactions
- Synth pooling and voice management
- Note scheduling with lookahead
- Global effects (reverb, filters)

### BeatClock (`src/engine/beatClock.ts`)
- Musical timing system (beat-based, not seconds)
- Wraps `Tone.Transport`
- All timing expressed in beats/measures
- BPM-independent game logic

### Timeline Map (`src/animation/timelineMap.ts`)
- Central registry of GSAP timelines
- Functions: `setTimeline()`, `killTimeline()`, `getTimeline()`
- Timelines keyed by robot ID
- Automatic cleanup on robot removal

### OceanStore (`src/stores/oceanStore.ts`)
- Zustand store for all application state
- Robots, actors, settings, world state
- No timelines or non-serializable data

---

## Data Flow

```
User Interaction
  ↓
Component Event Handler
  ↓
Zustand Action (update state)
  ↓
[State Change]
  ↓
├─→ Component Re-renders (React)
├─→ Animation System (GSAP)
└─→ Audio System (AudioEngine)
```

---

## File Organization

```
src/
├── animation/      # GSAP timelines, no audio/state
├── engine/         # AudioEngine, BeatClock, harmony
├── components/     # React UI only, no logic
├── stores/         # Zustand stores
├── systems/        # Domain logic (collision, spawning)
├── hooks/          # React hooks (orchestration only)
├── types/          # TypeScript definitions
└── utils/          # Pure functions
```

---

**Detailed architecture documentation will be added in Phase 1.**

See [.github/copilot-instructions.md](../.github/copilot-instructions.md) for implementation guidelines.
```

### 6.4 Create CONTRIBUTION_GUIDE.md (Placeholder)

**File: `docs/CONTRIBUTION_GUIDE.md`**
```markdown
# Pelagos-7 Contribution Guide

**Status:** 🚧 This document will be expanded in Phase 1 (AI Documentation)

---

## Code Standards

### Import Order

1. React & external libraries
2. Type imports (with `type` keyword)
3. Components
4. Hooks
5. Utils & refs
6. Constants
7. Stores (avoid when possible)

**Example:**
```typescript
import React, { useRef } from 'react';
import { gsap } from 'gsap';

import type { Robot } from '../types/Robot';

import { RobotBody } from './RobotBody';
import { useRobotAnimation } from '../hooks/useRobotAnimation';
import { robotRefs } from '../utils/refs';
import { MAX_ROBOTS } from '../constants';
```

---

## Architecture Rules

### Audio
- ✅ Call `AudioEngine.scheduleNote()`
- ❌ Never use `new Tone.Synth()` outside AudioEngine
- ❌ Never use `setTimeout` for audio timing

### Animation
- ✅ Create GSAP timelines, store in `timelineMap`
- ❌ Never store timelines in React state or Zustand
- ❌ Never use `requestAnimationFrame` loops

### State
- ✅ Update Zustand stores for all state changes
- ❌ Never put business logic in components
- ❌ Never store non-serializable data

---

## File Structure Template

```typescript
// 1. Imports (grouped)
import React from 'react';
import type { Robot } from '../types/Robot';

// 2. Types/Interfaces (before component)
interface RobotRendererProps {
  robot: Robot;
}

// 3. Constants (if any)
const ANIMATION_DURATION = 3;

// 4. Component/Function
export function RobotRenderer({ robot }: RobotRendererProps) {
  // implementation
}

// 5. Helpers (after exports)
function calculatePosition(robot: Robot) {
  // ...
}
```

---

## TypeScript Guidelines

- Use explicit return types for exported functions
- Always use `type` keyword for type-only imports
- Use `interface` for component props if >50 lines
- Prefix intentionally unused vars with `_`

---

## Testing Checklist

Before creating PR:
- [ ] `npm run lint` passes
- [ ] `npm run build:types` passes
- [ ] `npm run dev` runs without console errors
- [ ] Feature tested in browser
- [ ] No architecture violations

---

## Git Workflow

1. Create feature branch: `git checkout -b feature/M1-description`
2. Make small, logical commits
3. Write descriptive commit messages
4. Push and create PR referencing issue
5. Fill out PR template completely
6. Merge after review

---

**Detailed contribution guidelines will be added in Phase 1.**

See [.github/copilot-instructions.md](../.github/copilot-instructions.md) for full coding standards.
```

---

## Step 7: Commit Initial Structure (20 minutes)

### 7.1 Review Changes

```bash
git status
git diff
```

### 7.2 Stage and Commit (Small Commits)

**Commit 1: Project scaffold**
```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json
git add index.html public/ src/main.tsx src/App.tsx src/index.css src/vite-env.d.ts
git commit -m "chore: initialize Vite + React + TypeScript project"
```

**Commit 2: Linting configs**
```bash
git add eslint.config.js .prettierrc.json .vscode/
git commit -m "chore: add ESLint, Prettier, VS Code configs"
```

**Commit 3: Issue templates**
```bash
git add .github/
git commit -m "chore: add issue and PR templates"
```

**Commit 4: Folder structure**
```bash
git add src/animation/ src/engine/ src/components/ src/stores/ src/types/ src/constants/
git add src/hooks/ src/systems/ src/utils/ src/factory/ src/features/ src/debug/ src/assets/
git add docs/ scripts/
git commit -m "chore: create initial folder structure"
```

**Commit 5: Documentation**
```bash
git add README.md docs/ROADMAP.md docs/ARCHITECTURE.md docs/CONTRIBUTION_GUIDE.md
git commit -m "docs: add README, roadmap, and architecture placeholders"
```

**Commit 6: Update package.json scripts**
```bash
git add package.json
git commit -m "chore: add npm scripts for linting and auditing"
```

### 7.3 Push to GitHub

```bash
git push origin main
```

---

## Step 8: Verify Everything Works (15 minutes)

### 8.1 Test Development Server

```bash
npm run dev
```

- Visit http://localhost:5173
- Should see Vite + React starter page
- No console errors

### 8.2 Test Linting

```bash
npm run lint
```

Should pass with no errors (or only warnings from starter files).

### 8.3 Test TypeScript

```bash
npm run build:types
```

Should compile without errors.

### 8.4 Test Build

```bash
npm run build
```

Should create `dist/` folder successfully.

---

## Phase 0 Complete! ✅

**What You've Accomplished:**
- ✅ Fallboard Studios organization created
- ✅ Professional repository with branch protection
- ✅ Issue/PR templates for workflow
- ✅ Vite + React + TypeScript scaffold
- ✅ ESLint, Prettier, TypeScript configured
- ✅ Folder structure created
- ✅ Professional README & documentation (ROADMAP, ARCHITECTURE, CONTRIBUTION_GUIDE)
- ✅ 6+ clean commits with proper messages
- ✅ Dev server runs without errors

**What You Can Show:**
- GitHub org page with professional profile
- Clean repo with templates
- Well-organized project structure
- Commit history demonstrating conventions

**Next Phase:** [Phase 1: AI Documentation](phase-1-ai-documentation.md)

Write comprehensive AI instruction docs that will guide all future development (`.github/copilot-instructions.md`, architecture guides, etc.).

---

## Troubleshooting

**Issue: npm install fails**
- Solution: Clear npm cache: `npm cache clean --force`
- Try: `npm install --legacy-peer-deps`

**Issue: ESLint errors on starter files**
- Solution: Ignore or fix Vite-generated files, they'll be replaced

**Issue: Can't push to GitHub**
- Solution: Check remote URL: `git remote -v`
- Ensure you have write access to the org

**Issue: VS Code not formatting on save**
- Solution: Reload VS Code window after creating `.vscode/settings.json`

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Create org & repo | 30 min | |
| Issue templates | 30 min | |
| Vite scaffold | 30 min | |
| Configs (ESLint, Prettier, TS) | 45 min | |
| Folder structure | 15 min | |
| Documentation | 45 min | |
| Commits & push | 20 min | |
| Testing | 15 min | |
| **Total** | **~4 hours** | |

---

**Questions or Issues?** Open an issue in the repo with the `question` label.

**Ready to continue?** Move to Phase 1: AI Documentation
