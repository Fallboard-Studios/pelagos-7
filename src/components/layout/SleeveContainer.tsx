import React, { FC } from 'react';
import './SleeveContainer.css';

const SleeveContainer: FC = () => {
  return (
    <aside className="sleeve-container" aria-hidden="true">
      <div className="sleeve-logo" role="img" aria-hidden="true">PELAGOS</div>
    </aside>
  );
};

export default SleeveContainer;
