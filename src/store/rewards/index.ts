import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const rewards = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const rewardsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, rewards);
const rewardsActionContext = (context: any) => localActionContext(context, rewards);

export { rewardsGetterContext, rewardsActionContext };
export default rewards;
