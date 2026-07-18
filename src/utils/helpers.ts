import { DEV_TUNING } from '../constants';

export function swallow(err: unknown, ctx?: string) {
  // Only log when DEV_TUNING is enabled in callers (keeps runtime cost minimal).
  // Callers should import DEV_TUNING if they want to gate logs locally.
  try {
    console.warn(`[swallow] ${ctx ?? 'ignored error'}`, err);
  } catch {
    // fall through
  }
}

/** Log informational messages only when DEV_TUNING is enabled. */
export function devLog(...args: unknown[]): void {
  if (DEV_TUNING) console.log(...args);
}

/** Warn (e.g. on a caught/swallowed error) only when DEV_TUNING is enabled. */
export function devWarn(...args: unknown[]): void {
  if (DEV_TUNING) console.warn(...args);
}

export const SCREEN_VIEWPORT_ID = 'screen-viewport';

export function getScreenViewportDomNode(): HTMLElement | null {
  return document.getElementById(SCREEN_VIEWPORT_ID);
}