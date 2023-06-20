import { defineModule } from 'direct-vuex';

import { localActionContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const moonpay = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const moonpayActionContext = (context: any) => localActionContext(context, Module.Moonpay, moonpay);

export { moonpayActionContext };
export default moonpay;
