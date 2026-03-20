import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import { PageNames } from '@/consts';

const checkCurrentRouteMock = vi.fn();
const navigateMock = vi.fn();
const pushMock = vi.fn(async () => undefined);
const backMock = vi.fn();
const setTokenFromAddressMock = vi.fn();
const setTokenToAddressMock = vi.fn();
const assetDataByAddressMock = vi.fn();
const routeMock = reactive<{ query: Record<string, unknown> }>({ query: {} });
const walletStoreMock = reactive<{
  isLoggedIn: boolean;
  whitelist: Record<string, unknown>;
  whitelistIdsBySymbol: Record<string, string>;
}>({
  isLoggedIn: false,
  whitelist: {},
  whitelistIdsBySymbol: {},
});

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/router', () => ({
  __esModule: true,
  useRouterStore: () => ({
    checkCurrentRoute: checkCurrentRouteMock,
    navigate: navigateMock,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/stores/swap', () => ({
  __esModule: true,
  useSwapStore: () => ({
    setTokenFromAddress: setTokenFromAddressMock,
    setTokenToAddress: setTokenToAddressMock,
  }),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    getters: {
      assets: {
        assetDataByAddress: assetDataByAddressMock,
      },
    },
    dispatch: {
      addLiquidity: {
        setFirstTokenAddress: vi.fn(),
      },
    },
  },
}));

vi.mock('vue-router', () => ({
  __esModule: true,
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
  onBeforeRouteUpdate: vi.fn(),
}));

const WalletView = (await import('@/views/Wallet.vue')).default;

describe('Wallet view route syncing', () => {
  const mountWalletView = () =>
    mount(WalletView, {
      global: {
        stubs: {
          'sora-wallet': {
            name: 'SoraWalletStub',
            template: '<div class="sora-wallet-stub"></div>',
          },
        },
        directives: {
          loading: () => undefined,
        },
      },
    });

  beforeEach(() => {
    checkCurrentRouteMock.mockClear();
    navigateMock.mockClear();
    pushMock.mockClear();
    backMock.mockClear();
    setTokenFromAddressMock.mockReset();
    setTokenToAddressMock.mockReset();
    assetDataByAddressMock.mockReset();
    setTokenFromAddressMock.mockImplementation(() => undefined);
    setTokenToAddressMock.mockImplementation(() => undefined);
    routeMock.query = {};
    walletStoreMock.isLoggedIn = false;
    walletStoreMock.whitelist = {};
    walletStoreMock.whitelistIdsBySymbol = {};
  });

  it('forces wallet connection route check on mount', () => {
    mountWalletView();

    expect(checkCurrentRouteMock).toHaveBeenCalledTimes(1);
  });

  it('prepares swap store state and navigates to swap when wallet emits swap', async () => {
    const wrapper = mountWalletView();

    wrapper.findComponent({ name: 'SoraWalletStub' }).vm.$emit('swap', { address: 'asset-address' });
    await flushPromises();

    expect(setTokenFromAddressMock).toHaveBeenCalledWith('asset-address');
    expect(setTokenToAddressMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith({ name: PageNames.Swap });
  });

  it('still navigates to swap when swap token preselection fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setTokenFromAddressMock.mockImplementationOnce(() => {
      throw new Error('swap setup failed');
    });

    const wrapper = mountWalletView();

    wrapper.findComponent({ name: 'SoraWalletStub' }).vm.$emit('swap', { address: 'asset-address' });
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith({ name: PageNames.Swap });
    expect(warnSpy).toHaveBeenCalledWith('[WALLET] Swap setup issue:', expect.any(Error));

    warnSpy.mockRestore();
  });

  it('navigates to wallet send when query params become resolvable after login', async () => {
    routeMock.query = {
      page: 'send',
      asset: 'xor',
      to: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
      amount: '1',
    };
    assetDataByAddressMock.mockReturnValue({ address: '0x02', symbol: 'XOR' });

    mountWalletView();

    expect(navigateMock).not.toHaveBeenCalled();

    walletStoreMock.isLoggedIn = true;
    walletStoreMock.whitelistIdsBySymbol = { XOR: '0x02' };
    await nextTick();
    await flushPromises();

    expect(navigateMock).toHaveBeenCalledWith({
      name: 'WalletSend',
      params: {
        address: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
        amount: '1',
        asset: { address: '0x02', symbol: 'XOR' },
      },
    });
  });
});
