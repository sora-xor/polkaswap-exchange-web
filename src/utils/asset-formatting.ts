import { FPNumber, type CodecString } from '@sora-substrate/sdk';

import type { Nullable } from '@/types/common';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AmountWithSuffix } from '@/types/formats';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;

const ZERO_STRING_VALUE = '0';

export const asZeroValue = (value: unknown): boolean => {
  return !Number.isFinite(+value) || +value === 0;
};

export const getAssetBalance = (
  asset: Nullable<AssetWithBalance>,
  { internal = true, isBondedBalance = false } = {}
): CodecString => {
  if (!asset) return ZERO_STRING_VALUE;

  if (!internal) {
    return (asset as RegisteredAccountAsset)?.externalBalance ?? ZERO_STRING_VALUE;
  }

  if (isBondedBalance) {
    return (asset as AccountAsset)?.balance?.bonded ?? ZERO_STRING_VALUE;
  }

  return (asset as AccountAsset)?.balance?.transferable ?? ZERO_STRING_VALUE;
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

  const balance = getAssetBalance(asset, { internal, isBondedBalance });

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

  return {
    amount: new FPNumber(result.toFixed(precision)).toLocaleString(),
    suffix,
  };
};

export type AssetFormattingUtils = {
  asZeroValue: typeof asZeroValue;
  getAssetBalance: typeof getAssetBalance;
  getAssetDecimals: typeof getAssetDecimals;
  formatAssetBalance: typeof formatAssetBalance;
  formatAmountWithSuffix: typeof formatAmountWithSuffix;
};
