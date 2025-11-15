import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectSoraWallet: vi.fn(),
  connectEvmWallet: vi.fn(async () => undefined),
  disconnectExternalNetwork: vi.fn(),
  goTo: vi.fn(),
  setMoonpayVisibility: vi.fn(),
  isLoggedIn: { value: false },
  evmAddress: { value: '' },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: mocks.isLoggedIn,
    connectSoraWallet: mocks.connectSoraWallet,
  }),
}));

vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: () => ({
    connectEvmWallet: mocks.connectEvmWallet,
    evmAddress: mocks.evmAddress,
    disconnectExternalNetwork: mocks.disconnectExternalNetwork,
  }),
}));

vi.mock('@/router', () => ({
  goTo: mocks.goTo,
  lazyComponent: () => ({ template: '<div />' }),
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      moonpay: {
        bridgeTransactionData: null,
        startBridgeButtonVisibility: false,
      },
    },
    getters: {
      libraryTheme: 'light',
      settings: {
        moonpayEnabled: true,
      },
    },
    commit: {
      moonpay: {
        setDialogVisibility: mocks.setMoonpayVisibility,
      },
    },
  },
}));

import { shallowMount } from '@vue/test-utils';
import DepositOptions from '@/views/DepositOptions.vue';

describe('DepositOptions view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLoggedIn.value = false;
    mocks.evmAddress.value = '';
  });

  it('requests wallet connection when moonpay dialog opened while logged out', async () => {
    const wrapper = shallowMount(DepositOptions);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
    expect(mocks.setMoonpayVisibility).not.toHaveBeenCalled();
  });

  it('prompts for evm wallet connection when required', async () => {
    mocks.isLoggedIn.value = true;
    const wrapper = shallowMount(DepositOptions);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.connectEvmWallet).toHaveBeenCalled();
    expect(mocks.setMoonpayVisibility).not.toHaveBeenCalled();
  });

  it('opens moonpay when prerequisites satisfied', async () => {
    mocks.isLoggedIn.value = true;
    mocks.evmAddress.value = '0xabc';

    const wrapper = shallowMount(DepositOptions);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.setMoonpayVisibility).toHaveBeenCalledWith(true);
  });

  it('navigates to history page when clicking history button', async () => {
    mocks.isLoggedIn.value = true;
    const wrapper = shallowMount(DepositOptions);

    await wrapper.vm.openDepositTxHistory();

    expect(mocks.goTo).toHaveBeenCalled();
  });

  it('connects sora wallet when opening cede widget logged out', async () => {
    const wrapper = shallowMount(DepositOptions);

    await wrapper.vm.openCedeWidget();

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
  });
});
