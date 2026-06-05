import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineStore } from 'pinia';
import { computed, nextTick, ref } from 'vue';

import { useSwapBalanceSubscriptions } from '@/composables/useSwapBalanceSubscriptions';
import {
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithmForLiquiditySource,
  MarketAlgorithms,
  ZeroStringValue,
} from '@/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import type { SwapState } from '@/stores/types/swap';
import { settingsStorage } from '@/utils/storage';

import type { Distribution, SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountBalance, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

let balanceSubscriptionApi: ReturnType<typeof useSwapBalanceSubscriptions> | null = null;
const getBalanceSubscriptionApi = () => {
  if (!balanceSubscriptionApi) {
    balanceSubscriptionApi = useSwapBalanceSubscriptions();
  }
  return balanceSubscriptionApi;
};

const preservedResetKeys = new Set<keyof SwapState>(['tokenFromAddress', 'tokenToAddress']);

const resolveToken = (address: Nullable<string>): Nullable<RegisteredAccountAsset> => {
  if (!address) return null;
  const assetsStore = useAssetsStore();
  return assetsStore.assetDataByAddress(address) as Nullable<RegisteredAccountAsset>;
};

const applyBalance = (
  token: Nullable<RegisteredAccountAsset>,
  balance: Nullable<AccountBalance>
): Nullable<RegisteredAccountAsset> => {
  if (!token) return null;
  if (!balance) return token;

  return { ...token, balance } as RegisteredAccountAsset;
};

const resolveTokenWithBalance = (
  address: Nullable<string>,
  balance: Nullable<AccountBalance>
): Nullable<RegisteredAccountAsset> => {
  const token = resolveToken(address);
  return applyBalance(token, balance);
};

const buildInitialState = (): SwapState => {
  const allowLossPopup = settingsStorage.get('allowSwapLossPopup' as any);

  return {
    tokenFromAddress: XOR.address,
    tokenToAddress: '',
    tokenFromBalance: null,
    tokenToBalance: null,
    tokenFromCache: resolveTokenWithBalance(XOR.address, null),
    tokenToCache: null,
    fromValue: '',
    toValue: '',
    amountWithoutImpact: '',
    liquidityProviderFee: '',
    isExchangeB: false,
    rewards: [],
    route: [],
    distribution: [],
    isPathAvailable: false,
    isAvailable: false,
    quoteError: false,
    liquiditySources: [],
    swapQuote: null,
    selectedDexId: DexId.XOR,
    allowLossPopup: allowLossPopup ? Boolean(JSON.parse(allowLossPopup)) : true,
  };
};

/**
 * Feature-owned swap domain store. The public store API is preserved so legacy
 * consumers can keep importing `@/stores/swap` during the migration.
 */
export const useSwapStore = defineStore('swap', () => {
  const initialState = buildInitialState();

  const tokenFromAddress = ref(initialState.tokenFromAddress);
  const tokenFromBalance = ref(initialState.tokenFromBalance);
  const tokenFromCache = ref(initialState.tokenFromCache);
  const tokenToAddress = ref(initialState.tokenToAddress);
  const tokenToBalance = ref(initialState.tokenToBalance);
  const tokenToCache = ref(initialState.tokenToCache);
  const fromValue = ref(initialState.fromValue);
  const toValue = ref(initialState.toValue);
  const amountWithoutImpact = ref(initialState.amountWithoutImpact);
  const liquidityProviderFee = ref(initialState.liquidityProviderFee);
  const isExchangeB = ref(initialState.isExchangeB);
  const rewards = ref(initialState.rewards);
  const route = ref(initialState.route);
  const distribution = ref(initialState.distribution);
  const isPathAvailable = ref(initialState.isPathAvailable);
  const isAvailable = ref(initialState.isAvailable);
  const quoteError = ref(initialState.quoteError);
  const liquiditySources = ref(initialState.liquiditySources);
  const swapQuote = ref(initialState.swapQuote);
  const selectedDexId = ref(initialState.selectedDexId);
  const allowLossPopup = ref(initialState.allowLossPopup);

  const tokenFrom = computed((): Nullable<RegisteredAccountAsset> => tokenFromCache.value);
  const tokenTo = computed((): Nullable<RegisteredAccountAsset> => tokenToCache.value);
  const marketAlgorithms = computed((): Array<MarketAlgorithms> => {
    const settingsStore = useSettingsStore();
    const baseSources = settingsStore.debugEnabled
      ? liquiditySources.value
      : liquiditySources.value.filter((source) => source !== LiquiditySourceTypes.XYKPool);

    return (Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>).filter((entry) => {
      if (entry === MarketAlgorithms.SMART) return true;

      const liquiditySource = LiquiditySourceForMarketAlgorithm[entry];
      return baseSources.includes(liquiditySource);
    });
  });
  const marketAlgorithmsAvailable = computed((): boolean => marketAlgorithms.value.length > 1);
  const swapLiquiditySource = computed((): Nullable<LiquiditySourceTypes> => {
    if (!marketAlgorithmsAvailable.value) return undefined;

    const settingsStore = useSettingsStore();
    return settingsStore.liquiditySource;
  });
  const swapMarketAlgorithm = computed((): MarketAlgorithms => {
    const liquiditySource = swapLiquiditySource.value ?? '';
    return MarketAlgorithmForLiquiditySource[liquiditySource as LiquiditySourceTypes] ?? MarketAlgorithms.SMART;
  });
  const price = computed((): string => {
    if (!(tokenFrom.value && tokenTo.value)) return ZeroStringValue;

    return api.divideAssets(tokenFrom.value, tokenTo.value, fromValue.value, toValue.value, false);
  });
  const priceReversed = computed((): string => {
    if (!(tokenFrom.value && tokenTo.value)) return ZeroStringValue;

    return api.divideAssets(tokenFrom.value, tokenTo.value, fromValue.value, toValue.value, true);
  });
  const priceImpact = computed((): string => {
    if (!(tokenFrom.value && tokenTo.value)) return ZeroStringValue;

    return api.swap.getPriceImpact(
      tokenFrom.value,
      tokenTo.value,
      fromValue.value,
      toValue.value,
      amountWithoutImpact.value,
      isExchangeB.value
    );
  });
  const minMaxReceived = computed((): CodecString => {
    const settingsStore = useSettingsStore();

    if (!(tokenFrom.value && tokenTo.value)) return ZeroStringValue;

    return api.swap.getMinMaxValue(
      tokenFrom.value,
      tokenTo.value,
      fromValue.value,
      toValue.value,
      isExchangeB.value,
      settingsStore.slippageTolerance
    );
  });

  const resolveStore = (): ReturnType<typeof createStoreApi> => useSwapStore();
  let store: ReturnType<typeof createStoreApi>;

  function updateTokenSubscription(direction: 'from' | 'to') {
    const token = direction === 'from' ? tokenFrom.value : tokenTo.value;
    const currentStore = resolveStore();
    const updateBalance = direction === 'from' ? currentStore.setTokenFromBalance : currentStore.setTokenToBalance;

    getBalanceSubscriptionApi().updateSubscription(direction, token, updateBalance);
  }

  function setTokenFromAddress(address?: string) {
    tokenFromAddress.value = address ?? '';
    tokenFromCache.value = resolveTokenWithBalance(tokenFromAddress.value, tokenFromBalance.value);
    resolveStore().updateTokenSubscription('from');
  }

  function setTokenToAddress(address?: string) {
    tokenToAddress.value = address ?? '';
    tokenToCache.value = resolveTokenWithBalance(tokenToAddress.value, tokenToBalance.value);
    resolveStore().updateTokenSubscription('to');
  }

  function setTokenFromBalance(balance: Nullable<AccountBalance>) {
    tokenFromBalance.value = balance;
    tokenFromCache.value = resolveTokenWithBalance(tokenFromAddress.value, tokenFromBalance.value);
  }

  function setTokenToBalance(balance: Nullable<AccountBalance>) {
    tokenToBalance.value = balance;
    tokenToCache.value = resolveTokenWithBalance(tokenToAddress.value, tokenToBalance.value);
  }

  function setFromValue(value: string) {
    fromValue.value = value;
  }

  function setToValue(value: string) {
    toValue.value = value;
  }

  function setAmountWithoutImpact(amount: CodecString = ZeroStringValue) {
    amountWithoutImpact.value = amount;
  }

  function setExchangeB(flag: boolean) {
    isExchangeB.value = flag;
  }

  function setLiquidityProviderFee(value: CodecString = ZeroStringValue) {
    liquidityProviderFee.value = value;
  }

  function setRewards(nextRewards: ReadonlyArray<SwapState['rewards'][number]> = []) {
    rewards.value = Object.freeze([...nextRewards]);
  }

  function setRoute(nextRoute: ReadonlyArray<string> = []) {
    route.value = Object.freeze([...nextRoute]);
  }

  function setDistribution(nextDistribution: ReadonlyArray<Distribution[]> = []) {
    distribution.value = Object.freeze([...nextDistribution]);
  }

  function setSubscriptionPayload(payload?: {
    quote?: SwapQuote | null;
    isAvailable?: boolean;
    isPathAvailable?: boolean;
    liquiditySources?: LiquiditySourceTypes[];
  }) {
    if (!payload) {
      swapQuote.value = null;
      isAvailable.value = false;
      isPathAvailable.value = false;
      quoteError.value = false;
      liquiditySources.value = [];
      return;
    }

    const { quote = null, isAvailable: available = false, liquiditySources: nextLiquiditySources = [] } = payload;

    swapQuote.value = quote;
    isAvailable.value = available;
    if ('isPathAvailable' in payload) {
      isPathAvailable.value = payload.isPathAvailable ?? false;
    }
    liquiditySources.value = nextLiquiditySources;
  }

  function setQuoteError(flag = false) {
    quoteError.value = flag;
  }

  function setPathAvailability(flag = false) {
    isPathAvailable.value = flag;
  }

  function setLiquiditySource(liquiditySource: LiquiditySourceTypes) {
    liquiditySources.value = [liquiditySource];
  }

  function selectDexId(dexId: number = DexId.XOR) {
    selectedDexId.value = dexId;
  }

  function setAllowLossPopup(flag: boolean) {
    allowLossPopup.value = flag;
    settingsStorage.set('allowSwapLossPopup' as any, flag);
  }

  async function switchTokens() {
    const currentStore = resolveStore();
    const currentTokenFromAddress = tokenFromAddress.value;
    const currentTokenToAddress = tokenToAddress.value;
    const currentFromValue = fromValue.value;
    const currentToValue = toValue.value;
    const exchangeByOutput = isExchangeB.value;

    if (!(currentTokenFromAddress && currentTokenToAddress)) return;

    const [nextFromValue, nextToValue] = exchangeByOutput ? [currentToValue, ''] : ['', currentFromValue];
    const nextFromCache = resolveTokenWithBalance(currentTokenToAddress, tokenToBalance.value);
    const nextToCache = resolveTokenWithBalance(currentTokenFromAddress, tokenFromBalance.value);

    currentStore.setTokenFromAddress(currentTokenToAddress);
    currentStore.setTokenToAddress(currentTokenFromAddress);
    currentStore.setFromValue(nextFromValue);
    currentStore.setToValue(nextToValue);
    currentStore.setExchangeB(!exchangeByOutput);
    tokenFromCache.value = nextFromCache;
    tokenToCache.value = nextToCache;

    await currentStore.updateSubscriptions();
    await nextTick();

    tokenFromCache.value = resolveTokenWithBalance(tokenFromAddress.value, tokenFromBalance.value);
    tokenToCache.value = resolveTokenWithBalance(tokenToAddress.value, tokenToBalance.value);
  }

  async function updateSubscriptions() {
    const currentStore = resolveStore();
    await Promise.all([
      Promise.resolve(currentStore.updateTokenSubscription('from')),
      Promise.resolve(currentStore.updateTokenSubscription('to')),
    ]);
  }

  function resetSubscriptions() {
    const manager = getBalanceSubscriptionApi();
    manager.removeSubscription('from');
    manager.removeSubscription('to');
  }

  function reset() {
    resolveStore().resetSubscriptions();

    const next = buildInitialState();
    (Object.keys(next) as Array<keyof SwapState>).forEach((key) => {
      if (preservedResetKeys.has(key)) return;

      switch (key) {
        case 'tokenFromBalance':
          tokenFromBalance.value = next.tokenFromBalance;
          break;
        case 'tokenFromCache':
          tokenFromCache.value = next.tokenFromCache;
          break;
        case 'tokenToBalance':
          tokenToBalance.value = next.tokenToBalance;
          break;
        case 'tokenToCache':
          tokenToCache.value = next.tokenToCache;
          break;
        case 'fromValue':
          fromValue.value = next.fromValue;
          break;
        case 'toValue':
          toValue.value = next.toValue;
          break;
        case 'amountWithoutImpact':
          amountWithoutImpact.value = next.amountWithoutImpact;
          break;
        case 'liquidityProviderFee':
          liquidityProviderFee.value = next.liquidityProviderFee;
          break;
        case 'isExchangeB':
          isExchangeB.value = next.isExchangeB;
          break;
        case 'rewards':
          rewards.value = next.rewards;
          break;
        case 'route':
          route.value = next.route;
          break;
        case 'distribution':
          distribution.value = next.distribution;
          break;
        case 'isPathAvailable':
          isPathAvailable.value = next.isPathAvailable;
          break;
        case 'isAvailable':
          isAvailable.value = next.isAvailable;
          break;
        case 'quoteError':
          quoteError.value = next.quoteError;
          break;
        case 'liquiditySources':
          liquiditySources.value = next.liquiditySources;
          break;
        case 'swapQuote':
          swapQuote.value = next.swapQuote;
          break;
        case 'selectedDexId':
          selectedDexId.value = next.selectedDexId;
          break;
        case 'allowLossPopup':
          allowLossPopup.value = next.allowLossPopup;
          break;
      }
    });

    tokenFromCache.value = resolveTokenWithBalance(tokenFromAddress.value, tokenFromBalance.value);
    tokenToCache.value = resolveTokenWithBalance(tokenToAddress.value, tokenToBalance.value);
  }

  function createStoreApi() {
    return {
      tokenFromAddress,
      tokenFromBalance,
      tokenFromCache,
      tokenToAddress,
      tokenToBalance,
      tokenToCache,
      fromValue,
      toValue,
      amountWithoutImpact,
      liquidityProviderFee,
      isExchangeB,
      rewards,
      route,
      distribution,
      isPathAvailable,
      isAvailable,
      quoteError,
      liquiditySources,
      swapQuote,
      selectedDexId,
      allowLossPopup,
      tokenFrom,
      tokenTo,
      marketAlgorithms,
      marketAlgorithmsAvailable,
      swapLiquiditySource,
      swapMarketAlgorithm,
      price,
      priceReversed,
      priceImpact,
      minMaxReceived,
      updateTokenSubscription,
      setTokenFromAddress,
      setTokenToAddress,
      setTokenFromBalance,
      setTokenToBalance,
      setFromValue,
      setToValue,
      setAmountWithoutImpact,
      setExchangeB,
      setLiquidityProviderFee,
      setRewards,
      setRoute,
      setDistribution,
      setSubscriptionPayload,
      setQuoteError,
      setPathAvailability,
      setLiquiditySource,
      selectDexId,
      setAllowLossPopup,
      switchTokens,
      updateSubscriptions,
      resetSubscriptions,
      reset,
      $reset: reset,
    };
  }

  store = createStoreApi();

  return store;
});
