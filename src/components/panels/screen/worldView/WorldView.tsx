import AttenuationStyleView from '@/components/panels/screen/worldView/AttenuationStyleView';
import { useAttenuationStyleStore } from '@/stores/attenuationStyleStore';

import './WorldView.css'

function WorldView() {
  // Reactive, not hardcoded — Sector Settings' retransmit action can create
  // a brand-new Attenuation Style and discard the old one (including the
  // original 'pelagos' default), so this must follow whichever Attenuation
  // Style is actually current or AttenuationStyleView's lookup fails and the
  // whole world disappears.
  const currentAttenuationStyleId = useAttenuationStyleStore((s) => s.currentAttenuationStyleId);

  return (
    <div className="world-view">
      <AttenuationStyleView attenuationStyleId={currentAttenuationStyleId} />
    </div>
  );
}

export default WorldView;
