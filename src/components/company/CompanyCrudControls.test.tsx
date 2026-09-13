import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CompanyCrudControls } from './CompanyCrudControls';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { MAX_COMPANIES } from '@/constants';
import { ACCENT_COLORS, ROBOT_IDENTITY_COLOR_NAMES } from '@/constants/accentColors';
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
      useLocaleStore.getState().addCompany(localeId, { id: `c${i}`, name: `Company ${i}`, color: '#4f6d7a', robotIds: [] });
    }
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is enabled below the MAX_COMPANIES cap', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c0', name: 'Company 0', color: '#4f6d7a', robotIds: [] });
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('the Create name input is also disabled once the locale already has MAX_COMPANIES companies', () => {
    for (let i = 0; i < MAX_COMPANIES; i++) {
      useLocaleStore.getState().addCompany(localeId, { id: `c${i}`, name: `Company ${i}`, color: '#4f6d7a', robotIds: [] });
    }
    render(<CompanyCrudControls />);
    expect((screen.getByRole('textbox', { name: /new company name/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it('Create is disabled when the name draft is blank', () => {
    render(<CompanyCrudControls />);
    fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '' } });
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is disabled when the name draft is whitespace-only', () => {
    render(<CompanyCrudControls />);
    fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is enabled again once real (non-whitespace) text is entered', () => {
    render(<CompanyCrudControls />);
    const input = screen.getByRole('textbox', { name: /new company name/i });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.change(input, { target: { value: '  Iron Consortium  ' } });
    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(false);
  });

  // docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.2 — pickRandomCompanyColor, Math.random()-fed
  // (a live UI roll, matching suggestCompanyName's own precedent), re-rolled against every color
  // already in use by an existing company in the locale.
  describe('color generation', () => {
    it('assigns a color from ROBOT_IDENTITY_COLOR_NAMES\' resolved hex set', () => {
      const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
      render(<CompanyCrudControls />);
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      const [, company] = addSpy.mock.calls[0] as [string, Company];
      const validColors = ROBOT_IDENTITY_COLOR_NAMES.map((name) => ACCENT_COLORS[name]);
      expect(validColors).toContain(company.color);
    });

    it('never assigns a color already used by an existing company, when at least one hue is free', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: ACCENT_COLORS.blue, robotIds: [] });
      useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: ACCENT_COLORS.plum, robotIds: [] });
      const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
      render(<CompanyCrudControls />);
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      const [, company] = addSpy.mock.calls[0] as [string, Company];
      expect(company.color).not.toBe(ACCENT_COLORS.blue);
      expect(company.color).not.toBe(ACCENT_COLORS.plum);
    });

    it('terminates and still returns a valid color when Math.random keeps landing on an already-used hue (proves the retry loop is bounded, not unbounded)', () => {
      // Real exhaustion of all 18 hues can't happen through the rendered UI (Create disables at
      // MAX_COMPANIES = 6, always well under 18) — this instead proves boundedness directly: if
      // pickRandomCompanyColor retried unboundedly, mocking Math.random to always land on the one
      // color already in use would hang this test rather than complete it.
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      useLocaleStore.getState().addCompany(localeId, {
        id: 'c1', name: 'Iron Consortium', color: ACCENT_COLORS[ROBOT_IDENTITY_COLOR_NAMES[0]], robotIds: [],
      });
      const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
      render(<CompanyCrudControls />);
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      const [, company] = addSpy.mock.calls[0] as [string, Company];
      const validColors = ROBOT_IDENTITY_COLOR_NAMES.map((name) => ACCENT_COLORS[name]);
      expect(validColors).toContain(company.color);
      randomSpy.mockRestore();
    });
  });

  it('clicking Create trims surrounding whitespace from the stored name', () => {
    const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
    render(<CompanyCrudControls />);

    fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '  Iron Consortium  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    const [, company] = addSpy.mock.calls[0] as [string, Company];
    expect(company.name).toBe('Iron Consortium');
  });

  it('Rename input is disabled when no company is selected', () => {
    render(<CompanyCrudControls />);
    expect((screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it('Rename input is enabled and shows the selected company\'s name', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyCrudControls />);

    const renameInput = screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement;
    expect(renameInput.disabled).toBe(false);
    expect(renameInput.value).toBe('Iron Consortium');
  });

  it('editing the Rename input calls updateCompany with the new name', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
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
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Delete stays disabled when selectedCompanyId points at a company that no longer exists (e.g. after a reseed regenerated companies with fresh ids)', () => {
    // No companies at all in this locale, but selectedCompanyId is a stale leftover id — uiStore
    // isn't reset by a locale reseed, so this is a real reachable state, not a hypothetical one.
    useUIStore.getState().selectCompany('stale-id-from-before-reseed');
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Rename input stays disabled when selectedCompanyId points at a company that no longer exists', () => {
    useUIStore.getState().selectCompany('stale-id-from-before-reseed');
    render(<CompanyCrudControls />);
    expect((screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).disabled).toBe(true);
  });

  it('clicking Delete calls removeCompany then selectCompany(null), in that order', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    const calls: string[] = [];
    vi.spyOn(useLocaleStore.getState(), 'removeCompany').mockImplementation(() => { calls.push('removeCompany'); });
    vi.spyOn(useUIStore.getState(), 'selectCompany').mockImplementation(() => { calls.push('selectCompany'); });
    render(<CompanyCrudControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(calls).toEqual(['removeCompany', 'selectCompany']);
  });

  // docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.1 — CRUD controls wrap in an AccordionContainer,
  // collapsed by default, manual toggle only. aria-expanded is this codebase's own established
  // way of testing collapsed/open state (AccordionContainer.test.tsx) — content itself stays in
  // the DOM (forceMount) regardless of collapse state, so it's still queryable either way.
  describe('CRUD accordion', () => {
    it('starts collapsed (aria-expanded="false" on its own trigger)', () => {
      render(<CompanyCrudControls />);
      expect(screen.getByRole('button', { name: /manage companies/i }).getAttribute('aria-expanded')).toBe('false');
    });

    it('expands when its trigger is clicked, and collapses again on a second click', () => {
      render(<CompanyCrudControls />);
      const trigger = screen.getByRole('button', { name: /manage companies/i });
      fireEvent.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      fireEvent.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });

  it('clicking Delete calls removeCompany with the currently selected company\'s id', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    const removeSpy = vi.spyOn(useLocaleStore.getState(), 'removeCompany').mockImplementation(() => {});
    render(<CompanyCrudControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(removeSpy).toHaveBeenCalledWith(localeId, 'c1');
  });
});
