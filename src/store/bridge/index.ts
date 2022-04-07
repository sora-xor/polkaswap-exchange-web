import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const bridge = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const bridgeGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'bridge', bridge);
const bridgeActionContext = (context: any) => localActionContext(context, 'bridge', bridge);

export { bridgeGetterContext, bridgeActionContext };
export default bridge;
