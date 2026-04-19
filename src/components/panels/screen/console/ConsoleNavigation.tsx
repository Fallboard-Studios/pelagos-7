import * as Tabs from '@radix-ui/react-tabs';

import type { ConsoleTab } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';
import './ConsolePanel.css';

type TabDef = { value: ConsoleTab; label: string };

const TABS: TabDef[] = [
  { value: 'session', label: 'SESSION' },
  { value: 'composition', label: 'COMPOSITION' },
  { value: 'robotOptions', label: 'ROBOT OPTIONS' },
  { value: 'robotEditor', label: 'ROBOT EDITOR' },
  { value: 'audioRig', label: 'AUDIO RIG' },
  { value: 'settings', label: 'SETTINGS' },
];

export function ConsoleNavigation() {
  const activeConsoleTab = useUIStore((s) => s.activeConsoleTab);
  const setActiveConsoleTab = useUIStore((s) => s.setActiveConsoleTab);

  return (
    <Tabs.Root
      className="console-nav"
      orientation="horizontal"
      value={activeConsoleTab ?? 'session'}
      onValueChange={(v) => setActiveConsoleTab(v as ConsoleTab)}
    >
      <Tabs.List className="console-nav__list" aria-label="Console Navigation">
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.value}
            className="console-nav__trigger"
            value={t.value}
            aria-controls={`console-tab-${t.value}`}
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export default ConsoleNavigation;
