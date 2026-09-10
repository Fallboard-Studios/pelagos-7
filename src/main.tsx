import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
// Self-hosted (npm @fontsource/rajdhani, not a Google Fonts CDN link) — no
// external network request at runtime. All 5 weights (300-700); index.css's
// --font-sans token is the only consumer, applied as the app's default
// typeface, replacing the prior system-ui stack. latin/latin-ext subsets
// only (not the plain weight-only files, which also bundle Devanagari
// glyphs the app never uses — latin-ext still covers accented Latin
// characters at a fraction of Devanagari's per-weight size).
import '@fontsource/rajdhani/latin-300.css'
import '@fontsource/rajdhani/latin-ext-300.css'
import '@fontsource/rajdhani/latin-400.css'
import '@fontsource/rajdhani/latin-ext-400.css'
import '@fontsource/rajdhani/latin-500.css'
import '@fontsource/rajdhani/latin-ext-500.css'
import '@fontsource/rajdhani/latin-600.css'
import '@fontsource/rajdhani/latin-ext-600.css'
import '@fontsource/rajdhani/latin-700.css'
import '@fontsource/rajdhani/latin-ext-700.css'
import './index.css'
import { setGlobalAttenuationStyleSeedOverride } from './utils/seedUtils'

// Dev-only manual audible check (LFO_INTEGRATION_PLAN.md Task 14) — not real
// UI, no component/store references it. This import exists only so the
// file's own DEV_TUNING-gated registration runs; import.meta.env.DEV makes
// the whole thing dead code Vite strips from production builds.
import './engine/lfoDebug'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Support global seed override via URL param e.g. ?seed=myspecialseed
const seedParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('seed') : null;
if (seedParam) {
  setGlobalAttenuationStyleSeedOverride(seedParam);
  // keep a console-visible message so devs know the override is active
  // (intentionally after render so it shows up when app starts in dev)
  // eslint-disable-next-line no-console
  console.info('[seedUtils] global seed override set:', seedParam);
}
