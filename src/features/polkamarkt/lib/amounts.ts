import { FPNumber } from '@sora-substrate/sdk';

import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';

import type { CodecString } from '@sora-substrate/sdk';

const PERCENT_BASIS_POINTS = 10_000n;
const ZERO_CODEC = '0';

/**
 * Parses user-entered Polkamarkt amounts into SORA codec strings.
 */
export function parsePolkamarktAmount(
  value: string,
  decimals = POLKAMARKT_COLLATERAL_ASSET.decimals
): CodecString {
  const normalized = value.trim();
  if (!normalized) return ZERO_CODEC;
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a non-negative decimal number.');
  }

  return new FPNumber(normalized, decimals).toCodecString();
}

/**
 * Formats a runtime codec amount as a compact natural amount string.
 */
export function formatPolkamarktCodec(
  value?: Nullable<CodecString>,
  decimals = POLKAMARKT_COLLATERAL_ASSET.decimals,
  precision = 4
): string {
  return FPNumber.fromCodecValue(value || ZERO_CODEC, decimals).toLocaleString(precision);
}

/**
 * Returns true when a runtime codec amount is greater than zero.
 */
export function isPositiveCodec(value?: Nullable<CodecString>): boolean {
  if (!value) return false;
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

/**
 * Applies slippage to an output codec amount and returns the minimum accepted amount.
 */
export function applySlippageMinimum(value: CodecString, slippagePercent: string | number): CodecString {
  const amount = BigInt(value || ZERO_CODEC);
  const parsed = new FPNumber(String(slippagePercent || 0));
  const basisPointsText = parsed.mul(new FPNumber('100')).toFixed(0);
  const basisPoints = BigInt(basisPointsText);

  if (basisPoints <= 0n) return amount.toString();
  if (basisPoints >= PERCENT_BASIS_POINTS) return ZERO_CODEC;

  return ((amount * (PERCENT_BASIS_POINTS - basisPoints)) / PERCENT_BASIS_POINTS).toString();
}

/**
 * Converts a codec amount to a natural string used in transaction history metadata.
 */
export function codecToNaturalString(
  value: CodecString,
  decimals = POLKAMARKT_COLLATERAL_ASSET.decimals
): string {
  return FPNumber.fromCodecValue(value || ZERO_CODEC, decimals).toString();
}
