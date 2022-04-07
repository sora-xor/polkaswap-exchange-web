import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const createPair = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const createPairGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.CreatePair, createPair);
const createPairActionContext = (context: any) => localActionContext(context, Module.CreatePair, createPair);

export { createPairGetterContext, createPairActionContext };
export default createPair;
