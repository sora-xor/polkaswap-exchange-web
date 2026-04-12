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
  const walletConnectProvider = {
    uuid: 'WalletConnect',
    name: 'WalletConnect',
    icon: 'wallet-connect.svg',
    installed: false,
    getProvider: vi.fn(),
  };
  const metamaskProvider = {
    uuid: 'MetaMask',
    name: 'MetaMask',
    icon: 'metamask.svg',
    installed: false,
    getProvider: vi.fn(),
  };
  const fearlessProvider = {
    uuid: 'Fearless Wallet',
    name: 'Fearless Wallet',
    icon: 'fearless.svg',
    installed: false,
    getProvider: vi.fn(),
  };

  return {
    PredefinedProvider: {
      Fearless: 'Fearless Wallet',
      MetaMask: 'MetaMask',
      WalletConnect: 'WalletConnect',
    },
    WalletConnectProvider: walletConnectProvider,
    MetamaskProvider: metamaskProvider,
    FearlessWalletProvider: fearlessProvider,
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
const provider = vi.hoisted(
  () =>
    ({
      uuid: 'WalletConnect',
      name: 'WalletConnect',
      icon: 'icon.svg',
      getProvider: vi.fn(),
    }) as unknown as AppEIPProvider
);
const metamaskProvider = vi.hoisted(
  () =>
    ({
      uuid: 'MetaMask',
      name: 'MetaMask',
      icon: 'metamask.svg',
      installed: false,
      getProvider: vi.fn(),
    }) as unknown as AppEIPProvider
);
const fearlessProvider = vi.hoisted(
  () =>
    ({
      uuid: 'Fearless Wallet',
      name: 'Fearless Wallet',
      icon: 'fearless.svg',
      installed: false,
      getProvider: vi.fn(),
    }) as unknown as AppEIPProvider
);

const bridgeStorePiniaMock = vi.hoisted(() => ({
  isSubBridge: false,
  isSubAccountType: true,
  connector: {
    network: {
      subNetworkConnection: {
        nodeIsConnected: true,
      },
    },
  },
}));

const web3StorePiniaMock = vi.hoisted(() => ({
  appEvmProviders: [provider],
  evmProvider: provider,
  evmProviderLoading: null,
  evmAddress: '0x123',
  networkSelected: 'network',
  networkType: 'type',
  setSubAccountDialogVisibility: vi.fn(),
  setSelectSubNodeDialogVisibility: vi.fn(),
  disconnectExternalNetwork: disconnectExternalNetworkMock,
  resetEvmProviderConnection: disconnectEvmMock,
  resetSubAccount: disconnectSubMock,
  changeEvmNetworkProvided: changeNetworkMock,
  selectEvmProvider: selectProviderMock,
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
  web3StorePiniaMock.setSubAccountDialogVisibility.mockReset();
  web3StorePiniaMock.setSelectSubNodeDialogVisibility.mockReset();
  provider.getProvider.mockReset();
  metamaskProvider.getProvider.mockReset();
  fearlessProvider.getProvider.mockReset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  walletStorageMock.set.mockClear();
  walletStorageMock.get.mockClear();
  walletStorageMock.remove.mockClear();
  bridgeStorePiniaMock.isSubBridge = false;
  bridgeStorePiniaMock.isSubAccountType = true;
  bridgeStorePiniaMock.connector = {
    network: {
      subNetworkConnection: {
        nodeIsConnected: true,
      },
    },
  };
  web3StorePiniaMock.appEvmProviders = [provider];
  web3StorePiniaMock.evmProvider = provider;
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
    expect(selectProviderMock).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'WalletConnect' }));

    wallet.connectSubWallet();
    expect(web3StorePiniaMock.setSubAccountDialogVisibility).toHaveBeenCalledWith(true);

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

  it('prefers an injected MetaMask provider before falling back to WalletConnect', async () => {
    web3StorePiniaMock.evmProvider = null;
    web3StorePiniaMock.appEvmProviders = [fearlessProvider, metamaskProvider, provider];
    fearlessProvider.getProvider.mockResolvedValue(undefined);
    metamaskProvider.getProvider.mockResolvedValue({ request: vi.fn() });

    const wrapper = createHarness();
    const { wallet } = wrapper.vm as { wallet: ReturnType<typeof useWalletConnect> };

    await wallet.connectEvmWallet();

    expect(fearlessProvider.getProvider).toHaveBeenCalledTimes(1);
    expect(metamaskProvider.getProvider).toHaveBeenCalledTimes(1);
    expect(selectProviderMock).toHaveBeenCalledWith(metamaskProvider);

    wrapper.unmount();
  });

  it('opens the node selector instead of the sub-account dialog when the sub bridge is not ready', () => {
    bridgeStorePiniaMock.isSubBridge = true;
    bridgeStorePiniaMock.connector = {
      network: {
        subNetworkConnection: {
          nodeIsConnected: false,
        },
      },
    };

    const wrapper = createHarness();
    const { wallet } = wrapper.vm as { wallet: ReturnType<typeof useWalletConnect> };

    wallet.connectSubWallet();

    expect(web3StorePiniaMock.setSelectSubNodeDialogVisibility).toHaveBeenCalledWith(true);
    expect(web3StorePiniaMock.setSubAccountDialogVisibility).not.toHaveBeenCalled();

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
