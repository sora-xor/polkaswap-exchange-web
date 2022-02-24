import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import { api } from '@soramitsu/soraneo-wallet-web';

import { ZeroStringValue } from '@/consts';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map((x) => [x, x]),
  fromPairs
)(['GET_PRICE', 'GET_PRICE_REVERSED']);

interface PriceState {
  price: string;
  priceReversed: string;
}

function initialState(): PriceState {
  return {
    price: ZeroStringValue,
    priceReversed: ZeroStringValue,
  };
}

const state = initialState();

const getters = {
  price(state: PriceState) {
    return state.price;
  },
  priceReversed(state: PriceState) {
    return state.priceReversed;
  },
};

const mutations = {
  [types.GET_PRICE_REQUEST](state: PriceState) {},
  [types.GET_PRICE_SUCCESS](state: PriceState, price: string) {
    state.price = price;
  },
  [types.GET_PRICE_FAILURE](state: PriceState) {
    state.price = ZeroStringValue;
  },
  [types.GET_PRICE_REVERSED_REQUEST](state: PriceState) {},
  [types.GET_PRICE_REVERSED_SUCCESS](state: PriceState, priceReversed: string) {
    state.priceReversed = priceReversed;
  },
  [types.GET_PRICE_REVERSED_FAILURE](state: PriceState) {
    state.priceReversed = ZeroStringValue;
  },
};

const actions = {
  async getPrices({ commit }, payload) {
    if (payload && payload.assetAAddress && payload.assetBAddress && payload.amountA && payload.amountB) {
      commit(types.GET_PRICE_REQUEST);
      commit(types.GET_PRICE_REVERSED_REQUEST);
      try {
        const [price, priceReversed] = await Promise.all([
          api.divideAssetsByAssetIds(
            payload.assetAAddress,
            payload.assetBAddress,
            payload.amountA,
            payload.amountB,
            false
          ),
          api.divideAssetsByAssetIds(
            payload.assetAAddress,
            payload.assetBAddress,
            payload.amountA,
            payload.amountB,
            true
          ),
        ]);

        commit(types.GET_PRICE_SUCCESS, price);
        commit(types.GET_PRICE_REVERSED_SUCCESS, priceReversed);
      } catch (error) {
        commit(types.GET_PRICE_FAILURE);
        commit(types.GET_PRICE_REVERSED_FAILURE);
      }
    } else {
      commit(types.GET_PRICE_SUCCESS, ZeroStringValue);
      commit(types.GET_PRICE_REVERSED_SUCCESS, ZeroStringValue);
    }
  },
  resetPrices({ commit }) {
    commit(types.GET_PRICE_SUCCESS, ZeroStringValue);
    commit(types.GET_PRICE_REVERSED_SUCCESS, ZeroStringValue);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
