# Component Table

Converted from `component-map.csv`. Names normalized to Title Case; table includes only CSV fields. Add Notes as needed.

| Name | Component | Store | Parent | Displays In | Shows When | Notes |
|---|---|---|---|---|---|---|
| Transport | Panel | uiStore | Root | Root | Power On | |
| Play/Pause | Toggle | audioStore | Transport | Transport | Power On | |
| Stop | Button | audioStore | Transport | Transport | Power On | |
| Mute | Toggle | audioStore | Transport | Transport | Power On | |
| Volume | Slider | audioStore | Transport | Transport | Power On | |
| Measure | Display | audioStore | Transport | Transport | Power On | |
| Time Of Day | Display | oceanStore | Transport | Transport | Power On | |
| World View | Panel | uiStore | Root | Root | Power On | Displays the ocean scene; no interactive UI controls |
| Console | Panel | uiStore | Root | Root | Power On | |
| Console Navigation | Navigation | uiStore | Console | Console | Power On | |
| Session Settings | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | |
| New World | Button With Confirmation | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Save World To Local Storage | Button With Confirmation | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Load World From Local Storage | Button With Confirmation | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Export World To Text | Button | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Import World From Text | Button With Confirmation | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Select World Preset | Dropdown | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Load World Preset | Button With Confirmation | sessionStore | Session Settings | Console | Parent Nav Item Selected | |
| Composition | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | |
| Chords | Chords | audioStore | Composition | Console | Parent Nav Item Selected | |
| Chord Item | List Item | audioStore | Chords | Console | Parent Nav Item Selected | Repeats per chord in the sequence |
| Notes | Button | audioStore | Chord Item | Chord Item | Parent Nav Item Selected | |
| Delete Chord | Button With Confirmation | audioStore | Chord Item | Chord Item | Parent Nav Item Selected | |
| Add Chord Here | Button With Confirmation | audioStore | Chord Item | Chord Item | Parent Nav Item Selected | |
| Robot Options | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | |
| Min/Max Robots | Range Input | robotStore | Robot Options | Console | Parent Nav Item Selected | |
| Auto Spawn Robots | Toggle | robotStore | Robot Options | Console | Parent Nav Item Selected | |
| Spawn Frequency | Slider | robotStore | Robot Options | Console | Parent Nav Item Selected | |
| New Robot | Button | robotStore | Robot Options | Console | Parent Nav Item Selected | Opens Robot Editor with a newly spawned robot |
| Robot Editor | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | Shows most recently created robot by default |
| Robot Editor Navigation | Subnavigation Panel | uiStore | Robot Editor | Robot Editor Console | Parent Nav Item Selected | |
| Robot Editor Console | Panel | uiStore | Robot Editor | Console | Parent Nav Item Selected | |
| Robot Meta | Subnavigation Item | uiStore | Robot Editor | Robot Editor Navigation | Parent Nav Item Selected | |
| Name | Textbox | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Age | Display | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Persist | Toggle | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Preset Selection | Dropdown | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Load Robot Preset | Button | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Copy Robot | Dropdown | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Link To Robot | Dropdown | robotStore | Robot Meta | Robot Editor Console | Parent Nav Item Selected | |
| Robot Audio | Subnavigation Item | uiStore | Robot Editor | Robot Editor Navigation | Parent Nav Item Selected | |
| Solo, Mute, Highlight | Radio | robotStore | Robot Audio | Robot Editor Console | Parent Nav Item Selected | |
| Rhythmic Density | Slider | robotStore | Robot Audio | Robot Editor Console | Parent Nav Item Selected | |
| Note Variance | Slider | robotStore | Robot Audio | Robot Editor Console | Parent Nav Item Selected | |
| Octave Range | Range Input | robotStore | Robot Audio | Robot Editor Console | Parent Nav Item Selected | |
| New Melody | Button With Confirmation | robotStore | Robot Audio | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillators | Subnavigation Item | uiStore | Robot Editor | Robot Editor Navigation | Parent Nav Item Selected | |
| Robot Oscillator Type | Dropdown | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillator Detune | Dual Speed Stepper | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillator Gain | Dual Speed Stepper | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillator Phase | Slider | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillator Pulsewidth | Dual Speed Stepper | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Robot Oscillator ADSR Canvas | ADSR Envelope Canvas | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Select Robot Oscillator Preset | Dropdown | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Load Robot Oscillator Preset | Button With Confirmation | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Delete This Oscillator | Button With Confirmation | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| New Oscillator | Button | robotStore | Robot Oscillators | Robot Editor Console | Parent Nav Item Selected | |
| Audio Rig | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | |
| Audio Rig Navigation | Subnavigation Panel | uiStore | Audio Rig | Audio Rig Console | Parent Nav Item Selected | |
| Audio Rig Console | Panel | uiStore | Audio Rig | Console | Parent Nav Item Selected | |
| Audio Meta | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| BPM | Dual Speed Stepper | audioStore | Audio Meta | Audio Rig Console | Parent Nav Item Selected | |
| Volume Indicator | Volume Display | audioStore | Audio Meta | Audio Rig Console | Parent Nav Item Selected | |
| Audio Reverb | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| Reverb Room Size | Slider | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Reverb Wet/Dry Mix | Slider | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Reverb Pre-Delay | Slider | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Reverb Damping | Slider | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Reverb Width | Slider | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Reverb Bypass | Toggle | audioStore | Audio Reverb | Audio Rig Console | Parent Nav Item Selected | |
| Audio Compression | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| Compression Threshold | Slider | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Compression Ratio | Slider | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Compression Attack | Slider | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Compression Release | Slider | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Compression Knee | Slider | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Compression Bypass | Toggle | audioStore | Audio Compression | Audio Rig Console | Parent Nav Item Selected | |
| Audio Delay | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| Delay Time | Slider | audioStore | Audio Delay | Audio Rig Console | Parent Nav Item Selected | |
| Delay Feedback | Slider | audioStore | Audio Delay | Audio Rig Console | Parent Nav Item Selected | |
| Delay Wet/Dry | Slider | audioStore | Audio Delay | Audio Rig Console | Parent Nav Item Selected | |
| Delay Bypass | Toggle | audioStore | Audio Delay | Audio Rig Console | Parent Nav Item Selected | |
| Audio Filters | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| High Pass Cutoff Frequency | Slider | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| High Pass Resonance | Slider | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| High Pass Bypass | Toggle | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| Low Pass Cutoff Frequency | Slider | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| Low Pass Resonance | Slider | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| Low Pass Bypass | Toggle | audioStore | Audio Filters | Audio Rig Console | Parent Nav Item Selected | |
| Audio Chorus | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| Chorus Rate | Slider | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Chorus Depth | Slider | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Chorus Delay Time | Slider | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Chorus Feedback | Slider | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Chorus Wet/Dry | Slider | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Chorus Bypass | Toggle | audioStore | Audio Chorus | Audio Rig Console | Parent Nav Item Selected | |
| Audio EQ | Subnavigation Item | uiStore | Audio Rig | Audio Rig Navigation | Parent Nav Item Selected | |
| EQ Low | Slider | audioStore | Audio EQ | Audio Rig Console | Parent Nav Item Selected | |
| EQ Mid | Slider | audioStore | Audio EQ | Audio Rig Console | Parent Nav Item Selected | |
| EQ High | Slider | audioStore | Audio EQ | Audio Rig Console | Parent Nav Item Selected | |
| EQ Bypass | Toggle | audioStore | Audio EQ | Audio Rig Console | Parent Nav Item Selected | |
| Settings | Navigation Item | uiStore | Console Navigation | Console Navigation | Power On | |
| Length Of Day | Dual Speed Stepper | oceanStore | Settings | Console | Parent Nav Item Selected | |
| Theme Selector | Dropdown | settingsStore | Settings | Console | Parent Nav Item Selected | |
| Fullscreen | Toggle | settingsStore | Settings | Console | Parent Nav Item Selected | |
| Contact/Credits | Display | settingsStore | Settings | Console | Parent Nav Item Selected | |
| Keyboard Shortcuts? | Display | settingsStore | Settings | Console | Parent Nav Item Selected | |
| Help? | Button | settingsStore | Settings | Console | Parent Nav Item Selected | |
| Graphic Settings? | Dropdown | settingsStore | Settings | Console | Parent Nav Item Selected | |

---

