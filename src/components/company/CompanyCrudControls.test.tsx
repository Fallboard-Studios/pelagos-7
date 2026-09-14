import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { CompanyCrudControls } from './CompanyCrudControls';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { MAX_COMPANIES } from '@/constants';
import { ACCENT_COLORS, ROBOT_IDENTITY_COLOR_NAMES } from '@/constants/accentColors';
import { ADJECTIVES, COMPANY_NOUNS } from '@/systems/spawnSystem';
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
    fireEvent.click(screen.getByRole('button', { name: /^create\b/i }));

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
    expect((screen.getByRole('button', { name: /^create\b/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is enabled below the MAX_COMPANIES cap', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c0', name: 'Company 0', color: '#4f6d7a', robotIds: [] });
    render(<CompanyCrudControls />);
    expect((screen.getByRole('button', { name: /^create\b/i }) as HTMLButtonElement).disabled).toBe(false);
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
    expect((screen.getByRole('button', { name: /^create\b/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is disabled when the name draft is whitespace-only', () => {
    render(<CompanyCrudControls />);
    fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: /^create\b/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Create is enabled again once real (non-whitespace) text is entered', () => {
    render(<CompanyCrudControls />);
    const input = screen.getByRole('textbox', { name: /new company name/i });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.change(input, { target: { value: '  Iron Consortium  ' } });
    expect((screen.getByRole('button', { name: /^create\b/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  // docs/specs/COMPANY_SECTION_ENHANCEMENTS.md §1.2 — pickRandomCompanyColor, Math.random()-fed
  // (a live UI roll, matching suggestCompanyName's own precedent), re-rolled against every color
  // already in use by an existing company in the locale.
  describe('color generation', () => {
    it('assigns a color from ROBOT_IDENTITY_COLOR_NAMES\' resolved hex set', () => {
      const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
      render(<CompanyCrudControls />);
      fireEvent.click(screen.getByRole('button', { name: /^create\b/i }));

      const [, company] = addSpy.mock.calls[0] as [string, Company];
      const validColors = ROBOT_IDENTITY_COLOR_NAMES.map((name) => ACCENT_COLORS[name]);
      expect(validColors).toContain(company.color);
    });

    it('never assigns a color already used by an existing company, when at least one hue is free', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: ACCENT_COLORS.blue, robotIds: [] });
      useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: ACCENT_COLORS.plum, robotIds: [] });
      const addSpy = vi.spyOn(useLocaleStore.getState(), 'addCompany');
      render(<CompanyCrudControls />);
      fireEvent.click(screen.getByRole('button', { name: /^create\b/i }));

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
      fireEvent.click(screen.getByRole('button', { name: /^create\b/i }));

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
    fireEvent.click(screen.getByRole('button', { name: /^create\b/i }));

    const [, company] = addSpy.mock.calls[0] as [string, Company];
    expect(company.name).toBe('Iron Consortium');
  });

  // docs/tasks/COMPANY_CRUD_BUTTON_PREVIEW.md Task 2 — the Create button's own label previews the
  // draft, so both the visible text and the accessible name change together.
  describe('Create button label', () => {
    it('is exactly "Create" when the draft is blank', () => {
      render(<CompanyCrudControls />);
      fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '' } });

      expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    });

    it('is exactly "Create" when the draft is whitespace-only', () => {
      render(<CompanyCrudControls />);
      fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: '   ' } });

      expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    });

    it('is "Create {draft}" — the raw, as-typed draft — when non-blank', () => {
      render(<CompanyCrudControls />);
      fireEvent.change(screen.getByRole('textbox', { name: /new company name/i }), { target: { value: 'Glass Crew' } });

      expect(screen.getByRole('button', { name: 'Create Glass Crew' })).toBeTruthy();
    });

    it('updates live as the draft is typed, with no click required', () => {
      render(<CompanyCrudControls />);
      const input = screen.getByRole('textbox', { name: /new company name/i });

      fireEvent.change(input, { target: { value: 'Glass Crew' } });
      expect(screen.getByRole('button', { name: 'Create Glass Crew' })).toBeTruthy();

      fireEvent.change(input, { target: { value: 'Null Syndicate' } });
      expect(screen.getByRole('button', { name: 'Create Null Syndicate' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Create Glass Crew' })).toBeNull();
    });
  });

  it('Rename input is disabled when no company is selected', () => {
    render(<CompanyCrudControls />);
    expect((screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).disabled).toBe(true);
  });

  // docs/tasks/COMPANY_CRUD_BUTTON_PREVIEW.md Task 1 — the draft auto-suggests a fresh name
  // (suggestCompanyName's own generator) rather than pre-filling the selected company's current
  // name, so the Rename button can always preview two different names without the user typing
  // anything first.
  it('Rename input is enabled and pre-filled with a generated suggestion — never the selected company\'s own current name', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
    useUIStore.getState().selectCompany('c1');
    render(<CompanyCrudControls />);

    const renameInput = screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement;
    expect(renameInput.disabled).toBe(false);
    expect(renameInput.value).not.toBe('Iron Consortium');
    expect(renameInput.value.split(' ')).toHaveLength(2);
  });

  // docs/tasks/COMPANY_CRUD_BUTTON_PREVIEW.md Task 3 — the Rename button's own label previews
  // "{current name} > {draft}", so both the visible text and the accessible name change together.
  describe('Rename button label', () => {
    it('is exactly "Rename" when no company is selected', () => {
      render(<CompanyCrudControls />);
      expect(screen.getByRole('button', { name: 'Rename' })).toBeTruthy();
    });

    it('is exactly "Rename" when the draft is edited back to blank', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: '   ' } });

      expect(screen.getByRole('button', { name: 'Rename' })).toBeTruthy();
    });

    it('is "Rename {current name} > {draft}" once a company is selected (the auto-suggested draft, with no typing needed)', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      const draft = (screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).value;
      expect(screen.getByRole('button', { name: `Rename Iron Consortium > ${draft}` })).toBeTruthy();
    });

    it('updates live as the draft is typed, with no click required', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Null Wisp' } });

      expect(screen.getByRole('button', { name: 'Rename Iron Consortium > Null Wisp' })).toBeTruthy();
    });

    it('reads "Rename {just-committed name} > {new suggestion}" immediately after a successful submit — the "always two different names" property holds on the very next render', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Null Wisp' } });
      fireEvent.click(screen.getByRole('button', { name: 'Rename Iron Consortium > Null Wisp' }));

      const newDraft = (screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).value;
      expect(newDraft).not.toBe('Null Wisp');
      expect(screen.getByRole('button', { name: `Rename Null Wisp > ${newDraft}` })).toBeTruthy();
    });
  });

  // Rename is staged, like Create — editing alone no longer calls updateCompany; a separate
  // Submit button (matching Create's own Create button) does, and only when clicked.
  describe('Rename Submit button', () => {
    it('is disabled when no company is selected', () => {
      render(<CompanyCrudControls />);
      expect((screen.getByRole('button', { name: /^rename\b/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    // docs/tasks/COMPANY_CRUD_BUTTON_PREVIEW.md Task 1 — the draft now auto-suggests a fresh name
    // on selection (see the input-level test above), so Submit is normally enabled immediately,
    // not disabled — the opposite of this suite's pre-Task-1 behavior.
    it('is (normally) enabled immediately after selecting a company — the auto-suggested draft differs from the current name', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);
      expect((screen.getByRole('button', { name: /^rename\b/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('stays disabled in the rare case the auto-suggested draft coincidentally matches the current name (the existing renameUnchanged guard)', () => {
      // Math.random mocked to 0 forces suggestCompanyName's own getSeededVal-driven word picks to
      // index 0 of both ADJECTIVES and COMPANY_NOUNS every time (getSeededVal maps a constant -1
      // noise value to its own `min`) — so the "coincidence" is reproducible rather than relying on
      // real chance, proving the guard still holds now that it's a rare path instead of the default
      // one.
      const coincidentalName = `${ADJECTIVES[0]} ${COMPANY_NOUNS[0]}`;
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: coincidentalName, color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      render(<CompanyCrudControls />);

      const renameInput = screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement;
      expect(renameInput.value).toBe(coincidentalName);
      expect((screen.getByRole('button', { name: /^rename\b/i }) as HTMLButtonElement).disabled).toBe(true);
      randomSpy.mockRestore();
    });

    it('becomes enabled once the draft is edited to something new', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Renamed' } });

      expect((screen.getByRole('button', { name: /^rename\b/i }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('is disabled again when the draft is edited back to blank', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: '   ' } });

      expect((screen.getByRole('button', { name: /^rename\b/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('editing the Rename input does NOT call updateCompany on its own — only clicking Rename does', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Renamed' } });
      expect(updateSpy).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /^rename\b/i }));
      expect(updateSpy).toHaveBeenCalledWith(localeId, 'c1', { name: 'Renamed' });
    });

    it('trims surrounding whitespace from the submitted name', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: '  Renamed  ' } });
      fireEvent.click(screen.getByRole('button', { name: /^rename\b/i }));

      expect(updateSpy).toHaveBeenCalledWith(localeId, 'c1', { name: 'Renamed' });
    });

    it('switching the selected company resets the draft to a fresh generated suggestion, discarding an unsubmitted edit and never showing either company\'s own name', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', color: '#7a4f6d', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Unsubmitted Edit' } });
      act(() => { useUIStore.getState().selectCompany('c2'); });

      const newDraft = (screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).value;
      expect(newDraft).not.toBe('Unsubmitted Edit');
      expect(newDraft).not.toBe('Iron Consortium');
      expect(newDraft).not.toBe('Null Syndicate');
      expect(newDraft.split(' ')).toHaveLength(2);
    });

    // docs/tasks/COMPANY_CRUD_BUTTON_PREVIEW.md Task 1 — mirrors handleCreate's own reroll after a
    // successful create, so the "always two different names" property holds continuously rather
    // than only right after selecting a company.
    it('rerolls the draft to a new generated suggestion immediately after a successful submit', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Renamed' } });
      fireEvent.click(screen.getByRole('button', { name: /^rename\b/i }));

      const postSubmitDraft = (screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).value;
      expect(postSubmitDraft).not.toBe('Renamed');
      expect(postSubmitDraft.split(' ')).toHaveLength(2);
    });

    it('does NOT reset an in-progress draft when an unrelated field of the same selected company changes elsewhere', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: [] });
      useUIStore.getState().selectCompany('c1');
      render(<CompanyCrudControls />);

      fireEvent.change(screen.getByRole('textbox', { name: /rename company/i }), { target: { value: 'Unsubmitted Edit' } });
      // A robot getting (re)assigned into/out of this same company — same selectedCompanyId,
      // but a brand-new Company object reference — must not clobber the draft above.
      act(() => { useLocaleStore.getState().updateCompany(localeId, 'c1', { color: '#123456' }); });

      expect((screen.getByRole('textbox', { name: /rename company/i }) as HTMLInputElement).value).toBe('Unsubmitted Edit');
    });
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
