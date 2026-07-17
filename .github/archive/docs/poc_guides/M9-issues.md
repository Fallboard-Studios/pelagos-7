# M9: Polish & Launch Issues

**Milestone:** M9 - Polish & Launch  
**Timeline:** Week 9  
**Goal:** Production build deployed to GitHub Pages, debug scaffolding removed, portfolio-ready presentation

---

## M9.1: Remove Debug Overlays and Logging

**Title:** [M9.1] Strip debug overlays and verbose console logging from production builds

**Labels:** refactor, system: ui, size: S

### Feature Description
Several development aids are currently rendered unconditionally or guarded only by `DEV_TUNING` (which maps to `import.meta.env.DEV`). Before launch, confirm every debug surface is properly gated or removed entirely so production users see a clean experience.

### Implementation Details

**Components to remove / gate:**
- `<AudioStatus />` in `App.tsx` — currently rendered unconditionally; remove from JSX (the component itself can stay for dev use)
- `<InteractionStatus />` in `OceanScene.tsx` — same treatment
- Both components should only mount when `DEV_TUNING === true`; wrap at the call site:
  ```tsx
  {DEV_TUNING && <AudioStatus />}
  {DEV_TUNING && <InteractionStatus />}
  ```

**Console logging audit:**
- Search for all `console.log` calls outside a `DEV_TUNING` guard and either delete them or wrap them
- `console.warn` and `console.error` for genuine runtime faults (e.g. `AudioEngine` failures) are acceptable in production — leave those
- Patterns to find: `console.log('[AudioEngine]`, `console.log('[BeatClock]`, `console.log('[Dev]`

**`window` debug globals in `App.tsx`:**
- The `useEffect` that exposes `spawnRobot`, `removeRobot`, `oceanStore` on `window` is already inside a `DEV_TUNING` guard — confirm this is correct and leave it

**Verify `DEV_TUNING` constant:**
- `DEV_TUNING = import.meta.env.DEV` already evaluates to `false` in production builds via Vite's static replacement; confirm by running `npm run build` and grepping the output bundle for any surviving log strings

### Acceptance Criteria
- [ ] `<AudioStatus>` and `<InteractionStatus>` are gated behind `DEV_TUNING`
- [ ] No unguarded `console.log` calls in production bundle (verify with `grep` on dist/)
- [ ] `npm run build` completes without TypeScript errors
- [ ] Running `npm run preview` shows a clean UI with no debug panels

### Reference
- `src/App.tsx` — `<AudioStatus>`, window globals
- `src/components/OceanScene.tsx` — `<InteractionStatus>`
- `src/constants/index.ts` — `DEV_TUNING`

---

## M9.2: GitHub Pages Deployment Setup

**Title:** [M9.2] Configure Vite for GitHub Pages and add CI/CD deploy workflow

**Labels:** devops, size: S

### Feature Description
The project has no deployment configuration. This ticket adds the Vite `base` path required for GitHub Pages sub-path hosting and a GitHub Actions workflow that builds and deploys on every push to `main`.

### Implementation Details

**`vite.config.ts` — add `base`:**
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/pelagos-7/',  // matches the GitHub repo name
});
```

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

      - id: deployment
        uses: actions/deploy-pages@v4
```

**Repository settings (manual step — document in PR):**
- GitHub → Settings → Pages → Source: GitHub Actions

**Verify the deployment:**
- After merge, confirm the live URL loads correctly
- Check that all assets (JS, CSS, SVG) resolve under the `/pelagos-7/` prefix
- Confirm audio starts on first user gesture (browser autoplay policy)

### Acceptance Criteria
- [ ] `vite.config.ts` has `base: '/pelagos-7/'`
- [ ] `.github/workflows/deploy.yml` created and syntactically valid
- [ ] Push to `main` triggers workflow and deploys successfully
- [ ] Live URL loads the app without 404 on assets
- [ ] Audio initialises correctly on the deployed build
- [ ] `npm run build` and `npm run preview` pass locally before pushing

### Reference
- `vite.config.ts` — add `base`
- Vite Static Deploy docs: https://vite.dev/guide/static-deploy#github-pages

---

## M9.3: Performance Audit and Tuning

**Title:** [M9.3] Profile and tune animation, audio, and state update performance

**Labels:** performance, size: M

### Feature Description
With MAX_ROBOTS active robots, multiple GSAP timelines, an 8th-note audio tick, and SVG re-renders all running simultaneously, it is worth profiling under real load before launch. This ticket defines what to measure, where the likely bottlenecks are, and what tuning to apply.

### Implementation Details

**What to measure:**
- Frame rate (Chrome DevTools → Performance tab) with 12 robots in `moving` state simultaneously
- GSAP ticker callback duration (add a `DEV_TUNING` timer inside the tick)
- React re-render frequency — use React DevTools Profiler to confirm only the moved robot re-renders per swim update (not all siblings)
- Tone.js `AudioWorklet` latency and missed beats under load

**Known risk areas and mitigations:**

| Risk | Mitigation |
|---|---|
| All robots re-rendering when any store slice changes | Confirm selectors are granular — each `<Robot>` should select only `robots.find(r => r.id === id)`, not the whole array |
| GSAP `onUpdate` firing store writes on every frame | Wake particle positions must NOT write to the store; `onUpdate` is animation-only |
| SVG repaint thrash from many simultaneous tweens | Group all robot `<g>` elements under a single `<g>` with `will-change: transform` on the SVG |
| Polyphony spike when many robots play simultaneously | Confirm `MAX_POLYPHONY` cap in `AudioEngine` is enforced; log drops in `DEV_TUNING` mode |

**Profiling targets (minimum acceptable):**
- 60 FPS sustained with 12 robots moving
- No audio glitches (Transport stays on beat) after 5 minutes continuous play
- No memory growth over 5 minutes (heap stable in DevTools Memory tab)

**If frame rate drops below 50 FPS:**
- Reduce `MAX_WAKE_PARTICLES`
- Increase swim tween duration (robots move slower = fewer tween updates/s)
- Check whether `useMemo` in `OceanScene.tsx` is still effective

### Acceptance Criteria
- [ ] Performance profile captured and results noted in PR description
- [ ] 60 FPS sustained with 12 active robots (Chrome, no throttling)
- [ ] No memory growth over 5 minutes continuous play
- [ ] No unguarded `onUpdate` callbacks writing to Zustand
- [ ] Any fixes applied and regression-tested

### Reference
- `src/components/OceanScene.tsx` — `useMemo` for factory lists
- `src/components/robot/Robot.tsx` — per-robot selector granularity
- `src/engine/AudioEngine.ts` — `MAX_POLYPHONY` enforcement
- `src/animation/swimAnimation.ts` — GSAP tween `onUpdate` usage

---

## M9.4: Visual Polish Pass

**Title:** [M9.4] Consistent visual theme across HUD, panels, and ocean scene

**Labels:** design, system: ui, size: M

### Feature Description
After all features are implemented across M5–M8, do a single-pass visual polish to ensure the HUD panels, overlays, and ocean scene feel like one coherent product. Focus on spacing consistency, typography, and dark-theme fidelity rather than new features.

### Implementation Details

**Checklist areas:**

**Color tokens:**
- All HUD panels should source colors from `src/constants/colorTheme.json` via CSS custom properties — no hardcoded hex values in `HUD.css`, `MenuPanel.css`, or `FAQOverlay.css`
- Confirm `--hud-bg`, `--hud-border`, `--hud-text`, `--hud-accent` are defined and used consistently

**Typography:**
- Pick one monospace or industrial-feel font for all HUD text (the ocean aesthetic suits something like `JetBrains Mono` or `IBM Plex Mono`)
- Load via Google Fonts (single `@import` in `index.css`) — confirm it doesn't block render
- Font size scale: `12px` (labels) / `14px` (body) / `18px` (headings)

**Spacing:**
- Consistent `8px` grid — all padding, margin, gap values should be multiples of 8
- Panel internal padding: `16px`
- Control row gap: `8px`

**Component states:**
- All interactive controls (buttons, sliders) must have `:hover`, `:focus-visible`, and `:disabled` styles
- Focus ring should use `outline: 2px solid var(--hud-accent)` (not the browser default blue)

**Narrow viewport fallback (≥ 768px):**
- The HUD should remain usable at tablet width; no need for full mobile support
- Menu panel becomes a bottom sheet (slides up instead of in from right) at `< 900px` width

### Acceptance Criteria
- [ ] No hardcoded hex colors in HUD CSS files
- [ ] Font loaded and applied across all HUD text
- [ ] All spacing follows the 8px grid
- [ ] `:hover`, `:focus-visible`, `:disabled` states on all interactive elements
- [ ] Layout intact at 768px viewport width (Chrome DevTools device toolbar)
- [ ] `npm run lint` passes (no new lint errors introduced by CSS or TS changes)

### Reference
- `src/constants/colorTheme.json` — color token source
- `src/App.css`, `src/index.css` — global styles
- All files under `src/components/hud/`

---

## M9.5: README and Portfolio Write-Up

**Title:** [M9.5] Rewrite README with live demo, architecture overview, and portfolio context

**Labels:** documentation, size: S

### Feature Description
The current README is a placeholder. Before launch it should serve two audiences: a portfolio visitor clicking the GitHub link, and a developer wanting to run the project locally. Replace the existing content entirely.

### Implementation Details

**README sections:**

1. **Header** — Project name, one-sentence description, live demo badge/link, license badge
2. **What it does** — 2–3 sentences: generative music, autonomous robots, beat-synchronised visuals. No jargon.
3. **Screenshot / GIF** — A short screen-capture GIF (or static screenshot) of the running app. Add to `assets/` and embed with `![Demo](assets/demo.gif)`.
4. **Tech stack** — Bullet list: React + TypeScript, Tone.js, GSAP, Zustand, Vite
5. **Architecture highlights** — 3–4 bullets covering the interesting engineering decisions:
   - Single global `AudioEngine` + synth pool (no per-robot Tone.js instances)
   - All animation via GSAP timelines stored in a `timelineMap` (never in React state)
   - Beat-clock scheduling via `Tone.Transport` — no `setTimeout` or `requestAnimationFrame`
   - Audio-to-visual mapping: synth type → shape, ADSR → color, pitch → scale
6. **Local development** — `npm install` / `npm run dev` / `npm test`
7. **Project status** — "v1.0 — complete" with milestone summary table

**Do not include:**
- Long implementation details (those live in `docs/`)
- Instructions for contributing (this is a portfolio project, not OSS)
- Placeholder `[ ]` checkboxes

### Acceptance Criteria
- [ ] Live demo URL present and working in the header
- [ ] Screenshot or GIF embedded and renders in GitHub
- [ ] All placeholder text from the old README removed
- [ ] Tech stack and architecture highlights sections present
- [ ] Local dev instructions accurate (`npm install` + `npm run dev` works from a clean clone)
- [ ] README renders correctly in GitHub Markdown preview (no broken image links)

### Reference
- `README.md` — file to replace
- `docs/ARCHITECTURE.md` — source for architecture highlight bullets
