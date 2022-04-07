import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';

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

const removeLiquidityGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, 'removeLiquidity', removeLiquidity);
const removeLiquidityActionContext = (context: any) => localActionContext(context, 'removeLiquidity', removeLiquidity);

export { removeLiquidityGetterContext, removeLiquidityActionContext };
export default removeLiquidity;
