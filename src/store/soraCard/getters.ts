import { defineGetters } from 'direct-vuex';
import { soraCardGetterContext } from '.';

import { SoraCardState } from './types';

const getters = defineGetters<SoraCardState>()({
  accountAddress(...args): string {
    const { rootState } = soraCardGetterContext(args);
    return rootState.wallet.account.address;
  },
  isEuroBalanceEnough(...args): boolean {
    const { state } = soraCardGetterContext(args);
    const euroBalance = parseInt(state.euroBalance, 10);
    return euroBalance > 100;
  },
});

export default getters;
