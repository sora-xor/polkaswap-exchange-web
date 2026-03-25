import { nextTick, ref } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PageNames } from '@/consts';

const addressRef = ref('alice');
const isLoggedInRef = ref(false);
const logoutMock = vi.fn();
const setDialogVisibilityMock = vi.fn();
const goToMock = vi.fn();

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get address() {
      return addressRef.value;
    },
    get isLoggedIn() {
      return isLoggedInRef.value;
    },
    logout: logoutMock,
  }),
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({
    setSoraAccountDialogVisibility: setDialogVisibilityMock,
  }),
}));

vi.mock('@/router', () => ({
  __esModule: true,
  goTo: goToMock,
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

describe('useInternalConnect', () => {
  beforeEach(() => {
    addressRef.value = 'alice';
    isLoggedInRef.value = false;
    logoutMock.mockClear();
    setDialogVisibilityMock.mockClear();
    goToMock.mockClear();
  });

  it('exposes reactive wallet state and connection helpers', async () => {
    const { soraAddress, isLoggedIn, connectSoraWallet, disconnectSoraWallet, navigateToWallet } =
      await import('@/composables/useInternalConnect').then((m) => m.useInternalConnect());

    expect(soraAddress.value).toBe('alice');
    expect(isLoggedIn.value).toBe(false);

    addressRef.value = 'bob';
    isLoggedInRef.value = true;
    await nextTick();

    expect(soraAddress.value).toBe('bob');
    expect(isLoggedIn.value).toBe(true);

    connectSoraWallet();
    expect(setDialogVisibilityMock).toHaveBeenCalledWith(true);

    disconnectSoraWallet();
    expect(logoutMock).toHaveBeenCalledTimes(1);

    navigateToWallet();
    expect(goToMock).toHaveBeenCalledWith(PageNames.Wallet);
  });
});
