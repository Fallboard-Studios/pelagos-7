// ========================================
// IMPORTS
// ========================================
import type { TextInputSchema, CoordsInputSchema, ButtonSchema, DualLabelSchema, ToggleSchema } from '../types/controls';

// ========================================
// TYPES
// ========================================

/** One preset entry — a human-facing label paired with the value clicking it
 *  fills into the relevant field(s). Clicking a preset ONLY populates its
 *  field(s); it never calls retransmitWorld itself — the user still has to
 *  press Retransmit separately. */
export interface SectorPreset<T> {
  label: string;
  value: T;
}

// ========================================
// SCHEMAS
// ========================================

export const ATTENUATION_STYLE_SCHEMA: TextInputSchema = {
  id: 'sectorSettings.planetName',
  type: 'textInput',
  loreLabel: 'ATTENUATION SEED',
  humanLabel: 'Attenuation Style',
  placeholder: 'Enter a new attenuation style…',
  // Otherwise unbounded end-to-end — stored in state, hashed into a seed
  // (deriveAttenuationStyleSeed), and rendered in the status line. 128 is generous for
  // a lore-flavored name while ruling out pathological input.
  maxLength: 128,
};

export const COORDS_SCHEMA: CoordsInputSchema = {
  id: 'sectorSettings.coordinates',
  type: 'coordsInput',
  loreLabel: 'PLOT VECTOR',
  humanLabel: 'Coordinates',
};

export const RETRANSMIT_SCHEMA: ButtonSchema = {
  id: 'sectorSettings.retransmit',
  type: 'button',
  loreLabel: 'RETRANSMIT',
  humanLabel: 'Retransmit',
};

export const STATUS_HEADER_SCHEMA: DualLabelSchema = {
  id: 'sectorSettings.status',
  type: 'dualLabel',
  loreLabel: 'ACTIVE TRANSMISSION',
  humanLabel: 'Current Sector',
};

/**
 * Gates both Audio Swell pools (global + robot, including company-wide) —
 * see startAudioSwells/stopAudioSwells (systems/audioSwells.ts), which read
 * audioStore's audioSwellsEnabled directly each tick. A plain UI preference,
 * not part of the Attenuation Style/Coordinates retransmit flow above: it
 * takes effect immediately on click, is never reset by retransmitting, and
 * is never seeded.
 */
export const AUDIO_SWELLS_ENABLED_SCHEMA: ToggleSchema = {
  id: 'sectorSettings.audioSwellsEnabled',
  type: 'toggle',
  loreLabel: 'ENABLE DYNAMIC PING DEPLOYMENT',
  humanLabel: 'Enable automatic effects',
};

// ========================================
// PRESETS
// ========================================

/** Hand-curated, lore-flavored Attenuation Style name presets — static data, not
 *  user-saved favorites. */
export const ATTENUATION_STYLE_PRESETS: SectorPreset<string>[] = [
  { label: 'Kryndara', value: 'Kryndara' },
  { label: 'Vessport Null', value: 'Vessport Null' },
  { label: 'Halcyon Drift', value: 'Halcyon Drift' },
  { label: 'The Rusting', value: 'The Rusting' },
];

/** Hand-curated, interesting coordinate-pair presets. 'Null Basin' — (0, 0) —
 *  is included deliberately: the single worst-case coordinate from the
 *  pre-decoupling dead-zone bug, now safe to offer as an ordinary preset. */
export const COORDINATE_PRESETS: SectorPreset<{ x: number; y: number }>[] = [
  { label: 'The Trench', value: { x: -42, y: 108 } },
  { label: 'Shallow Reach', value: { x: 7, y: 3 } },
  { label: 'Far Shoal', value: { x: 219, y: -64 } },
  { label: 'Null Basin', value: { x: 0, y: 0 } },
];
