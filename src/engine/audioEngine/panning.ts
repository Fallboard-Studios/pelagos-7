import { WORLD_WIDTH } from '@/constants';

/**
 * Calculate stereo pan value from a robot's X position.
 * Returns −0.5 (left) to +0.5 (right) mapped from world coordinate [0, WORLD_WIDTH].
 * Reduced range keeps voices more centered for a cohesive mix.
 *
 * @param x - Robot X position in world space
 * @returns Pan value in range [−0.5, +0.5]
 */
export function calculatePanFromPosition(x: number): number {
  return (x / WORLD_WIDTH) * 1 - 0.5;
}
