export const GLASS_VIEWPORT_ID = 'glass-viewport';

/**
 * Returns the GlassViewport DOM element for use as a Radix portal container.
 * Works from any position in the component tree.
 */
export function useGlassPortal(): HTMLElement | null {
  return document.getElementById(GLASS_VIEWPORT_ID);
}
