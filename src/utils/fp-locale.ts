import { FPNumber } from '@sora-substrate/math';

/**
 * Syncs FPNumber locale delimiters with the selected UI locale.
 */
export const updateFpNumberLocale = (locale: string): void => {
  const thousandSymbol = Number(10000).toLocaleString(locale).substring(2, 3);

  if (thousandSymbol !== '0') {
    FPNumber.DELIMITERS_CONFIG.thousand = Number(12345).toLocaleString(locale).substring(2, 3);
  }

  FPNumber.DELIMITERS_CONFIG.decimal = Number(1.2).toLocaleString(locale).substring(1, 2);
};
