import React, { FC } from 'react';
import './GlassViewport.css';

const GlassViewport: FC = ({ children }: { children?: React.ReactNode }) => {
  return (
    <main className="glass-viewport">
      <div className="glass-occlusion" aria-hidden="true" />

      <svg className="glass-rail top-rail" viewBox="0 0 100 2" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100" y2="1" />
      </svg>

      <div className="glass-content">
        {children}
      </div>

      <svg className="glass-rail bottom-rail" viewBox="0 0 100 2" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100" y2="1" />
      </svg>
    </main>
  );
};

export default GlassViewport;
