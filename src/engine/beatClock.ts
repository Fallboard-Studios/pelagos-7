// ========================================
// IMPORTS
// ========================================
import { DEV_TUNING } from '../constants';

// Minimal transport-like interface to avoid importing Tone.js here.
interface TransportLike {
  // Tone.Transport.position can be a Tone.Time (string/number-like), accept unknown
  position?: unknown;
  scheduleRepeat(callback: (time?: unknown) => void, interval: string, startTime?: unknown): unknown;
  clear(id: unknown): void;
}

// Transport instance is provided by AudioEngine to avoid importing Tone here.
let transportInstance: TransportLike | null = null;

// ========================================
// CONSTANTS
// ========================================
const BEATS_PER_MEASURE = 4;
const MEASURES_PER_CYCLE = 96;
const MEASURES_PER_HOUR = 4;

// ========================================
// INTERNAL STATE
// ========================================
let currentBeat = 0;
let currentMeasure = 0;
let lastNotifiedMeasure = -1;
let initialized = false;
// Internal transport tick id for the 16n scheduler so we can clear it on reset
let internalTickId: unknown | null = null;
/** Map of scheduleId -> schedule entry. Stores pending schedules when transport is not yet available. */
const scheduleMap = new Map<string, { transportId?: unknown; interval: string; callback: () => void }>();
const measureListeners: Array<(measure: number) => void> = [];

// ========================================
// BEATCLOCK API
// ========================================

/**
 * Initializes beat tracking. Should be called after Transport starts.
 */
export function initBeatClock(transport?: TransportLike): void {
  if (initialized) return;
  if (!transport) {
    throw new Error('initBeatClock requires a transport instance. Call initBeatClock(transport) from AudioEngine or tests.');
  }
  transportInstance = transport;
  const transportLocal = transportInstance as TransportLike;
  // Register a 16n tick and remember its id so we can clear it on reset
  internalTickId = transportLocal.scheduleRepeat(() => {
    // Calculate current beat and measure from Transport position
    // Defensive: fallback to 0 if not started
    const pos = String(transportLocal.position).split(':');
    const measure = parseInt(pos[0], 10) || 0;
    const beat = parseInt(pos[1], 10) || 0;
    const sixteenths = parseInt(pos[2], 10) || 0;
    currentBeat = measure * BEATS_PER_MEASURE + beat + sixteenths / 4;
    currentMeasure = measure;
    // Fire measure listeners once per measure change
    if (currentMeasure !== lastNotifiedMeasure) {
      lastNotifiedMeasure = currentMeasure;
      const wrappedMeasure = currentMeasure % MEASURES_PER_CYCLE;
      measureListeners.forEach(fn => fn(wrappedMeasure));
    }
  }, '16n');
  initialized = true;
  if (DEV_TUNING) console.log('[BeatClock] initialized');
  // Register any schedules that were requested before transport initialization
  scheduleMap.forEach((entry, scheduleId) => {
    if (entry.transportId === undefined) {
      try {
        const transportId = transportLocal.scheduleRepeat((_time: unknown) => {
          entry.callback();
        }, entry.interval, entry.interval);
        entry.transportId = transportId;
        if (DEV_TUNING) console.log('[BeatClock] Registered pending schedule:', scheduleId, entry.interval);
      } catch (err) {
        if (DEV_TUNING) console.warn('[BeatClock] Failed to register pending schedule:', scheduleId, err);
      }
    }
  });
}

/**
 * Register a callback to be fired once per measure change.
 * The callback receives the wrapped measure (0–95).
 * Safe to call before or after initialization.
 *
 * @param callback - Called with the new wrapped measure on each measure tick.
 */
export function subscribeToMeasure(callback: (measure: number) => void): () => void {
  measureListeners.push(callback);
  // Return an unsubscribe function for safe removal by caller
  return () => {
    const idx = measureListeners.indexOf(callback);
    if (idx !== -1) measureListeners.splice(idx, 1);
  };
}

/**
 * Returns the current beat (float, 0-based)
 */
export function getCurrentBeat(): number {
  return currentBeat;
}

/**
 * Returns the current measure (integer, 0-based)
 */
export function getCurrentMeasure(): number {
  return currentMeasure;
}

/**
 * Returns the derived hour (0-23) from current measure position.
 * 96 measures = 1 full day cycle, 4 measures = 1 hour equivalent.
 */
export function getCurrentHour(): number {
  const derivedHour = Math.floor((currentMeasure % MEASURES_PER_CYCLE) / MEASURES_PER_HOUR);
  return Math.max(0, Math.min(23, derivedHour));
}

/**
 * Stub: schedule a callback at a specific beat (logs only)
 */
export function scheduleAtBeat(beat: number, callback: () => void): string {
  if (DEV_TUNING) console.log('[BeatClock] scheduleAtBeat (stub):', beat, callback);
  return 'stub-id';
}

/**
 * Schedule a callback to repeat at the given musical interval.
 * Registers with Tone.Transport and stores the event ID for later cancellation via cancelSchedule.
 * @param interval - Tone.js time notation, e.g. '4m', '8n', '60m'
 * @param callback - Called on each interval tick
 * @returns A schedule ID that can be passed to cancelSchedule
 */
export function scheduleRepeat(interval: string, callback: () => void): string {
  // Generate unique ID for this scheduled event
  const scheduleId = `schedule-${crypto.randomUUID()}`;

  // If transport isn't ready, persist the requested interval+callback so it
  // can be registered once initBeatClock provides the transport instance.
  if (!transportInstance) {
    scheduleMap.set(scheduleId, { interval, callback });
    if (DEV_TUNING) console.log('[BeatClock] scheduleRepeat (pending):', interval, 'id:', scheduleId);
    return scheduleId;
  }

  // Pass interval as startTime so the first tick fires after one full interval,
  // not at T=0 when Transport starts.
  const transportId = transportInstance.scheduleRepeat((_time: unknown) => {
    callback();
  }, interval, interval);

  // Store mapping for cancellation via cancelSchedule
  scheduleMap.set(scheduleId, { transportId, interval, callback });

  if (DEV_TUNING) console.log('[BeatClock] scheduleRepeat:', interval, 'id:', scheduleId);

  return scheduleId;
}

/**
 * Cancel a previously scheduled repeating event.
 * Clears the event from Tone.Transport and removes it from the internal schedule map.
 * @param scheduleId - ID returned by scheduleRepeat
 */
export function cancelSchedule(scheduleId: string): void {
  const entry = scheduleMap.get(scheduleId);
  if (entry === undefined) {
    if (DEV_TUNING) console.log('[BeatClock] cancelSchedule: no schedule found for', scheduleId);
    return;
  }

  // If transport isn't initialized or this entry was never registered with the
  // transport, just remove it from the map.
  if (!transportInstance || entry.transportId === undefined) {
    scheduleMap.delete(scheduleId);
    if (DEV_TUNING) console.log('[BeatClock] cancelSchedule (pending):', scheduleId);
    return;
  }

  try {
    transportInstance.clear(entry.transportId);
  } catch (err) {
    if (DEV_TUNING) console.warn('[BeatClock] cancelSchedule: failed to clear transport id', entry.transportId, err);
  }
  scheduleMap.delete(scheduleId);
  if (DEV_TUNING) console.log('[BeatClock] cancelSchedule: cleared', scheduleId);
}

/**
 * Reset BeatClock state so initBeatClock() will re-register the internal
 * 16n tick on the next AudioEngine.start() call.
 * Call from AudioEngine.killAll() after transport.cancel() has cleared
 * the old tick events.
 */
export function resetBeatClock(): void {
  initialized = false;

  // Clear the internal 16n tick if it was registered
  if (internalTickId !== null) {
    try {
      transportInstance?.clear(internalTickId);
    } catch (err) {
      if (DEV_TUNING) console.warn('[BeatClock] reset: failed to clear internal tick', err);
    }
    internalTickId = null;
  }

  // Attempt to clear any transport-registered schedules owned by this module
  scheduleMap.forEach((entry) => {
    if (entry.transportId !== undefined) {
      try {
        transportInstance?.clear(entry.transportId);
      } catch (err) {
        if (DEV_TUNING) console.warn('[BeatClock] reset: failed to clear schedule', err);
      }
    }
  });
  scheduleMap.clear();

  // Null the transport reference so scheduleRepeat() doesn't register events
  // against a stale/cancelled transport between reset and the next initBeatClock().
  transportInstance = null;

  // Reset position counters so getters don't return stale values before the
  // first 16n tick fires after re-initialization.
  currentBeat = 0;
  currentMeasure = 0;
  lastNotifiedMeasure = -1;

  // Clear listeners — stale subscribers from a previous session would otherwise
  // fire on the new session's measure ticks.
  measureListeners.length = 0;

  if (DEV_TUNING) console.log('[BeatClock] reset');
}
