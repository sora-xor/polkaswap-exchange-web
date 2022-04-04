import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const assets = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const assetsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, assets);
const assetsActionContext = (context: any) => localActionContext(context, assets);

export { assetsGetterContext, assetsActionContext };
export default assets;
