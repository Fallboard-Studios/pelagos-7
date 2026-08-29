import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';

export function getActiveLocaleId(): string {
  const attenuationStyleState = useAttenuationStyleStore.getState();
  const p = selectCurrentAttenuationStyle(attenuationStyleState);
  return p?.currentLocaleId ?? '';
}
