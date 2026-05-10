import { useUIStore } from '@/stores/uiStore';
import { usePlanetStore } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import type { Robot } from '@/types/Robot';

import './RobotOscillatorsTab.css';

export default function RobotOscillatorsTab() {
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');

  const robot: Robot | undefined = useLocaleStore((s) => {
    if (!localeId || !selectedRobotId) return undefined;
    return s.locales[localeId]?.robots?.find((r) => r.id === selectedRobotId);
  });

  if (!selectedRobotId || !robot) {
    return (
      <div className="robot-oscillators-empty">
        <p>No robot selected. Select a robot to view oscillator settings.</p>
      </div>
    );
  }

  const layers = robot.audioAttributes?.layers ?? [];

  return (
    <div className="robot-oscillators">
      <div className="robot-oscillators-header">
        <h3 className="robot-oscillators-title">{robot.name ?? 'Unnamed Robot'}</h3>
        <button className="add-layer-btn" disabled>
          Add Layer
        </button>
      </div>

      <ul className="layers-list" aria-label="Robot oscillator layers">
        {layers.length === 0 ? (
          <li className="layer-empty">No layers configured</li>
        ) : (
          layers.map((_, idx) => (
            <li key={idx} className="layer-item">
              {`Layer ${idx + 1}`}
            </li>
          ))
        )}
      </ul>

      {/* TODO Issue 14: <RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} /> */}
      <div className="envelope-editor-mount" />
    </div>
  );
}
