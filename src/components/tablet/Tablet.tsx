import SleeveContainer from '@/components/panels/physical/SleeveContainer';
import ScreenViewport from '@/components/panels/physical/ScreenViewport';

import { useUIStore } from '@/stores/uiStore';

import './Tablet.css'

function Tablet() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);

  return (
    <div className="tablet">
      <div className="sleeve-container-strip sleeve-container__top-strip" aria-hidden="true" />
      <SleeveContainer />
      <ScreenViewport isPoweredOn={isPoweredOn} />
      <div className="sleeve-container-strip sleeve-container__bottom-strip" aria-hidden="true" />
    </div>
  );
}

export default Tablet;
