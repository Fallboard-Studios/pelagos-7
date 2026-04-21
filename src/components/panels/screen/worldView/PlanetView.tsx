import { useState, useEffect } from 'react';
import LocaleView from './LocaleView';
import { computePlanetHour, computeLocalTime } from '@/constants/time';

import { usePlanetStore } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';

import './PlanetView.css';

interface PlanetViewProps {
  planetId: string;
}

function PlanetView({ planetId }: PlanetViewProps) {
  const planet = usePlanetStore((s) => s.planets.find((p) => p.id === planetId));

  const [currentHour, setCurrentHour] = useState(() => {
    const p = usePlanetStore.getState().planets.find((pl) => pl.id === planetId);
    if (!p) return 0;
    return computePlanetHour(p.dayStartTimestamp, p.size);
  });

  useEffect(() => {
    const tick = () => {
      const p = usePlanetStore.getState().planets.find((pl) => pl.id === planetId);
      if (!p) return;
      const hour = computePlanetHour(p.dayStartTimestamp, p.size);
      setCurrentHour(hour);

      const activeLocale = useLocaleStore.getState().locales[p.currentLocaleId ?? ''];
      if (activeLocale) {
        useUIStore.getState().setActiveLocaleLocalTime(computeLocalTime(hour, activeLocale.coordinates.x));
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [planetId]);

  if (!planet) return null;

  return (
    <div className="planet-view">
      <LocaleView localeId={planet.currentLocaleId ?? ''} currentHour={currentHour} />
    </div>
  );
}

export default PlanetView;

