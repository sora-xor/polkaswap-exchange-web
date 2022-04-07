import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const moonpay = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const moonpayGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Moonpay, moonpay);
const moonpayActionContext = (context: any) => localActionContext(context, Module.Moonpay, moonpay);

export { moonpayGetterContext, moonpayActionContext };
export default moonpay;
