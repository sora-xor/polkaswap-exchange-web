import { defineMutations } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import { initialState } from './state';

import type { SwapState } from './types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type {
  QuotePaths,
  PrimaryMarketsEnabledAssets,
  QuotePayload,
  LPRewardsInfo,
} from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

const mutations = defineMutations<SwapState>()({
  reset(state): void {
    const s = omit(['tokenFromAddress', 'tokenToAddress'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  setTokenFromAddress(state, address: string): void {
    state.tokenFromAddress = address;
  },
  resetTokenFromAddress(state): void {
    state.tokenFromAddress = '';
  },
  setTokenFromBalance(state, balance: Nullable<AccountBalance>): void {
    state.tokenFromBalance = balance;
  },
  setTokenToAddress(state, address: string): void {
    state.tokenToAddress = address;
  },
  resetTokenToAddress(state): void {
    state.tokenToAddress = '';
  },
  setTokenToBalance(state, balance: Nullable<AccountBalance>): void {
    state.tokenToBalance = balance;
  },
  setFromValue(state, value: string): void {
    state.fromValue = value;
  },
  setToValue(state, value: string): void {
    state.toValue = value;
  },
  setAmountWithoutImpact(state, amount: CodecString): void {
    state.amountWithoutImpact = amount;
  },
  setExchangeB(state, value: boolean): void {
    state.isExchangeB = value;
  },
  setLiquidityProviderFee(state, value: CodecString): void {
    state.liquidityProviderFee = value;
  },
  setPrimaryMarketsEnabledAssets(state, assets: PrimaryMarketsEnabledAssets): void {
    state.enabledAssets = Object.freeze({ ...assets });
  },
  setRewards(state, rewards: Array<LPRewardsInfo>): void {
    state.rewards = Object.freeze([...rewards]);
  },
  setRoute(state, route: string[]): void {
    state.route = Object.freeze([...route]);
  },
  setSubscriptionPayload(
    state,
    {
      dexId,
      payload,
      paths,
      liquiditySources,
    }: { payload: QuotePayload; dexId: number; paths: QuotePaths; liquiditySources: Array<LiquiditySourceTypes> }
  ): void {
    state.dexQuoteData = {
      ...state.dexQuoteData,
      [dexId]: Object.freeze({
        payload,
        paths,
        pairLiquiditySources: liquiditySources,
      }),
    };
  },
  selectDexId(state, dexId: number) {
    state.selectedDexId = dexId;
  },
});

export default mutations;
