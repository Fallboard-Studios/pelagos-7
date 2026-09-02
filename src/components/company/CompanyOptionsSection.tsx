import { AudioSettingSection, type AudioSettingValue } from '@/components/robot/AudioSettingSection';
import { PingControlsDrawer, type PingControlsValue } from '@/components/robot/PingControlsDrawer';
import { PingContourDrawer } from '@/components/robot/PingContourDrawer';
import { SignatureArrayDrawer, type SignatureArrayValue } from '@/components/robot/SignatureArrayDrawer';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { resolveCompanyOptions, diffCompoundField, diffLayerField } from '@/systems/companyOptions';
import {
  applyAudioMode, applyVolume, applyVolumeLfo,
  applyDensity, applyMotifLength, applyNoteVariance, applyOctaveMin, applyOctaveMax,
  applyAdsr, applyLayersContinuous, applyLayersStructural, applyLayerLfo, applyClickTrackActive,
} from '@/systems/robotOptionsActions';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import { VOLUME_LFO_TARGET } from '@/data/robotOptionsConfig';
import { LFO_RATE_MIN, LFO_DEPTH_MIN } from '@/types/lfo';
import type { ADSREnvelope } from '@/types/Robot';
import type { CompanyOptionsSnapshot } from '@/types/Company';

import './CompanyOptionsSection.css';

// Placeholder values shown when there's nothing to derive real ones from — "None" selected, or a
// selected company with zero members (nothing to broadcast to, nothing to resolve a baseline
// from). Kept structurally complete (e.g. 3 layer slots, not an empty array) so the panel's
// layout doesn't jump between the disabled and enabled states.
const DISABLED_AUDIO_SETTING: AudioSettingValue = {
  audioMode: 'none',
  masterVolume: 0,
  volumeLfo: { shape: 'sine', rate: LFO_RATE_MIN, depth: LFO_DEPTH_MIN, active: false },
};

const DISABLED_PING_CONTROLS: PingControlsValue = {
  rhythmicDensity: 0,
  rhythmicMotifLength: { active: false, value: 1 },
  noteVariance: { active: false, value: 1 },
  octaveRange: [1, 7],
  clickTrackActive: false,
};

const DISABLED_ADSR: ADSREnvelope = { attack: 0, decay: 0, sustain: 0, release: 0 };

const DISABLED_LAYER = { type: 'sine' as const, gain: 0, detune: 0, phase: 0, active: false };
const DISABLED_SIGNATURE_ARRAY: SignatureArrayValue = {
  layers: [DISABLED_LAYER, DISABLED_LAYER, DISABLED_LAYER],
  lfoSettings: {},
};

/**
 * "Company mode" call site for AudioSettingSection/PingControlsDrawer/PingContourDrawer/
 * SignatureArrayDrawer (Roadmap Phase 10) — the counterpart to RobotOptionsTab's "robot mode."
 * With no company selected, or a selected company with zero members (nothing to derive a
 * baseline from, nothing to broadcast to), every section renders disabled with a placeholder
 * value. With a non-empty company selected, each section's value comes from
 * resolveCompanyOptions(company.lastEditedOptions, members[0]), and every edit broadcasts
 * through the exact same robotOptionsActions functions RobotOptionsTab uses — once per member —
 * then patches only the touched field into the company's own lastEditedOptions snapshot. A
 * company edit is a one-time broadcast, never a standing link: editing a member robot
 * individually afterward (even via its own Robot Options screen) never touches lastEditedOptions
 * and is never reverted by this panel.
 *
 * CompanyButtonRow's "All" option (uiStore.allRobotsSelected) is a third mode, mutually
 * exclusive with selectedCompanyId: `members` becomes every robot in the locale regardless of
 * company (Freelance included), and the broadcast/snapshot machinery reruns identically against
 * that wider set — same resolveCompanyOptions call, same per-member applyXxx loop — just fed
 * `locale.allRobotsLastEditedOptions` instead of a Company's own snapshot, since there is no
 * Company object for "All" to bind to. Deliberately never touches any individual company's
 * lastEditedOptions, and vice versa — the two snapshots are independent.
 *
 * Every compound value (volumeLfo, rhythmicMotifLength, noteVariance, adsr, layers, per-layer
 * lfoSettings) arrives from its drawer as a *whole* replacement object/array built by spreading
 * `resolved` — the panel's own shared baseline — with just the one touched field set (e.g. Ping
 * Contour's Attack slider fires `{ ...adsr, attack: v }`). Broadcasting that whole object to every
 * member would silently overwrite each member's own untouched sub-fields (their own Decay/
 * Sustain/Release, their own other 2 signature layers, etc.) with whatever `resolved` held. Each
 * such handler instead diffs the old vs. new value (diffCompoundField/diffLayerField, both in
 * systems/companyOptions.ts) to find the single field that changed, then merges just that field
 * onto each member's own current value before calling the matching applyXxx — so a broadcast edit
 * only ever touches the one attribute the user actually changed, member by member.
 */
export function CompanyOptionsSection() {
  const localeId = getActiveLocaleId();
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const allRobotsSelected = useUIStore((s) => s.allRobotsSelected);
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  // Subscribe to the raw robots array (a stable reference — Zustand's default equality check is
  // by reference, and this only changes when the store's own robots array does) and filter
  // outside the selector. Filtering *inside* a Zustand selector returns a brand-new array every
  // call, which useSyncExternalStore sees as "always changed" and loops forever re-rendering.
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const allRobotsLastEditedOptions = useLocaleStore((s) => s.locales[localeId]?.allRobotsLastEditedOptions);
  const members = allRobotsSelected ? robots : robots.filter((r) => r.companyId === selectedCompanyId);

  const company = companies.find((c) => c.id === selectedCompanyId);
  const active = allRobotsSelected ? members.length > 0 : Boolean(company) && members.length > 0;
  const lastEditedOptions = allRobotsSelected ? allRobotsLastEditedOptions : company?.lastEditedOptions;
  const resolved = active ? resolveCompanyOptions(lastEditedOptions, members[0]) : undefined;

  function patchSnapshot(partial: Partial<CompanyOptionsSnapshot>) {
    if (allRobotsSelected) {
      useLocaleStore.getState().setLocaleData(localeId, {
        allRobotsLastEditedOptions: { ...allRobotsLastEditedOptions, ...partial },
      });
      return;
    }
    if (!company) return;
    useLocaleStore.getState().updateCompany(localeId, company.id, {
      lastEditedOptions: { ...company.lastEditedOptions, ...partial },
    });
  }

  return (
    <div className="company-options-section">
      <AudioSettingSection
        value={resolved ?? DISABLED_AUDIO_SETTING}
        disabled={!active}
        onAudioModeChange={(mode) => {
          members.forEach((m) => applyAudioMode(m, localeId, mode));
          patchSnapshot({ audioMode: mode });
        }}
        onVolumeChange={(pct) => {
          members.forEach((m) => applyVolume(m, localeId, pct));
          patchSnapshot({ masterVolume: pct / 100 });
        }}
        onVolumeLfoChange={(value) => {
          const patch = resolved ? diffCompoundField(resolved.volumeLfo, value) : value;
          members.forEach((m) => {
            const memberOwn = m.lfoSettings?.[VOLUME_LFO_TARGET] ?? { ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET], active: false };
            applyVolumeLfo(m, localeId, { ...memberOwn, ...patch });
          });
          patchSnapshot({ volumeLfo: value });
        }}
      />

      <PingControlsDrawer
        value={resolved ?? DISABLED_PING_CONTROLS}
        disabled={!active}
        onDensityChange={(v) => {
          members.forEach((m) => applyDensity(m, localeId, v));
          patchSnapshot({ rhythmicDensity: v });
        }}
        onMotifLengthChange={(v) => {
          const patch = resolved ? diffCompoundField(resolved.rhythmicMotifLength, v) : v;
          members.forEach((m) => {
            const memberOwn = resolveCompanyOptions(undefined, m).rhythmicMotifLength;
            applyMotifLength(m, localeId, { ...memberOwn, ...patch });
          });
          patchSnapshot({ rhythmicMotifLength: v });
        }}
        onOctaveMinChange={(v) => {
          members.forEach((m) => applyOctaveMin(m, localeId, v));
          patchSnapshot({ octaveRange: [v, resolved?.octaveRange[1] ?? v] });
        }}
        onOctaveMaxChange={(v) => {
          members.forEach((m) => applyOctaveMax(m, localeId, v));
          patchSnapshot({ octaveRange: [resolved?.octaveRange[0] ?? v, v] });
        }}
        onNoteVarianceChange={(v) => {
          const patch = resolved ? diffCompoundField(resolved.noteVariance, v) : v;
          members.forEach((m) => {
            const memberOwn = resolveCompanyOptions(undefined, m).noteVariance;
            applyNoteVariance(m, localeId, { ...memberOwn, ...patch });
          });
          patchSnapshot({ noteVariance: v });
        }}
        onClickTrackActiveChange={(active) => {
          members.forEach((m) => applyClickTrackActive(m, localeId, active));
          patchSnapshot({ clickTrackActive: active });
        }}
        // No onResetMelody — omitted entirely in company mode, it has no company-scoped meaning.
      />

      <PingContourDrawer
        value={resolved?.adsr ?? DISABLED_ADSR}
        disabled={!active}
        onChange={(adsr) => {
          const patch = resolved ? diffCompoundField(resolved.adsr, adsr) : adsr;
          members.forEach((m) => {
            const memberOwn = resolveCompanyOptions(undefined, m).adsr;
            applyAdsr(m, localeId, { ...memberOwn, ...patch });
          });
          patchSnapshot({ adsr });
        }}
      />

      <SignatureArrayDrawer
        value={resolved ? { layers: resolved.layers, lfoSettings: resolved.lfoSettings } : DISABLED_SIGNATURE_ARRAY}
        disabled={!active}
        onContinuousChange={(layers) => {
          const diff = resolved ? diffLayerField(resolved.layers, layers) : null;
          members.forEach((m) => {
            const memberOwn = resolveCompanyOptions(undefined, m).layers;
            const memberLayers = diff
              ? memberOwn.map((l, i) => (i === diff.idx ? { ...l, ...diff.patch } : l))
              : layers;
            applyLayersContinuous(m, localeId, memberLayers);
          });
          patchSnapshot({ layers });
        }}
        onStructuralChange={(layers) => {
          const diff = resolved ? diffLayerField(resolved.layers, layers) : null;
          members.forEach((m) => {
            const memberOwn = resolveCompanyOptions(undefined, m).layers;
            const memberLayers = diff
              ? memberOwn.map((l, i) => (i === diff.idx ? { ...l, ...diff.patch } : l))
              : layers;
            applyLayersStructural(m, localeId, memberLayers);
          });
          patchSnapshot({ layers });
        }}
        onLfoChange={(target, value) => {
          const oldValue = resolved?.lfoSettings?.[target] ?? { ...DEFAULT_LFO_SETTINGS[target], active: false };
          const patch = diffCompoundField(oldValue, value);
          members.forEach((m) => {
            const memberOwn = m.lfoSettings?.[target] ?? { ...DEFAULT_LFO_SETTINGS[target], active: false };
            applyLayerLfo(m, localeId, target, { ...memberOwn, ...patch });
          });
          patchSnapshot({ lfoSettings: { ...resolved?.lfoSettings, [target]: value } });
        }}
      />
    </div>
  );
}

export default CompanyOptionsSection;
