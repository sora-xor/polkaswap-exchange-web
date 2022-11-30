import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const prices = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
});

const pricesGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Prices, prices);
const pricesActionContext = (context: any) => localActionContext(context, Module.Prices, prices);

export { pricesActionContext, pricesGetterContext };
export default prices;
