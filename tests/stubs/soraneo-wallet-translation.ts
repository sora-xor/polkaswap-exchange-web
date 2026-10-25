import i18n from '@/lang';
import { computed } from 'vue';

const dayjsLocale = computed(() => {
  const value = i18n.global.locale.value;
  return value === 'hy' ? 'hy-am' : value;
});

export function useTranslation() {
  return {
    dayjsLocale,
    t: (key: string) => key,
    tc: (key: string) => key,
    te: (key: string) => key,
  };
}

export const translationUtils = () => ({
  TranslationConsts: {},
  t: (key: string) => key,
  tc: (key: string) => key,
  te: () => true,
  formatDate: (value?: number | string) => (value ?? '').toString(),
  getDayjsLocale: () => dayjsLocale.value,
});

export default {
  useTranslation,
  translationUtils,
};
