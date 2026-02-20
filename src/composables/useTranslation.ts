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
  const asyncWarnings = new Set<string>();

  const coerceAsyncTranslateResult = (value: unknown, key: unknown): string | null => {
    if (!(value instanceof Promise)) return null;

    const resolvedKey = typeof key === 'string' && key.length ? key : String(key ?? '');

    if (!asyncWarnings.has(resolvedKey)) {
      asyncWarnings.add(resolvedKey);
      console.warn(`[i18n] async translation result detected for key "${resolvedKey}". Falling back to key text.`);
    }

    return resolvedKey;
  };

  const wrapTranslate = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const result = fn(...args);
      const fallback = coerceAsyncTranslateResult(result, args[0]);
      if (fallback !== null) {
        return fallback as ReturnType<T>;
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
