import { PowerRockerSwitch } from '@/components/ui/physical/PowerRockerSwitch';

import './SleeveContainer.css';

interface SleeveContainerProps {
  hasPowerSwitch?: boolean;
}
function SleeveContainer({ hasPowerSwitch = false }: SleeveContainerProps) {
  const className = hasPowerSwitch ? 'sleeve-container sleeve-container--cutaway' : 'sleeve-container';

  return (
    <aside className={className} aria-label={hasPowerSwitch ? "Device controls" : undefined}>
      {hasPowerSwitch ? (
        <>
          <div className="sleeve-container__power-corner">
            <PowerRockerSwitch />
          </div>
        </>
      ) : (
        <div className="sleeve-logo" role="img" aria-hidden="true">PELAGOS</div>
      )}
    </aside>
  );
}

export default SleeveContainer;
