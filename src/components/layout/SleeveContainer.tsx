import type { FC } from 'react';
import { PowerRockerSwitch } from '../sleeve/PowerRockerSwitch';
import './SleeveContainer.css';

const SleeveContainer: FC = () => {
  return (
    <aside className="sleeve-container" aria-label="Device controls">
      <div className="sleeve-jut">
        <PowerRockerSwitch />
      </div>
      <div className="sleeve-logo" role="img" aria-hidden="true">PELAGOS</div>
    </aside>
  );
};

export default SleeveContainer;
