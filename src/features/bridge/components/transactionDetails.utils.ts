import { TranslationConsts, ZeroStringValue } from '@/consts';

import type { CodecString } from '@/lib/substrate/sdk';
import type { RegisteredAccountAsset } from '@/lib/substrate/sdk/assets/types';

export type TranslateFn = (key: string, values?: Record<string, unknown>) => string;

export function resolveAssetSymbol(asset: Nullable<RegisteredAccountAsset>): string {
  return asset?.symbol ?? '';
}

export function resolveNativeTokenSymbol(asset: Nullable<RegisteredAccountAsset>): string {
  return asset?.symbol ?? '';
}

export function buildFormattedNetworkFeeLabel(networkName: string, translate: TranslateFn): string {
  return `${TranslationConsts.Max} ${networkName} ${translate('networkFeeText')}`;
}

export function isNonZeroCodecString(value: CodecString): boolean {
  return value !== ZeroStringValue;
}
