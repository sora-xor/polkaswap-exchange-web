import { defineModule } from 'direct-vuex';

import mutations from './mutations';
import state from './state';

const router = defineModule({
  namespaced: true,
  state,
  mutations,
});

export default router;
