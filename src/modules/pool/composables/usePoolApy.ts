import { computed } from 'vue';

import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { api } from '@/shims/wallet-api';
import { usePoolStore } from '@/stores/pool';

import type { PoolApyObject } from '@/shims/wallet-indexer-types';

const { getFPNumberFromCodec, Hundred } = useNumberFormatter();

export function usePoolApy() {
  const poolStore = usePoolStore();
  const poolApyObject = computed<PoolApyObject>(() => poolStore.poolApyObject);

  const getPoolApy = (baseAssetAddress: Nullable<string>, targetAssetAddress: Nullable<string>): Nullable<string> => {
    if (!(baseAssetAddress && targetAssetAddress)) return null;

    const poolInfo = api.poolXyk.getInfo(baseAssetAddress, targetAssetAddress);

    if (!poolInfo?.address) return null;

    return poolApyObject.value[poolInfo.address] ?? null;
  };

  const getPoolApyFormatted = (baseAssetAddress: Nullable<string>, targetAssetAddress: Nullable<string>): string => {
    const apy = getPoolApy(baseAssetAddress, targetAssetAddress);
    if (!apy) return '';

    return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
  };

  return {
    poolApyObject,
    getPoolApy,
    getPoolApyFormatted,
  };
}

export type PoolApyComposable = ReturnType<typeof usePoolApy>;
