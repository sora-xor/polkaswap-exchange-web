import { FPNumber, type CodecString } from '@sora-substrate/sdk';
import { BalanceType, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { useNumberFormatter } from './useNumberFormatter';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

/**
 * Provides fiat conversion helpers equivalent to the wallet's
 * `FormattedAmountMixin` while being Composition API friendly.
 */
export function useFormattedAmount() {
  const numberFormatter = useNumberFormatter();
  const walletStore = useWalletStore(pinia);
  const fiatPriceObject = computed(() => walletStore.fiatPriceObject);

  const getAssetFiatPrice = (asset?: Nullable<Asset | AccountAsset>): Nullable<CodecString> => {
    if (!asset?.address) return null;
    return fiatPriceObject.value?.[asset.address] ?? null;
  };

  const getFiatBalance = (
    asset?: Nullable<AccountAsset>,
    type: BalanceType = BalanceType.Transferable
  ): Nullable<string> => {
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price || !asset.balance) return null;

    return numberFormatter
      .getFPNumberFromCodec(asset.balance[type], asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  };

  const getFiatAmount = (
    amount: string | CodecString,
    asset?: Nullable<Asset | AccountAsset>,
    isCodecString = false
  ): Nullable<string> => {
    if (!amount && amount !== '') return null;
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price) return null;

    const numericAmount = amount || '0';
    const factory = isCodecString ? numberFormatter.getFPNumberFromCodec : numberFormatter.getFPNumber;

    return factory(numericAmount, asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };

  const getFiatAmountByString = (amount: string, asset?: Nullable<Asset | AccountAsset>): Nullable<string> => {
    if (!amount && amount !== '') return null;
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price) return null;

    return numberFormatter
      .getFPNumber(amount || '0', asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  };

  const getFPNumberFiatAmountByFPNumber = (
    amount: FPNumber,
    asset: Nullable<Asset | AccountAsset> = XOR
  ): Nullable<FPNumber> => {
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price) return null;

    return amount.mul(FPNumber.fromCodecValue(price));
  };

  const getFiatAmountByFPNumber = (amount: FPNumber, asset: Nullable<Asset | AccountAsset> = XOR): Nullable<string> => {
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price) return null;

    return amount.mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };

  const getFiatAmountByCodecString = (
    amount: CodecString,
    asset: Nullable<Asset | AccountAsset> = XOR
  ): Nullable<string> => getFiatAmount(amount, asset, true);

  return {
    ...numberFormatter,
    getAssetFiatPrice,
    getFiatBalance,
    getFiatAmount,
    getFiatAmountByString,
    getFiatAmountByCodecString,
    getFiatAmountByFPNumber,
    getFPNumberFiatAmountByFPNumber,
  };
}

export type FormattedAmountComposable = ReturnType<typeof useFormattedAmount>;
