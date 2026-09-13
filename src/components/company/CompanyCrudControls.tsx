import { useState } from 'react';
import { TextInput } from '@/components/ui/controls/TextInput';
import { Button } from '@/components/ui/controls/Button';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { generateCompanyName } from '@/systems/spawnSystem';
import { COMPANY_NAME_INPUT_SCHEMA, CREATE_COMPANY_SCHEMA, DELETE_COMPANY_SCHEMA, COMPANY_CRUD_ACCORDION_SCHEMA } from '@/data/companyConfig';
import { MAX_COMPANIES } from '@/constants';
import { ACCENT_COLORS, ROBOT_IDENTITY_COLOR_NAMES } from '@/constants/accentColors';
import type { Company } from '@/types/Company';

import './CompanyCrudControls.css';

// Distinct schema clones for the Create/Rename inputs — same shared COMPANY_NAME_INPUT_SCHEMA
// shape, but each needs its own humanLabel: both inputs are mounted simultaneously, so sharing
// one accessible name ("Company Name") would make them ambiguous to query and to a screen reader.
const CREATE_NAME_SCHEMA = { ...COMPANY_NAME_INPUT_SCHEMA, id: 'company.name.create', humanLabel: 'New Company Name' };
const RENAME_NAME_SCHEMA = { ...COMPANY_NAME_INPUT_SCHEMA, id: 'company.name.rename', humanLabel: 'Rename Company' };

/**
 * A fresh "Adjective Noun" suggestion, reusing generateCompanyName's exact word-list logic
 * (Roadmap Phase 10 spawn generation) but fed by Math.random() instead of a seeded noise map —
 * this is a live, user-triggered suggestion, not part of replayable world generation, the same
 * "Random" precedent SectorSettingsDrawer's coordinate presets already establish (Math.random(),
 * not getSeededVal, for a one-off UI convenience roll rather than reproducible world state).
 */
function suggestCompanyName(): string {
  return generateCompanyName(() => Math.random() * 2 - 1, 0);
}

/**
 * A random, currently-unused company color (docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.2) —
 * re-rolls against every color already in use by an existing company in this locale, the same
 * Math.random()-for-a-live-UI-roll precedent suggestCompanyName above already establishes (not
 * reproducible world generation — spawnSystem.ts's own generateCompanyIdentityColor covers that
 * path, seeded). Bounded at ROBOT_IDENTITY_COLOR_NAMES.length attempts, never an unbounded loop —
 * MAX_COMPANIES (6) is always well under the 18-hue palette, so this always finds a free color in
 * practice; the fallback return only matters if that invariant is ever broken.
 */
function pickRandomCompanyColor(existingColors: string[]): string {
  const used = new Set(existingColors);
  for (let attempt = 0; attempt < ROBOT_IDENTITY_COLOR_NAMES.length; attempt++) {
    const name = ROBOT_IDENTITY_COLOR_NAMES[Math.floor(Math.random() * ROBOT_IDENTITY_COLOR_NAMES.length)];
    if (!used.has(ACCENT_COLORS[name])) return ACCENT_COLORS[name];
  }
  return ACCENT_COLORS[ROBOT_IDENTITY_COLOR_NAMES[Math.floor(Math.random() * ROBOT_IDENTITY_COLOR_NAMES.length)]];
}

/**
 * Create/Rename/Delete for Companies (Roadmap Phase 10). Create's name field is local, staged
 * component state — not committed to the store until the button is clicked — pre-filled with a
 * generated suggestion the user can accept as-is or edit first. Unlike every seeded ID elsewhere
 * in this app, a user-created company's id has no seed to derive from (the user's choice to
 * create it isn't reproducible world generation) — crypto.randomUUID() is the right tool here,
 * not a violation of the app's seeded-generation rule.
 *
 * Wrapped in its own AccordionContainer (docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.1),
 * collapsed by default, manual toggle only — no auto-open on company selection. CompanyButtonRow
 * stays outside it, rendered by CompanyManager above, always visible.
 */
export function CompanyCrudControls() {
  const localeId = getActiveLocaleId();
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const selectCompany = useUIStore((s) => s.selectCompany);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const [createNameDraft, setCreateNameDraft] = useState(suggestCompanyName);

  const atCap = companies.length >= MAX_COMPANIES;
  // A "visible string" — not blank, not whitespace-only. The input itself is never disabled for
  // this reason (only the cap disables the input) — disabling it on blank would make it
  // impossible to type a first character back in.
  const nameIsBlank = createNameDraft.trim().length === 0;
  // selectedCompany, not selectedCompanyId — uiStore isn't reset by a locale reseed, so
  // selectedCompanyId can point at a company that no longer exists (regenerated with a fresh id,
  // or simply gone) even when the id itself is non-null. Gating on the resolved company object
  // covers both "nothing selected" and "selection is stale" in one check.
  const hasSelectedCompany = Boolean(selectedCompany);

  const handleCreate = () => {
    const color = pickRandomCompanyColor(companies.map((c) => c.color));
    const company: Company = { id: crypto.randomUUID(), name: createNameDraft.trim(), color, robotIds: [] };
    useLocaleStore.getState().addCompany(localeId, company);
    setCreateNameDraft(suggestCompanyName());
  };

  const handleRename = (name: string) => {
    if (!selectedCompany) return;
    useLocaleStore.getState().updateCompany(localeId, selectedCompany.id, { name });
  };

  const handleDelete = () => {
    if (!selectedCompany) return;
    useLocaleStore.getState().removeCompany(localeId, selectedCompany.id);
    selectCompany(null);
  };

  return (
    <AccordionContainer schema={COMPANY_CRUD_ACCORDION_SCHEMA}>
      <div className="company-crud-controls">
        <div className="company-crud-controls__create">
          <TextInput schema={CREATE_NAME_SCHEMA} value={createNameDraft} onChange={setCreateNameDraft} disabled={atCap} />
          <Button schema={CREATE_COMPANY_SCHEMA} onClick={handleCreate} disabled={atCap || nameIsBlank} />
        </div>

        <TextInput
          schema={RENAME_NAME_SCHEMA}
          value={selectedCompany?.name ?? ''}
          onChange={handleRename}
          disabled={!hasSelectedCompany}
        />

        <Button schema={DELETE_COMPANY_SCHEMA} onClick={handleDelete} disabled={!hasSelectedCompany} />
      </div>
    </AccordionContainer>
  );
}

export default CompanyCrudControls;
