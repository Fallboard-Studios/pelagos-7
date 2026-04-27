// ========================================
// IMPORTS
// ========================================
import type { Robot, MelodyEvent } from '../types/Robot';
import type { LayeredWave } from '../types/layeredAudio';
import useLocaleStore from '../stores/localeStore';
import { AudioEngine } from '../engine/AudioEngine';
import { DEV_TUNING } from '../constants';
import { swallow } from '../utils/helpers';

// ========================================
// CONSTANTS
// ========================================

/**
 * Fields inherited from parent → child when a link exists.
 * Excludes: id, name, createdAt, linkedRobotId (structural), state, position,
 * destination, direction, layer, lastInteractionMeasure, persists.
 * Melody is handled separately (rhythm mapping).
 */
const INHERITED_SCALAR_FIELDS = [
  'audioAttributes',
  'masterVolume',
  'rhythmicDensity',
  'rhythmicMotifLength',
  'octaveRange',
  'noteVariance',
  'audioMode',
] as const satisfies ReadonlyArray<keyof Robot>;

// ========================================
// HELPERS
// ========================================

/**
 * Map a parent's melody rhythm onto the child's pitch identity.
 *
 * Rules:
 * - Child event[i].startStep = parent event[i].startStep
 * - Child event[i].length    = parent event[i].length
 * - Child event[i].noteIndex = childNoteIndices[i % childNoteIndices.length]  (cycle)
 * - Child event[i].octave    = child's existing octave for that position (or mid-range fallback)
 * - If child has no events, use parent rhythm + child's octaveRange mid-point as octave.
 *
 * Always returns a fresh array — safe to write straight to the store.
 */
export function mapRhythmToChild(
  parentMelody: MelodyEvent[],
  childMelody: MelodyEvent[],
  childOctaveRange: [number, number],
): MelodyEvent[] {
  if (parentMelody.length === 0) return childMelody.slice();

  const childNoteIndices = childMelody.map((e) => e.noteIndex);
  const childOctaves = childMelody.map((e) => e.octave);
  const fallbackOctave = Math.round((childOctaveRange[0] + childOctaveRange[1]) / 2);
  const hasChild = childMelody.length > 0;

  return parentMelody.map((parentEvent, i) => ({
    // Preserve the parent's source id shape but generate a fresh one so
    // event ids stay unique if child melody was shorter / different.
    id: `${parentEvent.id}-c${i}`,
    startStep: parentEvent.startStep,
    length: parentEvent.length,
    noteIndex: hasChild
      ? childNoteIndices[i % childNoteIndices.length]
      : parentEvent.noteIndex,
    octave: hasChild
      ? (childOctaves[i % childOctaves.length] ?? fallbackOctave)
      : fallbackOctave,
  }));
}

/**
 * Re-reserve a robot's voice in AudioEngine using its current audio attributes.
 * Mirrors the pattern used in spawnSystem and reRegisterAllRobotsAudio.
 */
function reReserveVoice(robot: Robot): void {
  try {
    AudioEngine.releaseVoice(robot.id);
  } catch (err) {
    if (DEV_TUNING) swallow(err, '[LinkPropagation] releaseVoice');
  }
  try {
    const layered = (
      robot.audioAttributes as unknown as {
        visualAudioMap?: { layeredWave?: LayeredWave };
      }
    )?.visualAudioMap?.layeredWave as LayeredWave | undefined;

    if (layered) {
      AudioEngine.reserveVoice(
        robot.id,
        layered,
        undefined,
        undefined,
        robot.audioAttributes.phase,
        robot.audioAttributes.detune,
      );
    } else {
      AudioEngine.reserveVoice(
        robot.id,
        robot.audioAttributes.synthType as string,
        robot.audioAttributes.waveform,
        robot.audioAttributes.adsr,
        robot.audioAttributes.phase,
        robot.audioAttributes.detune,
      );
    }
  } catch (err) {
    if (DEV_TUNING) swallow(err, '[LinkPropagation] reserveVoice');
  }
}

/**
 * Re-register a robot's melody with AudioEngine.
 */
function reRegisterMelody(robotId: string, melody: MelodyEvent[]): void {
  try {
    AudioEngine.unregisterRobotMelody(robotId);
    AudioEngine.registerRobotMelody(robotId, melody);
  } catch (err) {
    if (DEV_TUNING) swallow(err, '[LinkPropagation] registerRobotMelody');
  }
}

/**
 * Build a topological processing order for a set of affected robots.
 * Given a set of changed parent IDs, walks down the linked-child graph and
 * returns each (localeId, childId, parentId) tuple in dependency order so
 * that a parent's propagated state is fully committed before its children
 * are processed.
 *
 * Cycle detection is enforced at link-creation time (hasCycle in localeStore),
 * so we just use a visited set here to skip duplicates.
 */
function buildPropagationQueue(
  robots: Robot[],
  changedIds: Set<string>,
): Array<{ childId: string; parentId: string }> {
  const robotMap = new Map(robots.map((r) => [r.id, r]));
  const queue: Array<{ childId: string; parentId: string }> = [];
  const enqueued = new Set<string>();

  // BFS from each changed robot, following children downward.
  const frontier = [...changedIds];
  while (frontier.length > 0) {
    const parentId = frontier.shift()!;
    for (const robot of robots) {
      if (robot.linkedRobotId === parentId && !enqueued.has(robot.id)) {
        enqueued.add(robot.id);
        queue.push({ childId: robot.id, parentId });
        // Grandchildren — only enqueue if the child itself exists in the map
        if (robotMap.has(robot.id)) {
          frontier.push(robot.id);
        }
      }
    }
  }
  return queue;
}

// ========================================
// PROPAGATION ENGINE
// ========================================

/**
 * Apply parent → child inheritance for a single child robot.
 * Computes the merged update, writes it to the store, then syncs AudioEngine.
 * Returns the updated child robot object (reflects committed store state).
 */
function propagateToChild(
  localeId: string,
  child: Robot,
  parent: Robot,
): void {
  // Build scalar field updates
  const updates: Partial<Robot> = {};
  for (const field of INHERITED_SCALAR_FIELDS) {
    // Deep equality check: only write when values differ to keep propagation idempotent.
    const parentVal = parent[field];
    const childVal = child[field];
    if (JSON.stringify(parentVal) !== JSON.stringify(childVal)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[field] = parentVal;
    }
  }

  // Rhythm mapping: always recompute from the latest parent melody.
  const newMelody = mapRhythmToChild(
    parent.melody,
    child.melody,
    (updates.octaveRange as [number, number] | undefined) ?? child.octaveRange,
  );

  const melodyChanged =
    JSON.stringify(newMelody) !== JSON.stringify(child.melody);

  const hasScalarChanges = Object.keys(updates).length > 0;
  if (!hasScalarChanges && !melodyChanged) {
    if (DEV_TUNING) {
      console.log(`[LinkPropagation] No changes for child ${child.id}, skipping`);
    }
    return;
  }

  if (melodyChanged) {
    updates.melody = newMelody;
  }

  // Commit to store
  useLocaleStore.getState().updateRobot(localeId, child.id, updates);

  // Sync AudioEngine synchronously — the Zustand subscriber runs on the main
  // thread, outside any Transport tick, so direct calls are safe here.
  const audioChanged = 'audioAttributes' in updates;
  if (audioChanged) {
    // Re-read the freshest robot state after the store update.
    const fresh = useLocaleStore.getState().getRobotById(localeId, child.id);
    if (fresh) reReserveVoice(fresh);
  }
  if (melodyChanged) {
    reRegisterMelody(child.id, newMelody);
  }

  if (DEV_TUNING) {
    console.log(
      `[LinkPropagation] Propagated to child ${child.id} from parent ${parent.id}`,
      Object.keys(updates),
    );
  }
}

// ========================================
// SUBSCRIBER
// ========================================

let previousRobots: Record<string, Robot[]> = {};
let unsubscribe: (() => void) | null = null;

/**
 * Process a locale's robots: detect parents that changed inherited fields and
 * propagate updates to their linked children in topological order.
 */
function handleLocaleRobotChange(
  localeId: string,
  nextRobots: Robot[],
  prevRobots: Robot[],
): void {
  const prevMap = new Map(prevRobots.map((r) => [r.id, r]));

  // Find robots whose inherited fields changed (these are potential parents).
  const changedIds = new Set<string>();
  for (const robot of nextRobots) {
    const prev = prevMap.get(robot.id);
    if (!prev) {
      // Newly spawned robots: if they have a parent, trigger propagation from
      // the parent to this child so it inherits immediately.
      if (robot.linkedRobotId) {
        changedIds.add(robot.linkedRobotId);
      }
      continue;
    }
    // Check if any inherited scalar field changed on this robot
    const inherited = INHERITED_SCALAR_FIELDS as ReadonlyArray<keyof Robot>;
    const scalarChanged = inherited.some(
      (f) => JSON.stringify(robot[f]) !== JSON.stringify(prev[f]),
    );
    const melodyChanged =
      JSON.stringify(robot.melody) !== JSON.stringify(prev.melody);
    if (scalarChanged || melodyChanged) {
      changedIds.add(robot.id);
    }
  }

  if (changedIds.size === 0) return;

  // Only proceed if any changed robot actually has children.
  const hasChildren = nextRobots.some(
    (r) => r.linkedRobotId && changedIds.has(r.linkedRobotId),
  );
  if (!hasChildren) return;

  const queue = buildPropagationQueue(nextRobots, changedIds);
  if (queue.length === 0) return;

  const robotMap = new Map(nextRobots.map((r) => [r.id, r]));

  for (const { childId, parentId } of queue) {
    const child = robotMap.get(childId);
    // After each updateRobot call above, the store has been updated but our
    // local robotMap snapshot is stale for that child — re-read from store so
    // grandchildren receive the already-propagated state.
    const freshParent =
      useLocaleStore.getState().getRobotById(localeId, parentId) ??
      robotMap.get(parentId);
    const freshChild =
      useLocaleStore.getState().getRobotById(localeId, childId) ?? child;

    if (!freshParent || !freshChild) continue;
    propagateToChild(localeId, freshChild, freshParent);
  }
}

// ========================================
// PUBLIC API
// ========================================

/**
 * Start the link propagation subscriber. Subscribes to `localeStore` and
 * propagates parent → child inheritance whenever inherited fields change.
 *
 * Safe to call multiple times — subsequent calls are no-ops if already mounted.
 * Call `teardownLinkPropagation()` to stop (e.g. in tests).
 */
export function initLinkPropagation(): void {
  if (unsubscribe !== null) return;

  // Seed the snapshot with the current state so we don't fire on first mount.
  const initial = useLocaleStore.getState().locales;
  for (const [localeId, locale] of Object.entries(initial)) {
    previousRobots[localeId] = [...(locale.robots ?? [])];
  }

  unsubscribe = useLocaleStore.subscribe((state) => {
    for (const [localeId, locale] of Object.entries(state.locales)) {
      const prev = previousRobots[localeId] ?? [];
      const next = locale.robots ?? [];

      // Quick reference-equality skip before doing any work.
      if (prev !== next) {
        handleLocaleRobotChange(localeId, next, prev);
        previousRobots[localeId] = next;
      }
    }
    // Clean up snapshots for removed locales.
    for (const localeId of Object.keys(previousRobots)) {
      if (!state.locales[localeId]) {
        delete previousRobots[localeId];
      }
    }
  });

  if (DEV_TUNING) console.log('[LinkPropagation] Subscriber mounted');
}

/**
 * Tear down the link propagation subscriber. Used in tests and cleanup paths.
 */
export function teardownLinkPropagation(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    previousRobots = {};
    if (DEV_TUNING) console.log('[LinkPropagation] Subscriber torn down');
  }
}
