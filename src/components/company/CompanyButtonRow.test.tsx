import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CompanyButtonRow } from './CompanyButtonRow';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { MAX_COMPANIES } from '@/constants';
import { ACCENT_COLORS } from '@/constants/accentColors';
import type { Locale } from '@/types/locale';

describe('CompanyButtonRow', () => {
  const localeId = getActiveLocaleId();

  afterEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectAllRobots();
  });

  it('renders "All" plus one button per company, and no "Reset"', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#4f6d7a', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Iron Consortium' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Null Syndicate' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Reset' })).toBeNull();
  });

  // Roadmap: Robot Selection Filter Panel — every option in this row carries a color (All=green,
  // each company its own) — there is no "ambient fallback, no color" case here at all.
  it('shows each company\'s own color and All\'s own green', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#65617f', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).style.getPropertyValue('--color-accent-a')).toBe('#4f6d7a');
    expect(screen.getByRole('radio', { name: 'Null Syndicate' }).style.getPropertyValue('--color-accent-a')).toBe('#65617f');
    expect(screen.getByRole('radio', { name: 'All' }).style.getPropertyValue('--color-accent-a')).toBe(ACCENT_COLORS.green);
  });

  it('renders just "All" when there are no companies', () => {
    render(<CompanyButtonRow />);
    expect(screen.getAllByRole('radio').map((el) => el.getAttribute('aria-label'))).toEqual(['All']);
  });

  it('defaults to "All" selected', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('false');
  });

  it('reflects the currently selected company as checked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a company button calls selectCompany with that company\'s id', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Iron Consortium' }));

    expect(useUIStore.getState().selectedCompanyId).toBe('c1');
  });

  it('clicking "All" after a company was selected calls selectAllRobots, clearing the company', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(true);
    expect(useUIStore.getState().selectedCompanyId).toBeNull();
  });

  it('shows "All" as checked when allRobotsSelected is true, and every other button unchecked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectAllRobots();

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a company after "All" was selected deselects "All" (mutually exclusive)', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectAllRobots();
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Iron Consortium' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(false);
    expect(useUIStore.getState().selectedCompanyId).toBe('c1');
  });

  // Roadmap: Robot Selection Filter Panel — the row's fixed order: All first, then companies (in
  // their own existing order). No Reset option — All is the default and the "nothing filtered" state.
  it('renders All first, then companies in order', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#65617f', robotIds: [] });

    render(<CompanyButtonRow />);

    const names = screen.getAllByRole('radio').map((el) => el.getAttribute('aria-label'));
    expect(names).toEqual(['All', 'Iron Consortium', 'Null Syndicate']);
  });

  // Roadmap 11.1.6 — CompanyButtonRow reuses RadioButton, which the roadmap
  // draft's own 11.1.6 section didn't account for (Audio Setting/Decay
  // Mode/Layer Type are all short, fixed lists — this row can hold up to
  // MAX_COMPANIES user-named companies, plus "All"). See
  // docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md's own scope section.
  it('renders cleanly at the real MAX_COMPANIES ceiling, including a long company name', () => {
    // Exactly MAX_COMPANIES total (the real CRUD ceiling — CompanyCrudControls.tsx's
    // own atCap check), one of them a deliberately long generated-style name.
    for (let i = 0; i < MAX_COMPANIES - 1; i++) {
      useLocaleStore.getState().addCompany(localeId, { id: `c${i}`, name: `Company ${i}`, color: '#4f6d7a', robotIds: [] });
    }
    useLocaleStore.getState().addCompany(localeId, { id: 'long', name: 'Static Bloom Vanguard', color: '#4f6d7a', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    for (let i = 0; i < MAX_COMPANIES - 1; i++) {
      expect(screen.getByRole('radio', { name: `Company ${i}` })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: 'Static Bloom Vanguard' })).toBeTruthy();
    // "All" + MAX_COMPANIES companies — the real ceiling this row can reach.
    expect(screen.getAllByRole('radio')).toHaveLength(1 + MAX_COMPANIES);
  });
});
