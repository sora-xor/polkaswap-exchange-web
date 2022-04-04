import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const createPair = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const createPairGetterContext = (args: [any, any, any, any]) => localGetterContext(args, createPair);
const createPairActionContext = (context: any) => localActionContext(context, createPair);

export { createPairGetterContext, createPairActionContext };
export default createPair;
