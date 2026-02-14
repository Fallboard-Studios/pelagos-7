// ========================================
// IMPORTS
// ========================================
import type { Vec2 } from '../types/Vec2';
import type { Robot, AudioAttributes, SynthType } from '../types/Robot';
import { RobotState } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import { useOceanStore } from '../stores/oceanStore';

// ========================================
// CONSTANTS
// ========================================
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const SPAWN_EDGE_MARGIN = 100; // Spawn near edges (within 100px of boundaries)

// ADSR ranges (typical synth values)
const ATTACK_RANGE = { min: 0.01, max: 0.5 };
const DECAY_RANGE = { min: 0.1, max: 1.5 };
const SUSTAIN_RANGE = { min: 0.3, max: 0.9 };
const RELEASE_RANGE = { min: 0.2, max: 1.2 };

// Pitch ranges (Hz) - determines robot scale
const PITCH_RANGES = [
  { min: 80, max: 150 },   // Low (large robots)
  { min: 250, max: 450 },  // Mid (normal robots)
  { min: 700, max: 900 },  // High (small robots)
];

// Filter frequency range
const FILTER_FREQ_RANGE = { min: 400, max: 2500 };

// Synth types
const SYNTH_TYPES: SynthType[] = ['AMSynth', 'FMSynth', 'PolySynth', 'MembraneSynth'];

// ========================================
// EXPORTS
// ========================================

/**
 * Generate random spawn position near world edges
 * Robots spawn from outside and swim inward
 */
export function generateSpawnPosition(): Vec2 {
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

  switch (edge) {
    case 0: // Top edge
      return {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * SPAWN_EDGE_MARGIN,
      };
    case 1: // Right edge
      return {
        x: WORLD_WIDTH - Math.random() * SPAWN_EDGE_MARGIN,
        y: Math.random() * WORLD_HEIGHT,
      };
    case 2: // Bottom edge
      return {
        x: Math.random() * WORLD_WIDTH,
        y: WORLD_HEIGHT - Math.random() * SPAWN_EDGE_MARGIN,
      };
    case 3: // Left edge
    default:
      return {
        x: Math.random() * SPAWN_EDGE_MARGIN,
        y: Math.random() * WORLD_HEIGHT,
      };
  }
}

/**
 * Generate random audio attributes
 * Controls both sound synthesis and visual appearance
 */
export function generateAudioAttributes(): AudioAttributes {
  // Random synth type
  const synthType = SYNTH_TYPES[Math.floor(Math.random() * SYNTH_TYPES.length)];

  // Random ADSR envelope
  const adsr = {
    attack: ATTACK_RANGE.min + Math.random() * (ATTACK_RANGE.max - ATTACK_RANGE.min),
    decay: DECAY_RANGE.min + Math.random() * (DECAY_RANGE.max - DECAY_RANGE.min),
    sustain: SUSTAIN_RANGE.min + Math.random() * (SUSTAIN_RANGE.max - SUSTAIN_RANGE.min),
    release: RELEASE_RANGE.min + Math.random() * (RELEASE_RANGE.max - RELEASE_RANGE.min),
  };

  // Random pitch range (determines visual scale)
  const pitchRange = PITCH_RANGES[Math.floor(Math.random() * PITCH_RANGES.length)];

  // Random filter frequency (determines detail level)
  const filterFreq =
    FILTER_FREQ_RANGE.min +
    Math.random() * (FILTER_FREQ_RANGE.max - FILTER_FREQ_RANGE.min);

  // Random reverb amount
  const reverb = Math.random();

  return {
    synthType,
    adsr,
    pitchRange,
    filterFreq,
    reverb,
  };
}

/**
 * Spawn a new robot with randomized attributes
 * Enforces MAX_ROBOTS limit and registers melody with AudioEngine
 */
export function spawnRobot(): void {
  const { robots, settings } = useOceanStore.getState();

  // Enforce MAX_ROBOTS limit
  if (robots.length >= settings.maxRobots) {
    console.log(`[SpawnSystem] Max robots reached (${settings.maxRobots}), skipping spawn`);
    return;
  }

  // Generate robot attributes
  const robot: Robot = {
    id: crypto.randomUUID(),
    state: RobotState.Idle,
    position: generateSpawnPosition(),
    destination: null,
    melody: generateMelodyForRobot(),
    audioAttributes: generateAudioAttributes(),
  };

  // Add to store
  useOceanStore.getState().addRobot(robot);

  // Register melody with AudioEngine
  AudioEngine.registerRobotMelody(robot.id, robot.melody);

  console.log(`[SpawnSystem] Spawned robot ${robot.id} at (${Math.round(robot.position.x)}, ${Math.round(robot.position.y)})`);
}
