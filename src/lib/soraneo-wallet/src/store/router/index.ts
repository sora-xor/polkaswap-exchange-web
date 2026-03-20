import { defineModule } from '@/store/module-helpers';
import { localModuleActionContext } from '@/store/module-context';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const router = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const routerActionContext = (context: any) => localModuleActionContext(context, router);

export { routerActionContext };
export default router;
