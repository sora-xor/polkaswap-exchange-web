import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectEvmWallet = vi.hoisted(() => vi.fn());
const connectEvmProvider = vi.hoisted(() => vi.fn());
const disconnectEvmWallet = vi.hoisted(() => vi.fn());
const disconnectExternalNetwork = vi.hoisted(() => vi.fn());
const disconnectSubWallet = vi.hoisted(() => vi.fn());
const connectSubWallet = vi.hoisted(() => vi.fn());
const changeEvmNetworkProvided = vi.hoisted(() => vi.fn());
const selectEvmProvider = vi.hoisted(() => vi.fn());

const walletConnectMock = {
  connectEvmWallet,
  connectEvmProvider,
  disconnectEvmWallet,
  disconnectExternalNetwork,
  disconnectSubWallet,
  connectSubWallet,
  changeEvmNetworkProvided,
  selectEvmProvider,
  evmProvider: computed(() => null),
  evmProviderLoading: ref(null),
  evmAddress: ref(''),
  networkSelected: ref(null),
  networkType: computed(() => null),
  getEvmProviderIcon: vi.fn(),
  evmProviders: computed(() => []),
};

vi.mock('@/composables/useWalletConnect', () => ({
  useWalletConnect: () => walletConnectMock,
}));

const subscribeOnEvmProviders = vi.hoisted(() => vi.fn(async () => vi.fn()));
const setSelectProviderDialogVisibility = vi.hoisted(() => vi.fn());
const setSelectNetworkDialogVisibility = vi.hoisted(() => vi.fn());

vi.mock('@/store', () => ({
  default: {
    state: {
      web3: {
        evmProvider: null,
        selectProviderDialogVisibility: false,
      },
    },
    getters: {
      web3: {
        appEvmProviders: [],
        selectedNetwork: null,
        isValidNetwork: true,
        subAccount: {
          address: '',
          name: '',
          source: '',
        },
      },
    },
    dispatch: {
      web3: {
        subscribeOnEvmProviders,
      },
    },
    commit: {
      web3: {
        setSelectProviderDialogVisibility,
        setSelectNetworkDialogVisibility,
      },
    },
  },
}));

import { useWeb3Connection } from '@/composables/useWeb3Connection';

describe('useWeb3Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletConnectMock.evmAddress.value = '';
  });

  it('exposes connection status helpers', () => {
    const web3 = useWeb3Connection();

    expect(web3.isConnected.value).toBe(false);
    walletConnectMock.evmAddress.value = '0xabc';
    expect(web3.isConnected.value).toBe(true);
  });

  it('delegates connect and disconnect helpers', async () => {
    const web3 = useWeb3Connection();

    await web3.connect();
    expect(connectEvmWallet).toHaveBeenCalled();

    web3.disconnectAll();
    expect(disconnectEvmWallet).toHaveBeenCalled();
    expect(disconnectExternalNetwork).toHaveBeenCalled();
    expect(disconnectSubWallet).toHaveBeenCalled();
  });

  it('subscribes to provider announcements', async () => {
    const web3 = useWeb3Connection();

    await web3.subscribeOnEvmProviders();
    expect(subscribeOnEvmProviders).toHaveBeenCalled();
  });

  it('opens provider and network dialogs', () => {
    const web3 = useWeb3Connection();

    web3.openSelectProviderDialog();
    expect(setSelectProviderDialogVisibility).toHaveBeenCalledWith(true);

    web3.openSelectNetworkDialog();
    expect(setSelectNetworkDialogVisibility).toHaveBeenCalledWith(true);
  });
});
