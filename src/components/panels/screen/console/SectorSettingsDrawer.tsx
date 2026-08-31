import { useState } from 'react';
import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useAudioStore } from '@/stores/audioStore';
import { retransmitWorld, type RetransmitInput } from '@/systems/worldTransition';
import { generateRandomAttenuationStyleName } from '@/utils/seedUtils';
import { TextInput } from '@/components/ui/controls/TextInput';
import { CoordsInput } from '@/components/ui/controls/CoordsInput';
import { Button } from '@/components/ui/controls/Button';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { Toggle } from '@/components/ui/controls/Toggle';
import {
  ATTENUATION_STYLE_SCHEMA,
  COORDS_SCHEMA,
  RETRANSMIT_SCHEMA,
  STATUS_HEADER_SCHEMA,
  AUDIO_SWELLS_ENABLED_SCHEMA,
  ATTENUATION_STYLE_PRESETS,
  COORDINATE_PRESETS,
} from '@/data/sectorSettingsConfig';
import type { ButtonSchema } from '@/types/controls';
import './SectorSettingsDrawer.css';

const RANDOM_ATTENUATION_STYLE_SCHEMA: ButtonSchema = { id: 'sectorSettings.randomPlanet', type: 'button', humanLabel: 'Random' };
const RANDOM_COORDS_SCHEMA: ButtonSchema = { id: 'sectorSettings.randomCoords', type: 'button', humanLabel: 'Random' };

/** A random integer coordinate pair — no existing utility covers this
 *  (unlike Attenuation Style names, which reuse seedUtils' generateRandomAttenuationStyleName).
 *  Range is arbitrary but generous enough to feel like "a different plot,"
 *  not a variation on the current one. */
function randomCoordinate(): number {
  return Math.round((Math.random() - 0.5) * 400);
}

function presetSchema(idSuffix: string, humanLabel: string): ButtonSchema {
  return { id: `sectorSettings.preset.${idSuffix}`, type: 'button', humanLabel };
}

/**
 * Sector Settings console panel — Attenuation Style (reseed the Attenuation
 * Style) and Plot Tuning (jump to new locale coordinates), sharing one
 * Retransmit action. Preset buttons only populate their own field(s); they
 * never submit on their own — the user still presses Retransmit separately,
 * per docs/specs/SECTOR_SETTINGS.md §5.
 */
export function SectorSettingsDrawer() {
  const currentAttenuationStyle = useAttenuationStyleStore(selectCurrentAttenuationStyle);
  const currentLocaleId = currentAttenuationStyle?.currentLocaleId;
  const currentLocale = useLocaleStore((s) => (currentLocaleId ? s.locales[currentLocaleId] : undefined));
  const audioSwellsEnabled = useAudioStore((s) => s.audioSwellsEnabled);
  const setAudioSwellsEnabled = useAudioStore((s) => s.setAudioSwellsEnabled);

  const [attenuationStyleNameDraft, setAttenuationStyleNameDraft] = useState(currentAttenuationStyle?.name ?? '');
  const [coordsDraft, setCoordsDraft] = useState(currentLocale?.coordinates ?? { x: 0, y: 0 });

  // Reset the drafts when the store's "current" values actually change (e.g.
  // right after a retransmit resolves) — done during render, comparing
  // against the last-seen value, rather than via a useEffect (React's
  // recommended pattern for "adjust state when a prop/store value changes";
  // an effect here would cause an extra, avoidable render pass).
  const [lastSeenAttenuationStyleName, setLastSeenAttenuationStyleName] = useState(currentAttenuationStyle?.name);
  if (currentAttenuationStyle?.name !== lastSeenAttenuationStyleName) {
    setLastSeenAttenuationStyleName(currentAttenuationStyle?.name);
    setAttenuationStyleNameDraft(currentAttenuationStyle?.name ?? '');
  }

  const [lastSeenCoords, setLastSeenCoords] = useState(currentLocale?.coordinates);
  if (currentLocale && currentLocale.coordinates !== lastSeenCoords) {
    setLastSeenCoords(currentLocale.coordinates);
    setCoordsDraft(currentLocale.coordinates);
  }

  function handleRetransmit() {
    const input: RetransmitInput = {};
    if (attenuationStyleNameDraft !== (currentAttenuationStyle?.name ?? '')) {
      input.attenuationStyleName = attenuationStyleNameDraft;
    }
    if (currentLocale && (coordsDraft.x !== currentLocale.coordinates.x || coordsDraft.y !== currentLocale.coordinates.y)) {
      input.coordinates = coordsDraft;
    }
    retransmitWorld(input);
  }

  return (
    <div className="sector-settings-drawer">
      <div className="sector-settings-drawer__status">
        <DualLabel loreLabel={STATUS_HEADER_SCHEMA.loreLabel} humanLabel={STATUS_HEADER_SCHEMA.humanLabel} />
        <div className="sector-settings-drawer__status-line">
          {currentAttenuationStyle?.name ?? '—'} · ({currentLocale?.coordinates.x ?? '—'}, {currentLocale?.coordinates.y ?? '—'})
        </div>
      </div>

      <div className="sector-settings-drawer__section">
        <TextInput schema={ATTENUATION_STYLE_SCHEMA} value={attenuationStyleNameDraft} onChange={setAttenuationStyleNameDraft} />
        <div className="sector-settings-drawer__presets">
          {ATTENUATION_STYLE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              schema={presetSchema(`planet.${preset.label}`, preset.label)}
              onClick={() => setAttenuationStyleNameDraft(preset.value)}
            />
          ))}
          <Button schema={RANDOM_ATTENUATION_STYLE_SCHEMA} onClick={() => setAttenuationStyleNameDraft(generateRandomAttenuationStyleName())} />
        </div>
      </div>

      <div className="sector-settings-drawer__section">
        <CoordsInput schema={COORDS_SCHEMA} value={coordsDraft} onChange={setCoordsDraft} />
        <div className="sector-settings-drawer__presets">
          {COORDINATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              schema={presetSchema(`coords.${preset.label}`, preset.label)}
              onClick={() => setCoordsDraft(preset.value)}
            />
          ))}
          <Button
            schema={RANDOM_COORDS_SCHEMA}
            onClick={() => setCoordsDraft({ x: randomCoordinate(), y: randomCoordinate() })}
          />
        </div>
      </div>

      <div className="sector-settings-drawer__retransmit">
        <Button schema={RETRANSMIT_SCHEMA} onClick={handleRetransmit} />
      </div>

      <div className="sector-settings-drawer__section">
        <Toggle schema={AUDIO_SWELLS_ENABLED_SCHEMA} value={audioSwellsEnabled} onChange={setAudioSwellsEnabled} />
      </div>
    </div>
  );
}

export default SectorSettingsDrawer;
