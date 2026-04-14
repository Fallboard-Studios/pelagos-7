import SleeveContainer from '@/components/panels/physical/SleeveContainer';
import ScreenViewport from '@/components/panels/physical/ScreenViewport';

import { useUIStore } from '@/stores/uiStore';

import './Tablet.css'

function Tablet() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);

  return (
    <div className="tablet">
      <SleeveContainer hasPowerSwitch={true} />
      <ScreenViewport isPoweredOn={isPoweredOn} />
      <SleeveContainer />
    </div>
  );
}

export default Tablet;
