import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CompanyCrudControls } from './CompanyCrudControls';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { MAX_COMPANIES } from '@/constants';
import type { Company } from '@/types/Company';
import type { Locale } from '@/types/locale';

describe('CompanyCrudControls', () => {
  const localeId = getActiveLocaleId();

  afterEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectCompany(null);
  });

  it("Create's name input pre-fills with a generated \"Adjective Noun\" suggestion", () => {
    render(<CompanyCrudControls />);
    const input = screen.getByRole('textbox', { name: /new company name/i }) as HTMLInputElement;
    expect(input.value.split(' ')).toHaveLength(2);
  });

  it('clicking Create calls addCompany with the current draft name and an empty robotIds', () => {
    const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
    render(<CompanyCrudControls />);

    const input = screen.getByRole('textbox', { name: /new company name/i }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Custom Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(addSpy).toHaveBeenCalledTimes(1);
    const [calledLocaleId, company] = addSpy.mock.calls[0] as [string, Company];
    expect(calledLocaleId).toBe(localeId);
    expect(company.name).toBe('Custom Name');
    expect(company.robotIds).toEqual([]);
    expect(typeof company.id).toBe('string');
    expect(company.id.length).toBeGreaterThan(0);
  });

  it('Create is disabled once the locale already has MAX_COMPANIES companies', () => {
    for (let i = 0; i < MAX_COMPANIES; i++) {
      useLocaleStore.getState().addCompany(localeId, { id: `c${i}`, name: `Company ${i}`, robotIds: [] });
    }
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is enabled below the MAX_COMPANIES cap', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c0', name: 'Company 0', robotIds: [] });
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Rename input is disabled when no company is selected', () => {
    render(<CompanyCrudControls />);
    expect((screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it('Rename input is enabled and shows the selected company\'s name', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyCrudControls />);

    const renameInput = screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement;
    expect(renameInput.disabled).toBe(false);
    expect(renameInput.value).toBe('Iron Consortium');
  });

  it('editing the Rename input calls updateCompany with the new name', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');
    render(<CompanyCrudControls />);

    fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Renamed' } });

    expect(updateSpy).toHaveBeenCalledWith(localeId, 'c1', { name: 'Renamed' });
  });

  it('Delete is disabled when no company is selected', () => {
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Delete is enabled when a company is selected', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking Delete calls removeCompany then selectCompany(null), in that order', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    const calls: string[] = [];
    vi.spyOn(useLocaleStore.getState(), 'removeCompany').mockImplementation(() => { calls.push('removeCompany'); });
    vi.spyOn(useUIStore.getState(), 'selectCompany').mockImplementation(() => { calls.push('selectCompany'); });
    render(<CompanyCrudControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(calls).toEqual(['removeCompany', 'selectCompany']);
  });

  it('clicking Delete calls removeCompany with the currently selected company\'s id', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    const removeSpy = vi.spyOn(useLocaleStore.getState(), 'removeCompany').mockImplementation(() => {});
    render(<CompanyCrudControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(removeSpy).toHaveBeenCalledWith(localeId, 'c1');
  });
});
