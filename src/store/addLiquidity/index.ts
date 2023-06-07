import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import getters from './getters';
import mutations from './mutations';
import state from './state';

const addLiquidity = defineModule({
  namespaced: true,
  state,
  mutations,
  getters,
  actions,
});

const addLiquidityGetterContext = (args: [any, any, any, any]) =>
  localGetterContext(args, Module.AddLiquidity, addLiquidity);
const addLiquidityActionContext = (context: any) => localActionContext(context, Module.AddLiquidity, addLiquidity);

export { addLiquidityGetterContext, addLiquidityActionContext };
export default addLiquidity;
