/**
 * Robot Selection card content, resolving docs/tasks/ROBOT_SELECTION.md Task 6 (Roadmap
 * Phase 8). ROBOT_SELECTION_ROW_SCHEMAS's five entries use the exact lore/human pairs already
 * confirmed in docs/reference/ROBOT_DATA_GRID.md (Robot Name/Job Data/Battery Data/Docked
 * Status/Audio Setting). The per-value label maps below (JOB_TYPE_LABELS/
 * DOCKING_STATE_LABELS/AUDIO_MODE_LABELS) are best-guess drafts — the grid only defines
 * category-level pairs, not per-value ones — appended to ROBOT_DATA_GRID.md as drafts pending
 * review (see docs/tasks/ROBOT_SELECTION.md Task 12).
 */
import type { DualLabelSchema } from '@/types/controls';
import type { JobType, DockingState, Robot } from '@/types/Robot';
import type { StatusLightState } from '@/utils/statusLightColors';

// ========================================
// ROW SCHEMAS
// ========================================

export const ROBOT_SELECTION_ROW_SCHEMAS = {
  name: { id: 'robotSelection.name', type: 'dualLabel', loreLabel: 'ROBOT IDENTIFIER', humanLabel: 'Robot Name' },
  job: { id: 'robotSelection.job', type: 'dualLabel', loreLabel: 'ASSIGNED PROTOCOL', humanLabel: 'Job Data' },
  battery: { id: 'robotSelection.battery', type: 'dualLabel', loreLabel: 'POWER CELL STATUS', humanLabel: 'Battery Data' },
  docking: { id: 'robotSelection.docking', type: 'dualLabel', loreLabel: 'DOCKING STATE', humanLabel: 'Docked Status' },
  audio: { id: 'robotSelection.audio', type: 'dualLabel', loreLabel: 'PROBE DIAGNOSTICS', humanLabel: 'Audio Setting' },
} satisfies Record<string, DualLabelSchema>;

// ========================================
// VALUE LABELS (draft — pending review, see ROBOT_DATA_GRID.md)
// ========================================

interface ValueLabel {
  loreLabel: string;
  humanLabel: string;
}

export const JOB_TYPE_LABELS: Record<JobType, ValueLabel> = {
  ventExtraction: { loreLabel: 'VOLATILE VENT EXTRACTION', humanLabel: 'Vent Extraction' },
  acousticSurvey: { loreLabel: 'HIGH-ALTITUDE ACOUSTIC SURVEY', humanLabel: 'Acoustic Survey' },
  structuralInspection: { loreLabel: 'STRUCTURAL INTEGRITY INSPECTION', humanLabel: 'Structural Inspection' },
  fluidMonitoring: { loreLabel: 'SUBSTATION FLUID MONITORING', humanLabel: 'Fluid Monitoring' },
};

/** Shown in the Job Data row for a robot with no `job` yet (Docked/Docking/Departing). */
export const UNASSIGNED_JOB_LABEL: ValueLabel = { loreLabel: 'NO PROTOCOL ASSIGNED', humanLabel: 'Unassigned' };

export const DOCKING_STATE_LABELS: Record<DockingState, ValueLabel> = {
  docked: { loreLabel: 'DOCKED', humanLabel: 'Docked' },
  docking: { loreLabel: 'DOCKING', humanLabel: 'Docking' },
  departing: { loreLabel: 'DEPARTING', humanLabel: 'Departing' },
  active: { loreLabel: 'ACTIVE', humanLabel: 'Active' },
};

type AudioMode = NonNullable<Robot['audioMode']>;

export const AUDIO_MODE_LABELS: Record<AudioMode, ValueLabel> = {
  none: { loreLabel: 'OFFLINE', humanLabel: 'Off' },
  mute: { loreLabel: 'SILENCED', humanLabel: 'Mute' },
  solo: { loreLabel: 'ISOLATED', humanLabel: 'Solo' },
  highlight: { loreLabel: 'PRIORITIZED', humanLabel: 'Highlight' },
};

/** off=purple, mute=red, solo=green, highlight=amber — confirmed during intake. */
export const AUDIO_STATUS_COLOR_MAP: Record<AudioMode, StatusLightState> = {
  none: 'purple',
  mute: 'red',
  solo: 'green',
  highlight: 'amber',
};
