import { Theme, type DesignSystem } from '@/consts/theme';

type StoreLike = {
  getters?: {
    libraryTheme?: unknown;
    libraryDesignSystem?: unknown;
    wallet?: {
      settings?: {
        libraryTheme?: unknown;
        libraryDesignSystem?: unknown;
      };
    };
  };
  state?: {
    wallet?: {
      settings?: {
        theme?: unknown;
      };
    };
    settings?: {
      theme?: unknown;
    };
  };
};

const normalizeTheme = (value: unknown): Theme | null => {
  if (value === Theme.DARK || value === Theme.LIGHT) {
    return value;
  }

  return null;
};

const normalizeDesignSystem = (value: unknown): DesignSystem | null => {
  if (!value || typeof value !== 'object') return null;

  const theme = normalizeTheme((value as Partial<DesignSystem>).theme);
  if (!theme) return null;

  return { theme };
};

/**
 * Resolves the effective library theme from legacy root getters, wallet getters,
 * or wallet/settings state, in that order.
 */
export const resolveLibraryTheme = (store: StoreLike): Theme => {
  const candidates = [
    store.getters?.libraryTheme,
    store.getters?.wallet?.settings?.libraryTheme,
    store.state?.wallet?.settings?.theme,
    store.state?.settings?.theme,
  ];

  for (const candidate of candidates) {
    const theme = normalizeTheme(candidate);
    if (theme) return theme;
  }

  return Theme.LIGHT;
};

/**
 * Resolves the effective design-system payload while guaranteeing a valid theme.
 */
export const resolveLibraryDesignSystem = (store: StoreLike): DesignSystem => {
  const byRootGetter = normalizeDesignSystem(store.getters?.libraryDesignSystem);
  if (byRootGetter) return byRootGetter;

  const byWalletGetter = normalizeDesignSystem(store.getters?.wallet?.settings?.libraryDesignSystem);
  if (byWalletGetter) return byWalletGetter;

  return {
    theme: resolveLibraryTheme(store),
  };
};
