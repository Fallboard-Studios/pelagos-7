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
import type { OscillatorLayer } from '@/types/layeredAudio';

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
    clickTrackActive: firstMember.clickTrackActive ?? false,
    // TODO(PITCH_REPEAT Task 14): swap the literal 0 for DEFAULT_PITCH_REPEAT once
    // melodyGenerator.ts exports it (Task 6) — pulled forward from Task 14 to keep
    // `Required<CompanyOptionsSnapshot>` compiling after Task 3 adds the optional field.
    pitchRepeat: firstMember.pitchRepeat ?? 0,
  };
  return { ...fromRobot, ...lastEditedOptions };
}

/**
 * Diffs two versions of the same compound control value (an ADSREnvelope, an LfoValue, a
 * StepperWithToggleValue, one OscillatorLayer) and returns a patch containing only the one field
 * that actually changed. Every compound control in this codebase (Lfo, PingContourDrawer,
 * StepperWithToggle, SignatureArrayDrawer's per-layer edits) builds its onChange payload as
 * `{ ...currentValue, oneField: newValue }` — the *whole* object, with the touched value's shared
 * baseline (CompanyOptionsSection's `resolved`) spread across every other field. Broadcasting that
 * whole object to every member would silently overwrite each member's own untouched sub-fields
 * with whatever the panel's baseline happened to hold, rather than leaving them alone. Callers
 * diff `resolved`'s old value against the new one to find the single changed key, then merge just
 * that key onto each member's own current value before broadcasting — see
 * CompanyOptionsSection.tsx and docs/COMPANIES.md "Editing Semantics: Broadcast, Not Link".
 */
export function diffCompoundField<T extends object>(prev: T, next: T): Partial<T> {
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (!Object.is(prev[key], next[key])) return { [key]: next[key] } as Partial<T>;
  }
  return {};
}

/** Same idea as diffCompoundField, but for the 3-slot Signature Array `layers` list — finds which
 *  one layer index changed and, within it, which one field, so a broadcast can patch just that
 *  field onto each member's own layer instead of overwriting all 3 layers wholesale. Returns null
 *  if no field differs anywhere (defensive; every real edit changes exactly one). */
export function diffLayerField(
  prev: OscillatorLayer[],
  next: OscillatorLayer[]
): { idx: number; patch: Partial<OscillatorLayer> } | null {
  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (!p || !n) continue;
    const patch = diffCompoundField(p, n);
    if (Object.keys(patch).length > 0) return { idx: i, patch };
  }
  return null;
}
