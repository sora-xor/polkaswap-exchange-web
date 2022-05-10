import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const noir = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const noirGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Noir, noir);
const noirActionContext = (context: any) => localActionContext(context, Module.Noir, noir);

export { noirGetterContext, noirActionContext };

export default noir;
