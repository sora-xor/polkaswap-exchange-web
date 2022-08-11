import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type {
  QuotePaths,
  PrimaryMarketsEnabledAssets,
  QuotePayload,
  LPRewardsInfo,
} from '@sora-substrate/liquidity-proxy/build/types';

import { initialState } from './state';
import type { SwapState } from './types';

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
  setTokenFromBalance(state, balance: AccountBalance): void {
    state.tokenFromBalance = balance;
  },
  setTokenToAddress(state, address: string): void {
    state.tokenToAddress = address;
  },
  resetTokenToAddress(state): void {
    state.tokenToAddress = '';
  },
  setTokenToBalance(state, balance: AccountBalance): void {
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
  setPairLiquiditySources(state, liquiditySources: Array<LiquiditySourceTypes>): void {
    state.pairLiquiditySources = [...liquiditySources];
  },
  setPaths(state, paths: QuotePaths): void {
    state.paths = { ...paths };
  },
  setPrimaryMarketsEnabledAssets(state, assets: PrimaryMarketsEnabledAssets): void {
    state.enabledAssets = { ...assets };
  },
  setRewards(state, rewards: Array<LPRewardsInfo>): void {
    state.rewards = [...rewards];
  },
  setSubscriptionPayload(state, payload: QuotePayload): void {
    state.payload = payload;
  },
});

export default mutations;
