import { defineGetters } from 'direct-vuex';
import { soraCardGetterContext } from '.';

import { SoraCardState } from './types';

const getters = defineGetters<SoraCardState>()({
  isEuroBalanceEnough(...args): boolean {
    const { state } = soraCardGetterContext(args);
    const euroBalance = parseInt(state.euroBalance, 10);
    return euroBalance > 100;
  },
});

export default getters;
