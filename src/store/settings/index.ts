import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const settingsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, 'settings', settings);
const settingsActionContext = (context: any) => localActionContext(context, 'settings', settings);

export { settingsGetterContext, settingsActionContext };
export default settings;
