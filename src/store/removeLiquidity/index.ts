import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const removeLiquidity = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const removeLiquidityGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, Module.RemoveLiquidity, removeLiquidity);
const removeLiquidityActionContext = (context: any) =>
  localActionContext(context, Module.RemoveLiquidity, removeLiquidity);

export { removeLiquidityGetterContext, removeLiquidityActionContext };
export default removeLiquidity;
