import { defineMutations } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import type { PriceState } from './types';

const mutations = defineMutations<PriceState>()({
  setPrices(state, params: PriceState): void {
    state.price = params.price;
    state.priceReversed = params.priceReversed;
  },
  resetPrices(state): void {
    state.price = ZeroStringValue;
    state.priceReversed = ZeroStringValue;
  },
});

export default mutations;
