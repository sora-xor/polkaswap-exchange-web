import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const swapGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'swap', swap);
const swapActionContext = (context: any) => localActionContext(context, 'swap', swap);

export { swapGetterContext, swapActionContext };
export default swap;
