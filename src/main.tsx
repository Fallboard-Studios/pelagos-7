import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './index.css'
import { setGlobalPlanetSeedOverride } from './utils/seedUtils'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Support global seed override via URL param e.g. ?seed=myspecialseed
const seedParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('seed') : null;
if (seedParam) {
  setGlobalPlanetSeedOverride(seedParam);
  // keep a console-visible message so devs know the override is active
  // (intentionally after render so it shows up when app starts in dev)
  // eslint-disable-next-line no-console
  console.info('[seedUtils] global seed override set:', seedParam);
}
