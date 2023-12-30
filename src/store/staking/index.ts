import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const staking = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const stakingGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Staking, staking);
const stakingActionContext = (context: any) => localActionContext(context, Module.Staking, staking);

export { stakingGetterContext, stakingActionContext };
export default staking;
