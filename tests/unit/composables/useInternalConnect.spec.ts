import { nextTick, ref } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PageNames } from '@/consts';

const addressRef = ref('alice');
const isLoggedInRef = ref(false);
const soraAccountDialogVisibleRef = ref(false);
const logoutMock = vi.fn();
const setDialogVisibilityMock = vi.fn((flag: boolean) => {
  soraAccountDialogVisibleRef.value = flag;
});
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
    get soraAccountDialogVisibility() {
      return soraAccountDialogVisibleRef.value;
    },
    setSoraAccountDialogVisibility: setDialogVisibilityMock,
  }),
}));

vi.mock('@/app/router', () => ({
  __esModule: true,
  goTo: goToMock,
}));

describe('useInternalConnect', () => {
  beforeEach(() => {
    addressRef.value = 'alice';
    isLoggedInRef.value = false;
    soraAccountDialogVisibleRef.value = false;
    logoutMock.mockClear();
    setDialogVisibilityMock.mockClear();
    goToMock.mockClear();
  });

  it('exposes reactive wallet state and connection helpers', async () => {
    const {
      soraAddress,
      isLoggedIn,
      isSoraAccountDialogVisible,
      connectSoraWallet,
      disconnectSoraWallet,
      navigateToWallet,
    } = await import('@/composables/useInternalConnect').then((m) => m.useInternalConnect());

    expect(soraAddress.value).toBe('alice');
    expect(isLoggedIn.value).toBe(false);
    expect(isSoraAccountDialogVisible.value).toBe(false);

    addressRef.value = 'bob';
    isLoggedInRef.value = true;
    await nextTick();

    expect(soraAddress.value).toBe('bob');
    expect(isLoggedIn.value).toBe(true);

    connectSoraWallet();
    expect(setDialogVisibilityMock).toHaveBeenCalledWith(true);
    expect(isSoraAccountDialogVisible.value).toBe(true);

    disconnectSoraWallet();
    expect(logoutMock).toHaveBeenCalledTimes(1);

    navigateToWallet();
    expect(goToMock).toHaveBeenCalledWith(PageNames.Wallet);
  });

  it('reopens the account dialog when the visibility flag is already set', async () => {
    soraAccountDialogVisibleRef.value = true;
    const { connectSoraWallet } = await import('@/composables/useInternalConnect').then((m) => m.useInternalConnect());

    await connectSoraWallet();

    expect(setDialogVisibilityMock).toHaveBeenNthCalledWith(1, false);
    expect(setDialogVisibilityMock).toHaveBeenNthCalledWith(2, true);
  });
});
