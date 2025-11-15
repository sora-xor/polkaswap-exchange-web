import { defineModule, localActionContext, localGetterContext } from 'direct-vuex';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const account = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const accountGetterContext = (args: [any, any, any, any]) => localGetterContext(args, account);

const accountActionContext = (context: any) => localActionContext(context, account);

export { accountGetterContext, accountActionContext };
export default account;
