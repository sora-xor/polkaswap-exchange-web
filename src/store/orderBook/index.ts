import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const orderBook = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
});

const soraCardGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.OrderBook, orderBook);
const soraCardActionContext = (context: any) => localActionContext(context, Module.OrderBook, orderBook);

export { soraCardActionContext, soraCardGetterContext };
export default orderBook;
