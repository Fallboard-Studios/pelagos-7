import TransportBar from '@/components/panels/screen/TransportBar';
import WorldView from '@/components/panels/screen/worldView/WorldView';
import Console from '@/components/panels/screen/console/Console';
import { SCREEN_VIEWPORT_ID } from '@/utils/helpers';
import './ScreenViewport.css';

interface ScreenViewportProps {
  isPoweredOn: boolean;
}

function ScreenViewport({ isPoweredOn }: ScreenViewportProps) {
  return (
    <main id={SCREEN_VIEWPORT_ID} className="screen-viewport">
      <div className="screen-occlusion" aria-hidden="true" />

      <svg className="screen-rail top-rail" viewBox="0 0 100 2" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100" y2="1" />
      </svg>

      <div className="screen-content">
        {isPoweredOn && <TransportBar />}
        {isPoweredOn && <WorldView />}
        {isPoweredOn && <Console />}
      </div>

      <svg className="screen-rail bottom-rail" viewBox="0 0 100 2" width="100%" height="2" aria-hidden="true" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100" y2="1" />
      </svg>
    </main>
  );
}

export default ScreenViewport;
