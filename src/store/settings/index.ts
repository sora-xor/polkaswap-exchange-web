import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const settings = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const settingsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, settings);
const settingsActionContext = (context: any) => localActionContext(context, settings);

export { settingsGetterContext, settingsActionContext };
export default settings;
