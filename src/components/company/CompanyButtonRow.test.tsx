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
    useUIStore.getState().selectCompany(null);
  });

  it('renders one button per company plus "Reset"', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#4f6d7a', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Iron Consortium' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Null Syndicate' })).toBeTruthy();
  });

  // Roadmap: Robot Selection Filter Panel — every option in this row now carries a color
  // (All=green, Reset=red, each company its own) — there is no longer an "ambient fallback, no
  // color" case here at all.
  it('shows each company\'s own color, All\'s own green, and Reset\'s own red', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#65617f', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).style.getPropertyValue('--color-accent-a')).toBe('#4f6d7a');
    expect(screen.getByRole('radio', { name: 'Null Syndicate' }).style.getPropertyValue('--color-accent-a')).toBe('#65617f');
    expect(screen.getByRole('radio', { name: 'All' }).style.getPropertyValue('--color-accent-a')).toBe(ACCENT_COLORS.green);
    expect(screen.getByRole('radio', { name: 'Reset' }).style.getPropertyValue('--color-accent-a')).toBe(ACCENT_COLORS.red);
  });

  it('renders just "All" and "Reset" when there are no companies', () => {
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Reset' })).toBeTruthy();
  });

  it('defaults to "Reset" selected', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'Reset' }).getAttribute('aria-checked')).toBe('true');
  });

  it('reflects the currently selected company as checked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Reset' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a company button calls selectCompany with that company\'s id', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Iron Consortium' }));

    expect(useUIStore.getState().selectedCompanyId).toBe('c1');
  });

  it('clicking "Reset" calls selectCompany with null', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Reset' }));

    expect(useUIStore.getState().selectedCompanyId).toBeNull();
  });

  it('renders an "All" button alongside "Reset" and every company', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Iron Consortium' })).toBeTruthy();
  });

  it('clicking "All" calls selectAllRobots', () => {
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(true);
  });

  it('shows "All" as checked when allRobotsSelected is true, and every other button unchecked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectAllRobots();

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Reset' }).getAttribute('aria-checked')).toBe('false');
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

  it('clicking "Reset" after "All" was selected deselects "All" too', () => {
    useUIStore.getState().selectAllRobots();
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Reset' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(false);
  });

  // Roadmap: Robot Selection Filter Panel — the row's own new fixed order: All first, then
  // companies (in their own existing order), then Reset last.
  it('renders All first, then companies in order, then Reset last', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#65617f', robotIds: [] });

    render(<CompanyButtonRow />);

    const names = screen.getAllByRole('radio').map((el) => el.getAttribute('aria-label'));
    expect(names).toEqual(['All', 'Iron Consortium', 'Null Syndicate', 'Reset']);
  });

  // Roadmap 11.1.6 — CompanyButtonRow reuses RadioButton, which the roadmap
  // draft's own 11.1.6 section didn't account for (Audio Setting/Decay
  // Mode/Layer Type are all short, fixed lists — this row can hold up to
  // MAX_COMPANIES user-named companies, plus "All"/"Reset"). See
  // docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md's own scope section.
  it('renders cleanly at the real MAX_COMPANIES ceiling, including a long company name', () => {
    // Exactly MAX_COMPANIES total (the real CRUD ceiling — CompanyCrudControls.tsx's
    // own atCap check), one of them a deliberately long generated-style name.
    for (let i = 0; i < MAX_COMPANIES - 1; i++) {
      useLocaleStore.getState().addCompany(localeId, { id: `c${i}`, name: `Company ${i}`, color: '#4f6d7a', robotIds: [] });
    }
    useLocaleStore.getState().addCompany(localeId, { id: 'long', name: 'Static Bloom Vanguard', color: '#4f6d7a', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Reset' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    for (let i = 0; i < MAX_COMPANIES - 1; i++) {
      expect(screen.getByRole('radio', { name: `Company ${i}` })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: 'Static Bloom Vanguard' })).toBeTruthy();
    // "All" + MAX_COMPANIES companies + "Reset" — the real ceiling this row can reach.
    expect(screen.getAllByRole('radio')).toHaveLength(2 + MAX_COMPANIES);
  });
});
