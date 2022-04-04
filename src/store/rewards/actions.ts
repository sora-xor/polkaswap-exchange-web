import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';

import { rewardsActionContext } from '@/store/rewards';
import { rootActionContext } from '@/store';
import { SelectedRewards } from '@/types/rewards';
import { asZeroValue } from '@/utils';
import ethersUtil from '@/utils/ethers-util';
import { ethers } from 'ethers';

const actions = defineActions({
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
  async getRewards(context, address: string): Promise<void> {
    const { commit, getters, dispatch } = rewardsActionContext(context);
    commit.getRewardsRequest();
    try {
      const [internal, vested, crowdloan, external] = await Promise.all([
        api.rewards.checkLiquidityProvision(),
        api.rewards.checkVested(),
        api.rewards.checkCrowdloan(),
        address ? api.rewards.checkForExternalAccount(address) : ([] as Array<RewardInfo>),
      ]);

      commit.getRewardsSuccess({ internal, external, vested, crowdloan });

      const selectedRewards: SelectedRewards = {
        internal: getters.internalRewardsAvailable ? internal : null,
        external,
        vested: getters.vestedRewardsAvailable ? vested : null,
        crowdloan: crowdloan.filter((item) => !asZeroValue(item.amount)),
      };

      // select all rewards by default
      await dispatch.setSelectedRewards(selectedRewards);
    } catch (error) {
      console.error(error);
      commit.getRewardsFailure();
    }
  },
  async claimRewards(context, { internalAddress = '', externalAddress = '' } = {}): Promise<void> {
    const { commit, getters, state } = rewardsActionContext(context);
    const { rootState } = rootActionContext(context);
    if (!internalAddress) return;

    try {
      const { externalRewardsSelected, claimableRewards } = getters;

      if (externalRewardsSelected && !externalAddress) return;

      commit.setRewardsClaiming(true);
      commit.setTxError(false);

      if (externalRewardsSelected && state.transactionStep === 1) {
        const ethersInstance = await ethersUtil.getEthersInstance();
        const internalAddressHex = await ethersUtil.accountAddressToHex(internalAddress);
        const keccakHex = ethers.utils.keccak256(internalAddressHex);
        const message = ethers.utils.arrayify(keccakHex); // Uint8Array
        const signature = await ethersInstance.getSigner().signMessage(message);

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
          commit.setRewardsReceived(true);
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
