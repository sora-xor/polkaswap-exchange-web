import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const bridge = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const bridgeGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Bridge, bridge);
const bridgeActionContext = (context: any) => localActionContext(context, Module.Bridge, bridge);

export { bridgeGetterContext, bridgeActionContext };
export default bridge;
