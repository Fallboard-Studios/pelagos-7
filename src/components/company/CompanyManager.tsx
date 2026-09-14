import { memo } from 'react';
import { CompanyButtonRow } from '@/components/company/CompanyButtonRow';
import { CompanyCrudControls } from '@/components/company/CompanyCrudControls';
import { getTraitColorStyle } from '@/utils/traitColors';

import './CompanyManager.css';

/**
 * Top-level Company manager (Roadmap Phase 10) — rendered by RobotsTab beneath the existing
 * robot card list. Pure composition: the button row (select a company) and CRUD controls
 * (create/rename/delete), in that order. No logic of its own beyond composing the two.
 *
 * Used to also compose CompanyOptionsSection (the bulk-edit accordions) as a third child; that
 * moved out (Roadmap: Robot Selection Filter Panel) to be RobotsTab's own direct child instead —
 * "too large to hold in the filter panel" this component is becoming part of. Its own logic is
 * completely unaffected by the move; only who renders it changed.
 *
 * This root's own Company trait (Roadmap Phase 14) colors CompanyButtonRow/CompanyCrudControls'
 * own chrome.
 *
 * Bugfix, found live (Crawford, React DevTools "highlight updates" + Profiler flamegraph):
 * RobotsTab (this component's sibling-of-a-sibling parent) re-renders every 16n audio-swell tick
 * (audioSwells.ts's tickAudioSwells → applyAdsr/applyLayersContinuous/applyVolume →
 * useLocaleStore's updateRobot, which hands back a new `robots` array reference every tick, ~8-9x
 * a second at typical tempo, essentially continuously since some robot almost always has an
 * active swell). CompanyManager takes zero props and reads nothing from that same tick, but
 * without a memo boundary here, React re-renders this entire subtree in lockstep anyway — every
 * RadioButton/TextInput/CabinetBox inside Create/Rename, visibly "flashing" for no reason.
 * memo() is correct and sufficient here specifically because there are no props to compare (an
 * empty prop list can never differ) — this component will still re-render normally whenever ITS
 * OWN store subscriptions (inside CompanyButtonRow/CompanyCrudControls) actually change.
 */
export const CompanyManager = memo(function CompanyManager() {
  return (
    <div className="company-manager" style={getTraitColorStyle('company')}>
      <CompanyButtonRow />
      <CompanyCrudControls />
    </div>
  );
});

export default CompanyManager;
