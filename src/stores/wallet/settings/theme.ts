import { Theme } from '@/shims/wallet-consts';

/**
 * Coerces arbitrary persisted values to a supported wallet theme.
 */
export const normalizeTheme = (value: unknown): Theme => {
  return value === Theme.Dark ? Theme.Dark : Theme.Light;
};
