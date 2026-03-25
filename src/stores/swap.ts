import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineStore } from 'pinia';
import { nextTick } from 'vue';

import {
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithmForLiquiditySource,
  MarketAlgorithms,
  ZeroStringValue,
} from '@/consts';
import { api } from '@/shims/wallet-api';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useSwapBalanceSubscriptions } from '@/composables/useSwapBalanceSubscriptions';
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
    isAvailable: false,
    liquiditySources: [],
    swapQuote: null,
    selectedDexId: DexId.XOR,
    allowLossPopup: allowLossPopup ? Boolean(JSON.parse(allowLossPopup)) : true,
  };
};

/**
 * Pinia-powered swap store that mirrors the historic direct-vuex module.
 */
export const useSwapStore = defineStore('swap', {
  state: (): SwapState => buildInitialState(),
  getters: {
    tokenFrom: (state): Nullable<RegisteredAccountAsset> => state.tokenFromCache,
    tokenTo: (state): Nullable<RegisteredAccountAsset> => state.tokenToCache,
    marketAlgorithms(state): Array<MarketAlgorithms> {
      const settingsStore = useSettingsStore();
      const baseSources = settingsStore.debugEnabled
        ? state.liquiditySources
        : state.liquiditySources.filter((source) => source !== LiquiditySourceTypes.XYKPool);

      return (Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>).filter((entry) => {
        if (entry === MarketAlgorithms.SMART) return true;

        const liquiditySource = LiquiditySourceForMarketAlgorithm[entry];
        return baseSources.includes(liquiditySource);
      });
    },
    marketAlgorithmsAvailable(): boolean {
      return this.marketAlgorithms.length > 1;
    },
    swapLiquiditySource(): Nullable<LiquiditySourceTypes> {
      if (!this.marketAlgorithmsAvailable) return undefined;

      const settingsStore = useSettingsStore();

      return settingsStore.liquiditySource;
    },
    swapMarketAlgorithm(): MarketAlgorithms {
      const liquiditySource = this.swapLiquiditySource ?? '';
      return MarketAlgorithmForLiquiditySource[liquiditySource as LiquiditySourceTypes] ?? MarketAlgorithms.SMART;
    },
    price(state): string {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;

      if (!(tokenFrom && tokenTo)) return ZeroStringValue;

      return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, false);
    },
    priceReversed(state): string {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;

      if (!(tokenFrom && tokenTo)) return ZeroStringValue;

      return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, true);
    },
    priceImpact(state): string {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;

      if (!(tokenFrom && tokenTo)) return ZeroStringValue;

      return api.swap.getPriceImpact(
        tokenFrom,
        tokenTo,
        state.fromValue,
        state.toValue,
        state.amountWithoutImpact,
        state.isExchangeB
      );
    },
    minMaxReceived(state): CodecString {
      const tokenFrom = this.tokenFrom;
      const tokenTo = this.tokenTo;
      const settingsStore = useSettingsStore();

      if (!(tokenFrom && tokenTo)) return ZeroStringValue;

      return api.swap.getMinMaxValue(
        tokenFrom,
        tokenTo,
        state.fromValue,
        state.toValue,
        state.isExchangeB,
        settingsStore.slippageTolerance
      );
    },
  },
  actions: {
    updateTokenSubscription(direction: 'from' | 'to') {
      const token = direction === 'from' ? this.tokenFrom : this.tokenTo;
      const updateBalance = direction === 'from' ? this.setTokenFromBalance : this.setTokenToBalance;

      getBalanceSubscriptionApi().updateSubscription(direction, token, updateBalance);
    },
    setTokenFromAddress(address?: string) {
      this.tokenFromAddress = address ?? '';
      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
      this.updateTokenSubscription('from');
    },
    setTokenToAddress(address?: string) {
      this.tokenToAddress = address ?? '';
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
      this.updateTokenSubscription('to');
    },
    setTokenFromBalance(balance: Nullable<AccountBalance>) {
      this.tokenFromBalance = balance;
      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
    },
    setTokenToBalance(balance: Nullable<AccountBalance>) {
      this.tokenToBalance = balance;
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
    },
    setFromValue(value: string) {
      this.fromValue = value;
    },
    setToValue(value: string) {
      this.toValue = value;
    },
    setAmountWithoutImpact(amount: CodecString = ZeroStringValue) {
      this.amountWithoutImpact = amount;
    },
    setExchangeB(flag: boolean) {
      this.isExchangeB = flag;
    },
    setLiquidityProviderFee(value: CodecString = ZeroStringValue) {
      this.liquidityProviderFee = value;
    },
    setRewards(rewards: ReadonlyArray<SwapState['rewards'][number]> = []) {
      this.rewards = Object.freeze([...rewards]);
    },
    setRoute(route: ReadonlyArray<string> = []) {
      this.route = Object.freeze([...route]);
    },
    setDistribution(distribution: ReadonlyArray<Distribution[]> = []) {
      this.distribution = Object.freeze([...distribution]);
    },
    setSubscriptionPayload(payload?: {
      quote?: SwapQuote | null;
      isAvailable?: boolean;
      liquiditySources?: LiquiditySourceTypes[];
    }) {
      const { quote = null, isAvailable = false, liquiditySources = [] } = payload ?? {};
      this.swapQuote = quote;
      this.isAvailable = isAvailable;
      this.liquiditySources = liquiditySources;
    },
    setLiquiditySource(liquiditySource: LiquiditySourceTypes) {
      this.liquiditySources = [liquiditySource];
    },
    selectDexId(dexId: number = DexId.XOR) {
      this.selectedDexId = dexId;
    },
    setAllowLossPopup(flag: boolean) {
      this.allowLossPopup = flag;
      settingsStorage.set('allowSwapLossPopup' as any, flag);
    },
    async switchTokens() {
      const { tokenFromAddress, tokenToAddress, fromValue, toValue, isExchangeB } = this;

      if (!(tokenFromAddress && tokenToAddress)) return;

      const [nextFromValue, nextToValue] = isExchangeB ? [toValue, ''] : ['', fromValue];
      const nextFromCache = resolveTokenWithBalance(tokenToAddress, this.tokenToBalance);
      const nextToCache = resolveTokenWithBalance(tokenFromAddress, this.tokenFromBalance);

      this.setTokenFromAddress(tokenToAddress);
      this.setTokenToAddress(tokenFromAddress);
      this.setFromValue(nextFromValue);
      this.setToValue(nextToValue);
      this.setExchangeB(!isExchangeB);
      this.tokenFromCache = nextFromCache;
      this.tokenToCache = nextToCache;

      await this.updateSubscriptions();
      await nextTick();

      this.tokenFromCache = resolveTokenWithBalance(this.tokenFromAddress, this.tokenFromBalance);
      this.tokenToCache = resolveTokenWithBalance(this.tokenToAddress, this.tokenToBalance);
    },
    async updateSubscriptions() {
      await Promise.all([
        Promise.resolve(this.updateTokenSubscription('from')),
        Promise.resolve(this.updateTokenSubscription('to')),
      ]);
    },
    resetSubscriptions() {
      const manager = getBalanceSubscriptionApi();
      manager.removeSubscription('from');
      manager.removeSubscription('to');
    },
    reset() {
      this.resetSubscriptions();

      const next = buildInitialState();
      (Object.keys(next) as Array<keyof SwapState>).forEach((key) => {
        if (preservedResetKeys.has(key)) return;

        this[key] = next[key] as never;
      });
    },
  },
});
