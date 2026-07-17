# Power Cycling & Animations

This note documents the current ownership and wiring for power-related UI animations and timelines.

Overview
- Timeline storage: `src/animation/timelineMap.ts` — use `setTimeline(id, tl)` and `killTimeline(id)` to manage timelines. Timelines are not stored in React state.
- Animations helpers: `src/systems/powerAnimations.ts` exports reusable animation helpers such as `playTabletPowerOn()` and `playTabletPowerOff()`.
- Controller orchestration: `src/systems/powerController.ts` provides `start()`, `shutdown()`, `shutdownWithAnimation()`, and `powerOnSequence()`. `shutdownWithAnimation()` calls `playTabletPowerOff()` to dim the UI after stopping systems.
- Component-level feedback: `src/components/sleeve/PowerRockerSwitch.tsx` owns the physical rocker animations (timeline ids below) and immediate tactile feedback. It currently calls `powerController.start()` for audio startup and runs a local `tablet-power-on` timeline for UI brightness.

Timeline IDs and owners (current)
- `power-rocker` — rocker press thunk (owner: `PowerRockerSwitch`).
- `power-rocker-return` — rocker return animation (owner: `PowerRockerSwitch`).
- `power-rocker-sequence` / `power-rocker-confirm-delay` — internal sequencing in `PowerRockerSwitch` (owner: component).
- `tablet-power-on` — transport/controls brighten sequence (owner: `PowerRockerSwitch` currently; helper available in `powerAnimations.playTabletPowerOn`).
- `tablet-power-off` — transport/controls dim sequence (owner: `powerAnimations.playTabletPowerOff`, invoked from `powerController.shutdownWithAnimation`).

Notes & Recommendations
- Prefer controller-owned UI animations for sequences that must happen as part of a power lifecycle (use `powerController.powerOnSequence()` / `shutdownWithAnimation()`) so the orchestration is centralized. Component-owned timelines are fine for purely local feedback (the rocker press/release animations).
- The expressive "sleeve drain" animation targeted `.sleeve-shape` in older code. That DOM node is not guaranteed to exist; if you want to enable sleeve drain:
  - Add an element with class `sleeve-shape` inside `src/components/layout/SleeveContainer.tsx` (e.g., an absolutely positioned SVG rect behind the jut panel).
  - Move the timeline into `powerAnimations` as `playSleeveDrain()` and call it from `powerController.shutdownWithAnimation()` before stopping systems.
- Always gate diagnostic logs with `DEV_TUNING` and use the shared `swallow(err, ctx?)` helper in `catch` blocks for consistent dev-time reporting.

Developer checklist when editing power animations
- [ ] Decide whether animation is component-owned (local feedback) or controller-owned (lifecycle).
- [ ] Add/kill timelines via `setTimeline()` / `killTimeline()` with a descriptive id.
- [ ] Do not store GSAP timelines in React state or in Zustand stores.
- [ ] If a selector targets a DOM node (e.g. `.sleeve-shape`), ensure that node exists and is present when the timeline runs.

Examples
- Use `playTabletPowerOn()` from `powerAnimations` in `powerController.powerOnSequence()` if you want controller-driven UI animation.
- Keep the low-latency rocker press animation inside `PowerRockerSwitch` to ensure immediate tactile feedback while async startup runs.
