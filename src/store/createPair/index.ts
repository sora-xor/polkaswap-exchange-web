import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const createPairGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'createPair', createPair);
const createPairActionContext = (context: any) => localActionContext(context, 'createPair', createPair);

export { createPairGetterContext, createPairActionContext };
export default createPair;
