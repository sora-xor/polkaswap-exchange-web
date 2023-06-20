import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const settings = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const settingsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Settings, settings);
const settingsActionContext = (context: any) => localActionContext(context, Module.Settings, settings);

export { settingsGetterContext, settingsActionContext };
export default settings;
