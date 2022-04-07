import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const rewardsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'rewards', rewards);
const rewardsActionContext = (context: any) => localActionContext(context, 'rewards', rewards);

export { rewardsGetterContext, rewardsActionContext };
export default rewards;
