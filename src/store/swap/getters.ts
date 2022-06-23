import isEmpty from 'lodash/fp/isEmpty';
import { defineGetters } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { CodecString } from '@sora-substrate/util';

import { swapGetterContext } from '@/store/swap';
import {
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithmForLiquiditySource,
  MarketAlgorithms,
  ZeroStringValue,
} from '@/consts';
import type { SwapState } from './types';
import type { RegisteredAccountAssetWithDecimals } from '../assets/types';

const getters = defineGetters<SwapState>()({
  tokenFrom(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { state, rootGetters } = swapGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.tokenFromAddress);
    const balance = state.tokenFromBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAssetWithDecimals;
    }
    return token;
  },
  tokenTo(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { state, rootGetters } = swapGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.tokenToAddress);
    const balance = state.tokenToBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAssetWithDecimals;
    }
    return token;
  },
  marketAlgorithms(...args): Array<MarketAlgorithms> {
    const { state } = swapGetterContext(args);
    // implementation of backend hack, to show only primary market sources
    const primarySources = state.pairLiquiditySources.filter((source) => source !== LiquiditySourceTypes.XYKPool);
    const items = Object.keys(LiquiditySourceForMarketAlgorithm) as Array<MarketAlgorithms>;

    return items.filter((marketAlgorithm) => {
      const liquiditySource = LiquiditySourceForMarketAlgorithm[marketAlgorithm];

      return marketAlgorithm === MarketAlgorithms.SMART || primarySources.includes(liquiditySource);
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
  isAvailable(...args): boolean {
    const { state } = swapGetterContext(args);
    return !isEmpty(state.paths) && Object.values(state.paths).every((paths) => !isEmpty(paths));
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
