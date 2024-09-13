import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineMutations } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import { ZeroStringValue } from '@/consts';
import { settingsStorage } from '@/utils/storage';

import { initialState } from './state';

import type { SwapState } from './types';
import type { LPRewardsInfo, Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { SwapQuoteData } from '@sora-substrate/sdk/build/swap/types';

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
  setAmountWithoutImpact(state, amount: CodecString = ZeroStringValue): void {
    state.amountWithoutImpact = amount;
  },
  setExchangeB(state, value: boolean): void {
    state.isExchangeB = value;
  },
  setLiquidityProviderFee(state, value: CodecString = ZeroStringValue): void {
    state.liquidityProviderFee = value;
  },
  setRewards(state, rewards: Array<LPRewardsInfo> = []): void {
    state.rewards = Object.freeze([...rewards]);
  },
  setRoute(state, route: string[] = []): void {
    state.route = Object.freeze([...route]);
  },
  setDistribution(state, distribution: Distribution[][] = []): void {
    state.distribution = Object.freeze([...distribution]);
  },
  setSubscriptionPayload(state, payload?: SwapQuoteData): void {
    const { quote = null, isAvailable = false, liquiditySources = [] } = payload ?? {};
    state.swapQuote = quote;
    state.isAvailable = isAvailable;
    state.liquiditySources = liquiditySources;
  },
  setLiquiditySource(state, liquiditySource): void {
    state.liquiditySources = [liquiditySource];
  },
  selectDexId(state, dexId: number = DexId.XOR) {
    state.selectedDexId = dexId;
  },
  setAllowLossPopup(state, flag: boolean) {
    state.allowLossPopup = flag;
    settingsStorage.set('allowSwapLossPopup' as any, flag);
  },
});

export default mutations;
