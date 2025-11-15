import type { SubscriptionsState } from './types';

function initialState(): SubscriptionsState {
  return {
    storageUpdatesSubscription: null,
  };
}

const state = initialState();

export default state;
