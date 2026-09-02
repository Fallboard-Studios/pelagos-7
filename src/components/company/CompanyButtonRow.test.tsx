import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CompanyButtonRow } from './CompanyButtonRow';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import type { Locale } from '@/types/locale';

describe('CompanyButtonRow', () => {
  const localeId = getActiveLocaleId();

  afterEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectCompany(null);
  });

  it('renders one button per company plus "None"', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', robotIds: [] });

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Iron Consortium' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Null Syndicate' })).toBeTruthy();
  });

  it('renders just "None" when there are no companies', () => {
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
  });

  it('defaults to "None" selected', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'None' }).getAttribute('aria-checked')).toBe('true');
  });

  it('reflects the currently selected company as checked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'None' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a company button calls selectCompany with that company\'s id', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Iron Consortium' }));

    expect(useUIStore.getState().selectedCompanyId).toBe('c1');
  });

  it('clicking "None" calls selectCompany with null', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'None' }));

    expect(useUIStore.getState().selectedCompanyId).toBeNull();
  });

  it('renders an "All" button alongside "None" and every company', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    render(<CompanyButtonRow />);
    expect(screen.getByRole('radio', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Iron Consortium' })).toBeTruthy();
  });

  it('clicking "All" calls selectAllRobots', () => {
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(true);
  });

  it('shows "All" as checked when allRobotsSelected is true, and every other button unchecked', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectAllRobots();

    render(<CompanyButtonRow />);

    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'None' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: 'Iron Consortium' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a company after "All" was selected deselects "All" (mutually exclusive)', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectAllRobots();
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'Iron Consortium' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(false);
    expect(useUIStore.getState().selectedCompanyId).toBe('c1');
  });

  it('clicking "None" after "All" was selected deselects "All" too', () => {
    useUIStore.getState().selectAllRobots();
    render(<CompanyButtonRow />);

    fireEvent.click(screen.getByRole('radio', { name: 'None' }));

    expect(useUIStore.getState().allRobotsSelected).toBe(false);
  });
});
