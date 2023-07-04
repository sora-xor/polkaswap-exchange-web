import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const assets = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const assetsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Assets, assets);
const assetsActionContext = (context: any) => localActionContext(context, Module.Assets, assets);

export { assetsGetterContext, assetsActionContext };
export default assets;
