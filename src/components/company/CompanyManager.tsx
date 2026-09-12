import { CompanyButtonRow } from '@/components/company/CompanyButtonRow';
import { CompanyCrudControls } from '@/components/company/CompanyCrudControls';
import { CompanyOptionsSection } from '@/components/company/CompanyOptionsSection';
import { getTraitColorStyle } from '@/utils/traitColors';

import './CompanyManager.css';

/**
 * Top-level Company manager (Roadmap Phase 10) — rendered by RobotsTab beneath the existing
 * robot card list. Pure composition: the button row (select a company), CRUD controls
 * (create/rename/delete), and the options section (bulk-edit the selected company's robots), in
 * that order. No logic of its own beyond composing the three.
 *
 * This root's own Company trait (Roadmap Phase 14) colors CompanyButtonRow/CompanyCrudControls'
 * own chrome; CompanyOptionsSection's 4 reused accordions each override it locally with their own
 * domain trait (output/composition/timeSpace/spectral, matching RobotOptionsTab) — see that
 * file's own doc comment.
 */
export function CompanyManager() {
  return (
    <div className="company-manager" style={getTraitColorStyle('company')}>
      <CompanyButtonRow />
      <CompanyCrudControls />
      <CompanyOptionsSection />
    </div>
  );
}

export default CompanyManager;
