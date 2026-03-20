import { defineModule } from '@/store/module-helpers';
import { localModuleActionContext, localModuleGetterContext } from '@/store/module-context';

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

const transactionsGetterContext = (args: [any, any, any, any]) => localModuleGetterContext(args, transactions);

const transactionsActionContext = (context: any) => localModuleActionContext(context, transactions);

export { transactionsGetterContext, transactionsActionContext };
export default transactions;
