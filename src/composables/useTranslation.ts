import { useTranslation as useWalletTranslation } from '@soramitsu/soraneo-wallet-web/src/composables/useTranslation';
import { computed } from 'vue';

import { TranslationConsts } from '@/consts';
import store from '@/store';

const OrdinalRules = {
  en: (value: number) => {
    const normalized = Math.trunc(value);
    if (!Number.isFinite(normalized) || normalized === 0) return `${value}`;

    const remainder = Math.abs(normalized) % 10;

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
    language,
    tOrdinal,
    TranslationConsts,
  };
}

export type TranslationComposable = ReturnType<typeof useTranslation>;
