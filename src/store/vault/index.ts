import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';

import actions from './actions';
import mutations from './mutations';
import state from './state';

const vault = defineModule({
  namespaced: true,
  state,
  mutations,
  actions,
});

const vaultGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Vault, vault);
const vaultActionContext = (context: any) => localActionContext(context, Module.Vault, vault);

export { vaultGetterContext, vaultActionContext };
export default vault;
