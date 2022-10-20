import { defineGetters } from 'direct-vuex';

import { routeAssetsGetterContext } from '@/store/routeAssets';
import type { RouteAssetsState } from './types';
import state from './state';

const getters = defineGetters<RouteAssetsState>()({
  recipients(...args): Array<any> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients;
  },
  subscriptions(...args): Array<any> {
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
