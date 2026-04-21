import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useRouterStore } from '@/stores/router';
import {
  getWalletCurrentParams,
  getWalletCurrentRoute,
  getWalletPreviousParams,
  getWalletPreviousRoute,
  navigateWallet,
  syncWalletCurrentRoute,
} from '@/platform/wallet/navigation';

describe('platform wallet navigation adapter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reads and updates the legacy wallet route mirror through the platform adapter', () => {
    const routerStore = useRouterStore();
    const checkCurrentRouteSpy = vi.spyOn(routerStore, 'checkCurrentRoute');

    expect(getWalletCurrentRoute()).toBeNull();
    expect(getWalletCurrentParams()).toEqual({});

    navigateWallet({ name: 'wallet-send', params: { asset: 'xor' } });

    expect(getWalletCurrentRoute()).toBe('wallet-send');
    expect(getWalletCurrentParams()).toEqual({ asset: 'xor' });
    expect(getWalletPreviousRoute()).toBeNull();
    expect(getWalletPreviousParams()).toEqual({});

    syncWalletCurrentRoute();

    expect(checkCurrentRouteSpy).toHaveBeenCalledTimes(1);
  });
});
