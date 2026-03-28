import { FPNumber, type CodecString } from '@sora-substrate/sdk';
import { BalanceType, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { useWalletStore } from '@/stores/wallet';
import { FontSizeRate, FontWeightRate } from '../consts';

import { useNumberFormatter } from './useNumberFormatter';

import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

export function useFormattedAmount() {
  const walletStore = useWalletStore();
  const numberFormatter = useNumberFormatter();
  const { getFPNumber, getFPNumberFromCodec } = numberFormatter;

  const fiatPriceObject = computed(() => walletStore.fiatPriceObject);

  const getAssetFiatPrice = (asset: Asset | AccountAsset): Nullable<CodecString> => {
    if (!asset?.address) {
      return null;
    }

    return fiatPriceObject.value?.[asset.address] ?? null;
  };

  const getFiatBalance = (
    asset?: Nullable<AccountAsset>,
    type: BalanceType = BalanceType.Transferable
  ): Nullable<string> => {
    if (!asset) return null;

    const price = getAssetFiatPrice(asset);
    if (!price || !asset.balance) {
      return null;
    }
    return getFPNumberFromCodec(asset.balance[type], asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  };

  const getFiatAmount = (
    amount: string | CodecString,
    asset: Asset | AccountAsset,
    isCodecString = false
  ): Nullable<string> => {
    if (!amount && amount !== '') {
      return null;
    }
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    const { decimals } = asset;
    const amountParam = amount || '0';
    return (isCodecString ? getFPNumberFromCodec(amountParam, decimals) : getFPNumber(amountParam, decimals))
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  };

  const getFiatAmountByString = (amount: string, asset: AccountAsset | Asset): Nullable<string> => {
    if (!amount && amount !== '') {
      return null;
    }
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return getFPNumber(amount || '0', asset.decimals)
      .mul(FPNumber.fromCodecValue(price))
      .toLocaleString();
  };

  const getFPNumberFiatAmountByFPNumber = (amount: FPNumber, asset: Asset | AccountAsset = XOR): Nullable<FPNumber> => {
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price));
  };

  const getFiatAmountByFPNumber = (amount: FPNumber, asset: Asset | AccountAsset = XOR): Nullable<string> => {
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };

  const getFiatAmountByCodecString = (amount: CodecString, asset: Asset | AccountAsset = XOR): Nullable<string> => {
    return getFiatAmount(amount, asset, true);
  };

  return {
    ...numberFormatter,
    FontSizeRate,
    FontWeightRate,
    getAssetFiatPrice,
    getFiatBalance,
    getFiatAmount,
    getFiatAmountByString,
    getFPNumberFiatAmountByFPNumber,
    getFiatAmountByFPNumber,
    getFiatAmountByCodecString,
  };
}
