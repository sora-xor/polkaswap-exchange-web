import { u as useTranslation, aU as formatDecimalPlaces, F as FPNumber, H as useAssetsStore, h as computed, a9 as ref, aQ as toValue, s as store, c2 as useTransaction } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const BLOCKS_PER_YEAR = new FPNumber(5256e3);
function useDemeterApr() {
  const { t } = useTranslation();
  const formatted = useFormattedAmount();
  const getEmission = (pool, tokenInfo) => {
    const isFarm = !!pool?.isFarm;
    const tokenMultiplier = new FPNumber(
      (isFarm ? tokenInfo?.farmsTotalMultiplier : tokenInfo?.stakingTotalMultiplier) ?? 0
    );
    if (tokenMultiplier.isZero()) return FPNumber.ZERO;
    const poolMultiplier = new FPNumber(pool?.multiplier ?? 0);
    const multiplier = poolMultiplier.div(tokenMultiplier);
    const allocation = (isFarm ? tokenInfo?.farmsAllocation : tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;
    return allocation.mul(tokenPerBlock).mul(multiplier);
  };
  const getTvl = (pool, poolAssetPrice, liquidity) => {
    if (!pool) return FPNumber.ZERO;
    if (pool.isFarm) {
      if (!liquidity) return FPNumber.ZERO;
      return FPNumber.fromCodecValue(liquidity.secondBalance).div(FPNumber.fromCodecValue(liquidity.balance)).mul(pool.totalTokensInPool).mul(poolAssetPrice).mul(new FPNumber(2));
    }
    return pool.totalTokensInPool.mul(poolAssetPrice);
  };
  const getApr = (emission, tvl, rewardAssetPrice) => {
    if (tvl.isZero()) return FPNumber.ZERO;
    return emission.mul(BLOCKS_PER_YEAR).mul(rewardAssetPrice).div(tvl).mul(FPNumber.HUNDRED);
  };
  const formatApr = (apr) => {
    return apr.isZero() ? t("calculatingText") : formatDecimalPlaces(apr, true);
  };
  return {
    ...formatted,
    getEmission,
    getTvl,
    getApr,
    formatApr
  };
}
const createPoolsDoubleMap = (pools = [], isFarm = true) => {
  return pools.reduce((buffer, pool) => {
    if (pool.isFarm !== isFarm) return buffer;
    if (!buffer[pool.baseAsset]) buffer[pool.baseAsset] = {};
    if (!buffer[pool.baseAsset][pool.poolAsset]) buffer[pool.baseAsset][pool.poolAsset] = [];
    buffer[pool.baseAsset][pool.poolAsset].push(pool);
    return buffer;
  }, {});
};
function useDemeterBasePage(options = {}) {
  const aprApi = useDemeterApr();
  const { getAssetFiatPrice, getFiatAmountByFPNumber, formatCodecNumber, getEmission, getTvl, getApr, formatApr } = aprApi;
  const assetsStore = useAssetsStore();
  const isFarmingPage = computed(() => toValue(options.isFarmingPage) ?? true);
  const tokens = computed(() => store.state.demeterFarming.tokens);
  const demeterPools = computed(() => store.state.demeterFarming.pools);
  const demeterAccountPools = computed(() => store.state.demeterFarming.accountPools);
  const accountLiquidity = computed(() => store.state.pool?.accountLiquidity ?? []);
  const getAsset = assetsStore.assetDataByAddress;
  const showCalculatorDialog = ref(false);
  const baseAsset = ref(null);
  const poolAsset = ref(null);
  const rewardAsset = ref(null);
  const liquidity = ref(null);
  const tokenInfos = computed(() => {
    return tokens.value.reduce((buffer, token) => {
      buffer[token.assetId] = token;
      return buffer;
    }, {});
  });
  const uniqueAssets = computed(() => {
    return demeterPools.value.reduce((buffer, pool) => {
      buffer.push(pool.baseAsset, pool.poolAsset, pool.rewardAsset);
      return buffer;
    }, []);
  });
  const demeterAssetsData = computed(() => {
    return uniqueAssets.value.reduce((buffer, address) => {
      const asset = getAsset(address);
      const price = asset ? FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? 0) : FPNumber.ZERO;
      buffer[address] = { ...asset, price };
      return buffer;
    }, {});
  });
  const pools = computed(() => createPoolsDoubleMap(demeterPools.value, isFarmingPage.value));
  const accountPools = computed(() => createPoolsDoubleMap(demeterAccountPools.value, isFarmingPage.value));
  const selectedPool = computed(() => {
    if (!(baseAsset.value && poolAsset.value && rewardAsset.value)) return null;
    const poolList = pools.value[baseAsset.value]?.[poolAsset.value];
    if (!poolList) return null;
    return poolList.find((pool) => pool.rewardAsset === rewardAsset.value) ?? null;
  });
  const selectedAccountPool = computed(() => {
    const pool = selectedPool.value;
    if (!pool) return null;
    const poolAccountList = accountPools.value[pool.baseAsset]?.[pool.poolAsset];
    return poolAccountList?.find((accountPool) => accountPool.rewardAsset === pool.rewardAsset) ?? null;
  });
  const selectedAccountLiquidity = computed(() => {
    if (!(baseAsset.value && poolAsset.value)) return null;
    return accountLiquidity.value.find(
      (liquidity2) => liquidity2.firstAddress === baseAsset.value && liquidity2.secondAddress === poolAsset.value
    ) ?? null;
  });
  const isActiveAccountPool = (accountPool) => {
    return !(accountPool.pooledTokens.isZero() && accountPool.rewards.isZero());
  };
  const getAccountPool = (pool) => {
    return accountPools.value[pool.baseAsset]?.[pool.poolAsset]?.find(
      (accountPool) => accountPool.rewardAsset === pool.rewardAsset
    ) ?? null;
  };
  const getDerivedPools = (list) => {
    if (!Array.isArray(list)) return [];
    return list.reduce((buffer, pool) => {
      const poolIsActive = !pool.isRemoved;
      const accountPool = getAccountPool(pool);
      const accountPoolIsActive = !!accountPool && isActiveAccountPool(accountPool);
      if (!(poolIsActive || accountPoolIsActive)) return buffer;
      buffer.push({
        pool,
        accountPool
      });
      return buffer;
    }, []);
  };
  const prepareDerivedPoolData = (pool, accountPool, dialogLiquidity) => {
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
      apr: aprFormatted
    };
  };
  const showPoolCalculator = (params) => {
    setDialogParams(params);
    showCalculatorDialog.value = true;
  };
  const setDialogParams = (params) => {
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
    getLiquidityFarmingPools: (liquidity2) => {
      const list = pools.value[liquidity2.firstAddress]?.[liquidity2.secondAddress] ?? [];
      return getDerivedPools(list).map(
        (derived) => prepareDerivedPoolData(derived.pool, derived.accountPool, liquidity2)
      );
    }
  };
}
function useDemeterPage(basePage, options = {}) {
  const parentLoading = options.parentLoading;
  const { loading, withNotifications } = useTransaction({
    parentLoading: parentLoading ? typeof parentLoading === "function" ? parentLoading : () => toValue(parentLoading) : void 0
  });
  const showStakeDialog = ref(false);
  const showClaimDialog = ref(false);
  const isAddingStake = ref(true);
  const setDialogParams = (params) => {
    basePage.setDialogParams(params);
  };
  const changePoolStake = (params, adding = true) => {
    isAddingStake.value = adding;
    setDialogParams(params);
    showStakeDialog.value = true;
  };
  const claimPoolRewards = (params) => {
    setDialogParams(params);
    showClaimDialog.value = true;
  };
  const deposit = (params) => store.dispatch.demeterFarming.deposit(params);
  const withdraw = (params) => store.dispatch.demeterFarming.withdraw(params);
  const claimRewards = (pool) => store.dispatch.demeterFarming.claimRewards(pool);
  const handleStakeAction = async (params, action) => {
    await withNotifications(async () => {
      await action(params);
      showStakeDialog.value = false;
    });
  };
  const handleClaimRewards = async (pool) => {
    await withNotifications(async () => {
      await claimRewards(pool);
      showClaimDialog.value = false;
    });
  };
  const selectedDerivedPool = computed(() => {
    const pool = basePage.selectedPool.value;
    if (!pool) return null;
    return basePage.prepareDerivedPoolData(pool, basePage.selectedAccountPool.value, basePage.liquidity.value);
  });
  return {
    loading,
    showStakeDialog,
    showClaimDialog,
    isAddingStake,
    selectedDerivedPool,
    changePoolStake,
    claimPoolRewards,
    handleStakeAction,
    handleClaimRewards,
    deposit,
    withdraw,
    isActiveCollapseItem: (address, activeCollapseItems) => {
      return activeCollapseItems.includes(address);
    },
    getLiquidityFarmingPools: (liquidity) => basePage.getLiquidityFarmingPools(liquidity) ?? [],
    withNotifications
  };
}
export {
  useDemeterPage as a,
  useDemeterBasePage as u
};
