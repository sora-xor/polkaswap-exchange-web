import { defineGetters } from 'direct-vuex';
import { pricesGetterContext } from '.';

import { PriceState } from './types';

const getters = defineGetters<PriceState>()({
  isEuroBalanceEnough(...args): boolean {
    const { state } = pricesGetterContext(args);
    const euroBalance = parseInt(state.euroBalance, 10);
    return euroBalance > 100;
  },
});

export default getters;
