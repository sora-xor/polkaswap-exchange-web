import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

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

const swapGetterContext = (args: [any, any, any, any]) => localGetterContext(args, swap);
const swapActionContext = (context: any) => localActionContext(context, swap);

export { swapGetterContext, swapActionContext };
export default swap;
