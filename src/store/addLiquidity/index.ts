import { defineModule, localGetterContext, localActionContext } from 'direct-vuex';

import mutations from './mutations';
import state from './state';
import getters from './getters';
import actions from './actions';

const addLiquidity = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const addLiquidityGetterContext = (args: [any, any, any, any]) => localGetterContext(args, addLiquidity);
const addLiquidityActionContext = (context: any) => localActionContext(context, addLiquidity);

export { addLiquidityGetterContext, addLiquidityActionContext };
export default addLiquidity;
