import { FPNumber } from '@sora-substrate/sdk';

/**
 * Adds thousands separators to an exact, non-negative decimal string for reading.
 *
 * The digits are never parsed as a number, so nothing is rounded: `14312.9922415` becomes
 * `14,312.9922415` in the app's number format. Anything that is not a plain decimal is returned as it came.
 */
export function groupExactDecimal(value: string | number): string {
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text)) return text;
  const [whole, fraction] = text.split('.');
  const { thousand, decimal } = FPNumber.DELIMITERS_CONFIG;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
  return fraction === undefined ? grouped : `${grouped}${decimal}${fraction}`;
}
