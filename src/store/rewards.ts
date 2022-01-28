import map from 'lodash/fp/map';
import omit from 'lodash/fp/omit';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { ethers } from 'ethers';
import { api, groupRewardsByAssetsList } from '@soramitsu/soraneo-wallet-web';
import { KnownAssets, KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { Subscription } from '@polkadot/x-rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { RewardInfo, RewardsInfo, AccountMarketMakerInfo } from '@sora-substrate/util/build/rewards/types';

import ethersUtil from '@/utils/ethers-util';
import { asZeroValue, waitForAccountPair } from '@/utils';
import type { RewardsAmountHeaderItem } from '@/types/rewards';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET',
    'SET_TRANSACTION_STEP',
    'SET_TRANSACTION_ERROR',
    'SET_REWARDS_CLAIMING',
    'SET_REWARDS_RECIEVED',
    'SET_SIGNATURE',
    'SET_SELECTED_REWARDS',
    'SET_ACCOUNT_MARKET_MAKER_INFO',
    'SET_ACCOUNT_MARKET_MAKER_UPDATES',
    'RESET_ACCOUNT_MARKET_MAKER_UPDATES',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_REWARDS', 'GET_FEE']);

interface RewardsState {
  fee: CodecString;
  feeFetching: boolean;
  externalRewards: Array<RewardInfo>;
  selectedExternalRewards: Array<RewardInfo>;
  internalRewards: Nullable<RewardInfo>;
  selectedInternalRewards: Nullable<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  selectedVestedRewards: Nullable<RewardsInfo>;
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  rewardsRecieved: boolean;
  transactionError: boolean;
  transactionStep: number;
  signature: string;
  accountMarketMakerInfo: Nullable<AccountMarketMakerInfo>;
  accountMarketMakerUpdates: Nullable<Subscription>;
}

function initialState(): RewardsState {
  return {
    fee: '',
    feeFetching: false,
    externalRewards: [],
    internalRewards: null,
    vestedRewards: null,
    selectedVestedRewards: null,
    selectedInternalRewards: null,
    selectedExternalRewards: [],
    rewardsFetching: false,
    rewardsClaiming: false,
    rewardsRecieved: false,
    transactionError: false,
    transactionStep: 1,
    signature: '',
    accountMarketMakerInfo: null,
    accountMarketMakerUpdates: null,
  };
}

const state = initialState();

const getters = {
  claimableRewards(state: RewardsState): Array<RewardInfo | RewardsInfo> {
    const buffer: Array<RewardInfo | RewardsInfo> = [...state.selectedExternalRewards];

    if (state.selectedInternalRewards) {
      buffer.push(state.selectedInternalRewards);
    }

    if (state.selectedVestedRewards) {
      buffer.push(state.selectedVestedRewards);
    }

    return buffer;
  },
  rewardsAvailable(_, getters): boolean {
    return getters.claimableRewards.length !== 0;
  },
  internalRewardsAvailable(state: RewardsState): boolean {
    return !asZeroValue(state.internalRewards?.amount);
  },
  vestedRewardsAvailable(state: RewardsState): boolean {
    return !asZeroValue(state.vestedRewards?.limit);
  },
  externalRewardsAvailable(state: RewardsState): boolean {
    return state.externalRewards.length !== 0;
  },
  externalRewardsSelected(state: RewardsState): boolean {
    return state.selectedExternalRewards.length !== 0;
  },
  transactionStepsCount(_, getters): number {
    return getters.externalRewardsSelected ? 2 : 1;
  },
  rewardsByAssetsList(state, getters): Array<RewardsAmountHeaderItem> {
    if (!getters.rewardsAvailable) {
      return [
        {
          asset: KnownAssets.get(KnownSymbols.PSWAP),
          symbol: KnownSymbols.PSWAP,
          amount: '',
        } as RewardsAmountHeaderItem,
        {
          asset: KnownAssets.get(KnownSymbols.VAL),
          symbol: KnownSymbols.VAL,
          amount: '',
        } as RewardsAmountHeaderItem,
      ];
    }

    return groupRewardsByAssetsList(getters.claimableRewards);
  },
};

const mutations = {
  [types.RESET](state: RewardsState) {
    const s = omit(['accountMarketMakerUpdates', 'accountMarketMakerInfo'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },

  [types.SET_TRANSACTION_STEP](state: RewardsState, transactionStep: number) {
    state.transactionStep = transactionStep;
  },
  [types.SET_REWARDS_CLAIMING](state: RewardsState, flag: boolean) {
    state.rewardsClaiming = flag;
  },
  [types.SET_TRANSACTION_ERROR](state: RewardsState, flag: boolean) {
    state.transactionError = flag;
  },
  [types.SET_REWARDS_RECIEVED](state: RewardsState, flag: boolean) {
    state.rewardsRecieved = flag;
  },
  [types.SET_SIGNATURE](state: RewardsState, signature: string) {
    state.signature = signature;
  },

  [types.GET_REWARDS_REQUEST](state: RewardsState) {
    state.rewardsFetching = true;
  },
  [types.GET_REWARDS_SUCCESS](state: RewardsState, { internal = null, external = [], vested = null } = {}) {
    state.internalRewards = internal;
    state.externalRewards = external;
    state.vestedRewards = vested;
    state.rewardsFetching = false;
  },
  [types.GET_REWARDS_FAILURE](state: RewardsState) {
    state.internalRewards = null;
    state.externalRewards = [];
    state.vestedRewards = null;
    state.rewardsFetching = false;
  },

  [types.GET_FEE_REQUEST](state: RewardsState) {
    state.feeFetching = true;
  },
  [types.GET_FEE_SUCCESS](state: RewardsState, fee: CodecString) {
    state.fee = fee;
    state.feeFetching = false;
  },
  [types.GET_FEE_FAILURE](state: RewardsState) {
    state.feeFetching = false;
  },

  [types.SET_SELECTED_REWARDS](state: RewardsState, { internal = null, external = [], vested = null } = {}) {
    state.selectedExternalRewards = [...external];
    state.selectedInternalRewards = internal;
    state.selectedVestedRewards = vested;
  },

  [types.SET_ACCOUNT_MARKET_MAKER_INFO](state: RewardsState, info: Nullable<AccountMarketMakerInfo>) {
    state.accountMarketMakerInfo = info;
  },
  [types.SET_ACCOUNT_MARKET_MAKER_UPDATES](state: RewardsState, subscription: Subscription) {
    state.accountMarketMakerUpdates = subscription;
  },
  [types.RESET_ACCOUNT_MARKET_MAKER_UPDATES](state: RewardsState) {
    if (state.accountMarketMakerUpdates) {
      state.accountMarketMakerUpdates.unsubscribe();
    }
    state.accountMarketMakerUpdates = null;
  },
};

const actions = {
  reset({ commit }) {
    commit(types.RESET);
  },

  setTransactionStep({ commit }, transactionStep: number) {
    commit(types.SET_TRANSACTION_STEP, transactionStep);
  },

  async setSelectedRewards({ commit, dispatch }, params) {
    commit(types.SET_SELECTED_REWARDS, params);
    await dispatch('getNetworkFee');
  },

  async getNetworkFee({ commit, getters }) {
    commit(types.GET_FEE_REQUEST);
    try {
      const fee = await api.rewards.getNetworkFee(getters.claimableRewards);
      commit(types.GET_FEE_SUCCESS, fee);
    } catch (error) {
      console.error(error);
      commit(types.GET_FEE_FAILURE, error);
    }
  },

  async getRewards({ commit, dispatch, getters }, address) {
    commit(types.GET_REWARDS_REQUEST);
    try {
      const internal = await api.rewards.checkLiquidityProvision();
      const vested = await api.rewards.checkVested();
      const external = address ? await api.rewards.checkForExternalAccount(address) : [];

      commit(types.GET_REWARDS_SUCCESS, { internal, external, vested });

      // select all rewards by default
      await dispatch('setSelectedRewards', {
        internal: getters.internalRewardsAvailable ? internal : null,
        external,
        vested: getters.vestedRewardsAvailable ? vested : null,
      });
    } catch (error) {
      console.error(error);
      commit(types.GET_REWARDS_FAILURE);
    }
  },

  async claimRewards(
    { commit, state, getters, rootGetters }: { commit: any; state: RewardsState; getters: any; rootGetters: any },
    { internalAddress = '', externalAddress = '' } = {}
  ) {
    if (!internalAddress) return;

    try {
      const { externalRewardsSelected, claimableRewards } = getters;

      if (externalRewardsSelected && !externalAddress) return;

      commit(types.SET_REWARDS_CLAIMING, true);
      commit(types.SET_TRANSACTION_ERROR, false);

      if (externalRewardsSelected && state.transactionStep === 1) {
        const ethersInstance = await ethersUtil.getEthersInstance();
        const internalAddressHex = await ethersUtil.accountAddressToHex(internalAddress);
        const keccakHex = ethers.utils.keccak256(internalAddressHex);
        const message = ethers.utils.arrayify(keccakHex); // Uint8Array
        const signature = await ethersInstance.getSigner().signMessage(message);

        commit(types.SET_SIGNATURE, signature);
        commit(types.SET_TRANSACTION_STEP, 2);
      }
      if (!externalRewardsSelected || (state.transactionStep === 2 && state.signature)) {
        await api.rewards.claim(claimableRewards, state.signature, state.fee, externalAddress);

        // update ui to success state if user not changed external account
        if (rootGetters['web3/evmAddress'] === externalAddress) {
          commit(types.SET_TRANSACTION_STEP, 1);
          commit(types.SET_REWARDS_RECIEVED, true);
          commit(types.SET_REWARDS_CLAIMING, false);
        }
      }
    } catch (error) {
      commit(types.SET_TRANSACTION_ERROR, true);
      commit(types.SET_REWARDS_CLAIMING, false);
      throw error;
    }
  },

  async subscribeOnAccountMarketMakerInfo({ commit, rootGetters }) {
    commit(types.RESET_ACCOUNT_MARKET_MAKER_UPDATES);

    if (!rootGetters.isLoggedIn) return;

    await waitForAccountPair(() => {
      const subscription = api.rewards.subscribeOnAccountMarketMakerInfo().subscribe((info) => {
        commit(types.SET_ACCOUNT_MARKET_MAKER_INFO, info);
      });

      commit(types.SET_ACCOUNT_MARKET_MAKER_UPDATES, subscription);
    });
  },

  unsubscribeAccountMarketMakerInfo({ commit }) {
    commit(types.RESET_ACCOUNT_MARKET_MAKER_UPDATES);
    commit(types.SET_ACCOUNT_MARKET_MAKER_INFO, null);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
