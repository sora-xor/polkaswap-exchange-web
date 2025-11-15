import { Vue, Options } from 'vue-property-decorator';

import { translationUtils } from '@/composables/useTranslation';
import type { Nullable } from '@/types/common';

import { TranslationConsts } from '../../consts';

const getAppStore = () =>
  (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).__PS_APP_STORE__ : undefined) as
    | {
        state?: Record<string, any>;
      }
    | undefined;

@Options({})
export default class TranslationMixin extends Vue {
  private translationApi = translationUtils();

  /**
   * Contains wallet-specific words which shouldn't be translated.
   *
   * Will be extended in Polkaswap
   */
  readonly TranslationConsts = TranslationConsts;

  get language(): string {
    return getAppStore()?.state?.settings?.language ?? 'en';
  }

  t(key: string, values?: Record<string, unknown>): string {
    return this.translationApi.t(key, values);
  }

  tc(key: string, choice?: number, values?: Record<string, unknown>): string {
    return this.translationApi.tc(key, choice, values);
  }

  te(key: string): boolean {
    return this.translationApi.te(key);
  }

  get dayjsLocale(): string {
    return this.translationApi.getDayjsLocale();
  }

  formatDate(date: Nullable<number>, format = 'll LTS'): string {
    return this.translationApi.formatDate(date, format);
  }
}
