import { Theme } from '@/lib/soraneo-wallet/src/consts';

/**
 * Coerces arbitrary persisted values to a supported wallet theme.
 */
export const normalizeTheme = (value: unknown): Theme => {
  return value === Theme.Dark ? Theme.Dark : Theme.Light;
};
