import { defineModule } from '@/store/module-helpers';
import { localModuleActionContext, localModuleGetterContext } from '@/store/module-context';

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

const accountGetterContext = (args: [any, any, any, any]) => localModuleGetterContext(args, account);

const accountActionContext = (context: any) => localModuleActionContext(context, account);

export { accountGetterContext, accountActionContext };
export default account;
