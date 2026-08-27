import { RadioButton } from '@/components/ui/controls/RadioButton';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { NONE_VALUE, buildCompanyButtonRowSchema } from '@/data/companyConfig';

import './CompanyButtonRow.css';

/**
 * Company button row (Roadmap Phase 10) — one button per company in the active locale, plus
 * "None". Reuses the RadioButton primitive rather than a bespoke button list: this is exactly
 * "one active among many, click to select," which RadioButton already implements, active-state
 * styling included. `uiStore.selectedCompanyId` (null = "None") drives which button is checked;
 * clicking a button calls `selectCompany`.
 */
export function CompanyButtonRow() {
  const localeId = getActiveLocaleId();
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const selectCompany = useUIStore((s) => s.selectCompany);

  const schema = buildCompanyButtonRowSchema(companies);

  const handleChange = (value: string) => {
    selectCompany(value === NONE_VALUE ? null : value);
  };

  return (
    <div className="company-button-row">
      <RadioButton schema={schema} value={selectedCompanyId ?? NONE_VALUE} onChange={handleChange} />
    </div>
  );
}

export default CompanyButtonRow;
