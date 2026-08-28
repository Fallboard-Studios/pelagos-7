import { CompanyButtonRow } from '@/components/company/CompanyButtonRow';
import { CompanyCrudControls } from '@/components/company/CompanyCrudControls';
import { CompanyOptionsSection } from '@/components/company/CompanyOptionsSection';

import './CompanyManager.css';

/**
 * Top-level Company manager (Roadmap Phase 10) — rendered by RobotsTab beneath the existing
 * robot card list. Pure composition: the button row (select a company), CRUD controls
 * (create/rename/delete), and the options section (bulk-edit the selected company's robots), in
 * that order. No logic of its own beyond composing the three.
 */
export function CompanyManager() {
  return (
    <div className="company-manager">
      <CompanyButtonRow />
      <CompanyCrudControls />
      <CompanyOptionsSection />
    </div>
  );
}

export default CompanyManager;
