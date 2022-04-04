import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

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

const bridgeGetterContext = (args: [any, any, any, any]) => localGetterContext(args, bridge);
const bridgeActionContext = (context: any) => localActionContext(context, bridge);

export { bridgeGetterContext, bridgeActionContext };
export default bridge;
