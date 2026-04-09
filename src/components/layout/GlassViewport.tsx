import React, { FC, PropsWithChildren } from 'react';
import './GlassViewport.css';

const GlassViewport: FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <main className="glass-viewport">
      <div className="glass-occlusion" aria-hidden="true" />

      <svg className="glass-rail top-rail" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none">
        <line x1="0" y1="1" x2="100%" y2="1" />
      </svg>

      <svg className="glass-rail bottom-rail" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none">
        <line x1="0" y1="1" x2="100%" y2="1" />
      </svg>

      <div className="glass-content">
        {children}
      </div>
    </main>
  );
};

export default GlassViewport;
