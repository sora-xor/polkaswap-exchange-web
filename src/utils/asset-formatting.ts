import { FPNumber, type CodecString } from '@sora-substrate/math';

import type { Nullable } from '@/types/common';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AmountWithSuffix } from '@/types/formats';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;

const ZERO_STRING_VALUE = '0';

export const asZeroValue = (value: unknown): boolean => {
  return !Number.isFinite(+value) || +value === 0;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Converts supported codec balance representations into a plain decimal integer string.
 * Accepts strings, bigint values, safe integer numbers, and codec-like objects
 * returned by the Polkadot API.
 */
export const normalizeCodecBalanceValue = (value: unknown): Nullable<CodecString> => {
  if (typeof value === 'bigint') {
    return value >= 0n ? value.toString() : null;
  }

  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value.toString() : null;
  }

  if (typeof value !== 'string') {
    if (!isObjectRecord(value)) {
      return null;
    }

    const maybeToJson = value.toJSON;
    if (typeof maybeToJson === 'function') {
      const json = maybeToJson.call(value);

      if (isObjectRecord(json) && 'balance' in json) {
        return normalizeCodecBalanceValue(json.balance);
      }

      const normalizedJson = normalizeCodecBalanceValue(json);
      if (normalizedJson !== null) {
        return normalizedJson;
      }
    }

    const maybeToString = value.toString;
    if (typeof maybeToString === 'function' && maybeToString !== Object.prototype.toString) {
      return normalizeCodecBalanceValue(maybeToString.call(value));
    }

    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    try {
      return BigInt(trimmed).toString();
    } catch {
      return null;
    }
  }

  const compact = trimmed.replace(/[,\s]/g, '');

  return /^\d+$/.test(compact) ? compact : null;
};

export const getAssetBalance = (
  asset: Nullable<AssetWithBalance>,
  { internal = true, isBondedBalance = false } = {}
): CodecString => {
  if (!asset) return ZERO_STRING_VALUE;

  if (!internal) {
    return normalizeCodecBalanceValue((asset as RegisteredAccountAsset)?.externalBalance) ?? ZERO_STRING_VALUE;
  }

  if (isBondedBalance) {
    return normalizeCodecBalanceValue((asset as AccountAsset)?.balance?.bonded) ?? ZERO_STRING_VALUE;
  }

  return normalizeCodecBalanceValue((asset as AccountAsset)?.balance?.transferable) ?? ZERO_STRING_VALUE;
};

export const getAssetDecimals = (asset: Nullable<AssetWithBalance>, { internal = true } = {}): number | undefined => {
  if (!asset) return undefined;

  return internal ? asset.decimals : (asset as RegisteredAccountAsset)?.externalDecimals;
};

export const formatAssetBalance = (
  asset: Nullable<AssetWithBalance>,
  { internal = true, formattedZero = '', showZeroBalance = true, isBondedBalance = false } = {}
): string => {
  if (!asset) return formattedZero;

  const rawBalance = !internal
    ? (asset as RegisteredAccountAsset)?.externalBalance
    : isBondedBalance
      ? (asset as AccountAsset)?.balance?.bonded
      : (asset as AccountAsset)?.balance?.transferable;
  const balance = normalizeCodecBalanceValue(rawBalance);

  if (!balance || (!showZeroBalance && asZeroValue(balance))) return formattedZero;

  const decimals = getAssetDecimals(asset, { internal });

  return FPNumber.fromCodecValue(balance, decimals).toLocaleString();
};

export const formatAmountWithSuffix = (value: FPNumber, precision = 2): AmountWithSuffix => {
  const val = value.toNumber();
  const entries: Array<[number, string]> = [
    [3, 'K'],
    [6, 'M'],
    [9, 'B'],
    [12, 't'],
    [15, 'q'],
    [18, 'Q'],
  ];

  let suffix = '';
  let result = val;

  for (const [pow, symbol] of entries) {
    const res = val / Math.pow(10, pow);

    if (Math.trunc(res) > 0) {
      suffix = symbol;
      result = res;
    } else {
      break;
    }
  }

  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  });

  return {
    amount: formatter.format(Number(result.toFixed(precision))),
    suffix,
  };
};

export const isAmountValueIntegerOnly = (value: Nullable<string | number>): boolean => {
  if (value === null || value === undefined) return false;

  const normalized = String(value).trim();

  if (!normalized) return false;

  const [, decimal = ''] = normalized.split(FPNumber.DELIMITERS_CONFIG.decimal);

  return !decimal || /^0+$/.test(decimal);
};

export type AssetFormattingUtils = {
  asZeroValue: typeof asZeroValue;
  normalizeCodecBalanceValue: typeof normalizeCodecBalanceValue;
  getAssetBalance: typeof getAssetBalance;
  getAssetDecimals: typeof getAssetDecimals;
  formatAssetBalance: typeof formatAssetBalance;
  formatAmountWithSuffix: typeof formatAmountWithSuffix;
  isAmountValueIntegerOnly: typeof isAmountValueIntegerOnly;
};
