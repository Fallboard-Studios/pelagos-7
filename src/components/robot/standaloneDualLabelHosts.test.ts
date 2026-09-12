import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from '@/testUtils/cssRuleBody';

// TYPE_SCALE.md Task 8 — the 3 files rendering a standalone <DualLabel>
// directly (not composed inside one of the 11 leaf ControlSchema
// primitives) each get font-family: var(--font-controls)/font-weight:
// var(--font-weight-control) on the element wrapping their DualLabel usage,
// per spec §1.5 (no container-type — that's explicitly out of scope,
// §1.4's own scope decision).
//
// Deviation from the spec's literal wrapper-selector guesses, found while
// implementing: RobotSelectionCard.tsx renders its standalone DualLabel rows
// through TWO different wrapper classes, not one — .robot-selection-card__row
// (the name row) and .robot-selection-card__field (job/battery/docking/audio,
// inside .robot-selection-card__meta-grid). Rather than duplicate the same 2
// declarations onto two selectors (and risk a 3rd future row wrapper being
// missed), this targets the shared ROOT .robot-selection-card instead, which
// covers both via inheritance — RadioButton's own explicit font-family
// (Toggle/RadioButton/etc. all set their own) still wins by cascade
// regardless. RobotDisplaySection.tsx only has one wrapper class
// (.robot-display-section__row, used consistently), but this targets its
// root (.robot-display-section) too, for the same "one rule, not
// per-row-class-coupled" consistency — not because it was strictly required
// there. SectorSettingsDrawer.tsx's DualLabel has only one real wrapper
// (.sector-settings-drawer__status, not the whole drawer), so THAT stays
// scoped narrowly, matching the original plan — the drawer also renders
// other controls (TextInput, Button) with their own explicit font-family,
// so a drawer-root rule would be a bigger blast radius than this task needs.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('RobotSelectionCard.css standalone DualLabel host', () => {
  const cssSource = readFileSync(
    resolve(repoRoot, 'src/components/selection/RobotSelectionCard.css'),
    'utf-8',
  );

  it('sets font-family/font-weight on the shared root (.robot-selection-card), covering both DualLabel wrapper classes it uses', () => {
    const body = getCssRuleBody(cssSource, '.robot-selection-card');
    expect(body).not.toBeNull();
    expect(body).toContain('font-family: var(--font-controls);');
    expect(body).toContain('font-weight: var(--font-weight-control);');
  });

  it('gains no container-type/container-name (out of scope per spec §1.4)', () => {
    expect(cssSource).not.toContain('container-type');
    expect(cssSource).not.toContain('container-name');
  });

  it('migrates .__value off the old --font-size-sm token onto --font-size-label', () => {
    const body = getCssRuleBody(cssSource, '.robot-selection-card__value');
    expect(body).not.toBeNull();
    expect(body).toContain('font-size: var(--font-size-label);');
    expect(body).not.toContain('var(--font-size-sm)');
  });
});

describe('RobotDisplaySection.css standalone DualLabel host', () => {
  const cssSource = readFileSync(
    resolve(repoRoot, 'src/components/robot/RobotDisplaySection.css'),
    'utf-8',
  );

  it('sets font-family/font-weight on the root (.robot-display-section)', () => {
    const body = getCssRuleBody(cssSource, '.robot-display-section');
    expect(body).not.toBeNull();
    expect(body).toContain('font-family: var(--font-controls);');
    expect(body).toContain('font-weight: var(--font-weight-control);');
  });

  it('gains no container-type/container-name (out of scope per spec §1.4)', () => {
    expect(cssSource).not.toContain('container-type');
    expect(cssSource).not.toContain('container-name');
  });

  it('tokenizes .__value\'s font-weight to --font-weight-medium (same 600 value, not renumbered)', () => {
    const body = getCssRuleBody(cssSource, '.robot-display-section__value');
    expect(body).not.toBeNull();
    expect(body).toContain('font-weight: var(--font-weight-medium);');
    expect(body).not.toContain('font-weight: 600;');
  });
});

describe('SectorSettingsDrawer.css standalone DualLabel host', () => {
  const cssSource = readFileSync(
    resolve(repoRoot, 'src/components/panels/screen/console/SectorSettingsDrawer.css'),
    'utf-8',
  );

  it("sets font-family/font-weight scoped to the DualLabel's real wrapper (.sector-settings-drawer__status), not the whole drawer", () => {
    const statusBody = getCssRuleBody(cssSource, '.sector-settings-drawer__status');
    expect(statusBody).not.toBeNull();
    expect(statusBody).toContain('font-family: var(--font-controls);');
    expect(statusBody).toContain('font-weight: var(--font-weight-control);');

    // Regression guard: must not have been added at the drawer root instead,
    // which would also affect TextInput/Button's own already-correct fonts.
    const rootBody = getCssRuleBody(cssSource, '.sector-settings-drawer');
    expect(rootBody).not.toContain('font-family');
  });

  it('gains no container-type/container-name (out of scope per spec §1.4)', () => {
    expect(cssSource).not.toContain('container-type');
    expect(cssSource).not.toContain('container-name');
  });

  it('migrates .__status-line off the old 0.95em literal onto --font-size-label', () => {
    const body = getCssRuleBody(cssSource, '.sector-settings-drawer__status-line');
    expect(body).not.toBeNull();
    expect(body).toContain('font-size: var(--font-size-label);');
    expect(body).not.toContain('0.95em');
  });
});
