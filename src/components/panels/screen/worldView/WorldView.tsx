import PlanetView from '@/components/panels/screen/worldView/PlanetView';
import { usePlanetStore } from '@/stores/planetStore';

import './WorldView.css'

function WorldView() {
  // Reactive, not hardcoded — Sector Settings' retransmit action can create
  // a brand-new planet and discard the old one (including the original
  // 'pelagos' default), so this must follow whichever planet is actually
  // current or PlanetView's lookup fails and the whole world disappears.
  const currentPlanetId = usePlanetStore((s) => s.currentPlanetId);

  return (
    <div className="world-view">
      <PlanetView planetId={currentPlanetId} />
    </div>
  );
}

export default WorldView;
