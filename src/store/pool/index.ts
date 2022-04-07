import { defineModule } from 'direct-vuex';

import { localActionContext } from '@/store';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const pool = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const poolActionContext = (context: any) => localActionContext(context, 'pool', pool);

export { poolActionContext };
export default pool;
