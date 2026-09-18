# Performance Profiling

How to measure Trace Atlas's main-thread performance, and the running baseline that roadmap 17.2.2–17.2.5 are verified against. Built for roadmap **17.2.1**; the harness is `scripts/perf/profile.mjs`.

## Why this exists

Audio and the UI share one main thread. Tone schedules notes only about **100 ms** ahead (its default `lookAhead`, `latencyHint: "interactive"`), so any main-thread task longer than that risks late or dropped notes — an audible pause. Every metric below is reported against that 100 ms line.

## Running the harness

Needs Node 22+ (built-in `WebSocket`) and an installed Chrome or Edge. No dependency is added.

```bash
npm run build                        # production build (uses base /trace-atlas/, see vite.config.ts)
npx vite preview --port 4173         # terminal 1 — serve it
npm run perf                         # terminal 2 — 4x CPU throttle, desktop viewport
```

Flags (`npm run perf -- --help` for the full list):

| Flag | Effect |
|---|---|
| `--throttle <n>` | CPU slowdown multiplier; `1` = none. Default `4` (Chrome DevTools' "recommended" mobile setting). |
| `--mobile` | 390×844 phone viewport instead of 1280×900. |
| `--profile` | Adds a CPU profile (top self/inclusive functions) for an idle window and for opening Fleet Params. |
| `--trace` | Adds a layout/paint trace summary for the same two windows. |
| `--url <url>` | Profile a different server (e.g. an unminified build). |
| `--chrome <path>` | Chrome/Edge executable (else `$CHROME_PATH`, else a platform default). |

**Readable function names:** `--profile` is only useful against an unminified build:

```bash
npx vite build --minify false --outDir <some-temp-dir> --emptyOutDir
npx vite preview --outDir <some-temp-dir> --port 4174
npm run perf -- --url http://localhost:4174/trace-atlas/ --profile --trace
```

The default step sequence: power on → open Fleet Params → switch to Probes → switch to Nav & Comms → back to Fleet Params. Steps are clicked by their visible header-nav labels (`TILE_*` constants at the top of the script) — a label rename in `src/data/headerNavConfig.ts` needs the same rename there. Each step reports:

- `tasks >=100ms` / `longest (ms)` / `total in >=100ms tasks (ms)` — main-thread long tasks over Tone's lookahead (the audible-pause count).
- `tasks >=50ms` — total long tasks Chrome reports (its own threshold), including the steady background churn after a switch.
- `cabinetBoxes` — `.sc-cabinet-box` elements on the page. **This includes the header's 12** (present at power-on), and the Probes count drifts upward across a run as factories build robots.

## Caveats

- **Throttling is main-thread only.** `Emulation.setCPUThrottlingRate` does not slow compositor or raster worker threads. Treat throttled numbers as a *relative* signal for main-thread work, not a phone simulator.
- **Headless Chrome's raster/compositing path differs from a phone GPU's.** Paint and compositing figures (roadmap 17.2.5) are directional until confirmed on real hardware.
- **Audio isn't measured directly.** Headless Chrome has no real audio output (`--mute-audio` is on). The 100 ms threshold is the *proxy* for an audible pause; confirm by ear on a real device.
- **Run-to-run variance is large** (e.g. Probes at 4× throttle: 2.3 s in one run, 3.9 s in another — background robot/swell activity differs per run). Run 3× and compare medians, and only trust differences bigger than that spread.
- **Trace durations overlap.** A `FunctionCall` contains its own layouts, so compare an event's total across runs, never across event names.
- **Trace `RasterTask` totals are unstable** between runs (worker-thread events); ignore them.
- **Real phone:** the harness does not attach to a phone. To measure one, use Chrome's DevTools → Remote devices over USB and read the Performance panel / Local metrics by hand; record it in the table below.

## Baseline (2026-09-18, production build, desktop 1280×900, headless Chrome)

`tasks ≥100ms / longest ms / total ms in ≥100ms tasks`, from the runs on 2026-09-18. Ranges span 2 runs (4×) and 2 runs (1×).

| Step | Cabinet boxes | 4× throttle | 1× (none) |
|---|---|---|---|
| power on | 12 | 4 / 2.4–2.9 s / 3.1–3.7 s | 1 / 378–470 ms / 378–470 ms |
| open Fleet Params | 318–321 | 4–10 / 1.4–1.7 s / 2.9–4.0 s | 2 / 192–339 ms / 362–634 ms |
| switch to Probes | 481–494 | 6–8 / 2.3–3.9 s / 5.2–7.5 s | 2 / 373–537 ms / 687–1041 ms |
| switch to Nav & Comms | 26 | 1–3 / 330–342 ms / 330–586 ms | 0 / 55–80 ms / 0 ms |
| back to Fleet Params | 318–321 | 4–7 / 1.2–1.3 s / 2.7–3.1 s | 2 / 206–255 ms / 406–456 ms |

Every switch to a 300+ box tile exceeds the 100 ms line **even unthrottled** — the source of the audible pause. (An earlier DevTools Local-metrics capture at 4× on Crawford's machine showed INP 43,184 ms; a click on a `.sc-cabinet-box__front` spent ~25.5 s in processing.)

### Trace and CPU-profile baseline (4× throttle, unminified build)

| Window | Measure | Value |
|---|---|---|
| Open Fleet Params (9 s) | Forced style+layout passes (`Document::UpdateStyleAndLayout`) | **~10,100 events, ~2.7 s** |
| Open Fleet Params (9 s) | Layout events | ~1,600 events, ~2.5 s |
| Open Fleet Params (9 s) | Top JS self time | GSAP `_getComputedProperty` ~1.4 s, `getPropertyValue` ~0.4 s |
| Idle, blank hub (6 s) | Main thread busy | ~5.0 s of 6.0 s is native `(program)` work (paint/composite), ~0.1 s idle |
| Idle, blank hub (6 s) | Paint lifecycle / `PaintArtifactCompositor::Update` | ~2.9 s / ~1.7 s across ~120 frames |
| Idle, blank hub (6 s) | Forced style+layout passes | 31 events, ~30 ms |

Two idle-profile observations recorded for 17.2.5 (not yet investigated): `tickAudioSwells` → `advanceActiveSwells` → `writeRobotValue` (`src/systems/audioSwells.ts`, scheduled on a `16n` repeat) accounted for ~0.4 s inclusive of a 6 s idle window and appears to feed React re-renders (~0.5 s of `performWorkOnRoot`); and native `createPeriodicWave` (not referenced from `src/`, so Tone-internal) showed ~0.26 s self time.

## Pre-change baseline for roadmap 17.2.2 (2026-09-18)

The reference that [docs/specs/ACCORDION_LAZY_MOUNT.md](specs/ACCORDION_LAZY_MOUNT.md)'s success criteria (§5.3) are measured against, recorded **before** the lazy-mount change lands. It supersedes the single-run table above for that purpose: 3 runs per throttle rate instead of 2, plus the robot-detail steps and the per-section first-open rows the earlier table lacks (the earlier table stays as history).

- **Code measured:** commit `33807e6` (production, minified `npm run build` + `vite preview`). Product source under `src/` is identical to `ccddf6e`; only the harness changed between them.
- **Environment:** Windows 11, headless Chrome 153.0.8010.52, desktop viewport 1280×900, `npm run perf` at `--throttle 1` and `--throttle 4`, 3 runs each, run **sequentially with nothing else running**. Cells read `median (min–max)`; a bare number means all three runs agreed.
- **Notes on the data:**
  - An earlier batch was discarded: overlapping background launches collided on the debugging port and left orphaned Chrome processes running the app, so its numbers can't be trusted. The tables below are from a clean re-run (no orphaned processes before or after). Its values match the original single-run figures (Fleet Params 262 ms, Probes list 410 ms at 1×).
  - The per-section rows (`fleet › …`, `detail › …`) measure opening that section **pre-change**: the content is already mounted, so only the height tween runs and the cost is near zero. Post-change, the same rows carry the mount cost that moved here.
  - Two visible outliers, kept in the ranges rather than dropped: one 4× "switch to Probes" run at 5,822 ms (median 2,048 ms), and one 4× `fleet › Output` run at 708 ms total (median 109 ms) — background robot/swell activity varies run to run.
  - Probes-list and robot-detail box counts drift by a few (`481–494`, `401–404`) as factories build robots over a run; the "in closed accordions" column drifts with it.

### 1× throttle — 3 runs (median (min–max))

| Step | tasks ≥100 ms | longest (ms) | total in ≥100 ms tasks (ms) | cabinet boxes | boxes in closed accordions |
|---|---|---|---|---|---|
| power on | 1 | 623 (522–687) | 623 (522–687) | 12 | 0 |
| open Fleet Params | 2 | 262 (255–329) | 523 (507–613) | 321 (318–321) | 301 (298–301) |
| fleet › Transport & Composition | 0 | 0 | 0 | 321 (318–321) | 280 (277–280) |
| fleet › EQ & Filters | 0 | 0 | 0 | 321 (318–321) | 146 |
| fleet › Time & Space | 0 | 0 | 0 | 321 (318–321) | 84 |
| fleet › Output | 0 | 0 | 0 | 321 (318–321) | 0 |
| switch to Probes | 2 | 410 (368–410) | 787 (721–789) | 487 (481–494) | 357 (357–363) |
| open first robot (detail) | 2 | 291 (274–302) | 557 (535–582) | 403 (402–408) | 358 (358–364) |
| detail › Volume | 0 | 0 | 0 | 403 (402–408) | 319 (319–325) |
| detail › Melody | 0 | 0 | 0 | 403 (402–408) | 274 (274–280) |
| detail › Envelope | 0 | 0 | 0 | 403 (402–408) | 233 (233–239) |
| detail › Source | 0 | 0 | 0 | 403 (402–408) | 0 |
| back to robot list | 2 | 397 (374–413) | 729 (696–742) | 487 (481–494) | 357 (357–363) |
| switch to Nav & Comms | 0 | 84 (82–89) | 0 | 26 | 0 |
| back to Fleet Params | 2 | 209 (155–247) | 404 (304–469) | 321 (319–321) | 301 (299–301) |

### 4× throttle — 3 runs (median (min–max))

| Step | tasks ≥100 ms | longest (ms) | total in ≥100 ms tasks (ms) | cabinet boxes | boxes in closed accordions |
|---|---|---|---|---|---|
| power on | 4 | 2214 (2169–2240) | 2934 (2815–2988) | 12 | 0 |
| open Fleet Params | 4 (3–5) | 1270 (1254–1291) | 2659 (2478–2733) | 321 | 301 |
| fleet › Transport & Composition | 0 (0–5) | 92 (85–161) | 0 (0–649) | 321 | 280 |
| fleet › EQ & Filters | 2 (0–4) | 120 (98–141) | 236 (0–496) | 321 | 146 |
| fleet › Time & Space | 0 (0–1) | 82 (77–118) | 0 (0–118) | 321 | 84 |
| fleet › Output | 1 (0–6) | 109 (87–143) | 109 (0–708) | 321 | 0 |
| switch to Probes | 4 (4–10) | 2048 (1837–5822) | 4286 (3959–11557) | 481 (480–495) | 357 (356–358) |
| open first robot (detail) | 4 | 1354 (1287–1808) | 2854 (2756–3506) | 402 (401–404) | 358 (357–359) |
| detail › Volume | 0 (0–2) | 90 (83–176) | 0 (0–300) | 402 (401–404) | 319 (318–320) |
| detail › Melody | 0 (0–2) | 94 (87–210) | 0 (0–380) | 402 (401–404) | 274 (273–275) |
| detail › Envelope | 0 (0–1) | 77 (75–133) | 0 (0–133) | 402 (401–404) | 233 (232–234) |
| detail › Source | 1 (0–1) | 100 (91–109) | 100 (0–109) | 402 (401–404) | 0 |
| back to robot list | 5 (5–7) | 2026 (1938–2089) | 4185 (3959–4506) | 481 (480–495) | 357 (356–358) |
| switch to Nav & Comms | 1 | 379 (369–381) | 379 (369–381) | 26 | 0 |
| back to Fleet Params | 4 (4–7) | 1074 (1043–1672) | 2266 (2256–3871) | 321 | 301 |

### Section sizes (cabinet boxes per accordion, from the "in closed accordions" deltas above)

| Fleet Params | Boxes | Robot detail | Boxes |
|---|---|---|---|
| Transport & Composition | 21 | Volume | 39 |
| EQ & Filters | 134 | Melody | 45 |
| Time & Space | 62 | Envelope | 41 |
| Output | 84 | Source | 233 |

The largest single section is **Source** on the robot detail page (233 boxes), then EQ & Filters (134). Post-change, these are the first-open costs to watch.

### Gate numbers for 17.2.2 (spec §5.3), derived from this baseline

| Gate | Measured against | Threshold |
|---|---|---|
| 1 — deterministic | Total `.sc-cabinet-box` right after a tile opens | Fleet Params ≤ 25 (now 321), Probes list ≤ 150 (now ~481–494), robot detail ≤ 55 (now ~402–403), Nav & Comms unchanged at 26; `boxes in closed accordions` = 0 for every never-opened section |
| 2 — 1×, medians of 3 | Longest task: open Fleet Params (262 ms), open robot detail (291 ms), switch to Probes (410 ms) | Fleet Params and robot detail: **no task ≥ 100 ms**. Probes list: **≤ 205 ms** (≤ 50% of 410) |
| 3 — 4×, medians of 3 | Total time in ≥ 100 ms tasks: open Fleet Params (2,659 ms), open robot detail (2,854 ms) | Down **≥ 60%**: Fleet Params **≤ 1,064 ms**, robot detail **≤ 1,142 ms** |
| 4 — recorded, not gated | First-open cost per section (rows above), 1× and 4× | Target < 100 ms at 1×; a miss is documented, not blocking (spec §7 Q5) |

## Recording a new baseline

After a fix from 17.2.2–17.2.5, re-run `npm run perf` 3× at the same settings, compare medians against the table above, and add a dated row/section here rather than overwriting it, so the history of what each fix bought stays visible.
