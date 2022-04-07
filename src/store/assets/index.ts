import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const assetsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'assets', assets);
const assetsActionContext = (context: any) => localActionContext(context, 'assets', assets);

export { assetsGetterContext, assetsActionContext };
export default assets;
