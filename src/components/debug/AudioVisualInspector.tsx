import React, { useState, useMemo } from 'react';
import mapVisualAudioToProps from '../robot/robotVisualMapper';
import { RobotSleek } from '../robot/RobotSleek';
import { RobotOrganic } from '../robot/RobotOrganic';
import { RobotAngular } from '../robot/RobotAngular';
import { RobotIndustrial } from '../robot/RobotIndustrial';
import type { LayeredWave } from '../../types/layeredAudio';

const WAVEFORMS = ['sine', 'square', 'triangle', 'sawtooth'] as const;
type Waveform = typeof WAVEFORMS[number];

export function AudioVisualInspector(): React.ReactElement {
  const [base, setBase] = useState<LayeredWave['base']>('sine');
  const [numLayers, setNumLayers] = useState(2);
  const [layers, setLayers] = useState(() =>
    Array.from({ length: 3 }, (_, i) => ({ type: WAVEFORMS[i % WAVEFORMS.length], gain: 0.6 + i * 0.2 }))
  );

  const vm: LayeredWave = useMemo(() => ({ base, layers: layers.slice(0, numLayers) }), [base, layers, numLayers]);

  const mapped = mapVisualAudioToProps({ layeredWave: vm, averagedGain: layers.reduce((s, l) => s + (l.gain ?? 1), 0) / numLayers, shapeParams: undefined });

  function setLayerGain(index: number, value: number) {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, gain: value } : l)));
  }

  function setLayerType(index: number, type: Waveform) {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, type } : l)));
  }

  const variants = [
    { name: 'Sleek', Component: RobotSleek },
    { name: 'Organic', Component: RobotOrganic },
    { name: 'Angular', Component: RobotAngular },
    { name: 'Industrial', Component: RobotIndustrial },
  ];

  return (
    <div style={{ padding: 12, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>AudioVisual Inspector (M7.7)</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <label>
          Base
          <select value={base} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBase(e.target.value as Waveform)} style={{ marginLeft: 8 }}>
            {WAVEFORMS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>

        <label>
          Layers
          <input type="range" min={1} max={3} value={numLayers} onChange={(e) => setNumLayers(Number(e.target.value))} style={{ marginLeft: 8 }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {Array.from({ length: numLayers }, (_, i) => (
          <div key={i} style={{ border: '1px solid #e6e6e6', padding: 8, borderRadius: 6 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Layer {i + 1}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={layers[i]?.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLayerType(i, e.target.value as Waveform)}>
                {WAVEFORMS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <input type="range" min={0} max={2} step={0.05} value={layers[i]?.gain ?? 1} onChange={(e) => setLayerGain(i, Number(e.target.value))} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: '0 0 360px', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Preview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {variants.map(({ name, Component }) => (
              <div key={name} style={{ border: '1px solid rgba(0,0,0,0.04)', padding: 6, borderRadius: 6 }}>
                <div style={{ fontSize: 11, marginBottom: 6 }}>{name}</div>
                <div style={{ width: 160, height: 120 }}>
                  <Component colors={{ primary: '#6aa6c7', secondary: '#7b6f9a', accent: '#ffd27f' }} scale={1} detailLevel={mapped.bodyShapeProps.detail} shapeParams={{ torsoAspect: 1, appendageLength: 1, scaleBias: 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Mapped Props</div>
          <pre style={{ fontSize: 12, maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(mapped, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export default AudioVisualInspector;
