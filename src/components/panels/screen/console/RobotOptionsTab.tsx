import * as Switch from '@radix-ui/react-switch';
import * as Slider from '@radix-ui/react-slider';

import { useLocaleStore } from '@/stores/localeStore';
import { usePlanetStore } from '@/stores/planetStore';
import { useUIStore } from '@/stores/uiStore';
import { spawnRobot } from '@/systems/spawnSystem';
import type { LocaleSettings } from '@/types/locale';
import './RobotOptionsTab.css';

export function RobotOptionsTab() {
  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');
  const settings = useLocaleStore(
    (s) => s.locales[localeId]?.settings as LocaleSettings | undefined
  );

  const minRobots = settings?.minRobots ?? 2;
  const maxRobots = settings?.maxRobots ?? 12;
  const autoSpawn = settings?.autoSpawn ?? true;
  const spawnFrequency = settings?.spawnFrequency ?? 4;

  function updateSettings(patch: Partial<LocaleSettings>) {
    useLocaleStore.getState().setLocaleData(localeId, {
      settings: { ...(settings ?? {}), ...patch },
    });
  }

  function handleRangeChange([min, max]: number[]) {
    updateSettings({ minRobots: min, maxRobots: max });
  }

  function handleAutoSpawnChange(checked: boolean) {
    updateSettings({ autoSpawn: checked });
  }

  function handleFrequencyChange([value]: number[]) {
    updateSettings({ spawnFrequency: value });
  }

  function handleNewRobot() {
    const beforeIds = new Set(
      (useLocaleStore.getState().getLocaleById(localeId)?.robots ?? []).map((r) => r.id)
    );
    spawnRobot(localeId);
    const afterRobots = useLocaleStore.getState().getLocaleById(localeId)?.robots ?? [];
    const newRobot = afterRobots.find((r) => !beforeIds.has(r.id));
    if (!newRobot) return;
    useUIStore.getState().selectRobot(newRobot.id);
    useUIStore.getState().setActiveConsoleTab('robotEditor');
  }

  return (
    <div className="robot-options-tab" role="region" aria-label="Robot Options">

      {/* Min / Max Robots */}
      <section className="robot-options-tab__section">
        <h3 className="robot-options-tab__label">Robot Count</h3>
        <div className="robot-options-tab__range-display">
          <span>Min: {minRobots}</span>
          <span>Max: {maxRobots}</span>
        </div>
        <Slider.Root
          className="robot-options-tab__slider-root"
          min={1}
          max={20}
          step={1}
          minStepsBetweenThumbs={1}
          value={[minRobots, maxRobots]}
          onValueChange={handleRangeChange}
          aria-label="Min and Max Robots"
        >
          <Slider.Track className="robot-options-tab__slider-track">
            <Slider.Range className="robot-options-tab__slider-range" />
          </Slider.Track>
          <Slider.Thumb
            className="robot-options-tab__slider-thumb"
            aria-label="Minimum robots"
          />
          <Slider.Thumb
            className="robot-options-tab__slider-thumb"
            aria-label="Maximum robots"
          />
        </Slider.Root>
      </section>

      {/* Auto Spawn */}
      <section className="robot-options-tab__section">
        <label className="robot-options-tab__toggle-row" htmlFor="auto-spawn-switch">
          <span className="robot-options-tab__label">Auto Spawn</span>
          <Switch.Root
            id="auto-spawn-switch"
            className="robot-options-tab__switch-root"
            checked={autoSpawn}
            onCheckedChange={handleAutoSpawnChange}
            aria-label="Auto spawn robots"
          >
            <Switch.Thumb className="robot-options-tab__switch-thumb" />
          </Switch.Root>
        </label>
      </section>

      {/* Spawn Frequency */}
      <section className="robot-options-tab__section">
        <h3 className="robot-options-tab__label">
          Spawn Frequency: <span className="robot-options-tab__value">{spawnFrequency} measures</span>
        </h3>
        <Slider.Root
          className="robot-options-tab__slider-root"
          min={1}
          max={16}
          step={1}
          value={[spawnFrequency]}
          onValueChange={handleFrequencyChange}
          aria-label="Spawn frequency in measures"
        >
          <Slider.Track className="robot-options-tab__slider-track">
            <Slider.Range className="robot-options-tab__slider-range" />
          </Slider.Track>
          <Slider.Thumb
            className="robot-options-tab__slider-thumb"
            aria-label="Spawn frequency"
          />
        </Slider.Root>
      </section>

      {/* New Robot */}
      <section className="robot-options-tab__section">
        <button
          className="robot-options-tab__new-robot-btn"
          type="button"
          onClick={handleNewRobot}
        >
          + New Robot
        </button>
      </section>

    </div>
  );
}

export default RobotOptionsTab;
