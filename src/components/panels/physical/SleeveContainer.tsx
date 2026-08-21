import { PowerRockerSwitch } from '@/components/ui/physical/PowerRockerSwitch';

import './SleeveContainer.css';

interface SleeveContainerProps {
  hasPowerSwitch?: boolean;
}
function SleeveContainer({ hasPowerSwitch = false }: SleeveContainerProps) {
  return (
    <aside className="sleeve-container" aria-label="Device controls">
      {hasPowerSwitch ? (
        <>
          <div className="sleeve-container__power-corner">
            <PowerRockerSwitch />
          </div>
          <div className="sleeve-container__top-strip" aria-hidden="true" />
        </>
      ) : (
        <div className="sleeve-logo" role="img" aria-hidden="true">PELAGOS</div>
      )}
    </aside>
  );
}

export default SleeveContainer;
