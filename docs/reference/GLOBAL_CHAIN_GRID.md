# Audio Effects Label Mapping

| Effect | Setter | Param | Unit / Range | Default | Effect Label | Param Label | UI | LFO? |
|---|---|---|---|---|---|---|---|---|
| Compressor | `setGlobalCompressor()` | threshold | dB, −60 to 0 | −24 | DYNAMIC RANGE CONDENSER | ATTENUATION THRESHOLD | SLIDER | – |
| Compressor | `setGlobalCompressor()` | ratio | 1–20 | 2 | DYNAMIC RANGE CONDENSER | COMPRESSION RATIO | STEPPER (`[ - ] ( 2:1 ) [ + ]`) | – |
| Compressor | `setGlobalCompressor()` | attack | seconds, 0.001–1 | 0.003 | DYNAMIC RANGE CONDENSER | COMPRESSION RATE | SLIDER (Logarithmic) | – |
| Compressor | `setGlobalCompressor()` | release | seconds, 0.01–1 | 0.25 | DYNAMIC RANGE CONDENSER | RAREFACTION RATE | SLIDER (Logarithmic) | – |
| Compressor | `setGlobalCompressor()` | knee | dB, 0–40 | 6 | DYNAMIC RANGE CONDENSER | CURVATURE DAMPING | SLIDER | – |
| EQ (3-band) | `setGlobalEQ()` | low | dB, −12 to 12 | 0 | SPECTRAL FREQUENCY EQUALIZER | SUB-BAND DENSITY | SLIDER (Center-Zero) | X |
| EQ (3-band) | `setGlobalEQ()` | mid | dB, −12 to 12 | 0 | SPECTRAL FREQUENCY EQUALIZER | MEDIAL-BAND DENSITY | SLIDER (Center-Zero) | X |
| EQ (3-band) | `setGlobalEQ()` | high | dB, −12 to 12 | 0 | SPECTRAL FREQUENCY EQUALIZER | APICAL-BAND DENSITY | SLIDER (Center-Zero) | X |
| Low-Pass Filter | `setGlobalFilterLPF()` | frequency | Hz, 20–20000 | 20000 | HIGH-FREQUENCY MASK | CUTOFF FREQUENCY | SLIDER (Logarithmic) | X |
| Low-Pass Filter | `setGlobalFilterLPF()` | Q | 0.1–20 | 1 | HIGH-FREQUENCY MASK | BOUNDARY RESONANCE | SLIDER (Logarithmic) | X |
| High-Pass Filter | `setGlobalFilterHPF()` | frequency | Hz, 20–20000 | 20 | LOW-FREQUENCY MASK | CUTOFF FREQUENCY | SLIDER (Logarithmic) | X |
| High-Pass Filter | `setGlobalFilterHPF()` | Q | 0.1–20 | 1 | LOW-FREQUENCY MASK | BOUNDARY RESONANCE | SLIDER (Logarithmic) | X |
| Chorus | `setGlobalChorus()` | rate | Hz, 0.1–10 | 1.5 | PHASE DISPERSION ARRAY | OSCILLATION RATE | SLIDER | – |
| Chorus | `setGlobalChorus()` | depth | 0–1 | 0.2 | PHASE DISPERSION ARRAY | DISPERSION DEPTH | SLIDER | – |
| Chorus | `setGlobalChorus()` | delayTime | ms, 2–20 | 12 | PHASE DISPERSION ARRAY | PHASE OFFSET | SLIDER | X |
| Chorus | `setGlobalChorus()` | feedback | 0–1 | 0.1 | PHASE DISPERSION ARRAY | RECIRCULATION | SLIDER | – |
| Chorus | `setGlobalChorus()` | wet | 0–1 | 0.2 | PHASE DISPERSION ARRAY | SIGNAL DISPERSION BALANCE | SLIDER | – |
| Delay | `setGlobalDelay()` | delayTime | seconds, 0–1 | 0.25 | TEMPORAL REFLECTION MATRIX | PROPAGATION LAG | SLIDER | X |
| Delay | `setGlobalDelay()` | feedback | 0–0.95 | 0.2 | TEMPORAL REFLECTION MATRIX | RECIRCULATION RATE | SLIDER | – |
| Delay | `setGlobalDelay()` | wet | 0–1 | 0.15 | TEMPORAL REFLECTION MATRIX | REFLECTED SIGNAL BALANCE | SLIDER | – |
| Reverb | `setGlobalReverb()` | decay | seconds, 0.1–10 | 1.5 | SPATIAL DIFFUSION MATRIX | DISSIPATION DURATION | SLIDER (Logarithmic) | – |
| Reverb | `setGlobalReverb()` | preDelay | seconds, 0–0.5 | 0.02 | SPATIAL DIFFUSION MATRIX | INITIAL LAG | SLIDER | – |
| Reverb | `setGlobalReverb()` | dampening | Hz, 100–8000 | 3000 | SPATIAL DIFFUSION MATRIX | ABSORPTION THRESHOLD | SLIDER (Logarithmic) | – |
| Reverb | `setGlobalReverb()` | wet | 0–1 | 0.3 | SPATIAL DIFFUSION MATRIX | DIFFUSED SIGNAL BALANCE | SLIDER | – |
