import React, { useState } from 'react';
import { RobotOrganic } from './RobotOrganic';
import { RobotIndustrial } from './RobotIndustrial';
import { RobotAngular } from './RobotAngular';
import { RobotSleek } from './RobotSleek';

export function RobotPreview(): React.ReactElement {
  const [detailLevel, setDetailLevel] = useState(0.8);
  const [scale, setScale] = useState(1);
  const [colors, setColors] = useState({ primary: '#6aa6c7', secondary: '#7b6f9a', accent: '#ffd27f' });
  const [showGreebles, setShowGreebles] = useState(true);
  const [showVents, setShowVents] = useState(true);
  const [showSideLights, setShowSideLights] = useState(true);
  const [showHalo, setShowHalo] = useState(true);

  const variants = [
    { name: 'Organic', Component: RobotOrganic },
    { name: 'Industrial', Component: RobotIndustrial },
    { name: 'Angular', Component: RobotAngular },
    { name: 'Sleek', Component: RobotSleek },
  ];

  return (
    <div className="robot-preview" style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 12 }}>
      <h3 style={{ margin: '0 0 12px 0' }}>Robot Visual Preview</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Detail
          <input type="range" min={0} max={1} step={0.1} value={detailLevel} onChange={(e) => setDetailLevel(Number(e.target.value))} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Scale
          <input type="range" min={0.6} max={1.4} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Primary
          <input type="color" value={colors.primary} onChange={(e) => setColors({ ...colors, primary: e.target.value })} />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Secondary
          <input type="color" value={colors.secondary} onChange={(e) => setColors({ ...colors, secondary: e.target.value })} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <label><input type="checkbox" checked={showGreebles} onChange={(e) => setShowGreebles(e.target.checked)} /> Greebles</label>
        <label><input type="checkbox" checked={showVents} onChange={(e) => setShowVents(e.target.checked)} /> Vents</label>
        <label><input type="checkbox" checked={showSideLights} onChange={(e) => setShowSideLights(e.target.checked)} /> Side lights</label>
        <label><input type="checkbox" checked={showHalo} onChange={(e) => setShowHalo(e.target.checked)} /> Light halo</label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {variants.map(({ name, Component }) => (
          <div key={name} style={{ border: '1px solid rgba(0,0,0,0.06)', padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>{name}</div>
            <div
              className={`preview-card ${!showGreebles ? 'no-greebles' : ''} ${!showVents ? 'no-vents' : ''} ${!showSideLights ? 'no-sidelights' : ''} ${!showHalo ? 'no-halo' : ''}`}
              style={{ width: 160, height: 120 }}
            >
              <Component colors={colors} scale={scale} detailLevel={detailLevel} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .preview-card .greebles { display: var(--greebles-display, block); }
        .preview-card.no-greebles .greebles { display: none; }
        .preview-card.no-vents .vent { display: none; }
        .preview-card.no-sidelights .side-lights { display: none; }
        .preview-card.no-halo .status-light-glow, .preview-card.no-halo .side-light-glow { opacity: 0 !important; }
      `}</style>
    </div>
  );
}

export default RobotPreview;
