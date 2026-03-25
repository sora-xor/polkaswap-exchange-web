import { defineComponent } from 'vue';

import { translationUtils } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import type { Nullable } from '@/types/common';

import { TranslationConsts } from '../../consts';

export default defineComponent({
  data() {
    return {
      translationApi: translationUtils(),
      /**
       * Contains wallet-specific words which shouldn't be translated.
       *
       * Will be extended in Polkaswap
       */
      TranslationConsts,
    };
  },
  computed: {
    language(): string {
      try {
        return useSettingsStore().language ?? 'en';
      } catch {
        return 'en';
      }
    },
    dayjsLocale(this: any): string {
      return this.translationApi.getDayjsLocale();
    },
  },
  methods: {
    t(this: any, key: string, values?: Record<string, unknown>): string {
      return this.translationApi.t(key, values);
    },
    tc(this: any, key: string, choice?: number, values?: Record<string, unknown>): string {
      return this.translationApi.tc(key, choice, values);
    },
    te(this: any, key: string): boolean {
      return this.translationApi.te(key);
    },
    formatDate(this: any, date: Nullable<number>, format = 'll LTS'): string {
      return this.translationApi.formatDate(date, format);
    },
  },
});
