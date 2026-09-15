import { useState, useEffect, startTransition } from 'react';
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
      // Wrapped in startTransition (docs/todo/backlog.md item 25): this one tick fans out
      // into a re-render of every FactoryInner/RobotBody (and anything else) subscribed to
      // activeLocaleLocalTime — every one of them in a single synchronized React commit, by
      // design (avoids visual tearing between buildings). Live-profiling items 21/23/24's
      // fixes found that commit still costs real main-thread time even with no wasted work
      // left inside it, simply because ~36+ components update together. startTransition
      // doesn't reduce that work — it marks it low-priority so React can interrupt it for
      // anything more urgent, or spread it across frames, instead of blocking synchronously.
      // Purely a scheduling hint: the store values themselves (read via `.getState()`) update
      // synchronously as always: this only affects how React-subscribed consumers re-render.
      startTransition(() => {
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
      });
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
