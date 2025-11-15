import { defineModule, localActionContext } from 'direct-vuex';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const router = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const routerActionContext = (context: any) => localActionContext(context, router);

export { routerActionContext };
export default router;
