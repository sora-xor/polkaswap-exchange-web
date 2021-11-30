import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { SubqueryExplorerService, api } from '@soramitsu/soraneo-wallet-web';
import { CodecString, FPNumber, XOR } from '@sora-substrate/util';

import {
  NOIR_TOKEN_ADDRESS,
  NOIR_ADDRESS_ID,
  NOIR_FORM,
  NOIR_FORM_NAME,
  NOIR_FORM_ADDRESS,
  NOIR_FORM_EMAIL,
  NOIR_FORM_PHONE,
  NOIR_ACCOUNT_ADDRESS,
} from '@/consts';
import { noirStorage } from '@/utils/storage';
import { NoirFormData } from '@/types/noir';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'RESET_REDEMPTION_DATA_SUBSCRIPTION',
    'SET_REDEEM_DIALOG_VISIBILITY',
    'SET_CONGRATULATIONS_DIALOG_VISIBILITY',
    'SET_AGREEMENT',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_REDEMPTION_DATA']);

interface NoirState {
  totalRedeemed: number;
  total: number;
  availableForRedemption: number;
  redemptionSubscription: Nullable<NodeJS.Timer>;
  redeemDialogVisibility: boolean;
  congratulationsDialogVisibility: boolean;
  agreementSigned: boolean;
}

function initialState(): NoirState {
  return {
    totalRedeemed: 0,
    total: 0,
    availableForRedemption: 0,
    redemptionSubscription: null,
    redeemDialogVisibility: false,
    congratulationsDialogVisibility: false,
    agreementSigned: Boolean(noirStorage.get('agreement')) || false,
  };
}

const state = initialState();

const getters = {
  totalRedeemed(state: NoirState) {
    return state.totalRedeemed;
  },
  total(state: NoirState) {
    return state.total;
  },
  availableForRedemption(state: NoirState) {
    return state.availableForRedemption;
  },
  xorBalance(state: NoirState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](XOR.address);
    return token?.balance?.transferable || '0';
  },
  noirBalance(state: NoirState, getters, rootState, rootGetters) {
    const token = rootGetters['assets/getAssetDataByAddress'](NOIR_TOKEN_ADDRESS);
    return token?.balance?.transferable || '0';
  },
};

interface RedemptionData {
  totalRedeemed: number;
  noirReserve: CodecString;
  noirTotalSupply: FPNumber;
}

const mutations = {
  [types.GET_REDEMPTION_DATA_REQUEST](state: NoirState) {},

  [types.GET_REDEMPTION_DATA_SUCCESS](state: NoirState, params: RedemptionData) {
    state.totalRedeemed = params.totalRedeemed;
    state.availableForRedemption = FPNumber.fromCodecValue(params.noirReserve).toNumber(0);
    const totalRedeemedFP = FPNumber.fromCodecValue(params.totalRedeemed);
    state.total = params.noirTotalSupply.sub(totalRedeemedFP).toNumber(0);
  },

  [types.GET_REDEMPTION_DATA_FAILURE](state: NoirState) {
    state.totalRedeemed = 0;
    state.total = 0;
    state.availableForRedemption = 0;
  },

  [types.RESET_REDEMPTION_DATA_SUBSCRIPTION](state: NoirState) {
    if (state.redemptionSubscription) {
      clearInterval(state.redemptionSubscription);
      state.redemptionSubscription = null;
    }
  },

  [types.SET_REDEEM_DIALOG_VISIBILITY](state: NoirState, flag: boolean) {
    state.redeemDialogVisibility = flag;
  },

  [types.SET_CONGRATULATIONS_DIALOG_VISIBILITY](state: NoirState, flag: boolean) {
    state.congratulationsDialogVisibility = flag;
  },

  [types.SET_AGREEMENT](state: NoirState, flag: boolean) {
    state.agreementSigned = flag;
    noirStorage.set('agreement', flag);
  },
};

const actions = {
  async getRedemptionData({ commit }) {
    commit(types.GET_REDEMPTION_DATA_REQUEST);
    try {
      const totalRedeemed = await SubqueryExplorerService.getNoirTotalRedeemed(NOIR_ADDRESS_ID, NOIR_TOKEN_ADDRESS);
      if (!totalRedeemed) {
        commit(types.GET_REDEMPTION_DATA_FAILURE);
        return;
      }
      const totalSupply = await (api.api.rpc as any).assets.totalSupply(NOIR_TOKEN_ADDRESS);
      const noirTotalSupply = new FPNumber(totalSupply);
      const [_, noirReserve] = await api.getLiquidityReserves(XOR.address, NOIR_TOKEN_ADDRESS);

      commit(types.GET_REDEMPTION_DATA_SUCCESS, {
        totalRedeemed,
        noirReserve,
        noirTotalSupply,
      });
    } catch (error) {
      commit(types.GET_REDEMPTION_DATA_FAILURE);
    }
  },
  subscribeOnRedemptionDataUpdates({ dispatch, state }) {
    dispatch('getRedemptionData');
    state.redemptionSubscription = setInterval(() => {
      dispatch('getRedemptionData');
    }, FIFTEEN_MINUTES);
  },
  resetRedemptionDataSubscription({ commit }) {
    commit(types.RESET_REDEMPTION_DATA_SUBSCRIPTION);
  },

  setRedeemDialogVisibility({ commit }, flag: boolean) {
    commit(types.SET_REDEEM_DIALOG_VISIBILITY, flag);
  },

  setCongratulationsDialogVisibility({ commit }, flag: boolean) {
    commit(types.SET_CONGRATULATIONS_DIALOG_VISIBILITY, flag);
  },

  setAgreement({ commit }, flag: boolean) {
    commit(types.SET_AGREEMENT, flag);
  },

  submitGoogleForm({ commit, rootGetters: { account } }, form: NoirFormData) {
    let link = `https://docs.google.com/forms/d/e/${NOIR_FORM}/formResponse`;
    link += `?entry.${NOIR_FORM_NAME}=${encodeURIComponent(form.name)}`;
    link += `&entry.${NOIR_FORM_ADDRESS}=${encodeURIComponent(form.address)}`;
    link += `&entry.${NOIR_FORM_EMAIL}=${encodeURIComponent(form.email)}`;
    link += `&entry.${NOIR_FORM_PHONE}=${encodeURIComponent(form.phone)}`;
    link += `&entry.${NOIR_ACCOUNT_ADDRESS}=${encodeURIComponent(account.address)}`;
    const a = document.createElement('a');
    a.setAttribute('href', link);
    a.setAttribute('target', '_blank');
    a.click();
    a.remove();
  },

  async redeem({ dispatch }, count: number) {
    await api.transfer(NOIR_TOKEN_ADDRESS, NOIR_ADDRESS_ID, count);

    await dispatch('setCongratulationsDialogVisibility', true);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
