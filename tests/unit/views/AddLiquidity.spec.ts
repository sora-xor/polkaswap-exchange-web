import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';

import { PoolPageNames } from '@/modules/pool/consts';

const poolStoreMock = reactive({
  addLiquidityFirstToken: null as any,
  addLiquiditySecondToken: null as any,
  setAddLiquidityDataFromLiquidity: vi.fn(async () => undefined),
  resetAddLiquidityData: vi.fn(async () => undefined),
});
const pushMock = vi.fn(async () => undefined);
const parseCurrentRouteMock = vi.fn();
const updateRouteAfterSelectTokensMock = vi.fn();
const firstRouteAddress = ref('');
const secondRouteAddress = ref('');
const isValidRoute = ref(false);
const walletStoreMock = reactive({
  isLoggedIn: true,
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
    withParentLoading: async (callback: () => Promise<unknown> | unknown) => await callback(),
  }),
}));

vi.mock('@/composables/useSelectedTokensRoute', () => ({
  useSelectedTokensRoute: () => ({
    firstRouteAddress,
    secondRouteAddress,
    isValidRoute,
    parseCurrentRoute: parseCurrentRouteMock,
    updateRouteAfterSelectTokens: updateRouteAfterSelectTokensMock,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/stores/pool', () => ({
  usePoolStore: () => poolStoreMock,
}));

vi.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: pushMock,
  },
  lazyComponent: () => ({
    name: 'LazyComponentStub',
    template: '<div class="lazy-component-stub"><slot /></div>',
  }),
}));

vi.mock('@/modules/pool/router', () => ({
  poolLazyComponent: () => ({
    name: 'PoolLazyComponentStub',
    template: '<div class="pool-lazy-component-stub"><slot /></div>',
  }),
}));

const AddLiquidityView = (await import('@/views/AddLiquidity.vue')).default;

const mountView = () =>
  mount(AddLiquidityView, {
    global: {
      stubs: {
        'generic-page-header': {
          template: '<div class="generic-page-header-stub"><slot /></div>',
        },
        'add-liquidity-form': {
          template: '<div class="add-liquidity-form-stub"></div>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

describe('AddLiquidity view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolStoreMock.addLiquidityFirstToken = null;
    poolStoreMock.addLiquiditySecondToken = null;
    firstRouteAddress.value = '';
    secondRouteAddress.value = '';
    isValidRoute.value = false;
    walletStoreMock.isLoggedIn = true;
  });

  it('starts with an empty token pair when the current route is not valid', async () => {
    mountView();
    await nextTick();

    expect(parseCurrentRouteMock).toHaveBeenCalledTimes(1);
    expect(poolStoreMock.setAddLiquidityDataFromLiquidity).toHaveBeenCalledWith({
      firstAddress: '',
      secondAddress: '',
    });
  });

  it('uses the selected route tokens when the current route is valid', async () => {
    firstRouteAddress.value = '0xfirst';
    secondRouteAddress.value = '0xsecond';
    isValidRoute.value = true;

    mountView();
    await nextTick();

    expect(poolStoreMock.setAddLiquidityDataFromLiquidity).toHaveBeenCalledWith({
      firstAddress: '0xfirst',
      secondAddress: '0xsecond',
    });
  });

  it('navigates back to the pool page after logout', async () => {
    mountView();

    walletStoreMock.isLoggedIn = false;
    await nextTick();

    expect(pushMock).toHaveBeenCalledWith({ name: PoolPageNames.Pool });
  });

  it('resets the add-liquidity state when leaving the view', async () => {
    const wrapper = mountView();

    wrapper.unmount();

    expect(poolStoreMock.resetAddLiquidityData).toHaveBeenCalledTimes(1);
  });
});
