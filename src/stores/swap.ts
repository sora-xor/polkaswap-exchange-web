import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineStore } from 'pinia';

import {
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithmForLiquiditySource,
  MarketAlgorithms,
  ZeroStringValue,
} from '@/consts';
import store from '@/store';
import type { SwapState } from '@/stores/types/swap';
import { settingsStorage } from '@/utils/storage';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { Distribution, SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountBalance, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

const balanceSubscriptions = new TokenBalanceSubscriptions();

const preservedResetKeys = new Set<keyof SwapState>(['tokenFromAddress', 'tokenToAddress']);

const buildInitialState = (): SwapState => {
  const allowLossPopup = settingsStorage.get('allowSwapLossPopup' as any);

  return {
    tokenFromAddress: '',
    tokenToAddress: '',
    tokenFromBalance: null,
    tokenToBalance: null,
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

const resolveToken = (address: Nullable<string>): Nullable<RegisteredAccountAsset> => {
  if (!address) return null;

  return store.getters.assets.assetDataByAddress(address) as Nullable<RegisteredAccountAsset>;
};

const applyBalance = (
  token: Nullable<RegisteredAccountAsset>,
  balance: Nullable<AccountBalance>
): Nullable<RegisteredAccountAsset> => {
  if (!token) return null;
  if (!balance) return token;

  return { ...token, balance } as RegisteredAccountAsset;
};

/**
 * Pinia-powered swap store that mirrors the historic direct-vuex module.
 */
export const useSwapStore = defineStore('swap', {
  state: (): SwapState => buildInitialState(),
  getters: {
    tokenFrom: (state): Nullable<RegisteredAccountAsset> =>
      applyBalance(resolveToken(state.tokenFromAddress), state.tokenFromBalance),
    tokenTo: (state): Nullable<RegisteredAccountAsset> =>
      applyBalance(resolveToken(state.tokenToAddress), state.tokenToBalance),
    marketAlgorithms(state): Array<MarketAlgorithms> {
      const baseSources = store.getters.settings.debugEnabled
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

      return store.getters.settings.liquiditySource;
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

      if (!(tokenFrom && tokenTo)) return ZeroStringValue;

      return api.swap.getMinMaxValue(
        tokenFrom,
        tokenTo,
        state.fromValue,
        state.toValue,
        state.isExchangeB,
        store.state.settings.slippageTolerance
      );
    },
  },
  actions: {
    updateTokenSubscription(direction: 'from' | 'to') {
      const token = direction === 'from' ? this.tokenFrom : this.tokenTo;
      const updateBalance = direction === 'from' ? this.setTokenFromBalance : this.setTokenToBalance;

      balanceSubscriptions.remove(direction);

      if (!store.getters.wallet.account.isLoggedIn || !token?.address) {
        return;
      }

      if (token.address in store.getters.wallet.account.accountAssetsAddressTable) {
        return;
      }

      balanceSubscriptions.add(direction, {
        token,
        updateBalance,
      });
    },
    setTokenFromAddress(address?: string) {
      this.tokenFromAddress = address ?? '';
      this.updateTokenSubscription('from');
    },
    setTokenToAddress(address?: string) {
      this.tokenToAddress = address ?? '';
      this.updateTokenSubscription('to');
    },
    setTokenFromBalance(balance: Nullable<AccountBalance>) {
      this.tokenFromBalance = balance;
    },
    setTokenToBalance(balance: Nullable<AccountBalance>) {
      this.tokenToBalance = balance;
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

      this.tokenFromAddress = tokenToAddress;
      this.tokenToAddress = tokenFromAddress;
      this.fromValue = nextFromValue;
      this.toValue = nextToValue;
      this.isExchangeB = !isExchangeB;

      await Promise.all([
        Promise.resolve(this.updateTokenSubscription('from')),
        Promise.resolve(this.updateTokenSubscription('to')),
      ]);
    },
    async updateSubscriptions() {
      await Promise.all([
        Promise.resolve(this.updateTokenSubscription('from')),
        Promise.resolve(this.updateTokenSubscription('to')),
      ]);
    },
    resetSubscriptions() {
      balanceSubscriptions.remove('from');
      balanceSubscriptions.remove('to');
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
