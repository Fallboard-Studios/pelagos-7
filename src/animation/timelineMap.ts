// ========================================
// IMPORTS
// ========================================
import type { TimelineLite } from 'gsap';

// ========================================
// TYPES
// ========================================
type Timeline = TimelineLite;

// ========================================
// MODULE STATE
// ========================================
export const timelineMap = new Map<string, Timeline>();

// ========================================
// EXPORTS
// ========================================

/**
 * Store a timeline in the map. If a timeline with the same ID exists,
 * it will be killed first to prevent memory leaks.
 */
export function setTimeline(id: string, timeline: Timeline): void {
  // Kill any existing timeline with this ID
  const existing = timelineMap.get(id);
  if (existing) {
    existing.kill();
  }

  timelineMap.set(id, timeline);
}

/**
 * Retrieve a timeline from the map.
 * Returns undefined if not found.
 */
export function getTimeline(id: string): Timeline | undefined {
  return timelineMap.get(id);
}

/**
 * Kill a timeline and remove it from the map.
 * Safe to call even if timeline doesn't exist.
 */
export function killTimeline(id: string): void {
  const timeline = timelineMap.get(id);
  if (timeline) {
    timeline.kill();
    timelineMap.delete(id);
  }
}

/**
 * Kill all timelines and clear the map.
 * Useful for cleanup on app shutdown or reset.
 */
export function killAllTimelines(): void {
  timelineMap.forEach((timeline) => {
    timeline.kill();
  });
  timelineMap.clear();
}
