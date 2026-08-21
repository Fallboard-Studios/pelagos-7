// ========================================
// IMPORTS
// ========================================
import { AudioEngine } from './AudioEngine';
import { lfoEngine } from './lfoEngine';
import { DEV_TUNING } from '../constants';
import { getActiveLocaleId } from '../utils/localeHelpers';
import useLocaleStore from '../stores/localeStore';

// ========================================
// FUNCTIONS
// ========================================

/**
 * Dev-only manual audible check (docs/tasks/LFO_INTEGRATION_PLAN.md Task 14).
 * NOT real UI — no component or store references this file; it's imported
 * once from main.tsx purely for its DEV_TUNING-gated registration side
 * effect below. Connects one robot-layer target (layer0.detune — a clearly
 * audible pitch wobble) and one global-chain target (eq3.low — a slow tonal
 * sweep across the whole mix) to an active LFO, using real rate/depth/shape
 * values and the real signal-chaining path built across Tasks 9-13, so that
 * chain can be confirmed by ear from the browser devtools console:
 *   window.__lfoDebug.audition()
 *   window.__lfoDebug.stop()
 */
async function auditionLfo(): Promise<string> {
  await AudioEngine.start();

  const localeId = getActiveLocaleId();
  const robot = useLocaleStore.getState().locales[localeId]?.robots?.[0];
  if (!robot) {
    return '[lfoDebug] No robot in the active locale — spawn one first, then call window.__lfoDebug.audition() again.';
  }

  lfoEngine.setLfoShape('layer0.detune', 'sine', robot.id);
  lfoEngine.setLfoRate('layer0.detune', 3, robot.id);
  lfoEngine.setLfoDepth('layer0.detune', 100, robot.id);
  const robotConnected = lfoEngine.connectLfoTarget('layer0.detune', robot.id);
  lfoEngine.start('layer0.detune', robot.id);

  lfoEngine.setLfoShape('eq3.low', 'sine');
  lfoEngine.setLfoRate('eq3.low', 0.5);
  lfoEngine.setLfoDepth('eq3.low', 100);
  const globalConnected = lfoEngine.connectLfoTarget('eq3.low');
  lfoEngine.start('eq3.low');

  return `[lfoDebug] robot=${robot.id} layer0.detune connected=${robotConnected}; global eq3.low connected=${globalConnected}. Listen for pitch wobble on robot ${robot.id} and a slow tonal sweep across the mix. Call window.__lfoDebug.stop() to undo.`;
}

/** Reverses auditionLfo() — stops and disconnects both targets. Safe to call even if audition() was never run. */
function stopAuditionLfo(): void {
  const localeId = getActiveLocaleId();
  const robot = useLocaleStore.getState().locales[localeId]?.robots?.[0];
  if (robot) {
    lfoEngine.stop('layer0.detune', robot.id);
    lfoEngine.disconnectLfoTarget('layer0.detune', robot.id);
  }
  lfoEngine.stop('eq3.low');
  lfoEngine.disconnectLfoTarget('eq3.low');
}

// ========================================
// DEV-ONLY REGISTRATION
// ========================================
// DEV_TUNING (= import.meta.env.DEV) is statically replaced with a literal
// `false` in production builds, making this whole block unreachable dead
// code that Vite/Rollup's build eliminates — verified via `npm run build`,
// not assumed (see LFO_INTEGRATION_PLAN.md Task 14's verification notes).
if (DEV_TUNING && typeof window !== 'undefined') {
  (window as unknown as { __lfoDebug?: { audition: () => Promise<string>; stop: () => void } }).__lfoDebug = {
    audition: auditionLfo,
    stop: stopAuditionLfo,
  };
}
