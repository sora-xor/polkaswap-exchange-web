import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const removeLiquidity = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const removeLiquidityGetterContext = (args: [any, any, any, any]) => localGetterContext(args, removeLiquidity);
const removeLiquidityActionContext = (context: any) => localActionContext(context, removeLiquidity);

export { removeLiquidityGetterContext, removeLiquidityActionContext };
export default removeLiquidity;
