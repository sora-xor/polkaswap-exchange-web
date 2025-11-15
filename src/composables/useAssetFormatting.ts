import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import type { Nullable } from '@/types/common';
import {
  asZeroValue,
  formatAmountWithSuffix,
  formatAssetBalance as baseFormatAssetBalance,
} from '@/utils/asset-formatting';

import type { CodecString, FPNumber } from '@sora-substrate/sdk';
import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AssetWithBalance = AccountAsset | RegisteredAccountAsset;

export type FormatAssetBalanceOptions = {
  internal?: boolean;
  formattedZero?: string;
  showZeroBalance?: boolean;
  balanceType?: BalanceType;
};

export type AssetDisplay = {
  value: string;
  fiat: Nullable<string>;
};

const extractBalance = (
  asset: AssetWithBalance,
  balanceType: BalanceType = BalanceType.Transferable
): Nullable<CodecString> => {
  const balance = (asset as AccountAsset)?.balance;
  if (!balance) return null;

  if (balanceType === BalanceType.Transferable) return balance.transferable ?? null;
  return (balance as Record<string, CodecString | undefined>)[balanceType] ?? null;
};

/**
 * Consolidated asset formatting helpers wrapping the legacy mixins and
 * existing composables (`useFormattedAmount`, `useNumberFormatter`).
 */
export function useAssetFormatting() {
  const formattedAmount = useFormattedAmount();
  const numberFormatter = useNumberFormatter();

  const formatAssetBalance = (asset: Nullable<AssetWithBalance>, options: FormatAssetBalanceOptions = {}): string => {
    if (!asset) return options.formattedZero ?? '';

    const {
      internal = true,
      formattedZero = '',
      showZeroBalance = true,
      balanceType = BalanceType.Transferable,
    } = options;

    if (!internal) {
      return baseFormatAssetBalance(asset, { internal, formattedZero, showZeroBalance });
    }

    const balance = extractBalance(asset, balanceType);
    if (!balance || (!showZeroBalance && asZeroValue(balance))) {
      return formattedZero;
    }

    return numberFormatter.formatCodecNumber(balance, (asset as AccountAsset).decimals);
  };

  const formatAssetDisplay = (asset: Nullable<AccountAsset>, options: FormatAssetBalanceOptions = {}): AssetDisplay => {
    const value = formatAssetBalance(asset ?? null, options);
    const balanceType = options.balanceType ?? BalanceType.Transferable;
    const fiat = asset ? formattedAmount.getFiatBalance(asset, balanceType) : null;

    return { value, fiat };
  };

  const formatAmountWithFiat = (
    amount: string | CodecString,
    asset: Asset | AccountAsset,
    isCodecString = false
  ): Nullable<string> => {
    return formattedAmount.getFiatAmount(amount, asset, isCodecString);
  };

  const formatAmountWithSuffixHelper = (value: FPNumber, precision?: number) =>
    formatAmountWithSuffix(value, precision);

  return {
    ...formattedAmount,
    ...numberFormatter,
    formatAssetBalance,
    formatAssetDisplay,
    formatAmountWithFiat,
    formatAmountWithSuffix: formatAmountWithSuffixHelper,
  };
}

export type AssetFormattingComposable = ReturnType<typeof useAssetFormatting>;
