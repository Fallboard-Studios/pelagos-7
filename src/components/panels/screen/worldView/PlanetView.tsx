import { useState, useEffect } from 'react';
import LocaleView from './LocaleView';
import { computeLocaleHour } from '@/constants/time';

import { usePlanetStore } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';

import './PlanetView.css';

interface PlanetViewProps {
  planetId: string;
}

function PlanetView({ planetId }: PlanetViewProps) {
  const planet = usePlanetStore((s) => s.planets.find((p) => p.id === planetId));
  const localeId = planet?.currentLocaleId ?? '';

  const [currentHour, setCurrentHour] = useState(() => {
    const locale = useLocaleStore.getState().locales[localeId];
    return locale ? computeLocaleHour(locale.dayStartTimestamp) : 0;
  });

  useEffect(() => {
    const tick = () => {
      const locale = useLocaleStore.getState().locales[localeId];
      if (!locale) return;
      const hour = computeLocaleHour(locale.dayStartTimestamp);
      setCurrentHour(hour);
      // No second computeLocalTime pass — hour already IS this locale's own
      // local time, computed directly from its own dayStartTimestamp. One
      // computation, two consumers (local state below, uiStore here).
      useUIStore.getState().setActiveLocaleLocalTime(hour);
    };

    tick();
    const id = setInterval(tick, 1000); // wall-clock UI display tick, not musical timing
    return () => clearInterval(id);
  }, [localeId]);

  if (!planet) return null;

  return (
    <div className="planet-view">
      <LocaleView localeId={localeId} localTime={currentHour} />
    </div>
  );
}

export default PlanetView;
