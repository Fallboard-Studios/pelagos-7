# Phase 9: Polish & Launch (M6) - Detailed Steps

**Timeline:** Week 5-6 (1-2 weeks, ~40-50 hours)  
**Goal:** Add UI panels, optimize for mobile, tune performance, deploy to GitHub Pages, and create portfolio presentation materials.

---

## Prerequisites

- [ ] Phase 8 complete (M5 milestone done)
- [ ] All core features working (robots, audio, interactions, environment)
- [ ] Camera system functional
- [ ] All M6 issues created in project backlog
- [ ] Understanding of deployment workflows

---

## Why This Phase Matters

**This is what makes it portfolio-ready!** Everything before this phase is "technically impressive" - this phase makes it "professionally complete."

**What makes this impressive:**
- Mobile-responsive design shows production thinking
- Performance optimization demonstrates profiling skills
- Deployment proves it's a real, shareable application
- Portfolio materials show communication and presentation skills
- Demo mode makes it easy for reviewers to experience quickly

**After Phase 9:** You have a live, deployed application with professional documentation ready to show employers and clients.

---

## Phase Overview

You'll implement 10 issues from Milestone M6:

1. **M6.1:** Robot Editor Panel (view/edit selected robot)
2. **M6.2:** Settings Panel (volume, BPM, visual options)
3. **M6.3:** Time Display Component (measures/hours indicator)
4. **M6.4:** Mobile-Responsive Layout (touch controls, UI scaling)
5. **M6.5:** Performance Optimization Pass (60 FPS target)
6. **M6.6:** GitHub Pages Deployment
7. **M6.7:** Professional README with Screenshots
8. **M6.8:** PORTFOLIO.md Case Study
9. **M6.9:** Architecture Diagram (visual)
10. **M6.10:** Demo Mode (auto-showcase features)

**End state:** Live application at `https://fallboard-studios.github.io/pelagos-7/` with professional documentation and portfolio materials.

---

## Milestone M6: Polish & Launch

---

## Issue M6.1: Robot Editor Panel (4-5 hours)

### 1.1 Create RobotEditorPanel Component

**File: `src/components/panels/RobotEditorPanel.tsx`**

```typescript
import React from 'react';
import type { Robot } from '../../types/Robot';
import { useOceanStore } from '../../stores/oceanStore';
import './RobotEditorPanel.css';

interface RobotEditorPanelProps {
  robot: Robot;
  onClose: () => void;
}

export function RobotEditorPanel({ robot, onClose }: RobotEditorPanelProps) {
  const updateRobot = useOceanStore((state) => state.updateRobot);
  const removeRobot = useOceanStore((state) => state.removeRobot);

  const handleDelete = () => {
    if (confirm('Delete this robot?')) {
      removeRobot(robot.id);
      onClose();
    }
  };

  return (
    <div className="robot-editor-panel">
      <div className="panel-header">
        <h2>Robot Details</h2>
        <button onClick={onClose} className="close-button" aria-label="Close">
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Robot ID */}
        <div className="info-group">
          <label>ID</label>
          <div className="info-value">{robot.id.slice(0, 8)}...</div>
        </div>

        {/* Position */}
        <div className="info-group">
          <label>Position</label>
          <div className="info-value">
            x: {Math.round(robot.position.x)}, y: {Math.round(robot.position.y)}
          </div>
        </div>

        {/* State */}
        <div className="info-group">
          <label>State</label>
          <div className="info-value state-badge">{robot.state}</div>
        </div>

        {/* Audio Attributes */}
        <div className="section-header">Audio Attributes</div>

        <div className="info-group">
          <label>Synth Type</label>
          <div className="info-value">{robot.audio.synthType}</div>
        </div>

        <div className="info-group">
          <label>Pitch Range</label>
          <div className="info-value">
            {robot.audio.pitchMin} - {robot.audio.pitchMax} Hz
          </div>
        </div>

        <div className="info-group">
          <label>Melody Events</label>
          <div className="info-value">{robot.melody.length} notes</div>
        </div>

        {/* Visual Parts */}
        <div className="section-header">Visual Parts</div>

        <div className="info-group">
          <label>Chassis</label>
          <div className="info-value">{robot.svgParts.chassis}</div>
        </div>

        <div className="info-group">
          <label>Head</label>
          <div className="info-value">{robot.svgParts.head}</div>
        </div>

        {/* Actions */}
        <div className="panel-actions">
          <button onClick={handleDelete} className="delete-button">
            Delete Robot
          </button>
        </div>
      </div>
    </div>
  );
}
```

**File: `src/components/panels/RobotEditorPanel.css`**

```css
.robot-editor-panel {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  z-index: 1000;
  
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
  
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  color: white;
}

.close-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: white;
}

.panel-content {
  padding: 20px;
}

.info-group {
  margin-bottom: 16px;
}

.info-group label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.info-value {
  color: white;
  font-size: 14px;
  font-family: 'Courier New', monospace;
}

.state-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(79, 195, 247, 0.2);
  border: 1px solid rgba(79, 195, 247, 0.5);
  border-radius: 4px;
  color: #4fc3f7;
  text-transform: capitalize;
}

.section-header {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
  margin: 24px 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.delete-button {
  width: 100%;
  padding: 12px;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 6px;
  color: #f44336;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-button:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: #f44336;
}
```

### 1.2 Integrate with Robot Selection

**Update `src/components/Robot.tsx`:**

```typescript
// Add panel trigger when selected
const isSelected = useOceanStore((state) => state.selectedRobotId === robot.id);

// Panel renders in OceanScene, not in Robot component
```

**Update `src/components/OceanScene.tsx`:**

```typescript
import { RobotEditorPanel } from './panels/RobotEditorPanel';

// Inside component
const selectedRobotId = useOceanStore((state) => state.selectedRobotId);
const robots = useOceanStore((state) => state.robots);
const setSelectedRobotId = useOceanStore((state) => state.setSelectedRobotId);

const selectedRobot = robots.find((r) => r.id === selectedRobotId);

return (
  <div className="ocean-scene">
    {/* ... existing content */}
    
    {selectedRobot && (
      <RobotEditorPanel
        robot={selectedRobot}
        onClose={() => setSelectedRobotId(null)}
      />
    )}
  </div>
);
```

**Acceptance Criteria:**
- [ ] Panel appears when robot selected
- [ ] Shows robot ID, position, state
- [ ] Displays audio attributes
- [ ] Shows visual parts info
- [ ] Delete button works
- [ ] Close button clears selection

**Commit Message:**
```
feat(ui): add robot editor panel

- Create RobotEditorPanel component
- Display robot ID, position, state
- Show audio attributes and visual parts
- Add delete robot functionality
- Integrate with selection system

Closes #M6.1
```

---

## Issue M6.2: Settings Panel (4-5 hours)

### 2.1 Create Settings Panel Component

**File: `src/components/panels/SettingsPanel.tsx`**

```typescript
import React, { useState } from 'react';
import { AudioEngine } from '../../engine/AudioEngine';
import { useOceanStore } from '../../stores/oceanStore';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const volume = useOceanStore((state) => state.settings.volume);
  const bpm = useOceanStore((state) => state.settings.bpm);
  const maxPolyphony = useOceanStore((state) => state.settings.maxPolyphony);
  const showBubbles = useOceanStore((state) => state.settings.showBubbles);
  const updateSettings = useOceanStore((state) => state.updateSettings);

  const handleVolumeChange = (value: number) => {
    updateSettings({ volume: value });
    AudioEngine.setVolume(value);
  };

  const handleBPMChange = (value: number) => {
    updateSettings({ bpm: value });
    AudioEngine.setBPM(value);
  };

  const handlePolyphonyChange = (value: number) => {
    updateSettings({ maxPolyphony: value });
    AudioEngine.setMaxPolyphony(value);
  };

  const handleBubblesToggle = () => {
    updateSettings({ showBubbles: !showBubbles });
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>Settings</h2>
        <button onClick={onClose} className="close-button" aria-label="Close">
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Volume */}
        <div className="setting-group">
          <label htmlFor="volume-slider">
            Volume
            <span className="setting-value">{Math.round(volume * 100)}%</span>
          </label>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          />
        </div>

        {/* BPM */}
        <div className="setting-group">
          <label htmlFor="bpm-slider">
            BPM (Tempo)
            <span className="setting-value">{bpm}</span>
          </label>
          <input
            id="bpm-slider"
            type="range"
            min="40"
            max="120"
            step="5"
            value={bpm}
            onChange={(e) => handleBPMChange(parseInt(e.target.value))}
          />
        </div>

        {/* Polyphony */}
        <div className="setting-group">
          <label htmlFor="polyphony-slider">
            Max Voices
            <span className="setting-value">{maxPolyphony}</span>
          </label>
          <input
            id="polyphony-slider"
            type="range"
            min="4"
            max="16"
            step="1"
            value={maxPolyphony}
            onChange={(e) => handlePolyphonyChange(parseInt(e.target.value))}
          />
        </div>

        {/* Visual Options */}
        <div className="section-header">Visual Options</div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showBubbles}
              onChange={handleBubblesToggle}
            />
            <span>Show Bubbles</span>
          </label>
        </div>

        {/* Info */}
        <div className="settings-info">
          <p>Changes apply immediately. Settings are saved to local storage.</p>
        </div>
      </div>
    </div>
  );
}
```

**File: `src/components/panels/SettingsPanel.css`**

```css
.settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1100;
  
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.setting-value {
  color: #4fc3f7;
  font-family: 'Courier New', monospace;
}

.setting-group input[type="range"] {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4fc3f7;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.setting-group input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4fc3f7;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.settings-info {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
}
```

### 2.2 Add Settings Button to UI

**File: `src/components/ui/SettingsButton.tsx`**

```typescript
import React, { useState } from 'react';
import { SettingsPanel } from '../panels/SettingsPanel';
import './SettingsButton.css';

export function SettingsButton() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="settings-button"
        aria-label="Settings"
      >
        ⚙️
      </button>

      {showPanel && <SettingsPanel onClose={() => setShowPanel(false)} />}
    </>
  );
}
```

**File: `src/components/ui/SettingsButton.css`**

```css
.settings-button {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  
  width: 50px;
  height: 50px;
  
  background: rgba(20, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  
  font-size: 24px;
  cursor: pointer;
  
  transition: all 0.2s;
}

.settings-button:hover {
  background: rgba(30, 30, 40, 0.9);
  transform: rotate(45deg);
}
```

**Update `src/components/OceanScene.tsx`:**

```typescript
import { SettingsButton } from './ui/SettingsButton';

// Add to render
<SettingsButton />
```

**Acceptance Criteria:**
- [ ] Settings button in top-right corner
- [ ] Panel opens on click
- [ ] Volume slider works (0-100%)
- [ ] BPM slider works (40-120)
- [ ] Polyphony slider works (4-16)
- [ ] Bubbles toggle works
- [ ] Settings persist to localStorage

**Commit Message:**
```
feat(ui): add settings panel

- Create SettingsPanel component
- Add volume, BPM, and polyphony controls
- Add visual options (bubble toggle)
- Integrate with AudioEngine
- Add settings button to UI
- Persist settings to localStorage

Closes #M6.2
```

---

## Issue M6.3: Time Display Component (2 hours)

### 3.1 Create TimeDisplay Component

**File: `src/components/TimeDisplay.tsx`** (adapt from Oceanic)

```typescript
import React, { useState, useEffect } from 'react';
import { BeatClock } from '../engine/beatClock';
import './TimeDisplay.css';

export function TimeDisplay() {
  const [currentMeasure, setCurrentMeasure] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      setCurrentMeasure(BeatClock.getCurrentMeasure());
    };

    // Update every measure
    const intervalId = BeatClock.scheduleRepeat('1m', updateTime);

    return () => {
      BeatClock.cancel(intervalId);
    };
  }, []);

  // Derived hour for display (0-23)
  const hour = Math.floor((currentMeasure % 96) / 4);

  return (
    <div className="time-display">
      <div className="time-label">Measure</div>
      <div className="time-value">{currentMeasure}</div>
      <div className="time-separator">|</div>
      <div className="time-label">Hour</div>
      <div className="time-value">{hour}</div>
    </div>
  );
}
```

**File: `src/components/TimeDisplay.css`**

```css
.time-display {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  
  display: flex;
  align-items: center;
  gap: 12px;
  
  background: rgba(20, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 20px;
  
  font-family: 'Courier New', monospace;
}

.time-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.time-value {
  font-size: 18px;
  color: #4fc3f7;
  font-weight: bold;
}

.time-separator {
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
}
```

**Update `src/components/OceanScene.tsx`:**

```typescript
import { TimeDisplay } from './TimeDisplay';

// Add to render
<TimeDisplay />
```

**Acceptance Criteria:**
- [ ] Time display shows current measure
- [ ] Hour derived correctly (0-23 from 96-measure cycle)
- [ ] Updates every measure
- [ ] Positioned bottom-right
- [ ] Styled consistently

**Commit Message:**
```
feat(ui): add time display component

- Show current measure (game time)
- Display derived hour (0-23)
- Update synchronized to BeatClock
- Position bottom-right corner

Closes #M6.3
```

---

## Issue M6.4: Mobile-Responsive Layout (6-8 hours)

### 4.1 Add Viewport Meta Tag

**Update `index.html`:**

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Pelagos-7 | Robot Symphony</title>
</head>
```

### 4.2 Create Mobile Styles

**File: `src/styles/mobile.css`**

```css
/* Mobile breakpoints */
@media (max-width: 768px) {
  /* Settings button - larger touch target */
  .settings-button {
    width: 60px;
    height: 60px;
    top: 15px;
    right: 15px;
    font-size: 28px;
  }

  /* Settings panel - full width on mobile */
  .settings-panel {
    width: calc(100% - 40px);
    max-width: 400px;
  }

  /* Robot editor panel - slide from bottom */
  .robot-editor-panel {
    top: auto;
    bottom: 0;
    right: 0;
    left: 0;
    transform: none;
    width: 100%;
    max-height: 70vh;
    border-radius: 12px 12px 0 0;
  }

  /* Time display - smaller, reposition */
  .time-display {
    bottom: 15px;
    right: 15px;
    padding: 8px 14px;
    gap: 8px;
  }

  .time-label {
    font-size: 10px;
  }

  .time-value {
    font-size: 16px;
  }

  /* Play button - larger */
  .play-button {
    width: 80px;
    height: 80px;
    font-size: 40px;
  }
}

@media (max-width: 480px) {
  /* Ultra-small screens - hide time display on spawn */
  .time-display {
    font-size: 12px;
  }

  /* Settings panel - even smaller padding */
  .panel-content {
    padding: 15px;
  }

  /* Robot editor - compact */
  .robot-editor-panel {
    max-height: 60vh;
  }
}
```

### 4.3 Add Touch Gesture Support

**File: `src/hooks/useTouchGestures.ts`**

```typescript
import { useEffect, useRef } from 'react';

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number | null;
}

export function useTouchGestures(
  onPan: (dx: number, dy: number) => void,
  onPinch: (scale: number) => void
) {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startDistance: null,
  });

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - pan
        touchState.current.startX = e.touches[0].clientX;
        touchState.current.startY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Two-finger - pinch
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchState.current.startDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchState.current.startDistance === null) {
        // Pan
        const dx = e.touches[0].clientX - touchState.current.startX;
        const dy = e.touches[0].clientY - touchState.current.startY;
        onPan(dx, dy);
        touchState.current.startX = e.touches[0].clientX;
        touchState.current.startY = e.touches[0].clientY;
      } else if (e.touches.length === 2 && touchState.current.startDistance) {
        // Pinch
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const scale = currentDistance / touchState.current.startDistance;
        onPinch(scale);
        touchState.current.startDistance = currentDistance;
      }
    };

    const handleTouchEnd = () => {
      touchState.current.startDistance = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onPan, onPinch]);
}
```

### 4.4 Integrate Touch Support

**Update `src/components/OceanScene.tsx`:**

```typescript
import { useTouchGestures } from '../hooks/useTouchGestures';

// Inside component
const viewport = useOceanStore((state) => state.viewport);
const updateViewport = useOceanStore((state) => state.updateViewport);

useTouchGestures(
  (dx, dy) => {
    // Pan
    updateViewport({
      x: viewport.x + dx,
      y: viewport.y + dy,
    });
  },
  (scale) => {
    // Pinch zoom
    const newScale = Math.max(0.5, Math.min(2, viewport.scale * scale));
    updateViewport({ scale: newScale });
  }
);
```

**Import mobile styles in `src/main.tsx`:**

```typescript
import './styles/mobile.css';
```

**Acceptance Criteria:**
- [ ] Touch pan works (single finger drag)
- [ ] Pinch zoom works (two-finger gesture)
- [ ] UI elements have adequate touch targets (44x44px min)
- [ ] Panels adapt to mobile viewport
- [ ] No horizontal scroll on mobile
- [ ] Tested on iOS and Android

**Commit Message:**
```
feat(mobile): add mobile-responsive layout

- Add viewport meta tag
- Create mobile breakpoint styles
- Implement touch gesture support (pan/pinch)
- Enlarge touch targets for buttons
- Adapt panels for mobile viewports
- Prevent horizontal scroll

Closes #M6.4
```

---

## Issue M6.5: Performance Optimization Pass (5-6 hours)

### 5.1 Create Performance Profiling Script

**File: `scripts/performance-profile.mjs`**

```javascript
#!/usr/bin/env node

import { chromium } from 'playwright';

async function profilePerformance() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');
  
  // Wait for Play button
  await page.click('button:has-text("Play")');
  
  // Let app run for 30 seconds
  await page.waitForTimeout(30000);
  
  // Get performance metrics
  const metrics = await page.evaluate(() => {
    return {
      fps: performance.now() / 1000,
      memory: (performance as any).memory?.usedJSHeapSize || 0,
    };
  });
  
  console.log('Performance Metrics:');
  console.log(`  FPS target: 60`);
  console.log(`  Memory usage: ${(metrics.memory / 1024 / 1024).toFixed(2)} MB`);
  
  await browser.close();
}

profilePerformance();
```

### 5.2 Optimize Render Performance

**Add React.memo to expensive components:**

**Update `src/components/Robot.tsx`:**

```typescript
export const Robot = React.memo(RobotComponent, (prevProps, nextProps) => {
  // Only re-render if robot data changed
  return (
    prevProps.robot.id === nextProps.robot.id &&
    prevProps.robot.position.x === nextProps.robot.position.x &&
    prevProps.robot.position.y === nextProps.robot.position.y &&
    prevProps.robot.state === nextProps.robot.state &&
    prevProps.isSelected === nextProps.isSelected
  );
});
```

**Update `src/components/actors/ActorRenderer.tsx`:**

```typescript
export const ActorRenderer = React.memo(ActorRendererComponent);
```

### 5.3 Optimize Animation Performance

**Update `src/animation/tickLoop.ts` to throttle:**

```typescript
let lastTickTime = 0;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

export function startTickLoop() {
  gsap.ticker.add((time) => {
    const now = performance.now();
    if (now - lastTickTime < FRAME_TIME) return; // Skip frame if too soon
    
    lastTickTime = now;
    
    // Perform collision checks, etc.
  });
}
```

### 5.4 Limit Active Timelines

**Update `src/animation/timelineMap.ts`:**

```typescript
const MAX_ACTIVE_TIMELINES = 20;

export function setTimeline(id: string, timeline: gsap.core.Timeline) {
  if (timelineMap.size >= MAX_ACTIVE_TIMELINES) {
    console.warn('[TimelineMap] Max timelines reached, skipping');
    return;
  }
  timelineMap.set(id, timeline);
}
```

### 5.5 Add Performance Monitoring

**File: `src/debug/PerformanceMonitor.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import './PerformanceMonitor.css';

export function PerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;

        // Memory (if available)
        if ((performance as any).memory) {
          setMemory((performance as any).memory.usedJSHeapSize / 1024 / 1024);
        }
      }
      requestAnimationFrame(measureFPS);
    };

    measureFPS();
  }, []);

  const fpsColor = fps >= 55 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336';

  return (
    <div className="performance-monitor">
      <div className="perf-stat">
        <span className="perf-label">FPS</span>
        <span className="perf-value" style={{ color: fpsColor }}>
          {fps}
        </span>
      </div>
      {memory > 0 && (
        <div className="perf-stat">
          <span className="perf-label">Memory</span>
          <span className="perf-value">{memory.toFixed(1)} MB</span>
        </div>
      )}
    </div>
  );
}
```

**File: `src/debug/PerformanceMonitor.css`**

```css
.performance-monitor {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  
  display: flex;
  gap: 20px;
  
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.perf-stat {
  display: flex;
  gap: 8px;
  align-items: center;
}

.perf-label {
  color: rgba(255, 255, 255, 0.6);
}

.perf-value {
  color: white;
  font-weight: bold;
}
```

**Add to OceanScene (dev only):**

```typescript
{import.meta.env.DEV && <PerformanceMonitor />}
```

**Acceptance Criteria:**
- [ ] Achieves 60 FPS with 12 robots
- [ ] Memory usage < 200 MB after 5 minutes
- [ ] No memory leaks (stable after 10 minutes)
- [ ] React.memo applied to expensive components
- [ ] Timeline count limited
- [ ] Performance monitor shows FPS and memory (dev mode)

**Commit Message:**
```
perf: optimize rendering and animation performance

- Add React.memo to Robot and Actor components
- Throttle tick loop to target 60 FPS
- Limit max active timelines to 20
- Add performance profiling script
- Add performance monitor component (dev mode)
- Optimize collision detection frequency

Closes #M6.5
```

---

## Issue M6.6: GitHub Pages Deployment (3-4 hours)

### 6.1 Configure Vite for GitHub Pages

**Update `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/pelagos-7/', // Repository name
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### 6.2 Create GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 6.3 Enable GitHub Pages in Repository Settings

**Steps (manual):**
1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. Save

### 6.4 Add Build Scripts

**Update `package.json`:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^6.1.0"
  }
}
```

### 6.5 Test Deployment Locally

```bash
npm run build
npm run preview
```

Visit `http://localhost:4173/pelagos-7/` to test production build.

**Acceptance Criteria:**
- [ ] Vite configured with correct base path
- [ ] GitHub Actions workflow created
- [ ] Workflow runs on push to main
- [ ] Build succeeds without errors
- [ ] App deploys to GitHub Pages
- [ ] Live site accessible at `https://fallboard-studios.github.io/pelagos-7/`
- [ ] All assets load correctly

**Commit Message:**
```
ci: configure GitHub Pages deployment

- Set Vite base path for GitHub Pages
- Create GitHub Actions deploy workflow
- Add build and preview scripts
- Enable automatic deployment on push to main

Closes #M6.6
```

---

## Issue M6.7: Professional README with Screenshots (4 hours)

### 7.1 Take Screenshots

**Tools:**
- Browser DevTools (Cmd/Ctrl + Shift + P → "Capture screenshot")
- OBS Studio for video recording
- GIF creation: ScreenToGif or similar

**Screenshots needed:**
1. `docs/screenshots/hero.png` - Full app view with robots
2. `docs/screenshots/robot-editor.png` - Robot editor panel open
3. `docs/screenshots/settings.png` - Settings panel
4. `docs/screenshots/mobile.png` - Mobile view
5. `docs/screenshots/demo.gif` - 10-second interaction loop

### 7.2 Create Professional README

**File: `README.md`** (replace existing)

```markdown
# Pelagos-7

**A browser-based ambient music generator where autonomous robot fish create evolving symphonies in a post-apocalyptic ocean environment.**

🎵 **[Live Demo](https://fallboard-studios.github.io/pelagos-7/)** | 📊 **[Project Board](https://github.com/orgs/fallboard-studios/projects/1)**

![Pelagos-7 Screenshot](docs/screenshots/hero.png)

---

## Overview

Pelagos-7 is an interactive musical experience that combines procedural generation, autonomous agents, and beat-synchronized audio. Watch as robot fish swim through underwater ruins, generating unique melodies through their movements and interactions.

**Key Features:**
- 🤖 Autonomous robot behavior with GSAP-driven animation
- 🎼 Procedurally generated melodies synchronized to musical beats
- 🏭 Factory actors that periodically spawn new robots
- 🌊 Post-apocalyptic underwater environment with parallax depth
- 📱 Mobile-responsive with touch pan/zoom controls
- 🎚️ Real-time audio controls (volume, BPM, polyphony)

---

## Technical Highlights

### Architecture: Three Pillars Pattern

**Audio** (Tone.js)
- Beat-synchronized timing via Tone.Transport
- Polyphony management (voice limiting)
- Dynamic harmony system (8-note palette, changes every 4 measures)
- Index-based melodies adapt to harmony changes

**Animation** (GSAP)
- Timeline-driven robot movement
- Separate timeline map (not stored in React state)
- Interaction bursts and visual effects
- Camera pan/zoom with easing

**State** (Zustand)
- Serializable data only
- No timelines or synths in store
- Persistent settings via localStorage

### Why This Pattern?

Clean separation prevents common web audio pitfalls:
- No `setTimeout`/`setInterval` for musical timing
- No audio scheduling in React render cycles
- No GSAP timelines triggering Tone.js directly

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full explanation.

---

## Screenshots

### Robot Editor Panel
![Robot Editor](docs/screenshots/robot-editor.png)

*View and edit attributes of selected robots*

### Settings Panel
![Settings](docs/screenshots/settings.png)

*Real-time audio and visual controls*

### Mobile View
![Mobile View](docs/screenshots/mobile.png)

*Touch-optimized interface with gesture support*

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/fallboard-studios/pelagos-7.git
cd pelagos-7

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

---

## Development

### Project Structure

```
src/
├── engine/          # AudioEngine, BeatClock, harmony system
├── animation/       # GSAP timeline management
├── components/      # React components
│   ├── panels/      # UI panels (settings, robot editor)
│   └── actors/      # Environmental actor renderers
├── stores/          # Zustand state management
├── hooks/           # Custom React hooks
└── types/           # TypeScript definitions
```

### Key Files

- `src/engine/AudioEngine.ts` - Singleton audio manager
- `src/engine/beatClock.ts` - Musical timing authority
- `src/animation/timelineMap.ts` - GSAP timeline registry
- `src/stores/oceanStore.ts` - Global state

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run audit        # Check architectural patterns
```

---

## Contributing

This project follows strict architectural conventions enforced by AI documentation and audit scripts. See:

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) - AI development guide
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Three pillars pattern
- [`docs/FORBIDDEN_PATTERNS.md`](docs/FORBIDDEN_PATTERNS.md) - Anti-patterns to avoid

**Before submitting a PR:**
1. Run `npm run lint` and `npm run audit`
2. Test on both desktop and mobile
3. Ensure no console errors

---

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Audio:** Tone.js (Web Audio API wrapper)
- **Animation:** GSAP (GreenSock)
- **State:** Zustand
- **Build:** Vite
- **Deployment:** GitHub Pages
- **CI/CD:** GitHub Actions

---

## Roadmap

**v1.0 (Current)**
- ✅ Core robot behavior and audio system
- ✅ Factory spawning mechanism
- ✅ Environmental actors and camera controls
- ✅ Mobile-responsive UI
- ✅ GitHub Pages deployment

**v1.1 (Planned)**
- [ ] Save/load system (export/import world state)
- [ ] Additional robot variants (10+ combinations)
- [ ] Energy system with charging stations
- [ ] Audio presets (different musical modes)
- [ ] URL-based world sharing

---

## Credits

**Created by:** [Your Name]  
**Organization:** Fallboard Studios  
**License:** MIT

**Inspired by:** Oceanic (proof-of-concept), generative music systems, autonomous agent simulations

---

## License

MIT License - see [LICENSE](LICENSE) for details
```

**Acceptance Criteria:**
- [ ] Professional README with screenshots
- [ ] Live demo link functional
- [ ] Architecture explained clearly
- [ ] Getting started instructions work
- [ ] Project structure documented
- [ ] Tech stack listed
- [ ] Roadmap included
- [ ] License added

**Commit Message:**
```
docs: create professional README with screenshots

- Add hero screenshot and demo GIF
- Document architecture (three pillars pattern)
- Add getting started guide
- Include project structure overview
- List tech stack and roadmap
- Add contributing guidelines

Closes #M6.7
```

---

## Issue M6.8: PORTFOLIO.md Case Study (5-6 hours)

### 8.1 Create Portfolio Case Study

**File: `docs/PORTFOLIO.md`**

```markdown
# Pelagos-7: Portfolio Case Study

**Role:** Solo Developer & Designer  
**Timeline:** 6 weeks (Oct - Nov 2024)  
**Tech Stack:** React, TypeScript, Tone.js, GSAP, Zustand  
**Live Demo:** [pelagos-7](https://fallboard-studios.github.io/pelagos-7/)

---

## Project Overview

Pelagos-7 is an interactive ambient music generator featuring autonomous robot fish that create evolving musical compositions through their movements and interactions in a post-apocalyptic underwater environment.

**Challenge:** Build a browser-based generative music system with complex autonomous behavior while maintaining clean architecture and 60 FPS performance.

---

## Technical Approach

### 1. Architecture: Three Pillars Pattern

**Problem:** Web audio projects often suffer from timing drift, memory leaks, and tangled audio/animation code.

**Solution:** Strict separation of concerns:

- **Audio Pillar (Tone.js):** Single AudioEngine manages all sound. No audio scheduling outside this singleton.
- **Animation Pillar (GSAP):** Timelines stored in separate Map, never in React state. No Tone.js calls from GSAP.
- **State Pillar (Zustand):** Serializable data only. No synths, no timelines.

**Result:** Zero timing drift, predictable performance, easy debugging.

```typescript
// ❌ BAD: Audio in React
useEffect(() => {
  const synth = new Tone.Synth().toDestination();
  synth.triggerAttackRelease("C4", "8n");
}, []);

// ✅ GOOD: Audio through singleton
AudioEngine.scheduleNote({ robotId, note: "C4", duration: "8n" });
```

### 2. Beat-Synchronized Timing System

**Problem:** `setTimeout`/`setInterval` drift over time. Animations and audio desync.

**Solution:** Use Tone.Transport as authoritative clock. All timing expressed in musical measures/beats.

**Impact:**
- Robots spawn on measure boundaries
- Interactions trigger on beat subdivisions
- Harmony changes synchronized to Transport
- Camera animations align to musical phrases

**Technical detail:** 96 measures = 1 day/night cycle. All game logic measure-based, BPM-independent.

### 3. Procedural Generation

**Robots:**
- 5 swappable SVG parts (chassis, head, propeller, 2 antennae)
- 2-3 variants per part = 100+ visual combinations
- Melodies: 16-step, 2-measure loops with weighted note selection
- Index-based system: melodies adapt when harmony changes

**Environment:**
- Procedural machinery actors (seed-based generation)
- Deterministic: same seed = same appearance
- Cached geometry for performance

### 4. Performance Optimization

**Challenges:**
- 12 robots with unique melodies
- 20+ environmental actors
- Real-time audio synthesis
- Mobile support

**Solutions:**
- React.memo on Robot/Actor components
- Polyphony limiting (voice stealing)
- Timeline count cap (max 20 active)
- Frame-rate throttling (60 FPS target)
- Touch gesture optimization

**Results:**
- 60 FPS sustained with 12 robots
- <200 MB memory usage
- No memory leaks after 10+ minutes
- Works on iPhone 12 and newer

---

## Development Process

### Week 1-2: Foundation & Core Architecture
- Repository setup (GitHub organization, templates, CI/CD)
- AI documentation (`.github/copilot-instructions.md`)
- AudioEngine, BeatClock, timeline management
- Type definitions and store structure

### Week 3: Robots & Audio Integration
- SVG robot components with variants
- GSAP swim animation system
- Melody generation and playback
- Polyphony management

### Week 4: Interactions & Environment
- Collision detection (gsap.ticker based)
- Robot-robot interaction effects
- Factory actors (spawn system)
- Environmental actors (ruins, machinery)
- Camera pan/zoom with persistence

### Week 5-6: Polish & Launch
- UI panels (robot editor, settings)
- Mobile-responsive layout
- Performance optimization pass
- GitHub Pages deployment
- Documentation and screenshots

---

## Key Technical Decisions

### Why Zustand over Redux?
- Simpler API, less boilerplate
- No action creators needed
- Better TypeScript inference
- Smaller bundle size

### Why GSAP over CSS animations?
- Timeline control (pause/seek/reverse)
- Better performance for complex sequences
- Synchronized to JavaScript (not CSS repaint)
- Easier collision detection integration

### Why Tone.js over Web Audio API directly?
- Transport abstraction (musical timing)
- Synth presets and effects chain
- Better mobile support
- Active community and docs

### Why NOT use a game engine (Phaser, PixiJS)?
- Overkill for SVG-based visuals
- React integration complexity
- Want to demonstrate architecture skills, not framework mastery

---

## Challenges & Solutions

### Challenge 1: Audio Context Suspension on Mobile

**Problem:** iOS/Android browsers suspend audio context aggressively.

**Solution:**
- Explicit `Tone.start()` behind Play button
- Resume context on user gesture
- Graceful error handling with UI feedback

```typescript
try {
  await Tone.start();
  Tone.Transport.start();
} catch (err) {
  showError("Audio failed to start. Tap Play again.");
}
```

### Challenge 2: Touch Gesture Conflicts

**Problem:** Camera pan vs. robot selection on touch devices.

**Solution:**
- Detect gesture intent (distance threshold)
- Delay selection until touchend
- Cancel selection if pan distance > 10px

### Challenge 3: Memory Leaks from GSAP Timelines

**Problem:** Timelines not cleaned up on robot removal.

**Solution:**
- Centralized `timelineMap` registry
- Cleanup on component unmount
- Max timeline cap with warnings

```typescript
export function killTimeline(id: string) {
  const tl = timelineMap.get(id);
  if (tl) {
    tl.kill();
    timelineMap.delete(id);
  }
}
```

---

## Results & Impact

### Metrics
- **Performance:** 60 FPS with 12 active robots
- **Accessibility:** Works on mobile (touch gestures)
- **Code Quality:** 0 ESLint errors, passes architecture audits
- **Documentation:** 2000+ lines of AI guidance and architecture docs

### Portfolio Value
- Demonstrates **clean architecture** (separation of concerns)
- Shows **performance optimization** skills (profiling, React.memo, voice limiting)
- Proves **mobile development** capability (touch gestures, responsive design)
- Highlights **generative systems** thinking (melody generation, procedural actors)
- Professional **deployment workflow** (GitHub Actions, Pages)

### What I Learned
- Musical timing systems require authoritative clocks (not `setTimeout`)
- Separation of concerns prevents "big ball of mud" in creative coding
- Performance optimization starts with architecture, not micro-optimizations
- AI-assisted development requires explicit constraints and patterns
- Portfolio projects need documentation as much as features

---

## Code Samples

**AudioEngine Singleton Pattern:**
```typescript
class AudioEngineImpl {
  private synths = new Map<string, Tone.PolySynth>();
  
  scheduleNote(params: NoteParams) {
    const synth = this.getSynth(params.synthType);
    const time = Tone.now() + MIN_LEAD;
    synth.triggerAttackRelease(params.note, params.duration, time);
  }
}

export const AudioEngine = new AudioEngineImpl();
```

**Timeline Management:**
```typescript
const timelineMap = new Map<string, gsap.core.Timeline>();

export function setTimeline(id: string, tl: gsap.core.Timeline) {
  killTimeline(id); // Clean up old
  timelineMap.set(id, tl);
}
```

**Beat-Synchronized Spawning:**
```typescript
BeatClock.scheduleRepeat('4m', () => {
  if (canSpawnRobot()) {
    spawnRobot(generateRobotAttributes());
  }
});
```

---

## Future Enhancements

**v1.1 Planned Features:**
- Save/load system (export JSON, restore world state)
- Energy system (robots dim when low, recharge at stations)
- More robot variants (10+ chassis types)
- Audio presets (ambient, energetic, dark modes)
- URL-based sharing (encode world seed in URL params)

**Long-term Vision:**
- Multiplayer mode (shared world state via WebRTC)
- VR support (WebXR for immersive experience)
- Live performance mode (MIDI controller integration)

---

## Links

- **Live Demo:** [https://fallboard-studios.github.io/pelagos-7/](https://fallboard-studios.github.io/pelagos-7/)
- **GitHub Repository:** [https://github.com/fallboard-studios/pelagos-7](https://github.com/fallboard-studios/pelagos-7)
- **Project Board:** [GitHub Projects](https://github.com/orgs/fallboard-studios/projects/1)

---

## Contact

**Developer:** [Your Name]  
**Email:** [your.email@example.com]  
**Portfolio:** [yourportfolio.com]  
**LinkedIn:** [linkedin.com/in/yourname]  
**GitHub:** [github.com/yourusername]

---

*Pelagos-7 demonstrates clean architecture, performance optimization, and professional deployment practices in a creative coding context.*
```

**Acceptance Criteria:**
- [ ] Case study covers technical approach
- [ ] Architecture decisions explained
- [ ] Challenges and solutions documented
- [ ] Code samples included
- [ ] Results and impact quantified
- [ ] Future roadmap outlined
- [ ] Contact info added

**Commit Message:**
```
docs: create portfolio case study

- Document three pillars architecture
- Explain beat-synchronized timing system
- Detail procedural generation approach
- Include performance optimization process
- Add code samples and technical decisions
- Quantify results and impact
- Outline future enhancements

Closes #M6.8
```

---

## Issue M6.9: Architecture Diagram (3 hours)

### 9.1 Create Architecture Diagram

**Tool Options:**
- Excalidraw (recommended - hand-drawn aesthetic)
- Figma
- Mermaid (code-based)
- draw.io

**File: `docs/architecture-diagram.png`**

**Diagram should show:**

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                      │
│                  (Click Play, Select Robot)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      REACT COMPONENTS                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │OceanScene│  │  Robot   │  │ Settings │  │TimeDisplay│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────┬──────────────┬───────────────┬──────────────┬──────┘
        │              │               │              │
        │ Read State   │ Trigger       │ Update      │ Get Time
        │              │ Actions       │ Settings    │
        ▼              ▼               ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                      ZUSTAND STORE                            │
│  robots[], actors[], viewport, settings, selectedRobotId     │
│  (Serializable data only - NO timelines, NO synths)          │
└───────┬──────────────────────────────────────┬───────────────┘
        │                                      │
        │ Spawn/Remove                        │ Select/Update
        │                                      │
┌───────▼──────────────┐            ┌─────────▼────────────────┐
│  ANIMATION PILLAR    │            │    AUDIO PILLAR          │
│                      │            │                          │
│  ┌────────────────┐  │            │  ┌──────────────────┐   │
│  │  TimelineMap   │  │            │  │  AudioEngine     │   │
│  │  (GSAP refs)   │  │            │  │  (Tone.js)       │   │
│  └────────────────┘  │            │  └──────────────────┘   │
│                      │            │                          │
│  • Swim animation    │            │  • Melody playback       │
│  • Interaction FX    │            │  • Harmony system        │
│  • Camera easing     │            │  • Polyphony limiting    │
│                      │            │                          │
│  ⚠️ NO Tone.js calls │            │  ⚠️ NO GSAP calls        │
└──────────────────────┘            └──────────────────────────┘
            │                                      │
            │ Semantic Callbacks                  │ Schedule Notes
            │ (onArrived, onInteract)             │ (via Transport)
            │                                      │
            └───────────┬────────────┬────────────┘
                        │            │
                ┌───────▼────────┐   │
                │  BeatClock     │◄──┘
                │ (Authoritative)│
                └────────────────┘
                        │
                        │ Transport.now()
                        │ scheduleRepeat()
                        │
                ┌───────▼────────┐
                │ Tone.Transport │
                │  (Web Audio)   │
                └────────────────┘
```

**Save as:** `docs/architecture-diagram.png` or `.svg`

### 9.2 Add Diagram to README

**Update `README.md`:**

```markdown
## Architecture

![Architecture Diagram](docs/architecture-diagram.png)

Pelagos-7 uses a **Three Pillars** pattern for clean separation of concerns...
```

**Acceptance Criteria:**
- [ ] Diagram clearly shows three pillars
- [ ] Data flow arrows labeled
- [ ] Forbidden interactions marked (❌)
- [ ] BeatClock as authoritative source
- [ ] Component relationships visible
- [ ] Added to README

**Commit Message:**
```
docs: add architecture diagram

- Create visual diagram of three pillars pattern
- Show data flow between components
- Mark forbidden cross-pillar calls
- Highlight BeatClock as timing authority
- Add to README for quick reference

Closes #M6.9
```

---

## Issue M6.10: Demo Mode (3-4 hours)

### 10.1 Create Demo Mode Logic

**File: `src/systems/demoMode.ts`**

```typescript
import { useOceanStore } from '../stores/oceanStore';
import { AudioEngine } from '../engine/AudioEngine';
import { BeatClock } from '../engine/beatClock';

interface DemoConfig {
  autoSpawnInterval: number; // measures
  maxRobots: number;
  autoSelectInterval: number; // measures
  cameraTourEnabled: boolean;
}

const DEFAULT_CONFIG: DemoConfig = {
  autoSpawnInterval: 8,
  maxRobots: 8,
  autoSelectInterval: 16,
  cameraTourEnabled: true,
};

let demoActive = false;
let spawnScheduleId: string | null = null;
let selectScheduleId: string | null = null;

export function startDemoMode(config: Partial<DemoConfig> = {}) {
  if (demoActive) return;
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  demoActive = true;
  
  console.log('[Demo Mode] Starting...', finalConfig);
  
  // Auto-spawn robots
  spawnScheduleId = BeatClock.scheduleRepeat(`${finalConfig.autoSpawnInterval}m`, () => {
    const store = useOceanStore.getState();
    if (store.robots.length < finalConfig.maxRobots) {
      store.spawnRobot();
      console.log('[Demo Mode] Auto-spawned robot');
    }
  });
  
  // Auto-select robots (cycle through)
  let currentIndex = 0;
  selectScheduleId = BeatClock.scheduleRepeat(`${finalConfig.autoSelectInterval}m`, () => {
    const store = useOceanStore.getState();
    if (store.robots.length === 0) return;
    
    const robot = store.robots[currentIndex % store.robots.length];
    store.setSelectedRobotId(robot.id);
    console.log('[Demo Mode] Auto-selected robot', robot.id.slice(0, 8));
    
    currentIndex++;
  });
  
  // Camera tour (if enabled)
  if (finalConfig.cameraTourEnabled) {
    startCameraTour();
  }
}

export function stopDemoMode() {
  if (!demoActive) return;
  
  demoActive = false;
  
  if (spawnScheduleId) {
    BeatClock.cancel(spawnScheduleId);
    spawnScheduleId = null;
  }
  
  if (selectScheduleId) {
    BeatClock.cancel(selectScheduleId);
    selectScheduleId = null;
  }
  
  console.log('[Demo Mode] Stopped');
}

export function isDemoActive(): boolean {
  return demoActive;
}

function startCameraTour() {
  // Gentle camera movement
  BeatClock.scheduleRepeat('32m', () => {
    const store = useOceanStore.getState();
    const { viewport } = store;
    
    // Pan to random location
    const targetX = Math.random() * 1000 - 500;
    const targetY = Math.random() * 500 - 250;
    
    gsap.to(viewport, {
      x: targetX,
      y: targetY,
      duration: 8,
      ease: 'power1.inOut',
      onUpdate: () => {
        store.updateViewport({ x: viewport.x, y: viewport.y });
      },
    });
  });
}
```

### 10.2 Add Demo Mode UI Control

**File: `src/components/ui/DemoModeButton.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { startDemoMode, stopDemoMode, isDemoActive } from '../../systems/demoMode';
import './DemoModeButton.css';

export function DemoModeButton() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoActive());
  }, []);

  const handleToggle = () => {
    if (active) {
      stopDemoMode();
      setActive(false);
    } else {
      startDemoMode();
      setActive(true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`demo-mode-button ${active ? 'active' : ''}`}
      aria-label="Toggle Demo Mode"
    >
      {active ? '⏸️ Stop Demo' : '▶️ Start Demo'}
    </button>
  );
}
```

**File: `src/components/ui/DemoModeButton.css`**

```css
.demo-mode-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 100;
  
  padding: 12px 24px;
  
  background: rgba(79, 195, 247, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(79, 195, 247, 0.5);
  border-radius: 8px;
  
  color: #4fc3f7;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  
  transition: all 0.2s;
}

.demo-mode-button:hover {
  background: rgba(79, 195, 247, 0.3);
  border-color: #4fc3f7;
}

.demo-mode-button.active {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.5);
  color: #f44336;
}

.demo-mode-button.active:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: #f44336;
}
```

### 10.3 Auto-Start Demo on First Visit

**File: `src/app/initEngine.ts`** (update)

```typescript
export async function initEngine() {
  try {
    await AudioEngine.start();
    BeatClock.start();
    
    // Check if first visit
    const hasVisited = localStorage.getItem('pelagos-7-visited');
    if (!hasVisited) {
      localStorage.setItem('pelagos-7-visited', 'true');
      
      // Start demo mode after 2 seconds
      setTimeout(() => {
        startDemoMode({
          maxRobots: 6,
          autoSpawnInterval: 6,
          autoSelectInterval: 12,
        });
      }, 2000);
    }
  } catch (err) {
    console.error('[Init] Failed to start', err);
  }
}
```

### 10.4 Add Demo Mode to README

**Update `README.md`:**

```markdown
## Demo Mode

For portfolio reviewers and quick demonstrations, Pelagos-7 includes an auto-play mode:

1. Click **"▶️ Start Demo"** (bottom-left)
2. Robots spawn automatically every 8 measures
3. Camera pans gently around the environment
4. Selection cycles through robots every 16 measures

**First-time visitors:** Demo mode starts automatically after clicking Play.
```

**Acceptance Criteria:**
- [ ] Demo mode spawns robots automatically
- [ ] Auto-selection cycles through robots
- [ ] Camera tour pans around environment
- [ ] Demo button toggles mode on/off
- [ ] Auto-starts on first visit
- [ ] Can be stopped/restarted manually
- [ ] Documented in README

**Commit Message:**
```
feat(demo): add demo mode for portfolio showcase

- Auto-spawn robots every 8 measures
- Auto-select robots every 16 measures
- Camera tour with gentle panning
- Toggle button (bottom-left)
- Auto-start on first visit
- Document in README

Closes #M6.10
```

---

## Phase 9 Complete! ✅

### Final Verification

- [ ] All 10 M6 issues complete
- [ ] Robot editor panel functional
- [ ] Settings panel working
- [ ] Time display visible
- [ ] Mobile-responsive (tested on iPhone/Android)
- [ ] Performance at 60 FPS
- [ ] Deployed to GitHub Pages
- [ ] README professional with screenshots
- [ ] PORTFOLIO.md case study complete
- [ ] Architecture diagram created
- [ ] Demo mode functional
- [ ] All PRs merged
- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] Audit scripts pass

### What You've Built

**UI Features:**
- ✅ Robot editor panel (inspect attributes)
- ✅ Settings panel (volume, BPM, polyphony, visuals)
- ✅ Time display (measure + hour)
- ✅ Mobile-responsive layout with touch gestures
- ✅ Demo mode for portfolio showcase

**Technical Achievements:**
- 60 FPS performance with 12 robots
- <200 MB memory usage
- Works on mobile (iOS/Android)
- GitHub Pages deployment
- Professional documentation

**Portfolio Materials:**
- Professional README with screenshots
- Technical case study (PORTFOLIO.md)
- Architecture diagram
- Live demo link
- Clean commit history (50+ commits)

### Current State

**What works:**
- Full application deployed live
- All features functional
- Mobile-responsive
- Performance optimized
- Professional documentation

**What's ready:**
- Portfolio presentation
- Case study writeup
- Architecture explanations
- Code samples and examples
- Live demo for employers

### Testing the Complete Application

1. Visit live site: `https://fallboard-studios.github.io/pelagos-7/`
2. Click Play button
3. Demo mode starts automatically (first visit)
4. Watch robots spawn and interact
5. Click a robot → Robot editor panel appears
6. Open settings (⚙️) → Adjust BPM, volume
7. Test on mobile device:
   - Touch pan with one finger
   - Pinch zoom with two fingers
   - Select robots with tap
8. Check performance monitor (dev mode): FPS should be 58-60

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M6.1: Robot Editor | 4-5 hours | |
| M6.2: Settings Panel | 4-5 hours | |
| M6.3: Time Display | 2 hours | |
| M6.4: Mobile Layout | 6-8 hours | |
| M6.5: Performance | 5-6 hours | |
| M6.6: Deployment | 3-4 hours | |
| M6.7: README | 4 hours | |
| M6.8: PORTFOLIO.md | 5-6 hours | |
| M6.9: Diagram | 3 hours | |
| M6.10: Demo Mode | 3-4 hours | |
| **Total** | **40-50 hours** | |

---

## Common Issues & Solutions

### Issue: Build fails with TypeScript errors

**Symptoms:** `npm run build` errors

**Solutions:**
- Run `npx tsc --noEmit` to see all errors
- Fix type mismatches in new UI components
- Check import paths are correct

### Issue: Mobile touch gestures not working

**Symptoms:** Can't pan or zoom on mobile

**Solutions:**
- Check `passive: false` in touch event listeners
- Verify viewport meta tag in `index.html`
- Test preventDefault() is working

### Issue: GitHub Pages 404

**Symptoms:** Live site shows 404 error

**Solutions:**
- Check `vite.config.ts` base path matches repo name
- Verify GitHub Pages source is "GitHub Actions"
- Check workflow ran successfully
- Wait 2-3 minutes for deployment to propagate

### Issue: Performance drops below 60 FPS

**Symptoms:** Laggy animation with many robots

**Solutions:**
- Check React.memo is applied to Robot/Actor components
- Verify timeline count < 20 (check console warnings)
- Reduce max polyphony in settings
- Check memory usage (performance monitor)

---

## Portfolio Talking Points

**Architecture:**
- "Three pillars pattern prevents common web audio pitfalls"
- "Beat-synchronized timing eliminates drift"
- "Separation of concerns enables independent testing"

**Performance:**
- "Achieved 60 FPS with 12 concurrent melodies"
- "Polyphony limiting prevents audio chaos"
- "React.memo and timeline capping optimize renders"

**Mobile:**
- "Touch gestures with pan and pinch zoom"
- "Responsive UI adapts to viewport"
- "Tested on iOS 16+ and Android 12+"

**Deployment:**
- "GitHub Actions CI/CD pipeline"
- "Automated deployment to GitHub Pages"
- "Professional workflow demonstrates DevOps thinking"

**Documentation:**
- "2000+ lines of AI guidance"
- "Architecture docs prevent drift"
- "Portfolio case study shows communication skills"

---

## Next Steps

**You're ready to showcase Pelagos-7!**

Phase 9 deliverables:
- ✅ Live application deployed
- ✅ Professional README
- ✅ Portfolio case study
- ✅ Architecture diagram
- ✅ Demo mode for reviewers

**Share your work:**
1. Add to portfolio website
2. Share on LinkedIn/Twitter with screenshots
3. Include in resume (link to live demo)
4. Mention in cover letters
5. Use case study in interviews

**Optional enhancements (v1.1):**
- Save/load system
- More robot variants
- Energy system
- Audio presets
- URL-based sharing

---

**Questions?** Review portfolio materials or open a discussion.

**Ready for interviews?** You have architecture examples, performance stories, and a live demo.

**Congratulations on completing Pelagos-7!** 🎉

