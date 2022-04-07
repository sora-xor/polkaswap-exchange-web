import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const swap = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const swapGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Swap, swap);
const swapActionContext = (context: any) => localActionContext(context, Module.Swap, swap);

export { swapGetterContext, swapActionContext };
export default swap;
