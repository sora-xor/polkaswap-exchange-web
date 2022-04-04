import { defineModule, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const pool = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const poolActionContext = (context: any) => localActionContext(context, pool);

export { poolActionContext };
export default pool;
