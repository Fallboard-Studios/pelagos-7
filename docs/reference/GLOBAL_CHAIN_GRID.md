# Audio Effects Label Mapping

**Global chain order — "Natural Decay" (default):** EQ (3-band) → Low-Pass Filter → High-Pass Filter → Delay → Reverb → Compressor → Limiter → Destination.

**"Controlled Decay"** (user toggle, `compressorBeforeDelay: true`): EQ (3-band) → Low-Pass Filter → High-Pass Filter → Compressor → Delay → Reverb → Limiter → Destination — swaps Compressor to before both Delay and Reverb, so their tails are compressed rather than ringing out untouched. Robot voice busses always connect in at EQ (3-band) — it's first in both topologies.

**This table is the source of truth for both ranges every field carries:**
- **Unit / Range** — the full range: what the UI slider exposes and what the app itself supports. Verified directly against Tone.js v15.1.22's own source (`@min`/`@max` doc comments where Tone documents them; its own reference-range prose where it doesn't) — see the notes at the bottom.
- **Loading Range** — a narrower sub-range of the above, the only window a *fresh seed* is allowed to land a value in. Never presented in the UI, never a cap on what the app can do — purely bounds what `generateGlobalAudioSettings` rolls at planet-load time. Confirmed with the user per-effect; `src/data/globalAudioLoadingRanges.ts` is a direct, mechanical transcription of this column, not an independent source.

| Effect | Setter | Param | Unit / Range | Loading Range | Default | Effect Label | Param Label | UI | LFO? |
|---|---|---|---|---|---|---|---|---|---|
| EQ (3-band) | `setGlobalEQ()` | low | dB, −12 to 12 | −6 to 6 | 0 | SPECTRAL FREQUENCY EQUALIZER | SUB-BAND DENSITY | SLIDER (Center-Zero) | X |
| EQ (3-band) | `setGlobalEQ()` | mid | dB, −12 to 12 | −6 to 6 | 0 | SPECTRAL FREQUENCY EQUALIZER | MEDIAL-BAND DENSITY | SLIDER (Center-Zero) | X |
| EQ (3-band) | `setGlobalEQ()` | high | dB, −12 to 12 | −6 to 6 | 0 | SPECTRAL FREQUENCY EQUALIZER | APICAL-BAND DENSITY | SLIDER (Center-Zero) | X |
| Low-Pass Filter | `setGlobalFilterLPF()` | frequency | Hz, 20–20000 | 2000–20000 | 20000 | HIGH-FREQUENCY MASK | CUTOFF FREQUENCY | SLIDER (Logarithmic) | X |
| Low-Pass Filter | `setGlobalFilterLPF()` | Q | 0.1–20 | 0.1–5 | 1 | HIGH-FREQUENCY MASK | BOUNDARY RESONANCE | SLIDER (Logarithmic) | X |
| High-Pass Filter | `setGlobalFilterHPF()` | frequency | Hz, 20–20000 | 20–500 | 20 | LOW-FREQUENCY MASK | CUTOFF FREQUENCY | SLIDER (Logarithmic) | X |
| High-Pass Filter | `setGlobalFilterHPF()` | Q | 0.1–20 | 0.1–5 | 1 | LOW-FREQUENCY MASK | BOUNDARY RESONANCE | SLIDER (Logarithmic) | X |
| Delay | `setGlobalDelay()` | delayTime | seconds, 0–1 | 0.05–0.5 | 0.25 | TEMPORAL REFLECTION MATRIX | PROPAGATION LAG | SLIDER | – |
| Delay | `setGlobalDelay()` | feedback | 0–0.95 | 0–0.4 | 0.2 | TEMPORAL REFLECTION MATRIX | RECIRCULATION RATE | SLIDER | – |
| Delay | `setGlobalDelay()` | wet | 0–1 | 0–0.3 | 0.15 | TEMPORAL REFLECTION MATRIX | REFLECTED SIGNAL BALANCE | SLIDER | – |
| Reverb | `setGlobalReverb()` | decay | seconds, 0.1–10 | 0.5–4 | 1.5 | SPATIAL DIFFUSION MATRIX | DISSIPATION DURATION | SLIDER (Logarithmic) | – |
| Reverb | `setGlobalReverb()` | preDelay | seconds, 0–0.5 | 0–0.1 | 0.02 | SPATIAL DIFFUSION MATRIX | INITIAL LAG | SLIDER | – |
| Reverb | `setGlobalReverb()` | wet | 0–1 | 0.1–0.4 | 0.3 | SPATIAL DIFFUSION MATRIX | DIFFUSED SIGNAL BALANCE | SLIDER | – |
| Compressor | `setGlobalCompressor()` | threshold | dB, −60 to 0 | −24 to −6 | −24 | DYNAMIC RANGE CONDENSER | ATTENUATION THRESHOLD | SLIDER | – |
| Compressor | `setGlobalCompressor()` | ratio | 1–20 | 1.5–4 | 2 | DYNAMIC RANGE CONDENSER | COMPRESSION RATIO | STEPPER (`[ - ] ( 2:1 ) [ + ]`) | – |
| Compressor | `setGlobalCompressor()` | attack | seconds, 0.001–1 | 0.003–0.05 | 0.003 | DYNAMIC RANGE CONDENSER | COMPRESSION RATE | SLIDER (Logarithmic) | – |
| Compressor | `setGlobalCompressor()` | release | seconds, 0.01–1 | 0.05–0.3 | 0.25 | DYNAMIC RANGE CONDENSER | RAREFACTION RATE | SLIDER (Logarithmic) | – |
| Compressor | `setGlobalCompressor()` | knee | dB, 0–40 | 2–15 | 6 | DYNAMIC RANGE CONDENSER | CURVATURE DAMPING | SLIDER | – |
| Limiter | `setGlobalLimiter()` | threshold | dB, −20 to 0 | −3 to −1 | −12 | TERMINAL CEILING GATE | OUTPUT CEILING | SLIDER | – |

## Notes from the Tone.js verification pass (V2)

- **Compressor** — every full-range value above checked exactly against `Tone.Compressor`'s own `@min`/`@max` doc comments: `ratio` (1–20) and `knee` (0–40) match Tone's hard bounds exactly; `threshold` (−60 to 0) is a deliberately narrower slice of Tone's true −100 to 0; `attack`/`release` (0.001–1 / 0.01–1) both sit safely inside Tone's 0–1.
- **Low-Pass/High-Pass Filter** frequency (20–20000 Hz) isn't just a UI convention — it's the exact range `Tone.Filter`'s own class doc references ("frequency response curve... between 20hz-20khz"). `Q` has no Tone-documented bound; 0.1–20 is a conventional musically-useful range, not derived from a hard limit.
- **EQ (3-band)** `low`/`mid`/`high` have no Tone-documented numeric bound either; ±12 dB full range is a conventional EQ range, a judgment call not a hard constraint. `Tone.EQ3` also exposes a shared `Q` and `lowFrequency`/`highFrequency` crossover points that aren't surfaced as controls here — noted, not added.
- **Delay** `feedback` is capped at 0.95, short of Tone's technical 0–1, to avoid runaway buildup near unity. `delayTime`'s 0–1s full range now has an explicit `maxDelay: 1` set on the underlying `Tone.FeedbackDelay` node (previously relied on Tone's own default coincidentally matching) — the two must stay in sync if this range ever changes. `delayTime`'s `LFO?` flag was removed post-shipping (was `X`, now `–`) — LFO judged unwanted on Delay's own time parameter. `delayTime` itself is unaffected; it still seeds/edits normally, only the LFO-modulation capability is gone. `GlobalLfoTargetId` is now 7 members, not 8.
- **Reverb** — the `dampening` row that used to appear here is removed: `Tone.Reverb` (v15.1.22) has no such property; the field was a dead cast in `globalFx.ts` that never affected the sound, dating back to Phase 0. Reverb now has exactly 3 real params. `decay`/`preDelay` full ranges have no Tone-documented caps; the existing ranges are conventional, not corrected.
- **Limiter** — `Tone.Limiter` exposes exactly one param, `threshold` (default −12 dB), internally wrapping a `Compressor` with a fixed `ratio: 20`/`attack: 0.003`/`release: 0.01` (none adjustable). The −20 to 0 dB full range is a proposed convention (a limiter's threshold conventionally stays near the ceiling, unlike a general compressor's much wider −100 to 0) — accepted by the user via its loading range fitting comfortably inside it; flag if that full range itself needs revisiting.
- **Loading ranges** (this table's own dedicated column) were set together with the user, per effect, after the full-range review above — see `docs/specs/AUDIO_RIG_V2.md` and `docs/tasks/AUDIO_RIG_V2.md` for how they flow into `src/data/globalAudioLoadingRanges.ts`.
