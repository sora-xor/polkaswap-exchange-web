import { FPNumber } from '@/lib/substrate/math';

/** Parse a nonnegative natural token amount without silently truncating fractional base units. */
export function toCodec(amount: string, decimals: number): string {
  if (
    typeof amount !== 'string' ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36 ||
    !/^(0|[1-9]\d*)(\.\d+)?$/.test(amount) ||
    amount.length > 100 ||
    (amount.split('.')[1]?.length ?? 0) > decimals
  )
    throw new Error('bots.errors.amount');
  return new FPNumber(amount, decimals).toCodecString();
}

/** Render exact base units without the division precision limit of BigNumber's global configuration. */
export function fromCodec(amount: string, decimals: number): string {
  codec(amount);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('bots.errors.amount');
  if (!decimals) return amount;
  const padded = amount.padStart(decimals + 1, '0');
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return padded.slice(0, -decimals) + (fraction ? `.${fraction}` : '');
}

/** Validate a persisted integer amount before exact arithmetic. */
export function codec(value: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value) || value.length > 120) {
    throw new Error('bots.errors.amount');
  }
  return BigInt(value);
}

/** Exact addition for ledger amounts. */
export function addCodec(a: string, b: string): string {
  return (codec(a) + codec(b)).toString();
}

/** Exact subtraction which refuses negative inventories. */
export function subtractCodec(a: string, b: string): string {
  const result = codec(a) - codec(b);
  if (result < 0n) throw new Error('bots.errors.balance');
  return result.toString();
}

/** Finite, nonnegative percentage validation for user-defined execution policies. */
export function percent(value: string, maximum = '100'): FPNumber {
  toCodec(value, 18);
  const amount = new FPNumber(value);
  if (amount.gt(new FPNumber(maximum))) throw new Error('bots.errors.policy');
  return amount;
}
