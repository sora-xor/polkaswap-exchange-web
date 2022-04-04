import { defineModule, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const referrals = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const referralsActionContext = (context: any) => localActionContext(context, referrals);

export { referralsActionContext };
export default referrals;
