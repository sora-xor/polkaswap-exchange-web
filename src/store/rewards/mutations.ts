import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { Subscription } from '@polkadot/x-rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { AccountMarketMakerInfo } from '@sora-substrate/util/build/rewards/types';

import { initialState } from './state';
import type { RewardsState } from './types';

const mutations = defineMutations<RewardsState>()({
  reset(state): void {
    const s = omit(['accountMarketMakerUpdates', 'accountMarketMakerInfo'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  setTxStep(state, step: number): void {
    state.transactionStep = step;
  },
  setRewardsClaiming(state, value: boolean): void {
    state.rewardsClaiming = value;
  },
  setTxError(state, value: boolean): void {
    state.transactionError = value;
  },
  setRewardsReceived(state, value: boolean): void {
    state.rewardsRecieved = value;
  },
  setSignature(state, value: string): void {
    state.signature = value;
  },
  getRewardsRequest(state): void {
    state.rewardsFetching = true;
  },

  setInternalRewards(state, internal = null): void {
    state.internalRewards = internal;
  },
  setExternalRewards(state, external = []): void {
    state.externalRewards = external;
  },
  setVestedRewards(state, vested = null): void {
    state.vestedRewards = vested;
  },
  setCrowdloanRewards(state, crowdloan = []): void {
    state.crowdloanRewards = crowdloan;
  },

  // TODO: remove
  getRewardsSuccess(state, { internal = null, external = [], vested = null, crowdloan = [] } = {}): void {
    state.internalRewards = internal;
    state.externalRewards = external;
    state.vestedRewards = vested;
    state.crowdloanRewards = crowdloan;
    state.rewardsFetching = false;
  },
  getRewardsFailure(state): void {
    state.internalRewards = null;
    state.externalRewards = [];
    state.vestedRewards = null;
    state.crowdloanRewards = [];
    state.rewardsFetching = false;
  },
  getFeeRequest(state): void {
    state.feeFetching = true;
  },
  getFeeSuccess(state, fee: CodecString): void {
    state.fee = fee;
    state.feeFetching = false;
  },
  getFeeFailure(state): void {
    state.feeFetching = false;
  },
  setSelectedRewards(state, { internal = null, external = [], vested = null, crowdloan = [] } = {}): void {
    state.selectedExternalRewards = [...external];
    state.selectedInternalRewards = internal;
    state.selectedVestedRewards = vested;
    state.selectedCrowdloanRewards = [...crowdloan];
  },
  setAccountMarketMakerInfo(state, info: Nullable<AccountMarketMakerInfo>): void {
    state.accountMarketMakerInfo = info;
  },
  setAccountMarketMakerUpdates(state, subscription: Subscription): void {
    state.accountMarketMakerUpdates = subscription;
  },
  unsubscribeAccountMarketMakerInfo(state): void {
    state.accountMarketMakerUpdates?.unsubscribe();
    state.accountMarketMakerUpdates = null;
    state.accountMarketMakerInfo = null;
  },
  // pswap distribution subscription
  setLiquidityProvisionRewardsUpdates(state, subscription: Subscription): void {
    state.liquidityProvisionRewardsSubscription = subscription;
  },
  resetLiquidityProvisionRewardsUpdates(state) {
    state.liquidityProvisionRewardsSubscription?.unsubscribe();
    state.liquidityProvisionRewardsSubscription = null;
    state.internalRewards = null;
  },
  // vested rewards subscription
  setVestedRewardsUpdates(state, subscription: Subscription): void {
    state.vestedRewardsSubscription = subscription;
  },
  resetVestedRewardsUpdates(state) {
    state.vestedRewardsSubscription?.unsubscribe();
    state.vestedRewardsSubscription = null;
    state.vestedRewards = null;
  },
  // crowdloan rewards subscription
  setCrowdloanRewardsUpdates(state, subscription: Subscription): void {
    state.crowdloanRewardsSubscription = subscription;
  },
  resetCrowdloanRewardsUpdates(state) {
    state.crowdloanRewardsSubscription?.unsubscribe();
    state.crowdloanRewardsSubscription = null;
    state.crowdloanRewards = [];
  },
});

export default mutations;
