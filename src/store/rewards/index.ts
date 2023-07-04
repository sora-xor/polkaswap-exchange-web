import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const rewards = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const rewardsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Rewards, rewards);
const rewardsActionContext = (context: any) => localActionContext(context, Module.Rewards, rewards);

export { rewardsGetterContext, rewardsActionContext };
export default rewards;
