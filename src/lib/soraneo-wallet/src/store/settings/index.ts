import { defineModule } from '@/store/module-helpers';
import { localModuleActionContext, localModuleGetterContext } from '@/store/module-context';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const settings = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
});

const settingsGetterContext = (args: [any, any, any, any]) => localModuleGetterContext(args, settings);
const settingsActionContext = (context: any) => localModuleActionContext(context, settings);

export { settingsActionContext, settingsGetterContext };
export default settings;
