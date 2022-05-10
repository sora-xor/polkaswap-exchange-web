import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';

const assets = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
});

const assetsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Assets, assets);
const assetsActionContext = (context: any) => localActionContext(context, Module.Assets, assets);

export { assetsGetterContext, assetsActionContext };
export default assets;
