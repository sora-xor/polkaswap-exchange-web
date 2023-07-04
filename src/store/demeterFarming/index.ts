import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const demeterFarming = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const demeterFarmingGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, Module.DemeterFarming, demeterFarming);
const demeterFarmingActionContext = (context: any) =>
  localActionContext(context, Module.DemeterFarming, demeterFarming);

export { demeterFarmingGetterContext, demeterFarmingActionContext };
export default demeterFarming;
