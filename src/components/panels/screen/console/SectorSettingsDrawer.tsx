import { useState } from 'react';
import { usePlanetStore, selectCurrentPlanet } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import { retransmitWorld, type RetransmitInput } from '@/systems/worldTransition';
import { generateRandomPlanetName } from '@/utils/seedUtils';
import { TextInput } from '@/components/ui/controls/TextInput';
import { CoordsInput } from '@/components/ui/controls/CoordsInput';
import { Button } from '@/components/ui/controls/Button';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import {
  PLANET_NAME_SCHEMA,
  COORDS_SCHEMA,
  RETRANSMIT_SCHEMA,
  STATUS_HEADER_SCHEMA,
  PLANET_NAME_PRESETS,
  COORDINATE_PRESETS,
} from '@/data/sectorSettingsConfig';
import type { ButtonSchema } from '@/types/controls';
import './SectorSettingsDrawer.css';

const RANDOM_PLANET_SCHEMA: ButtonSchema = { id: 'sectorSettings.randomPlanet', type: 'button', humanLabel: 'Random' };
const RANDOM_COORDS_SCHEMA: ButtonSchema = { id: 'sectorSettings.randomCoords', type: 'button', humanLabel: 'Random' };

/** A random integer coordinate pair — no existing utility covers this
 *  (unlike planet names, which reuse seedUtils' generateRandomPlanetName).
 *  Range is arbitrary but generous enough to feel like "a different plot,"
 *  not a variation on the current one. */
function randomCoordinate(): number {
  return Math.round((Math.random() - 0.5) * 400);
}

function presetSchema(idSuffix: string, humanLabel: string): ButtonSchema {
  return { id: `sectorSettings.preset.${idSuffix}`, type: 'button', humanLabel };
}

/**
 * Sector Settings console panel — Planet Calibration (reseed the planet) and
 * Plot Tuning (jump to new locale coordinates), sharing one Retransmit
 * action. Preset buttons only populate their own field(s); they never submit
 * on their own — the user still presses Retransmit separately, per
 * docs/specs/SECTOR_SETTINGS.md §5.
 */
export function SectorSettingsDrawer() {
  const currentPlanet = usePlanetStore(selectCurrentPlanet);
  const currentLocaleId = currentPlanet?.currentLocaleId;
  const currentLocale = useLocaleStore((s) => (currentLocaleId ? s.locales[currentLocaleId] : undefined));

  const [planetNameDraft, setPlanetNameDraft] = useState(currentPlanet?.name ?? '');
  const [coordsDraft, setCoordsDraft] = useState(currentLocale?.coordinates ?? { x: 0, y: 0 });

  // Reset the drafts when the store's "current" values actually change (e.g.
  // right after a retransmit resolves) — done during render, comparing
  // against the last-seen value, rather than via a useEffect (React's
  // recommended pattern for "adjust state when a prop/store value changes";
  // an effect here would cause an extra, avoidable render pass).
  const [lastSeenPlanetName, setLastSeenPlanetName] = useState(currentPlanet?.name);
  if (currentPlanet?.name !== lastSeenPlanetName) {
    setLastSeenPlanetName(currentPlanet?.name);
    setPlanetNameDraft(currentPlanet?.name ?? '');
  }

  const [lastSeenCoords, setLastSeenCoords] = useState(currentLocale?.coordinates);
  if (currentLocale && currentLocale.coordinates !== lastSeenCoords) {
    setLastSeenCoords(currentLocale.coordinates);
    setCoordsDraft(currentLocale.coordinates);
  }

  function handleRetransmit() {
    const input: RetransmitInput = {};
    if (planetNameDraft !== (currentPlanet?.name ?? '')) {
      input.planetName = planetNameDraft;
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
          {currentPlanet?.name ?? '—'} · ({currentLocale?.coordinates.x ?? '—'}, {currentLocale?.coordinates.y ?? '—'})
        </div>
      </div>

      <div className="sector-settings-drawer__section">
        <TextInput schema={PLANET_NAME_SCHEMA} value={planetNameDraft} onChange={setPlanetNameDraft} />
        <div className="sector-settings-drawer__presets">
          {PLANET_NAME_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              schema={presetSchema(`planet.${preset.label}`, preset.label)}
              onClick={() => setPlanetNameDraft(preset.value)}
            />
          ))}
          <Button schema={RANDOM_PLANET_SCHEMA} onClick={() => setPlanetNameDraft(generateRandomPlanetName())} />
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
    </div>
  );
}

export default SectorSettingsDrawer;
