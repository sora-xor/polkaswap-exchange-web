import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { rewardsActionContext } from '@/store/rewards';
import type { SelectedRewards } from '@/types/rewards';
import { waitForAccountPair } from '@/utils';
import ethersUtil from '@/utils/ethers-util';

import state from './state';

import type { ClaimRewardsParams } from './types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

async function getCrowdloanRewardsSubscription(context: ActionContext<any, any>): Promise<Subscription> {
  const { commit, dispatch, getters } = rewardsActionContext(context);

  const observable = await api.rewards.getCrowdloanRewardsSubscription();

  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = observable.subscribe((crowdloanRewards) => {
      commit.setRewards({ crowdloanRewards });

      // select available rewards for first time
      if (!state.crowdloanRewardsSubscription && getters.crowdloanRewardsAvailable.length) {
        const selectedCrowdloan = getters.crowdloanRewardsAvailable.reduce((buffer, tag) => {
          buffer[tag] = state.crowdloanRewards[tag];
          return buffer;
        }, {});
        dispatch.setSelectedRewards({ selectedCrowdloan });
      }
      // deselect if no rewards after update
      if (Object.keys(state.selectedCrowdloan)) {
        const selectedCrowdloan = Object.entries(state.selectedCrowdloan).reduce((buffer, [tag, rewards]) => {
          if (getters.crowdloanRewardsAvailable.includes(tag)) {
            buffer[tag] = rewards;
          }
          return buffer;
        }, {});
        dispatch.setSelectedRewards({ selectedCrowdloan });
      }

      resolve();
    });
  });

  return subscription;
}

async function getVestedRewardsSubscription(context: ActionContext<any, any>): Promise<Subscription> {
  const { commit, dispatch, getters } = rewardsActionContext(context);

  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = api.rewards.getVestedRewardsSubscription().subscribe((vestedRewards) => {
      commit.setRewards({ vestedRewards });
      // select available rewards for first time
      if (!state.vestedRewardsSubscription && getters.vestedRewardsAvailable) {
        dispatch.setSelectedRewards({ selectedVested: vestedRewards });
      }
      // deselect if no rewards after update
      if (state.selectedVested && !getters.vestedRewardsAvailable) {
        dispatch.setSelectedRewards({ selectedVested: null });
      }
      resolve();
    });
  });

  return subscription;
}

async function getLiquidityProvisionRewardsSubscription(context: ActionContext<any, any>): Promise<Subscription> {
  const { commit, dispatch, getters } = rewardsActionContext(context);

  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = api.rewards.getLiquidityProvisionRewardsSubscription().subscribe((internalRewards) => {
      commit.setRewards({ internalRewards });
      // select available rewards for first time
      if (!state.liquidityProvisionRewardsSubscription && getters.internalRewardsAvailable) {
        dispatch.setSelectedRewards({ selectedInternal: internalRewards });
      }
      // deselect if no rewards after update
      if (state.selectedInternal && !getters.internalRewardsAvailable) {
        dispatch.setSelectedRewards({ selectedInternal: null });
      }
      resolve();
    });
  });

  return subscription;
}

const actions = defineActions({
  async subscribeOnRewards(context): Promise<void> {
    const { commit, dispatch, rootGetters } = rewardsActionContext(context);

    dispatch.unsubscribeFromRewards();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(async () => {
      const [liquidityProvisionRewardsSubscription, vestedRewardsSubscription, crowdloanRewardsSubscription] =
        await Promise.all([
          getLiquidityProvisionRewardsSubscription(context),
          getVestedRewardsSubscription(context),
          getCrowdloanRewardsSubscription(context),
        ]);

      commit.setLiquidityProvisionRewardsUpdates(liquidityProvisionRewardsSubscription);
      commit.setVestedRewardsUpdates(vestedRewardsSubscription);
      commit.setCrowdloanRewardsUpdates(crowdloanRewardsSubscription);
    });
  },

  unsubscribeFromRewards(context): void {
    const { commit } = rewardsActionContext(context);

    commit.resetLiquidityProvisionRewardsUpdates();
    commit.resetVestedRewardsUpdates();
    commit.resetCrowdloanRewardsUpdates();
  },

  async getNetworkFee(context): Promise<void> {
    const { commit, getters } = rewardsActionContext(context);
    commit.getFeeRequest();
    try {
      const claimableRewards = getters.claimableRewards as Array<RewardInfo>;
      const fee = await api.rewards.getNetworkFee(claimableRewards);
      commit.getFeeSuccess(fee);
    } catch (error) {
      console.error(error);
      commit.getFeeFailure();
    }
  },

  async setSelectedRewards(context, params: SelectedRewards): Promise<void> {
    const { commit, dispatch } = rewardsActionContext(context);
    commit.setSelectedRewards(params);
    await dispatch.getNetworkFee();
  },

  async getExternalRewards(context, address: string): Promise<void> {
    const { commit, dispatch } = rewardsActionContext(context);

    try {
      const externalRewards = address ? await api.rewards.checkForExternalAccount(address) : [];

      commit.setRewards({ externalRewards });

      await dispatch.setSelectedRewards({ selectedExternal: externalRewards });
    } catch (error) {
      console.error(error);
      commit.setRewards({ externalRewards: [] });
    }
  },

  async claimRewards(context, { internalAddress = '', externalAddress = '' }: ClaimRewardsParams = {}): Promise<void> {
    const { commit, getters, state, rootState } = rewardsActionContext(context);
    if (!internalAddress) return;

    try {
      const { externalRewardsSelected, claimableRewards, rewardsByAssetsList } = getters;

      const rewardsListToReceive = [...rewardsByAssetsList];

      if (externalRewardsSelected && !externalAddress) return;

      commit.setRewardsClaiming(true);
      commit.setTxError(false);

      if (externalRewardsSelected && state.transactionStep === 1) {
        const internalAddressHex = await ethersUtil.accountAddressToHex(internalAddress);
        const keccakHex = ethers.keccak256(internalAddressHex);
        const message = ethers.getBytes(keccakHex); // Uint8Array
        const signer = await ethersUtil.getSigner();
        const signature = await signer.signMessage(message);

        commit.setSignature(signature);
        commit.setTxStep(2);
      }
      if (!externalRewardsSelected || (state.transactionStep === 2 && state.signature)) {
        await api.rewards.claim(
          claimableRewards as Array<RewardInfo | RewardsInfo>,
          state.signature,
          state.fee,
          externalAddress
        );

        // update ui to success state if user not changed external account
        if (rootState.web3.evmAddress === externalAddress) {
          commit.setTxStep(1);
          commit.setRewardsReceived(rewardsListToReceive);
          commit.setRewardsClaiming(false);
        }
      }
    } catch (error) {
      commit.setTxError(true);
      commit.setRewardsClaiming(false);
      throw error;
    }
  },
});

export default actions;
