import { defineModule, localActionContext } from 'direct-vuex';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const subscriptions = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const subscriptionsActionContext = (context: any) => localActionContext(context, subscriptions);

export { subscriptionsActionContext };
export default subscriptions;
