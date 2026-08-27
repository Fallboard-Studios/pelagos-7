import { getStatusLightColor } from '@/utils/statusLightColors';
import { AUDIO_STATUS_COLOR_MAP, AUDIO_MODE_LABELS } from '@/data/robotSelectionConfig';
import type { Robot } from '@/types/Robot';
import './AudioStatusBadge.css';

interface AudioStatusBadgeProps {
  audioMode: NonNullable<Robot['audioMode']>;
}

/**
 * Read-only colored dot for a robot's diagnostic audio routing (Roadmap Phase 8) — off=purple,
 * mute=red, solo=green, highlight=amber, sourced from statusLightColors.ts (colorTheme.json)
 * rather than hardcoded hex. Never writes audioMode — editing stays RobotAudioTab.tsx's job.
 * role="status" (not "img") to match PowerRockerSwitch's existing precedent for "a colored dot
 * that is the only accessible representation of a state" — code review Consider finding.
 */
export function AudioStatusBadge({ audioMode }: AudioStatusBadgeProps) {
  const { color, glow } = getStatusLightColor(AUDIO_STATUS_COLOR_MAP[audioMode]);
  const label = AUDIO_MODE_LABELS[audioMode];
  return (
    <span
      className="audio-status-badge"
      role="status"
      aria-label={`${label.humanLabel} (${label.loreLabel})`}
      style={{ color, boxShadow: `0 0 4px 1px ${glow}` }}
    />
  );
}

export default AudioStatusBadge;
