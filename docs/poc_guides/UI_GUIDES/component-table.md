# Component Map

Converted from `component-map.csv`.

**Complexity:** **Low** = standard primitive UI; **Medium** = requires state wiring, conditional render, or AudioEngine integration; **High** = complex interaction, audio/transport sync, relational state, or procedural visual.

**Milestone:** M0–M6 correspond to milestones in UI_ISSUE_OVERVIEW.md. **⚠️ Needs Milestone** = no existing milestone covers this feature — new milestone(s) required.

| Group | Label | Component | Store | Parent | Milestone | Complexity |
|-------|-------|-----------|-------|--------|-----------|------------|
| **Transport** | | | | Root | | |
| | Play/Pause | Toggle | Audio Control | | M1 (Issue 2) | Low |
| | Stop | Button | Audio Control | | M1 (Issue 2) | Low |
| | Mute | Toggle | Audio Control | | M1 (Issue 2) | Low |
| | Volume | Slider | Audio Control | | M1 (Issue 2) | Low |
| | Measure | Display | Audio Control | | M1 (Issue 2) | Low |
| | Timeline Scrubber | Dual Speed Stepper | | | ⚠️ Needs Milestone | High |
| | Time of Day | Display | Ocean Management | | M2 (Issue 8) | Low |
| **Instance Settings** | | | | File | | |
| | New/Reset | Button with confirmation | Session | | M2 (Issue 7) | Medium |
| | Save to local storage | Button with confirmation | Session | | M2 (Issue 7) | Medium |
| | Load from local storage | Button with confirmation | Session | | M2 (Issue 7) | Medium |
| | Export to text | Button | Session | | M2 (Issue 7) | Medium |
| | Import from text | Button with confirmation | Session | | M2 (Issue 7) | High |
| **Presets** | | | | File | | |
| | Select Preset | Dropdown | Session | | ⚠️ Needs Milestone | Medium |
| | Load Preset | Button with confirmation | Session | | ⚠️ Needs Milestone | Medium |
| **World Options** | | | | Root | | |
| | BPM | Dual Speed Stepper | Audio Control | | M2 (Issue 8) | Medium |
| | Length of Day | Dual Speed Stepper | Ocean Management | | M2 (Issue 8) | Medium |
| | Volume Indicator | Volume Display | Audio Control | | M2 (Issue 9) | Medium |
| **Robot Options** | | | | Robots | | |
| | Max Robots | Dual Speed Stepper | Robot Management | | M6 (Issue 22) | Low |
| | Auto Spawn Robots | Toggle | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Conditional Spawn Rate | Dual Speed Stepper | Robot Management | | ⚠️ Needs Milestone | Medium |
| | New Robot | Button | Robot Management | | ⚠️ Needs Milestone | Low |
| **Robots** | | | | Root | | |
| | Preset Selection | Dropdown | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Load Preset | Button | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Copy Robot | Dropdown | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Link to Robot | Dropdown | Robot Management | | ⚠️ Needs Milestone | High |
| | Name | Textbox | Robot Management | | M3 (Issue 11) | Low |
| | New Oscillator | Button | Robot Management | | M3 (Issue 12) | Medium |
| | Solo / Mute / Highlight | Radio | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Rhythmic Density | Slider | Robot Management | | M3 (Issue 11) | Medium |
| | Note Variance | Slider | Robot Management | | M3 (Issue 11) | Medium |
| | Octave Range | Range Input | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Age | Display | Robot Management | | ⚠️ Needs Milestone | Low |
| | Persist | Toggle | Robot Management | | ⚠️ Needs Milestone | Medium |
| **Oscillators** | | | | Robots | | |
| | Type | Dropdown | Robot Management | | M3 (Issue 12) | Low |
| | Detune | Dual Speed Stepper | Robot Management | | M3 (Issue 12) | Low |
| | Gain | Dual Speed Stepper | Robot Management | | M3 (Issue 12) | Low |
| | Phase | Knob | Robot Management | | M3 (Issue 12) | Low |
| | Pulsewidth | Dual Speed Stepper | Robot Management | | M3 (Issue 12) | Medium |
| | ADSR Envelope (×4) | Dual Speed Stepper | Robot Management | | M3 (Issue 13) | Medium |
| | Select Preset | Dropdown | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Load Preset | Button with confirmation | Robot Management | | ⚠️ Needs Milestone | Medium |
| | Robot Visual | Robot Visual | Robot Management | | M3 (Issue 10) | High |
| **Note Matrix** | | | | Root | | |
| | Note Arrays | Display | Audio Control | | M4 (Issue 14) | Medium |
| | Edit Notes | Button | Audio Control | | M4 (Issue 14) | Low |
| | Note Editor | Keyboard Popover | Audio Control | | M4 (Issue 15) | High |
| | Delete Measure | Button with confirmation | Audio Control | | M4 (Issue 16) | Medium |
| | New Measure | Button | Audio Control | | M4 (Issue 16) | Low |
| **Reverb** | | | | Global Audio Effects | | |
| | Room Size | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Wet/Dry Mix | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Pre-Delay | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Damping | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Width | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **Compression** | | | | Global Audio Effects | | |
| | Threshold | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Ratio | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Attack | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Release | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Knee | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **Delay** | | | | Global Audio Effects | | |
| | Delay Time | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Feedback | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Wet/Dry | Knob | Audio Control | | M5 (Issue 18) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **High/Low Pass Filters** | | | | Global Audio Effects | | |
| | Cutoff Frequency | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Resonance | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **Chorus** | | | | Global Audio Effects | | |
| | Rate | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Depth | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Delay Time | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Feedback | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Wet/Dry | Knob | Audio Control | | M5 (Issue 20) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **EQ** | | | | Global Audio Effects | | |
| | Low | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Mid | Knob | Audio Control | | M5 (Issue 19) | Low |
| | High | Knob | Audio Control | | M5 (Issue 19) | Low |
| | Bypass | Toggle | Audio Control | | M5 (Issue 17) | Low |
| **Data Vis** | | | | Root | | |
| | TBD | — | Audio Control | | M6 (Issue 21) | Unknown |
| **Settings Panel** | | | | | | |
| | Theme Selector | Dropdown | Settings | Settings Panel | M6 (Issue 22) | Low |
| | Fullscreen | Toggle | Settings | | M6 (Issue 22) | Low |
| | Contact / Credits | Display | Settings | | ⚠️ Needs Milestone | Low |
| | Keyboard Shortcuts | Display | Settings | | ⚠️ Needs Milestone | Medium |
| | Help | Button | Settings | | ⚠️ Needs Milestone | Medium |
| | Graphic Settings | Dropdown | Settings | | M6 (Issue 22) | Medium |

---

## ⚠️ Features Needing New Milestones

The following features have no existing milestone. Consider grouping them into one or more new milestones:

### Suggested: Milestone 7 — Robot Management & Spawning Controls
- Robot Options: Max Robots, Auto Spawn Robots, Conditional Spawn Rate, New Robot
- Robots: Solo / Mute / Highlight, Octave Range, Age, Persist

### Suggested: Milestone 8 — Presets & Session Templates
- Instance Presets: Select Preset, Load Preset (global/session)
- Robot Presets: Preset Selection, Load Preset, Copy Robot, Link to Robot
- Oscillator Presets: Select Preset, Load Preset

### Suggested: Milestone 9 — Transport Enhancements
- Transport: Timeline Scrubber

### Suggested: Milestone 6 addition or Milestone 10 — Settings & Help
- Settings: Contact / Credits, Keyboard Shortcuts, Help
