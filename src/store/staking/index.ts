import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const stakingFarming = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const stakingFarmingGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, Module.Staking, stakingFarming);
const stakingFarmingActionContext = (context: any) => localActionContext(context, Module.Staking, stakingFarming);

export { stakingFarmingGetterContext, stakingFarmingActionContext };
export default stakingFarming;
