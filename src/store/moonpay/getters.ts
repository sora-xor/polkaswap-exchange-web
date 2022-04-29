import { defineGetters } from 'direct-vuex';

import { moonpayGetterContext } from '@/store/moonpay';
import type { MoonpayCurrenciesById, MoonpayTransaction } from '@/utils/moonpay';
import type { MoonpayState } from './types';

const getters = defineGetters<MoonpayState>()({
  lastCompletedTransaction(...args): Nullable<MoonpayTransaction> {
    const { state } = moonpayGetterContext(args);
    if (state.pollingTimestamp === 0) return undefined;

    return state.transactions.find(
      (tx) => Date.parse(tx.createdAt) >= state.pollingTimestamp && tx.status === 'completed'
    );
  },
  currenciesById(...args): MoonpayCurrenciesById {
    const { state } = moonpayGetterContext(args);
    return state.currencies.reduce(
      (result, item) => ({
        ...result,
        [item.id]: item,
      }),
      {}
    );
  },
});

export default getters;
