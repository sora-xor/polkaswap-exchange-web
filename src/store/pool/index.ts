import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const pool = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const poolActionContext = (context: any) => localActionContext(context, Module.Pool, pool);
const poolGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Pool, pool);

export { poolActionContext, poolGetterContext };
export default pool;
