import { mount } from '@vue/test-utils';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import { useWalletConnect } from '@/composables/useWalletConnect';
import type { AppEIPProvider } from '@/types/evm/provider';

const alertMock = vi.fn();
const routerGo = vi.hoisted(() => vi.fn());

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    go: routerGo,
  },
  lazyComponent: () => ({ template: '<div class="router-lazy-component-stub"><slot /></div>' }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    te: () => false,
  }),
}));

vi.mock('@/utils/connection/evm/providers', () => {
  const provider = {
    uuid: 'WalletConnect',
    name: 'WalletConnect',
    icon: 'wallet-connect.svg',
    installed: false,
  };

  return {
    PredefinedProvider: {
      WalletConnect: 'WalletConnect',
    },
    WalletConnectProvider: provider,
  };
});

vi.mock('@/utils/ethers-util', () => ({
  handleRpcProviderError: (error: Error & { message?: string }) => error.message ?? 'error',
  installExtensionKey: 'install-extension',
}));

const { walletStorageMock } = vi.hoisted(() => ({
  walletStorageMock: {
    set: vi.fn(),
    get: vi.fn(() => null),
    remove: vi.fn(),
  },
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    storage: walletStorageMock,
    settingsStorage: walletStorageMock,
    WALLET_CONSTS: {
      HiddenValue: '***',
    },
  });
});

const selectProviderMock = vi.hoisted(() => vi.fn());
const disconnectExternalNetworkMock = vi.hoisted(() => vi.fn());
const disconnectEvmMock = vi.hoisted(() => vi.fn());
const disconnectSubMock = vi.hoisted(() => vi.fn());
const changeNetworkMock = vi.hoisted(() => vi.fn());

const mockStore = vi.hoisted(() => {
  const provider = {
    uuid: 'WalletConnect',
    name: 'WalletConnect',
    icon: 'icon.svg',
    getProvider: vi.fn(),
  } as unknown as AppEIPProvider;

  return {
    state: {
      web3: {
        evmProvider: provider,
        evmProviderLoading: null,
        evmAddress: '0x123',
        networkSelected: 'network',
        networkType: 'type',
      },
      bridge: {
        isSignTxDialogVisible: false,
      },
    },
    getters: {
      bridge: {
        isSubBridge: false,
        isSubAccountType: true,
      },
      web3: {
        appEvmProviders: [provider],
      },
    },
    commit: {
      web3: {
        setSubAccountDialogVisibility: vi.fn(),
      },
      bridge: {
        setSignTxDialogVisibility: vi.fn(),
      },
    },
    dispatch: {
      web3: {
        disconnectExternalNetwork: disconnectExternalNetworkMock,
        resetEvmProviderConnection: disconnectEvmMock,
        resetSubAccount: disconnectSubMock,
        changeEvmNetworkProvided: changeNetworkMock,
        selectEvmProvider: selectProviderMock,
      },
      bridge: {},
    },
    provider,
  };
});

vi.mock('@/store', () => ({
  default: mockStore,
}));

const bridgeStorePiniaMock = vi.hoisted(() => ({
  isSubBridge: false,
  isSubAccountType: true,
}));

const web3StorePiniaMock = vi.hoisted(() => ({
  evmProvider: mockStore.state.web3.evmProvider,
  evmProviderLoading: null,
  evmAddress: '0x123',
  networkSelected: 'network',
  networkType: 'type',
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStorePiniaMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StorePiniaMock,
}));

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

beforeEach(() => {
  setActivePinia(createPinia());
  alertMock.mockReset();
  routerGo.mockReset();
  selectProviderMock.mockReset();
  selectProviderMock.mockResolvedValue(undefined);
  disconnectExternalNetworkMock.mockReset();
  disconnectEvmMock.mockReset();
  disconnectSubMock.mockReset();
  changeNetworkMock.mockReset();
  mockStore.commit.web3.setSubAccountDialogVisibility.mockReset();
  mockStore.commit.bridge.setSignTxDialogVisibility.mockReset();
  mockStore.provider.getProvider.mockReset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  walletStorageMock.set.mockClear();
  walletStorageMock.get.mockClear();
  walletStorageMock.remove.mockClear();
  bridgeStorePiniaMock.isSubBridge = false;
  bridgeStorePiniaMock.isSubAccountType = true;
  web3StorePiniaMock.evmProvider = mockStore.state.web3.evmProvider;
  web3StorePiniaMock.evmProviderLoading = null;
  web3StorePiniaMock.evmAddress = '0x123';
  web3StorePiniaMock.networkSelected = 'network';
  web3StorePiniaMock.networkType = 'type';
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  vi.unstubAllGlobals();
});

const createHarnessComponent = () =>
  defineComponent({
    setup() {
      const wallet = useWalletConnect();
      return { wallet };
    },
    render() {
      return null;
    },
  });

describe('useWalletConnect', () => {
  const createHarness = () =>
    mount(createHarnessComponent(), {
      global: {
        config: {
          globalProperties: {
            $alert: alertMock,
          },
        },
      },
    });

  it('exposes reactive wallet state and basic actions', async () => {
    const wrapper = createHarness();
    const { wallet } = wrapper.vm as { wallet: ReturnType<typeof useWalletConnect> };

    expect(wallet.evmAddress.value).toBe('0x123');
    await wallet.connectEvmWallet();
    expect(selectProviderMock).toHaveBeenCalledWith(mockStore.provider);

    wallet.connectSubWallet();
    expect(mockStore.commit.web3.setSubAccountDialogVisibility).toHaveBeenCalledWith(true);

    await wallet.disconnectExternalNetwork();
    expect(disconnectExternalNetworkMock).toHaveBeenCalled();

    await wallet.disconnectEvmWallet();
    expect(disconnectEvmMock).toHaveBeenCalled();

    await wallet.disconnectSubWallet();
    expect(disconnectSubMock).toHaveBeenCalled();

    await wallet.changeEvmNetworkProvided();
    expect(changeNetworkMock).toHaveBeenCalled();

    const provider = { icon: 'icon', name: 'Metamask' } as AppEIPProvider;
    expect(wallet.getEvmProviderIcon(provider)).toBe('icon');

    selectProviderMock.mockResolvedValueOnce(undefined);
    await wallet.connectEvmProvider(provider);
    expect(selectProviderMock).toHaveBeenCalledWith(provider);

    wrapper.unmount();
  });

  it('handles provider connection errors with alert fallback', async () => {
    const error = new Error('provider.error');
    selectProviderMock.mockRejectedValueOnce(error);

    const wrapper = createHarness();
    const { wallet } = wrapper.vm as { wallet: ReturnType<typeof useWalletConnect> };

    await wallet.connectEvmProvider({ icon: 'icon', name: 'MM' } as AppEIPProvider);
    await nextTick();

    expect(alertMock).toHaveBeenCalled();

    wrapper.unmount();
  });
});
