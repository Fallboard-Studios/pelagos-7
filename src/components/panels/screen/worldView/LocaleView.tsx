import { OceanScene } from './OceanScene';
import { computeLocalTime } from '@/constants/time';
import { useLocaleStore } from '@/stores/localeStore';

import './LocaleView.css';

interface LocaleViewProps {
  localeId: string;
  currentHour: number;
}

function LocaleView({ localeId, currentHour }: LocaleViewProps) {
  const locale = useLocaleStore((s) => s.locales[localeId]);

  if (!locale) return null;

  const localTime = computeLocalTime(currentHour, locale.coordinates.x);

  return (
    <div className="locale-view">
      <OceanScene localTime={localTime} />
    </div>
  );
}

export default LocaleView;

