import { defineActions } from '@/store/module-helpers';

import { useRouterStore } from '@/stores/router';

const actions = defineActions({
  async back(): Promise<void> {
    const { getWalletPinia } = await import('../../index');
    const routerStore = useRouterStore(getWalletPinia());
    routerStore.back();
  },
  async checkCurrentRoute(): Promise<void> {
    const { getWalletPinia } = await import('../../index');
    const routerStore = useRouterStore(getWalletPinia());
    routerStore.checkCurrentRoute();
  },
});

export default actions;
