import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './index.css'
import { setGlobalPlanetSeedOverride } from './utils/seedUtils'

// Dev-only manual audible check (LFO_INTEGRATION_PLAN.md Task 14) — not real
// UI, no component/store references it. This import exists only so the
// file's own DEV_TUNING-gated registration runs; import.meta.env.DEV makes
// the whole thing dead code Vite strips from production builds.
import './engine/lfoDebug'

// THROWAWAY dev-only preview hook for docs/COMPONENT_LIBRARY.md's 13
// primitives (?preview=controls). Not part of Phase 1's committed scope —
// remove this block and src/dev/ControlsPreview.tsx together when done.
const isControlsPreview = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('preview') === 'controls';

if (isControlsPreview) {
  const { ControlsPreview } = await import('./dev/ControlsPreview');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ControlsPreview />
    </StrictMode>,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Support global seed override via URL param e.g. ?seed=myspecialseed
const seedParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('seed') : null;
if (seedParam) {
  setGlobalPlanetSeedOverride(seedParam);
  // keep a console-visible message so devs know the override is active
  // (intentionally after render so it shows up when app starts in dev)
  // eslint-disable-next-line no-console
  console.info('[seedUtils] global seed override set:', seedParam);
}
