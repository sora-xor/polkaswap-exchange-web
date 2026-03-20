import { defineModule } from '@/store/module-helpers';
import { localModuleActionContext } from '@/store/module-context';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const subscriptions = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const subscriptionsActionContext = (context: any) => localModuleActionContext(context, subscriptions);

export { subscriptionsActionContext };
export default subscriptions;
