import { defineComponent } from 'vue';

import { translationUtils } from '@/composables/useTranslation';
import type { Nullable } from '@/types/common';

import { TranslationConsts } from '../../consts';

const getAppStore = () =>
  (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).__PS_APP_STORE__ : undefined) as
    | {
        state?: Record<string, any>;
      }
    | undefined;

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
      return getAppStore()?.state?.settings?.language ?? 'en';
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
