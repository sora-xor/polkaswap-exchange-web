import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

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

const moonpayGetterContext = (args: [any, any, any, any]) => localGetterContext(args, moonpay);
const moonpayActionContext = (context: any) => localActionContext(context, moonpay);

export { moonpayGetterContext, moonpayActionContext };
export default moonpay;
