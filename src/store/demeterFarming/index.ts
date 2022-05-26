import { defineModule } from 'direct-vuex';

import { localActionContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const demeterFarming = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const demeterFarmingActionContext = (context: any) =>
  localActionContext(context, Module.DemeterFarming, demeterFarming);

export { demeterFarmingActionContext };
export default demeterFarming;
