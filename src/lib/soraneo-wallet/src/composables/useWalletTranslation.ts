import { computed } from 'vue';

import { translationUtils } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';

import { TranslationConsts } from '../consts';

export function useWalletTranslation() {
  const translationApi = translationUtils();
  const language = computed(() => {
    try {
      return useSettingsStore().language ?? 'en';
    } catch {
      return 'en';
    }
  });

  const t = (key: string, values?: Record<string, unknown>): string => translationApi.t(key, values);
  const tc = (key: string, choice?: number, values?: Record<string, unknown>): string =>
    translationApi.tc(key, choice, values);
  const te = (key: string): boolean => translationApi.te(key);
  const dayjsLocale = computed(() => translationApi.getDayjsLocale());
  const formatDate = (date: Nullable<number>, format = 'll LTS'): string => translationApi.formatDate(date, format);

  return {
    language,
    TranslationConsts,
    t,
    tc,
    te,
    dayjsLocale,
    formatDate,
  };
}
