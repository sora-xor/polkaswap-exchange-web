import { defineModule, localActionContext, localGetterContext } from 'direct-vuex';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const transactions = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const transactionsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, transactions);

const transactionsActionContext = (context: any) => localActionContext(context, transactions);

export { transactionsGetterContext, transactionsActionContext };
export default transactions;
