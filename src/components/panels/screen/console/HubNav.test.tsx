import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { HubNav } from './HubNav';
import { HUB_NAV_ITEMS } from '@/data/hubNavConfig';
import { useUIStore } from '@/stores/uiStore';

describe('HubNav', () => {
  afterEach(() => {
    useUIStore.getState().setActiveHubTile(null);
  });

  it('renders exactly one tile per HUB_NAV_ITEMS entry, with no Session/Composition remnants', () => {
    render(<HubNav />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(HUB_NAV_ITEMS.length);
    expect(buttons).toHaveLength(3);
  });

  it("renders each entry's lore and human labels via the Button primitive", () => {
    render(<HubNav />);
    for (const item of HUB_NAV_ITEMS) {
      if (item.schema.loreLabel) expect(screen.getByText(item.schema.loreLabel)).toBeTruthy();
      if (item.schema.humanLabel) expect(screen.getByText(item.schema.humanLabel)).toBeTruthy();
    }
  });

  it('clicking a tile sets activeHubTile to that entry\'s target', () => {
    render(<HubNav />);
    fireEvent.click(screen.getByRole('button', { name: 'Robots' }));

    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });
});
