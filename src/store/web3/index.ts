import { defineModule } from 'direct-vuex';

import mutations from './mutations';
import state from './state';

const web3 = defineModule({
  namespaced: true,
  state,
  mutations,
});

export default web3;
