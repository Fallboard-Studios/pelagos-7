import PlanetView from '@/components/panels/screen/worldView/PlanetView';

import './WorldView.css'

function WorldView() {

  return (
    <div className="world-view">
      <PlanetView planetId="pelagos" />
    </div>
  );
}

export default WorldView;
