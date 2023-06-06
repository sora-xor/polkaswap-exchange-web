import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const routeAssets = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const routeAssetsGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, Module.RouteAssets, routeAssets);
const routeAssetsActionContext = (context: any) => localActionContext(context, Module.RouteAssets, routeAssets);

export { routeAssetsGetterContext, routeAssetsActionContext };
export default routeAssets;
