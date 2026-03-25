import { FPNumber, Operation, type NetworkFeesObject, type CodecString } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { ZeroStringValue } from '@/consts';
import { usePoolStore } from '@/stores/pool';
import { useSettingsStore } from '@/stores/settings';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

/**
 * Shared pool token state (replacement for `BaseTokenPairMixin`).
 */
export function usePoolTokenPair() {
  const { formatCodecNumber, formatStringValue } = useFormattedAmount();
  const poolStore = usePoolStore();
  const settingsStore = useSettingsStore();

  const networkFees = computed<NetworkFeesObject>(() => settingsStore.networkFees);
  const firstTokenValue = computed(() => poolStore.addLiquidityFirstTokenValue);
  const secondTokenValue = computed(() => poolStore.addLiquiditySecondTokenValue);
  const isAvailable = computed(() => poolStore.addLiquidityIsAvailable);

  const firstToken = computed(() => poolStore.addLiquidityFirstToken as Nullable<AccountAsset>);
  const secondToken = computed(() => poolStore.addLiquiditySecondToken as Nullable<AccountAsset>);
  const price = computed(() => poolStore.addLiquidityPrice);
  const priceReversed = computed(() => poolStore.addLiquidityPriceReversed);

  const networkFee = computed<CodecString>(() => {
    const operation = isAvailable.value ? Operation.AddLiquidity : Operation.CreatePair;

    return networkFees.value?.[operation] ?? ZeroStringValue;
  });

  const formattedFee = computed(() => formatCodecNumber(networkFee.value));
  const formattedPrice = computed(() => formatStringValue(price.value));
  const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));

  const emptyAssets = computed(() => {
    if (!(firstTokenValue.value || secondTokenValue.value)) return true;

    const first = new FPNumber(firstTokenValue.value || ZeroStringValue);
    const second = new FPNumber(secondTokenValue.value || ZeroStringValue);

    return first.isNaN() || first.isZero() || second.isNaN() || second.isZero();
  });

  return {
    XOR_SYMBOL: XOR.symbol,
    networkFees,
    firstTokenValue,
    secondTokenValue,
    isAvailable,
    firstToken,
    secondToken,
    price,
    priceReversed,
    networkFee,
    formattedFee,
    formattedPrice,
    formattedPriceReversed,
    emptyAssets,
  };
}

export type PoolTokenPairComposable = ReturnType<typeof usePoolTokenPair>;
