export function swallow(err: unknown, ctx?: string) {
  // Only log when DEV_TUNING is enabled in callers (keeps runtime cost minimal).
  // Callers should import DEV_TUNING if they want to gate logs locally.
  try {
    console.warn(`[swallow] ${ctx ?? 'ignored error'}`, err);
  } catch {
    // fall through
  }
}

export const SCREEN_VIEWPORT_ID = 'screen-viewport';

export function getScreenViewportDomNode(): HTMLElement | null {
  return document.getElementById(SCREEN_VIEWPORT_ID);
}