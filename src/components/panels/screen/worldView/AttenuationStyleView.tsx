import { useState, useEffect } from 'react';
import LocaleView from './LocaleView';
import { computeLocaleHour } from '@/constants/time';
import { computeLocaleTemperature } from '@/utils/localeTemperature';

import { useAttenuationStyleStore } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';

import './AttenuationStyleView.css';

interface AttenuationStyleViewProps {
  attenuationStyleId: string;
}

function AttenuationStyleView({ attenuationStyleId }: AttenuationStyleViewProps) {
  const attenuationStyle = useAttenuationStyleStore((s) => s.attenuationStyles.find((p) => p.id === attenuationStyleId));
  const localeId = attenuationStyle?.currentLocaleId ?? '';

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
      // Same tick, same hour, same locale object — temperature is purely
      // decorative (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.3) and drifts
      // continuously because it samples at this live hour rather than a
      // fixed offset, so it rides the same 1s cadence as local time instead
      // of a separate timer.
      useUIStore.getState().setActiveLocaleTemperature(
        computeLocaleTemperature(localeId, locale.coordinates.x, locale.coordinates.y, hour),
      );
    };

    tick();
    const id = setInterval(tick, 1000); // wall-clock UI display tick, not musical timing
    return () => clearInterval(id);
  }, [localeId]);

  if (!attenuationStyle) return null;

  return (
    <div className="attenuation-style-view">
      <LocaleView localeId={localeId} localTime={currentHour} />
    </div>
  );
}

export default AttenuationStyleView;
