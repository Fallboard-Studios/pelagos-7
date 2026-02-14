// ========================================
// TYPES
// ========================================
type RefMap = Map<string, SVGGElement>;

// ========================================
// STATE
// ========================================
const refs: RefMap = new Map();

// ========================================
// EXPORTS
// ========================================

/**
 * Store a reference to an SVG element for GSAP animations
 * Key format: 'robot-{id}', 'swim-{id}', etc.
 */
export function setRef(key: string, element: SVGGElement): void {
  refs.set(key, element);
}

/**
 * Get a stored reference to an SVG element
 * Returns undefined if not found
 */
export function getRef(key: string): SVGGElement | undefined {
  return refs.get(key);
}

/**
 * Remove a reference (for cleanup)
 */
export function deleteRef(key: string): void {
  refs.delete(key);
}

/**
 * Clear all references (for testing/reset)
 */
export function clearRefs(): void {
  refs.clear();
}
