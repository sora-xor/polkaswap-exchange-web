import { defineGetters } from 'direct-vuex';

import { routeAssetsGetterContext } from '@/store/routeAssets';
import type { Recipient, RouteAssetsState, RouteAssetsSubscription } from './types';
import { api } from '@soramitsu/soraneo-wallet-web';
import state from './state';

const getters = defineGetters<RouteAssetsState>()({
  recipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients;
  },
  validRecipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients.filter((recipient) => api.validateAddress(recipient.wallet));
  },
  subscriptions(...args): Array<RouteAssetsSubscription> {
    const { state } = routeAssetsGetterContext(args);
    return state.subscriptions;
  },
  isProcessed(...args): boolean {
    const { state } = routeAssetsGetterContext(args);
    return state.processed;
  },
  isDataExisting(): boolean {
    return state.recipients.length > 0;
  },
});

export default getters;
