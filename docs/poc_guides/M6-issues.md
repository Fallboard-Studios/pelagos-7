# M6: Polish & Launch Issues

**Milestone:** M6 - Polish & Launch  
**Timeline:** Week 6  
**Goal:** Production-ready, deployed, and portfolio-ready

---

## M6.1: Create Robot Info Panel

**Title:** [M6.1] Create robot info panel showing attributes

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create a side panel that displays detailed information about the selected robot (audio attributes, melody, state).

### Implementation Details
- Create `src/components/panels/RobotInfoPanel.tsx`
- Show when robot selected (selectedRobotId not null)
- Display robot attributes:
  - ID (shortened)
  - Synth type
  - ADSR envelope values
  - Pitch range
  - Melody event count
  - Current state
- Positioned on right side of screen
- Slide in/out animation

**Panel component:**
```tsx
export function RobotInfoPanel() {
  const selectedId = useOceanStore(s => s.selectedRobotId);
  const robot = useOceanStore(s => s.getRobotById(selectedId ?? ''));
  
  if (!robot) return null;
  
  return (
    <div className="robot-info-panel">
      <h3>Robot {robot.id.slice(0, 8)}</h3>
      
      <section>
        <h4>Audio</h4>
        <div>Synth: {robot.audioAttributes.synthType}</div>
        <div>Attack: {robot.audioAttributes.adsr.attack}s</div>
        <div>Decay: {robot.audioAttributes.adsr.decay}s</div>
        <div>Sustain: {robot.audioAttributes.adsr.sustain}</div>
        <div>Release: {robot.audioAttributes.adsr.release}s</div>
      </section>
      
      <section>
        <h4>Melody</h4>
        <div>Events: {robot.melody.length}</div>
        <div>Pattern: {robot.melody.map(e => e.noteIndex).join('-')}</div>
      </section>
      
      <section>
        <h4>State</h4>
        <div>Current: {robot.state}</div>
        <div>Cooldown: {robot.interactionCooldown ? 'Yes' : 'No'}</div>
      </section>
      
      <button onClick={() => deselectRobot()}>Close</button>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Panel shows when robot selected
- [ ] All attributes displayed correctly
- [ ] Panel slides in/out smoothly
- [ ] Close button deselects robot
- [ ] Responsive layout (adapts to screen size)
- [ ] No performance impact

### Reference
- Standard info panel pattern

---

## M6.2: Create Settings Panel

**Title:** [M6.2] Create settings panel for BPM and audio controls

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create a settings panel for adjusting global parameters (BPM, master volume, visual options).

### Implementation Details
- Create `src/components/panels/SettingsPanel.tsx`
- Toggle with settings button (gear icon)
- Controls:
  - BPM slider (40-120 BPM)
  - Master volume slider (0-100%)
  - Show debug overlay toggle
  - Max robots slider (4-16)
- Apply changes immediately
- Persist to localStorage (optional)

**Settings panel:**
```tsx
export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const settings = useOceanStore(s => s.settings);
  
  const handleBPMChange = (bpm: number) => {
    useOceanStore.getState().updateSettings({ bpm });
    Tone.getTransport().bpm.value = bpm;
  };
  
  return (
    <>
      <button className="settings-button" onClick={() => setIsOpen(true)}>
        ⚙️
      </button>
      
      {isOpen && (
        <div className="settings-panel">
          <h3>Settings</h3>
          
          <label>
            BPM: {settings.bpm}
            <input 
              type="range" 
              min={40} 
              max={120} 
              value={settings.bpm}
              onChange={e => handleBPMChange(Number(e.target.value))}
            />
          </label>
          
          <label>
            Max Robots: {settings.maxRobots}
            <input 
              type="range" 
              min={4} 
              max={16} 
              value={settings.maxRobots}
              onChange={e => updateSettings({ maxRobots: Number(e.target.value) })}
            />
          </label>
          
          <label>
            Debug Overlay
            <input 
              type="checkbox" 
              checked={settings.showDebug}
              onChange={e => updateSettings({ showDebug: e.target.checked })}
            />
          </label>
          
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
```

### Acceptance Criteria
- [ ] Settings button toggles panel
- [ ] BPM slider updates Transport immediately
- [ ] Max robots limit applied
- [ ] Debug toggle works
- [ ] Settings persist across sessions (localStorage)
- [ ] Panel closes on outside click

### Reference
- Standard settings panel pattern

---

## M6.3: Add Time Display (Measures/Hours)

**Title:** [M6] Add time display showing measures and derived hours

**Labels:** feature, system: ui, size: S, priority: medium

### Feature Description
Create a time display showing current measure count and derived "hour" (visual feedback for harmony cycle).

### Implementation Details
- Create `src/components/ui/TimeDisplay.tsx`
- Show current measure (e.g., "M: 42")
- Show derived hour (0-23, from measure % 96 / 4)
- Update every beat using BeatClock
- Position in top-left corner

**Time display:**
```tsx
export function TimeDisplay() {
  const [time, setTime] = useState({ measure: 0, hour: 0 });
  
  useEffect(() => {
    const updateTime = () => {
      const measure = BeatClock.getCurrentMeasure().measure;
      const hour = Math.floor((measure % 96) / 4);
      setTime({ measure, hour });
    };
    
    // Update every beat
    const intervalId = BeatClock.scheduleRepeat('4n', updateTime);
    
    return () => BeatClock.cancelScheduled(intervalId);
  }, []);
  
  return (
    <div className="time-display">
      <div>Measure: {time.measure}</div>
      <div>Hour: {time.hour}:00</div>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] Display shows current measure
- [ ] Display shows derived hour (0-23)
- [ ] Updates synchronized to beat
- [ ] No performance impact
- [ ] Positioned in corner (non-intrusive)

### Reference
- Standard game time display

---

## M6.4: Implement Mobile Touch Controls

**Title:** [M6] Implement mobile touch controls

**Labels:** feature, system: ui, size: L, priority: high

### Feature Description
Add touch gesture support for mobile devices (tap to select, pinch to zoom, drag to pan).

### Implementation Details
- Detect touch events (touchstart, touchmove, touchend)
- Single tap: select robot
- Drag: pan camera
- Pinch: zoom camera
- Prevent default behaviors (zoom, scroll)
- Add touch-friendly UI elements (larger tap targets)

**Touch handler:**
```typescript
export function useTouchControls(svgRef: RefObject<SVGSVGElement>) {
  const [touches, setTouches] = useState<Touch[]>([]);
  
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    setTouches(Array.from(e.touches));
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const currentTouches = Array.from(e.touches);
    
    if (currentTouches.length === 1) {
      // Single finger drag (pan)
      handlePan(currentTouches[0]);
    } else if (currentTouches.length === 2) {
      // Two finger pinch (zoom)
      handlePinch(currentTouches[0], currentTouches[1]);
    }
    
    setTouches(currentTouches);
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      // Tap to select
      handleTap(e.changedTouches[0]);
    }
    setTouches(Array.from(e.touches));
  };
  
  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

### Acceptance Criteria
- [ ] Tap selects robot
- [ ] Drag pans camera
- [ ] Pinch zooms camera
- [ ] No accidental selections during pan/zoom
- [ ] Smooth gesture handling
- [ ] Works on iOS and Android

### Reference
- Standard touch gesture handlers

---

## M6.5: Implement Responsive Layout

**Title:** [M6] Implement responsive layout for mobile devices

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Make the UI responsive and mobile-friendly with appropriate breakpoints and layout adjustments.

### Implementation Details
- Add CSS media queries for mobile (< 768px)
- Stack panels vertically on mobile
- Adjust font sizes for readability
- Make buttons/targets larger (44x44px minimum)
- Hide non-essential UI on small screens
- Ensure SVG scales properly

**Responsive CSS:**
```css
/* Desktop (default) */
.ocean-scene {
  width: 100vw;
  height: 100vh;
}

.robot-info-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 300px;
  height: 100vh;
}

/* Mobile */
@media (max-width: 768px) {
  .robot-info-panel {
    bottom: 0;
    top: auto;
    width: 100vw;
    height: 50vh;
  }
  
  .settings-button {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }
  
  .time-display {
    font-size: 14px;
  }
}
```

### Acceptance Criteria
- [ ] Layout adapts to screen size
- [ ] Panels stack vertically on mobile
- [ ] Touch targets ≥ 44x44px
- [ ] Text readable on small screens
- [ ] SVG scales properly
- [ ] Tested on iOS Safari and Chrome Android

### Reference
- Standard responsive design patterns

---

## M6.6: Performance Optimization Pass

**Title:** [M6] Performance optimization pass (target 60 FPS)

**Labels:** refactor, size: L, priority: high

### Feature Description
Optimize performance to maintain 60 FPS with 12 robots and 20+ actors.

### Implementation Details
- Profile with Chrome DevTools Performance tab
- Optimize collision detection (spatial partitioning or reduce frequency)
- Memoize expensive React computations
- Debounce camera updates
- Optimize SVG rendering (reduce complexity if needed)
- Check for memory leaks (Timeline cleanup, event listeners)

**Optimization checklist:**
```markdown
- [ ] Profile with DevTools (identify bottlenecks)
- [ ] Memoize robot/actor components with React.memo
- [ ] Use useMemo for expensive calculations
- [ ] Reduce collision check frequency if needed
- [ ] Ensure timelines cleaned up on unmount
- [ ] Check for event listener leaks
- [ ] Optimize SVG complexity (simplify paths if needed)
- [ ] Test with 12 robots + 20 actors
```

**Performance targets:**
- 60 FPS with 12 robots
- < 100ms interaction response
- < 200MB memory usage
- Smooth camera pan/zoom

### Acceptance Criteria
- [ ] Maintains 60 FPS with full load
- [ ] No memory leaks after 5 minutes
- [ ] Camera movements smooth
- [ ] Interactions responsive
- [ ] Profiling shows no major bottlenecks

### Reference
- React performance best practices

---

## M6.7: Configure GitHub Pages Deployment

**Title:** [M6] Configure GitHub Pages deployment

**Labels:** chore, size: M, priority: high

### Feature Description
Set up automated deployment to GitHub Pages so the project is publicly accessible.

### Implementation Details
- Update `vite.config.ts` with base path
- Create `deploy.sh` script or use GitHub Actions
- Configure GitHub Pages in repository settings
- Add deployment workflow (optional: deploy on push to main)
- Test deployed site

**Vite config:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/pelagos-7/',  // Repository name
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
```

**Deploy script:**
```bash
#!/bin/bash
# deploy.sh

# Build
npm run build

# Deploy to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

**Or GitHub Actions:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Acceptance Criteria
- [ ] Site deploys to GitHub Pages
- [ ] Base path configured correctly
- [ ] All assets load properly
- [ ] Audio works on deployed site
- [ ] Site accessible at https://fallboard-studios.github.io/pelagos-7/
- [ ] Deployment documented in README

### Reference
- Vite GitHub Pages deployment guide

---

## M6.8: Write Portfolio Documentation

**Title:** [M6] Write portfolio documentation (PORTFOLIO.md, screenshots)

**Labels:** documentation, size: M, priority: high

### Feature Description
Create comprehensive portfolio documentation showcasing technical decisions, architecture, and outcomes.

### Implementation Details
- Create `docs/PORTFOLIO.md`
- Write case study format:
  - Project overview
  - Technical challenges
  - Architecture decisions
  - Key features
  - Technologies used
  - Lessons learned
- Take screenshots/screen recordings
- Create architecture diagram
- Document time spent per milestone

**Portfolio structure:**
```markdown
# Pelagos-7 Portfolio Case Study

## Overview
Browser-based generative music system where autonomous robots create evolving ambient compositions.

## Technical Challenge
Build a real-time music generation system with:
- Sample-accurate audio scheduling
- Musical time management (beat-based, not wall-clock)
- Separation of concerns (audio/animation/state)

## Architecture Decisions

### Three Pillars
- **Audio**: Singleton AudioEngine, Tone.js Transport
- **Animation**: GSAP timelines (NOT in state)
- **State**: Zustand (serializable only)

### Key Patterns
- Step registry for O(1) melody lookup
- Skip-based polyphony limiting
- Index-based melodies (harmony-adaptive)
- Measure-based world time

## Implementation Highlights

[Code snippets, diagrams, screenshots]

## Outcomes
- 60 FPS with 12 robots
- Sample-accurate audio
- Mobile-responsive
- Zero memory leaks

## Technologies
- React + TypeScript
- Tone.js (Web Audio)
- GSAP (animation)
- Zustand (state)
- Vitest (testing)

## Lessons Learned
[Key insights from development]

## Live Demo
https://fallboard-studios.github.io/pelagos-7/
```

### Acceptance Criteria
- [ ] PORTFOLIO.md written (1500-2000 words)
- [ ] Screenshots captured (3-5 images)
- [ ] Architecture diagram created
- [ ] Code snippets included
- [ ] Live demo link works
- [ ] Time tracking documented

### Reference
- Portfolio case study best practices

---

## M6.9: Final Testing and Polish

**Title:** [M6] Final testing and polish pass

**Labels:** testing, size: L, priority: high

### Feature Description
Comprehensive end-to-end testing of the complete system and final polish.

### Implementation Details
- Test all features end-to-end
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices (iOS, Android)
- Fix any remaining bugs
- Polish animations and transitions
- Verify all documentation links work

**Final test checklist:**
```markdown
## Core Systems
- [ ] AudioEngine starts on play button click
- [ ] Robots spawn and swim autonomously
- [ ] Melodies play synchronized to beat
- [ ] Harmony changes every 4 measures
- [ ] Polyphony limiting works
- [ ] Interactions trigger (audio + visual)
- [ ] Cooldowns prevent spam
- [ ] Factories spawn robots every 60 measures
- [ ] Camera pan/zoom works smoothly

## UI/UX
- [ ] Robot selection works
- [ ] Info panel shows correct data
- [ ] Settings panel controls work
- [ ] Time display updates
- [ ] Touch controls work on mobile
- [ ] Responsive layout adapts

## Performance
- [ ] 60 FPS with 12 robots
- [ ] No memory leaks after 10 minutes
- [ ] No console errors/warnings
- [ ] Audio stays synchronized

## Cross-browser
- [ ] Chrome (desktop + mobile)
- [ ] Firefox (desktop)
- [ ] Safari (desktop + iOS)
- [ ] Edge (desktop)

## Deployment
- [ ] Deployed to GitHub Pages
- [ ] Live site loads correctly
- [ ] All assets load
- [ ] Audio works on deployed site
```

### Acceptance Criteria
- [ ] All tests pass
- [ ] No critical bugs
- [ ] Performance targets met
- [ ] Works on major browsers
- [ ] Mobile-friendly
- [ ] Documentation complete
- [ ] Portfolio-ready

### Reference
- End-to-end validation
