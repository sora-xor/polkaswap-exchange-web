import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import {
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithmForLiquiditySource,
  MarketAlgorithms,
  ZeroStringValue,
} from '@/consts';
import { swapGetterContext } from '@/store/swap';

import type { SwapState } from './types';
import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<SwapState>()({
  tokenFrom(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = swapGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.tokenFromAddress);
    const balance = state.tokenFromBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  tokenTo(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = swapGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.tokenToAddress);
    const balance = state.tokenToBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  marketAlgorithms(...args): Array<MarketAlgorithms> {
    const { state, rootGetters } = swapGetterContext(args);

    const allSources = rootGetters.settings.debugEnabled
      ? state.liquiditySources
      : // implementation of backend hack, to show only primary market sources
        state.liquiditySources.filter((source) => source !== LiquiditySourceTypes.XYKPool);

    const items = Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>;

    return items.filter((marketAlgorithm) => {
      const liquiditySource = LiquiditySourceForMarketAlgorithm[marketAlgorithm];

      return marketAlgorithm === MarketAlgorithms.SMART || allSources.includes(liquiditySource);
    });
  },
  marketAlgorithmsAvailable(...args): boolean {
    const { getters } = swapGetterContext(args);
    return getters.marketAlgorithms.length > 1;
  },
  swapLiquiditySource(...args): Nullable<LiquiditySourceTypes> {
    const { getters, rootGetters } = swapGetterContext(args);
    if (!getters.marketAlgorithmsAvailable || !rootGetters.settings.liquiditySource) return undefined;

    return rootGetters.settings.liquiditySource;
  },
  swapMarketAlgorithm(...args): MarketAlgorithms {
    const { getters } = swapGetterContext(args);
    return MarketAlgorithmForLiquiditySource[getters.swapLiquiditySource ?? ''] as MarketAlgorithms;
  },
  price(...args): string {
    const { state, getters } = swapGetterContext(args);
    const { tokenFrom, tokenTo } = getters;
    if (!(tokenFrom && tokenTo)) {
      return ZeroStringValue;
    }
    return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, false);
  },
  priceReversed(...args): string {
    const { state, getters } = swapGetterContext(args);
    const { tokenFrom, tokenTo } = getters;
    if (!(tokenFrom && tokenTo)) {
      return ZeroStringValue;
    }
    return api.divideAssets(tokenFrom, tokenTo, state.fromValue, state.toValue, true);
  },
  priceImpact(...args): string {
    const { state, getters } = swapGetterContext(args);
    const { fromValue, toValue, amountWithoutImpact, isExchangeB } = state;
    const { tokenFrom, tokenTo } = getters;
    if (!(tokenFrom && tokenTo)) {
      return ZeroStringValue;
    }
    return api.swap.getPriceImpact(tokenFrom, tokenTo, fromValue, toValue, amountWithoutImpact, isExchangeB);
  },
  minMaxReceived(...args): CodecString {
    const { state, getters, rootState } = swapGetterContext(args);
    const { fromValue, toValue, isExchangeB } = state;
    const { tokenFrom, tokenTo } = getters;
    if (!(tokenFrom && tokenTo)) {
      return ZeroStringValue;
    }
    return api.swap.getMinMaxValue(
      tokenFrom,
      tokenTo,
      fromValue,
      toValue,
      isExchangeB,
      rootState.settings.slippageTolerance
    );
  },
});

export default getters;
