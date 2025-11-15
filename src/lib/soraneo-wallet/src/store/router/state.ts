import { RouteNames } from '../../consts';

import type { RouterState } from './types';

function initialState(): RouterState {
  return {
    currentRoute: RouteNames.WalletConnection,
    currentRouteParams: {},
    previousRoute: '',
    previousRouteParams: {},
  };
}

const state = initialState();

export default state;
