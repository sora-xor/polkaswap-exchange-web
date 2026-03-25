import { FPNumber } from '@sora-substrate/math';
import { computed, ref, toValue } from 'vue';

import { useAssetsStore } from '@/stores/assets';
import { useDemeterFarmingStore } from '@/stores/demeterFarming';
import { usePoolStore } from '@/stores/pool';
import type { DataMap, DoubleMap } from '@/types/common';
import { formatDecimalPlaces } from '@/utils';

import { useDemeterApr } from './useDemeterApr';

import type { DemeterAsset, DemeterPoolDerived, DemeterPoolDerivedData } from '../types';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { MaybeRef } from 'vue';

const createPoolsDoubleMap = <T extends DemeterPool | DemeterAccountPool>(
  pools: readonly T[] = [],
  isFarm = true
): DoubleMap<T[]> => {
  return pools.reduce<DoubleMap<T[]>>((buffer, pool) => {
    if (pool.isFarm !== isFarm) return buffer;

    if (!buffer[pool.baseAsset]) buffer[pool.baseAsset] = {};
    if (!buffer[pool.baseAsset][pool.poolAsset]) buffer[pool.baseAsset][pool.poolAsset] = [];

    buffer[pool.baseAsset][pool.poolAsset].push(pool);

    return buffer;
  }, {});
};

export type UseDemeterBasePageOptions = {
  isFarmingPage?: MaybeRef<boolean>;
};

/**
 * Provides derived data helpers for Demeter staking lists, mirroring `BasePageMixin` logic.
 */
export function useDemeterBasePage(options: UseDemeterBasePageOptions = {}) {
  const aprApi = useDemeterApr();
  const { getAssetFiatPrice, getFiatAmountByFPNumber, formatCodecNumber, getEmission, getTvl, getApr, formatApr } =
    aprApi;
  const assetsStore = useAssetsStore();
  const demeterFarmingStore = useDemeterFarmingStore();
  const poolStore = usePoolStore();

  const isFarmingPage = computed(() => toValue(options.isFarmingPage) ?? true);

  const tokens = computed(() => demeterFarmingStore.tokens as DemeterRewardToken[]);
  const demeterPools = computed(() => demeterFarmingStore.pools as DemeterPool[]);
  const demeterAccountPools = computed(() => demeterFarmingStore.accountPools as DemeterAccountPool[]);
  const accountLiquidity = computed(() => poolStore.accountLiquidity as AccountLiquidity[]);

  const getAsset = assetsStore.assetDataByAddress as (addr?: string) => Nullable<AccountAsset>;

  const showCalculatorDialog = ref(false);
  const baseAsset = ref<Nullable<string>>(null);
  const poolAsset = ref<Nullable<string>>(null);
  const rewardAsset = ref<Nullable<string>>(null);
  const liquidity = ref<Nullable<AccountLiquidity>>(null);

  const tokenInfos = computed<DataMap<DemeterRewardToken>>(() => {
    return tokens.value.reduce<DataMap<DemeterRewardToken>>((buffer, token) => {
      buffer[token.assetId] = token;
      return buffer;
    }, {});
  });

  const uniqueAssets = computed(() => {
    return demeterPools.value.reduce<string[]>((buffer, pool) => {
      buffer.push(pool.baseAsset, pool.poolAsset, pool.rewardAsset);
      return buffer;
    }, []);
  });

  const demeterAssetsData = computed<Record<string, DemeterAsset>>(() => {
    return uniqueAssets.value.reduce<Record<string, DemeterAsset>>((buffer, address) => {
      const asset = getAsset(address);
      const price = asset ? FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? 0) : FPNumber.ZERO;

      buffer[address] = { ...asset, price } as DemeterAsset;

      return buffer;
    }, {});
  });

  const pools = computed(() => createPoolsDoubleMap(demeterPools.value, isFarmingPage.value));
  const accountPools = computed(() => createPoolsDoubleMap(demeterAccountPools.value, isFarmingPage.value));

  const selectedPool = computed<Nullable<DemeterPool>>(() => {
    if (!(baseAsset.value && poolAsset.value && rewardAsset.value)) return null;

    const poolList = pools.value[baseAsset.value]?.[poolAsset.value];
    if (!poolList) return null;

    return poolList.find((pool) => pool.rewardAsset === rewardAsset.value) ?? null;
  });

  const selectedAccountPool = computed<Nullable<DemeterAccountPool>>(() => {
    const pool = selectedPool.value;
    if (!pool) return null;

    const poolAccountList = accountPools.value[pool.baseAsset]?.[pool.poolAsset];

    return poolAccountList?.find((accountPool) => accountPool.rewardAsset === pool.rewardAsset) ?? null;
  });

  const selectedAccountLiquidity = computed<Nullable<AccountLiquidity>>(() => {
    if (!(baseAsset.value && poolAsset.value)) return null;
    return (
      accountLiquidity.value.find(
        (liquidity) => liquidity.firstAddress === baseAsset.value && liquidity.secondAddress === poolAsset.value
      ) ?? null
    );
  });

  const isActiveAccountPool = (accountPool: DemeterAccountPool): boolean => {
    return !(accountPool.pooledTokens.isZero() && accountPool.rewards.isZero());
  };

  const getAccountPool = (pool: DemeterPool): Nullable<DemeterAccountPool> => {
    return (
      accountPools.value[pool.baseAsset]?.[pool.poolAsset]?.find(
        (accountPool) => accountPool.rewardAsset === pool.rewardAsset
      ) ?? null
    );
  };

  const getDerivedPools = (list: DemeterPool[]): DemeterPoolDerived[] => {
    if (!Array.isArray(list)) return [];

    return list.reduce<DemeterPoolDerived[]>((buffer, pool) => {
      const poolIsActive = !pool.isRemoved;
      const accountPool = getAccountPool(pool);
      const accountPoolIsActive = !!accountPool && isActiveAccountPool(accountPool);

      if (!(poolIsActive || accountPoolIsActive)) return buffer;

      buffer.push({
        pool,
        accountPool,
      });

      return buffer;
    }, []);
  };

  const prepareDerivedPoolData = (
    pool: DemeterPool,
    accountPool: Nullable<DemeterAccountPool>,
    dialogLiquidity?: Nullable<AccountLiquidity>
  ): DemeterPoolDerivedData => {
    const base = demeterAssetsData.value[pool.baseAsset];
    const poolAssetData = demeterAssetsData.value[pool.poolAsset];
    const reward = demeterAssetsData.value[pool.rewardAsset];
    const tokenInfo = tokenInfos.value[pool.rewardAsset];
    const emission = getEmission(pool, tokenInfo);
    const tvl = getTvl(pool, poolAssetData.price, dialogLiquidity);
    const apr = getApr(emission, tvl, reward.price);
    const aprFormatted = formatApr(apr);
    const tvlFormatted = `$${formatDecimalPlaces(tvl)}`;

    return {
      pool,
      accountPool,
      tokenInfo,
      baseAsset: base,
      poolAsset: poolAssetData,
      rewardAsset: reward,
      emission,
      tvl: tvlFormatted,
      apr: aprFormatted,
    };
  };

  const showPoolCalculator = (params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void => {
    setDialogParams(params);
    showCalculatorDialog.value = true;
  };

  const setDialogParams = (params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }): void => {
    baseAsset.value = params.baseAsset;
    poolAsset.value = params.poolAsset;
    rewardAsset.value = params.rewardAsset;
    liquidity.value = params.liquidity ?? null;
  };

  return {
    pools,
    accountPools,
    tokenInfos,
    uniqueAssets,
    demeterAssetsData,
    selectedPool,
    selectedAccountPool,
    selectedAccountLiquidity,
    showCalculatorDialog,
    baseAsset,
    poolAsset,
    rewardAsset,
    liquidity,
    isFarmingPage,
    getDerivedPools,
    isActiveAccountPool,
    prepareDerivedPoolData,
    getAccountPool,
    showPoolCalculator,
    setDialogParams,
    getAssetFiatPrice,
    getFiatAmountByFPNumber,
    formatCodecNumber,
    getEmission,
    getTvl,
    getApr,
    formatApr,
    getLiquidityFarmingPools: (liquidity: AccountLiquidity) => {
      const list = pools.value[liquidity.firstAddress]?.[liquidity.secondAddress] ?? [];
      return getDerivedPools(list).map((derived) =>
        prepareDerivedPoolData(derived.pool, derived.accountPool, liquidity)
      );
    },
  };
}

export type DemeterBasePageComposable = ReturnType<typeof useDemeterBasePage>;
