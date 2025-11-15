import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

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

const settingsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, settings);
const settingsActionContext = (context: any) => localActionContext(context, settings);

export { settingsActionContext, settingsGetterContext };
export default settings;
