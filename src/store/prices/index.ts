import { defineModule } from 'direct-vuex';

import { localActionContext } from '@/store';

import mutations from './mutations';
import state from './state';
import actions from './actions';

const prices = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const pricesActionContext = (context: any) => localActionContext(context, 'prices', prices);

export { pricesActionContext };
export default prices;
