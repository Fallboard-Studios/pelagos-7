import { OceanScene } from './OceanScene';
import { useLocaleStore } from '@/stores/localeStore';

import './LocaleView.css';

interface LocaleViewProps {
  localeId: string;
  /** Was currentHour — computeLocalTime's longitude-offset step is retired,
   *  this IS the final, already-resolved local time (see PlanetView.tsx and
   *  docs/specs/ATTENUATION_STYLE.md §1.1). */
  localTime: number;
}

function LocaleView({ localeId, localTime }: LocaleViewProps) {
  const locale = useLocaleStore((s) => s.locales[localeId]);

  if (!locale) return null;

  return (
    <div className="locale-view">
      <OceanScene localTime={localTime} />
    </div>
  );
}

export default LocaleView;
