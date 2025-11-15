import { SubscriptionsState } from './types';

declare const mutations: {
  setSubscription(state: SubscriptionsState, newSubscription: Nullable<VoidFunction>): void;
};
export default mutations;
