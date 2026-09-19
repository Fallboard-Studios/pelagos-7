# Scratchy / Cutting-Out Audio on Phones — Investigation State

Opened 2026-09-18 on branch `bugs/scratchy-audio-phones` (cut from `main` after PR #484 merged roadmap 17.2.1/17.2.2). **Nothing is changed or committed for this issue yet** — this file is the handoff. Related: [17.2.4](roadmap.md#1724-performance-audio-scheduling-headroom-tone-lookahead) (Tone `lookAhead`), [17.2.5](roadmap.md#1725-performance-idle-paint--composite-cost), [PERFORMANCE.md](../PERFORMANCE.md).

## The report

Crawford, on a **Pixel 8, incognito Chrome**, after 17.2.2 went live (`main`): visual loading is much better, but **audio is very scratchy and often cuts out completely for 10–20 seconds**. Not yet known: whether it happens at idle or while interacting, and whether the visuals keep animating during a dropout.

## What was measured (desktop, headless Chrome 153, production build)

- **The audio render thread is steady at ~25–30% of one core** just to play, with no interaction. Chrome's own DevTools data agrees: render capacity mean **0.28**, max 0.50; callback interval **10.000 ms**, std-dev 0.06 ms; callback buffer 480 frames (10 ms @ 48 kHz). Held for 60 s at 1× and at 6× main-thread throttle (which doesn't touch the audio thread). p99 render time ~1.4 ms vs a 2.67 ms budget per 128-frame quantum; ~0 quanta over budget.
- **No audio errors or exceptions** in 60 s at either throttle. The only console output is benign `[IdleSystem] Robot … not found or not Idle/Active (state: idle, docking: docked)` warnings (~10 per run).
- **The graph is large: ~1,400 nodes at startup, ~1,000 processed per render quantum** (about 411 `Gain`, 12 oscillator, 10 biquad, a `Convolver`, a `DynamicsCompressor`, plus ~260 always-running `ConstantSource`s). ~1–2 µs per node per quantum.
- **Where the nodes come from** (creation-stack attribution on an unminified build): almost all from `spawnRobot` → `spawnInitialRoster` — every one of the 12 robots gets a full `Tone.Synth` (`OmniOscillator` + `AmplitudeEnvelope` + `Volume`), several `Tone.Filter`s, and per-layer gains at spawn, even though only 2–4 start active (`INITIAL_ACTIVE_ROBOTS_MIN/MAX`, `src/constants/index.ts`). The `ConstantSource`s are Tone `Signal`/`Param` internals (oscillator frequency/detune, filter params, envelopes): they start at construction and never stop, so they render every quantum forever. Global FX (`EQ3`/`MultibandSplit`, etc.) and a few LFOs (~10–14) are a small share.
- **The reverb is not the driver.** Ablation (a scratch build with no reverb): only 2–7 percentage points. Decay is seeded 0.5–4 s (`globalAudioLoadingRanges.ts`).
- **Steady cost scales weakly with robot count** when quiet: 12 robots ≈ 24%, 3 robots ≈ 16–20% (3 interleaved rounds, same seed).
- The Tone context uses **defaults**: `latencyHint: "interactive"`, `lookAhead: 0.1` (100 ms). Nothing in `src/` sets `Tone.setContext`, and nothing calls `resume()`/`suspend()` or listens for `statechange` — **a suspended AudioContext would never be resumed by the app.**

## What is NOT known (do not assert these)

- **Whether the phone's audio thread is overloaded.** ~25–30% of a desktop core is thin headroom for a phone, but it is not proof of overload; the phone's per-core speed, core placement, and thermal state are unmeasured.
- **What causes 10–20 s total dropouts.** Buffer underruns give short crackles, not long silences. Candidates, none confirmed: the AudioContext being suspended/interrupted and never resumed; a long main-thread stall starving the scheduler; thermal throttling (the app also keeps the main thread ~84% busy at idle at 4× — 17.2.5).
- Chrome Android's low-latency (`interactive`) path is known to glitch on complex graphs, and `latencyHint: "playback"` is the usual mitigation — **unverified for this app on this phone.**

## Retracted earlier claims (so nobody re-derives them)

- "Load depends on the world seed" — **wrong.** Single runs of the same `?seed=` gave 72% and 29% (and 55% vs 34%); the swings (17%–79%) were measurement noise, most likely system activity right after fresh builds. Interleaved, repeated runs on a quiet machine are stable at ~24%.
- Single-run comparisons of any audio-load number are unreliable here. Use ≥3 interleaved rounds, and see the hygiene rules in the memory note `perf-harness-measurement-hygiene`.

## How to measure (the scratch scripts are gone; recreate from this)

All drive headless Chrome over CDP (Node 24 built-in `WebSocket`, no dependency), load `vite preview` of a production build, click `button[aria-label="Power on"]`, wait ~8 s. `?seed=<word>` pins the otherwise-random world.

1. **Render-thread time per quantum** — `Tracing.start` with `includedCategories: ['webaudio','audio']`; sum `dur` of `RealtimeAudioDestinationHandler::Render` events (thread `AudioOutputDevice`). Budget = 128/48000 s = 2.67 ms. This is light. Adding `disabled-by-default-webaudio.audionode` gives per-handler timings (`GainHandler::Process`, `OscillatorHandler::Process`, `ConvolverHandler::Process`, …) but **the tracing itself inflates load ~3×** — use it only for the relative breakdown.
2. **DevTools "Web Audio" panel data** — `WebAudio.enable`, capture `WebAudio.contextCreated` (the `realtime` one), then **poll** `WebAudio.getRealtimeData({contextId})` every ~500 ms (`contextRealtimeDataChanged` events do not arrive on their own). Fields: `renderCapacity` (0–1), `callbackIntervalMean`, `callbackIntervalVariance` (seconds).
3. **Node counts by creator** — inject via `Page.addScriptToEvaluateOnNewDocument` a Proxy over each `AudioNode` subclass constructor plus a wrapper over every `BaseAudioContext.prototype.create*`, recording `new Error().stack` (set `Error.stackTraceLimit = 40`); aggregate by the first non-plumbing frames on an **unminified** build (`npx vite build --minify false --outDir <tmp>`).
4. `AudioContext.renderCapacity` (the JS API) is **not available** in Chrome 153 desktop, even with `--enable-experimental-web-platform-features`.

## What to do next

**Step 1 — get real data from the phone (Crawford, USB):** enable USB debugging on the Pixel → desktop `chrome://inspect` → inspect the app tab → DevTools ⋮ → More tools → **WebAudio** → select the context and read, *while it is scratchy or cut out*: **render capacity** (desktop is ~0.3; near/above 1.0 means the audio thread is overloaded), callback interval mean/variance, callback buffer size, and **context state** (`running` vs `suspended`). Also note: do the visuals keep animating during a dropout (→ audio thread/context) or freeze too (→ main-thread stall)? Does it happen at idle or only while interacting? After how long?

**Step 2 — pick by what Step 1 shows.** Every option below touches the audio system, so `CLAUDE.md` requires asking Crawford first.

| If the phone shows… | Do | Notes |
|---|---|---|
| State goes `suspended`/`interrupted` | Listen for `statechange` on the raw context and resume when the engine should be running (small, TDD-able) | The app currently never resumes. |
| Render capacity high, or crackles with a healthy state | Opt-in `?latency=playback` first (default unchanged) so Crawford can A/B on the phone in one deploy; if it helps, make it the default | Overlaps roadmap **17.2.4**, which Crawford had held to keep profiling data clean; the symptom now justifies it. Must be set before any Tone node is constructed. |
| Render capacity high even with `playback` | Build each robot's voice chain only while it is audible/active (and dispose or pool otherwise) | Real design change; could cut most of the ~1,000 nodes (docked robots' chains are always-on today). Needs a spec. |
| Visuals freeze during dropouts | Main-thread stall — 17.2.3/17.2.5 territory; also check for a long task in a Performance trace | The 17.2.2 fix removed the tile-open stalls; idle paint cost is still ~84% busy at 4×. |
| Device hot / throttling | 17.2.5 (idle paint & composite cost) — heat throttles the audio thread too | |

If USB debugging is impractical, an **in-app `?debug` readout** (context state, `baseLatency`/`outputLatency`, `statechange` log) would give the same first-order signal — also an audio-adjacent change, ask first.

## Housekeeping

- Branch `bugs/scratchy-audio-phones` is clean apart from this file. All scratch scripts, scratch builds (`dist-*`), and preview servers were in the session scratch folder / temp and have been stopped.
- Backlog #29 lists three unrelated intermittent full-suite test failures — not part of this.

---

## Update 2026-09-19 — new phone repro (this changes the picture)

Crawford re-ran it on the Pixel 8. **After ~5 minutes with most effect controls near max (reverb items, delay, random LFOs throughout), the audio distorted; then, while turning everything back down, it "stopped making music completely until I refreshed."** So the failure is not (only) a load problem: it needs a **hard-latched fault that turning parameters down does not clear**.

Nothing was changed or reproduced on desktop for this; the following is code reading only. **Do not treat any of it as confirmed.**

**Code facts checked this session**
- Global chain (`wireGlobalFxChain`, `src/engine/audioEngine/globalFx.ts`): `EQ3 → LPF → HPF → FeedbackDelay → Reverb → Compressor → Limiter → masterGain → destination` (natural-decay mode). Delay `feedback` UI/seed max is **0.95** (`globalAudioSeedRanges.ts`), delay time up to 10 s, reverb decay up to 10 s, filter Q up to 20.
- **Global LFOs can only drive EQ3 gains and LPF/HPF frequency and Q** (`GLOBAL_LFO_TARGET_IDS`), not delay feedback or reverb. Swing is computed **once, at connect time**, from the base value at that moment (`centeredSwingFromRange` in `lfoEngine.connectLfoTarget`); it is not recomputed when the base slider later moves.
- Voices: `triggerWithCap` increments `activeVoices` and only a `Tone.getContext().setTimeout` callback (main-thread-driven) releases it; `activeVoices >= MAX_POLYPHONY (16)` silently rejects notes. A code comment already documents this exact failure mode ("plays a few more notes, then nothing") from a different cause. Failure paths inside `triggerWithCap` do decrement; no permanent leak was found by reading.
- Nothing in `src/` resumes a suspended `AudioContext` or listens for `statechange`.

**Candidate causes, ranked by how well they fit "distorts under max settings, then silent forever, refresh fixes"** (all unverified):
1. **A non-finite value (Inf/NaN) latched in a recirculating node** — the feedback delay's loop, the reverb convolver, or a biquad. Once NaN circulates, lowering feedback/wet does not clear it (NaN × 0 = NaN) and everything downstream stays silent until the nodes are rebuilt. Fits the symptom best; **no code path producing Inf was found** (feedback is capped at 0.95), so the trigger is unknown. Note the distortion stage itself is plausible without a bug: feedback 0.95 with delay wet 1 and reverb wet 1 gives ~+26 dB of recirculating energy ahead of the compressor/limiter.
2. **The AudioContext was suspended/interrupted by Chrome Android** (heavy load, audio-focus change, power management) and the app never resumes it.
3. **`activeVoices` pinned at 16** after a long main-thread stall delayed the release timeouts (recovers only if the stall clears; permanent only if a release is lost).
4. A Tone exception loop (e.g. a start-time or non-finite-value error) — would show in the console.

**What to check on the phone the next time it goes silent** (USB remote debugging, `chrome://inspect`):
- **Does the UI still animate and respond?** (No → main-thread stall, cause 3/4. Yes → audio thread/context/graph, causes 1/2.)
- **Console:** any red errors or Tone warnings, and whether they repeat.
- **WebAudio panel:** context **state** (`running` vs `suspended`/`interrupted`), and whether *callback interval* / *current time* are still advancing.
- **Try Power off → Power on** (or Mute → Unmute) while silent. If sound returns, the engine can be recovered without a refresh, which narrows it to something a rebuild clears (cause 1). If not, ask whether it survives a tile change.
- Roughly which controls were maxed when the distortion began (delay feedback? delay wet? reverb wet/decay? filter Q?) — the more specific, the better.

**Proposed mitigations to discuss (each touches audio → ask first; none started):**
- **Self-healing guard:** tap the master output with an analyser; if the output is non-finite, or silent while notes are being triggered, rebuild the global FX chain (`buildGlobalFxChain`) and resume the context. Cause-agnostic, and also surfaces the bug instead of hiding it.
- **`statechange` → resume** handler (small, TDD-able), if the WebAudio panel shows suspension.
- **Headroom:** compensate or soft-limit the recirculating delay/reverb stage so maxed settings distort gracefully instead of hitting the limiter hard; consider a lower ceiling than 0.95 for delay feedback.
- The earlier options (opt-in `?latency=playback`; build voice chains only for audible robots) still stand for the *scratchy* symptom.
