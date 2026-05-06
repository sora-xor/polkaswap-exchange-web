import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectSoraWallet: vi.fn(),
  connectEvmWallet: vi.fn(async () => undefined),
  disconnectExternalNetwork: vi.fn(),
  routerPush: vi.fn(async () => undefined),
  setMoonpayVisibility: vi.fn(),
  isLoggedIn: { value: false },
  evmAddress: { value: '' },
  settingsStore: {
    libraryTheme: 'light',
    moonpayEnabled: true,
  },
  moonpayStore: {
    bridgeTransactionData: null,
    startBridgeButtonVisibility: false,
    setDialogVisibility: vi.fn(),
  },
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

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}));

vi.mock('@/shared/ui/async', () => ({
  createAsyncComponent: () => ({
    name: 'AsyncComponentStub',
    template: '<div class="async-component-stub"><slot /><slot name="title" /></div>',
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}));

vi.mock('@/stores/moonpay', () => ({
  useMoonpayStore: () => ({
    ...mocks.moonpayStore,
    setDialogVisibility: mocks.setMoonpayVisibility,
  }),
}));

import { shallowMount } from '@vue/test-utils';
import DepositOptionsPage from '@/features/deposit/pages/DepositOptionsPage.vue';

describe('DepositOptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLoggedIn.value = false;
    mocks.evmAddress.value = '';
  });

  it('requests wallet connection when moonpay dialog opened while logged out', async () => {
    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
    expect(mocks.setMoonpayVisibility).not.toHaveBeenCalled();
  });

  it('prompts for evm wallet connection when required', async () => {
    mocks.isLoggedIn.value = true;
    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.connectEvmWallet).toHaveBeenCalled();
    expect(mocks.setMoonpayVisibility).not.toHaveBeenCalled();
  });

  it('opens moonpay when prerequisites satisfied', async () => {
    mocks.isLoggedIn.value = true;
    mocks.evmAddress.value = '0xabc';

    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openMoonpayDialog();

    expect(mocks.setMoonpayVisibility).toHaveBeenCalledWith(true);
  });

  it('navigates to history page when clicking history button', async () => {
    mocks.isLoggedIn.value = true;
    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openDepositTxHistory();

    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'DepositTxHistory' });
  });

  it('connects sora wallet when opening cede widget logged out', async () => {
    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openCedeWidget();

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
  });

  it('navigates to Cede Store when the wallet is already connected', async () => {
    mocks.isLoggedIn.value = true;
    const wrapper = shallowMount(DepositOptionsPage);

    await wrapper.vm.openCedeWidget();

    expect(mocks.routerPush).toHaveBeenCalledWith({ name: 'CedeStore' });
  });
});
