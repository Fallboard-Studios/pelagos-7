# Robot Audio Mode — Spec

Purpose
 - Define runtime semantics for `robot.audioMode` and provide exact UI labels for consistency between the editor and `AudioEngine` enforcement.

Modes
 - `none` (label: "Off")
   - Default. No special routing or attenuation is applied by the engine.

 - `mute` (label: "Mute")
   - Silence this robot: scheduled notes for this robot are suppressed by the `AudioEngine`.
   - Use case: temporarily silence a robot without changing its melody or stored parameters.

 - `solo` (label: "Solo (isolate)")
   - Isolate this robot: the `AudioEngine` mutes all other robots in the same locale for scheduling purposes.
   - If multiple robots are set to `solo`, the engine will allow only the soloed robots (logical OR).

 - `highlight` (label: "Highlight (attenuate others)")
   - Make this robot prominent: the `AudioEngine` attenuates other robots' volume by approximately 50% (multiplicative factor 0.5) when at least one robot is in `highlight` mode.
   - This is enforced at note scheduling/mix time so the highlighted robot remains perceptually louder.

Engine contract
 - Enforcement point: `AudioEngine.scheduleNote()` (and a safety check in `triggerWithCap`) apply the above semantics at scheduling/trigger time.
 - `AudioEngine.refreshAudioModeIndex(localeId?)` is available to rebuild caches after store changes.
 - Highlight attenuation is multiplicative and applied on top of each robot's `masterVolume` and per-note velocity calculations.

UI guidance
 - Use the exact labels above in the editor and tooltips so users see consistent behavior.
 - Provide a short tooltip for each mode explaining what it does (one sentence).

Developer notes
 - When storing or serializing robots, `audioMode` remains a simple string union: `none | solo | mute | highlight`.
 - Tests should exercise schedule-time enforcement and the attenuation factor for `highlight`.
