import {
  useTranslation as useWalletTranslation,
  translationUtils as walletTranslationUtils,
} from '@wallet/src/composables/useTranslation';
import { computed } from 'vue';

import { TranslationConsts } from '@/consts';
import store from '@/store';

const OrdinalRules = {
  en: (value: number) => {
    const normalized = Math.trunc(value);
    if (!Number.isFinite(normalized) || normalized === 0) return `${value}`;

    const absolute = Math.abs(normalized);
    const remainder = absolute % 10;
    const remainderHundreds = absolute % 100;

    if (remainderHundreds >= 11 && remainderHundreds <= 13) {
      return `${normalized}th`;
    }

    if (remainder === 1) return `${normalized}st`;
    if (remainder === 2) return `${normalized}nd`;
    if (remainder === 3) return `${normalized}rd`;

    return `${normalized}th`;
  },
} as const satisfies Record<string, (value: number) => string>;

/**
 * Provides translation helpers shared across Polkaswap components.
 * Wraps the wallet translation composable with repo-specific additions like
 * language tracking and ordinal formatting.
 */
export function useTranslation() {
  const base = useWalletTranslation();

  const wrapTranslate = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const result = fn(...args);
      if (result instanceof Promise) {
        if (typeof window !== 'undefined') {
          const scope = window as unknown as { __ASYNC_TRANSLATIONS__?: Array<unknown> };
          (scope.__ASYNC_TRANSLATIONS__ ||= []).push(args[0]);
        }
      }
      return result;
    }) as T;
  };

  const t = wrapTranslate(base.t);
  const tc = wrapTranslate(base.tc);

  const language = computed(() => store.state.settings.language);

  const tOrdinal = (value: number | string) => {
    const locale = language.value?.toLowerCase();
    const numericValue = typeof value === 'string' ? Number(value) : value;
    const resolveRule = OrdinalRules[locale as keyof typeof OrdinalRules];

    if (!resolveRule || Number.isNaN(numericValue)) {
      return `${value}`;
    }

    return resolveRule(numericValue);
  };

  return {
    ...base,
    t,
    tc,
    language,
    tOrdinal,
    TranslationConsts,
  };
}

export type TranslationComposable = ReturnType<typeof useTranslation>;

export const translationUtils = walletTranslationUtils;
