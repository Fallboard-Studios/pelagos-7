import { RadioButton } from '@/components/ui/controls/RadioButton';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { ALL_VALUE, buildCompanyButtonRowSchema } from '@/data/companyConfig';

import './CompanyButtonRow.css';

/**
 * Company button row (Roadmap Phase 10) — "All" (the default) plus one button per company in the
 * active locale; there is no Reset/None option, the selection is always one or the other. Reuses the RadioButton primitive rather than a bespoke button list: this is
 * exactly "one active among many, click to select," which RadioButton already implements,
 * active-state styling included. `uiStore.allRobotsSelected`/`selectedCompanyId` (mutually
 * exclusive — see uiStore.ts) drive which button is checked; clicking "All" calls
 * `selectAllRobots`, every other button calls `selectCompany`.
 */
export function CompanyButtonRow() {
  const localeId = getActiveLocaleId();
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const allRobotsSelected = useUIStore((s) => s.allRobotsSelected);
  const selectCompany = useUIStore((s) => s.selectCompany);
  const selectAllRobots = useUIStore((s) => s.selectAllRobots);

  const schema = buildCompanyButtonRowSchema(companies);
  const value = allRobotsSelected || selectedCompanyId === null ? ALL_VALUE : selectedCompanyId;

  const handleChange = (v: string) => {
    if (v === ALL_VALUE) {
      selectAllRobots();
      return;
    }
    selectCompany(v);
  };

  return (
    <div className="company-button-row">
      <RadioButton schema={schema} value={value} onChange={handleChange} />
    </div>
  );
}

export default CompanyButtonRow;
