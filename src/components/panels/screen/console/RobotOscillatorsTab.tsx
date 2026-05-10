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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="robot-oscillators-title">{robot.name ?? 'Unnamed Robot'}</h3>
          <span className="layer-count-badge" aria-hidden>
            {layers.length}
          </span>
        </div>
        <button className="add-layer-btn" disabled>
          Add Layer
        </button>
      </div>

      <ul className="layers-list" aria-label="Robot oscillator layers">
        {layers.length === 0 ? (
          <li className="layer-empty">No layers configured</li>
        ) : (
          layers.map((layer, idx) => (
            <li key={idx} className="layer-item">
              <details>
                <summary className="layer-summary">{`Layer ${idx + 1} — ${layer.type}`}</summary>
                <div className="layer-content">
                  <div className="field">
                    <span className="label">Type</span>
                    <span className="value">{layer.type}</span>
                  </div>
                  <div className="field">
                    <span className="label">Gain</span>
                    <span className="value">{layer.gain}</span>
                  </div>
                  <div className="field">
                    <span className="label">Detune (cents)</span>
                    <span className="value">{layer.detune}</span>
                  </div>
                  <div className="field">
                    <span className="label">Phase (°)</span>
                    <span className="value">{layer.phase}</span>
                  </div>
                  {(layer.type === 'pulse' || layer.type === 'square') && (
                    <div className="field">
                      <span className="label">Pulse Width</span>
                      <span className="value">{typeof layer.pulseWidth === 'number' ? layer.pulseWidth : '—'}</span>
                    </div>
                  )}

                  <details className="adsr-details">
                    <summary>Envelope Override</summary>
                    <div className="adsr-content">
                      {layer.adsr ? (
                        <>
                          <div className="field"><span className="label">Attack</span><span className="value">{layer.adsr.attack ?? '—'}</span></div>
                          <div className="field"><span className="label">Decay</span><span className="value">{layer.adsr.decay ?? '—'}</span></div>
                          <div className="field"><span className="label">Sustain</span><span className="value">{layer.adsr.sustain ?? '—'}</span></div>
                          <div className="field"><span className="label">Release</span><span className="value">{layer.adsr.release ?? '—'}</span></div>
                        </>
                      ) : (
                        <p className="inherits-master">Inherits master</p>
                      )}
                    </div>
                  </details>
                </div>
              </details>
            </li>
          ))
        )}
      </ul>

      {/* TODO Issue 14: <RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} /> */}
      <div className="envelope-editor-mount" />
    </div>
  );
}
