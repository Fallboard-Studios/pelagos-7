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

## Recording a new baseline

After a fix from 17.2.2–17.2.5, re-run `npm run perf` 3× at the same settings, compare medians against the table above, and add a dated row/section here rather than overwriting it, so the history of what each fix bought stays visible.
