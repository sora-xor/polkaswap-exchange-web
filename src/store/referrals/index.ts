import { defineModule } from 'direct-vuex';

import { localActionContext } from '@/store';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const referrals = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const referralsActionContext = (context: any) => localActionContext(context, 'referrals', referrals);

export { referralsActionContext };
export default referrals;
