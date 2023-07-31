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

const orderBookGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.OrderBook, orderBook);
const orderBookActionContext = (context: any) => localActionContext(context, Module.OrderBook, orderBook);

export { orderBookActionContext, orderBookGetterContext };
export default orderBook;
