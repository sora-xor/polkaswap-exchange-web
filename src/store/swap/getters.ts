import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';
import isEmpty from 'lodash/fp/isEmpty';

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
    const { state } = swapGetterContext(args);
    const allSources = [
      ...new Set(
        Object.values(state.dexQuoteData)
          .map((data) => data.pairLiquiditySources)
          .flat()
      ),
    ];
    // implementation of backend hack, to show only primary market sources
    const primarySources = allSources.filter((source) => source !== LiquiditySourceTypes.XYKPool);

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
    const paths = state.dexQuoteData?.[state.selectedDexId]?.paths;
    return !isEmpty(paths) && Object.values(paths).every((paths) => !isEmpty(paths));
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
