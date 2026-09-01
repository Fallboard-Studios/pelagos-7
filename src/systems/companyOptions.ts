/**
 * The per-field merge (Roadmap Phase 10) that makes "revert to the last state it was in when
 * last editing, or the first member robot's options if unused" true without a special-cased
 * first-edit branch: an untouched field falls back live to the first member's current value;
 * a field that HAS been edited reads from its own recorded snapshot instead. See
 * docs/specs/COMPANIES.md §7.1 for why this is a deliberate simplification over literally
 * cloning the first member's values into the snapshot at first-edit time — functionally
 * identical from the user's perspective, without ever storing a stale duplicate of a field that
 * was never actually edited.
 *
 * Takes the snapshot directly (`Company.lastEditedOptions`, or, for the "All" selection —
 * highlighting every robot regardless of company, CompanyButtonRow's All button —
 * `Locale.allRobotsLastEditedOptions`) rather than a whole `Company`, since that's genuinely all
 * this function ever reads; both CompanyOptionsSection call sites share this one resolver.
 */
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import { VOLUME_LFO_TARGET } from '@/data/robotOptionsConfig';
import { DEFAULT_RHYTHMIC_DENSITY, DEFAULT_RHYTHMIC_MOTIF_LENGTH, DEFAULT_NOTE_VARIANCE } from '@/engine/melodyGenerator';
import type { CompanyOptionsSnapshot } from '@/types/Company';
import type { Robot } from '@/types/Robot';

export function resolveCompanyOptions(lastEditedOptions: CompanyOptionsSnapshot | undefined, firstMember: Robot): Required<CompanyOptionsSnapshot> {
  const fromRobot: Required<CompanyOptionsSnapshot> = {
    audioMode: firstMember.audioMode ?? 'none',
    masterVolume: firstMember.masterVolume,
    volumeLfo: firstMember.lfoSettings?.[VOLUME_LFO_TARGET] ?? { ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET], active: false },
    rhythmicDensity: firstMember.rhythmicDensity ?? DEFAULT_RHYTHMIC_DENSITY,
    rhythmicMotifLength: firstMember.rhythmicMotifLength ?? DEFAULT_RHYTHMIC_MOTIF_LENGTH,
    noteVariance: firstMember.noteVariance ?? DEFAULT_NOTE_VARIANCE,
    octaveRange: firstMember.octaveRange,
    adsr: firstMember.audioAttributes.adsr,
    layers: firstMember.audioAttributes.layers ?? [],
    lfoSettings: firstMember.lfoSettings ?? {},
  };
  return { ...fromRobot, ...lastEditedOptions };
}
