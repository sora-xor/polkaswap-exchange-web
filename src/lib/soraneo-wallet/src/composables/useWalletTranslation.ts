import { translationUtils } from '@/composables/useTranslation';

import { TranslationConsts } from '../consts';

export function useWalletTranslation() {
  const translationApi = translationUtils();

  const t = (key: string, values?: Record<string, unknown>): string => translationApi.t(key, values);
  const tc = (key: string, choice?: number, values?: Record<string, unknown>): string =>
    translationApi.tc(key, choice, values);
  const te = (key: string): boolean => translationApi.te(key);
  const dayjsLocale = translationApi.getDayjsLocale;
  const formatDate = (date: Nullable<number>, format = 'll LTS'): string => translationApi.formatDate(date, format);

  return {
    TranslationConsts,
    t,
    tc,
    te,
    dayjsLocale,
    formatDate,
  };
}
