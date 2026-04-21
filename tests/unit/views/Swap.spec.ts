import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref, watch } from 'vue';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VueWrapper } from '@vue/test-utils';

const capturedGridValues: Array<Record<string, boolean> | undefined> = [];
const capturedGridIds: Array<string | undefined> = [];
const capturedDefaultLayouts: Array<Record<string, Array<Record<string, unknown>>> | undefined> = [];
const capturedGridAutoResize: Array<boolean> = [];
const capturedRouteCallbacks: Array<(params: { firstAddress: string; secondAddress: string }) => Promise<void> | void> =
  [];

const tokenFromRef = ref<{ symbol: string; address: string } | null>({ symbol: 'XOR', address: 'xor-address' });
const tokenToRef = ref<{ symbol: string; address: string } | null>(null);
const firstRouteAddressRef = ref('');
const secondRouteAddressRef = ref('');
const isValidRouteRef = ref(false);
const routeAssetLookupRef = ref<Record<string, { symbol: string; address: string }>>({});

const setTokenFromAddressMock = vi.fn(async () => undefined);
const setTokenToAddressMock = vi.fn(async () => undefined);
const parseCurrentRouteMock = vi.fn();
const updateRouteAfterSelectTokensMock = vi.fn();

const createStub = (name: string) =>
  defineComponent({
    name,
    setup() {
      return () => h('div', { class: `${name}-stub` });
    },
  });

vi.mock('@/router', () => ({
  lazyComponent: () => createStub('LazySwapViewStub'),
}));

vi.mock('@/components/shared/Widget/Grid.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'WidgetsGridStub',
    props: {
      gridId: {
        type: String,
        default: undefined,
      },
      value: {
        type: Object,
        default: undefined,
      },
      modelValue: {
        type: Object,
        default: undefined,
      },
      defaultLayouts: {
        type: Object,
        default: undefined,
      },
      autoResize: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['input', 'update:modelValue'],
    setup(props) {
      watch(
        () => (props.modelValue ?? props.value) as Record<string, boolean> | undefined,
        (value) => capturedGridValues.push(value),
        { immediate: true, deep: true }
      );
      watch(
        () => props.gridId as string | undefined,
        (value) => capturedGridIds.push(value),
        { immediate: true }
      );
      watch(
        () => props.defaultLayouts as Record<string, Array<Record<string, unknown>>> | undefined,
        (value) => capturedDefaultLayouts.push(value),
        { immediate: true, deep: true }
      );
      watch(
        () => props.autoResize as boolean,
        (value) => capturedGridAutoResize.push(value),
        { immediate: true }
      );

      return () => h('div', { class: 'widgets-grid-stub' });
    },
  }),
}));

vi.mock('@/features/swap/components/widgets/Form.vue', () => ({
  __esModule: true,
  default: createStub('SwapFormWidgetStub'),
}));
vi.mock('@/components/shared/Widget/PriceChart.vue', () => ({
  __esModule: true,
  default: createStub('PriceChartWidgetStub'),
}));
vi.mock('@/features/swap/components/widgets/Distribution.vue', () => ({
  __esModule: true,
  default: createStub('SwapDistributionWidgetStub'),
}));
vi.mock('@/features/swap/components/widgets/TransactionDetails.vue', () => ({
  __esModule: true,
  default: createStub('SwapTransactionDetailsWidgetStub'),
}));
vi.mock('@/features/swap/components/widgets/Transactions.vue', () => ({
  __esModule: true,
  default: createStub('SwapTransactionsWidgetStub'),
}));
vi.mock('@/components/shared/Widget/Customise.vue', () => ({
  __esModule: true,
  default: createStub('CustomiseWidgetStub'),
}));
vi.mock('@/components/shared/Widget/TokenPriceChart.vue', () => ({
  __esModule: true,
  default: createStub('TokenPriceChartWidgetStub'),
}));
vi.mock('@/components/shared/Widget/SupplyChart.vue', () => ({
  __esModule: true,
  default: createStub('SupplyChartWidgetStub'),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
    withApi: async (cb: () => Promise<void> | void) => {
      await cb();
    },
  }),
}));

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: () => undefined,
}));

vi.mock('@/features/swap/stores/useSwapStore', () => ({
  useSwapStore: () => ({
    isAvailable: true,
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: (address?: string) => (address ? (routeAssetLookupRef.value[address] ?? null) : null),
  }),
}));

vi.mock('@/features/swap/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => ({
    tokenFrom: computed(() => tokenFromRef.value),
    tokenTo: computed(() => tokenToRef.value),
    setTokenFromAddress: (...args: unknown[]) => setTokenFromAddressMock(...args),
    setTokenToAddress: (...args: unknown[]) => setTokenToAddressMock(...args),
  }),
}));

vi.mock('@/shared/navigation/useSelectedTokensRoute', () => ({
  useSelectedTokensRoute: (
    callback: (params: { firstAddress: string; secondAddress: string }) => Promise<void> | void
  ) => {
    capturedRouteCallbacks.push(callback);
    return {
      firstRouteAddress: firstRouteAddressRef,
      secondRouteAddress: secondRouteAddressRef,
      isValidRoute: isValidRouteRef,
      parseCurrentRoute: (...args: unknown[]) => parseCurrentRouteMock(...args),
      updateRouteAfterSelectTokens: (...args: unknown[]) => updateRouteAfterSelectTokensMock(...args),
    };
  },
}));

let SwapView: typeof import('@/features/swap/pages/SwapPage.vue').default;
const mountedWrappers: VueWrapper[] = [];

const mountSwapView = async () => {
  const wrapper = mount(SwapView);
  mountedWrappers.push(wrapper);
  await flushPromises();
  return wrapper;
};

beforeAll(async () => {
  SwapView = (await import('@/features/swap/pages/SwapPage.vue')).default;
});

beforeEach(() => {
  capturedGridValues.length = 0;
  capturedGridIds.length = 0;
  capturedDefaultLayouts.length = 0;
  capturedGridAutoResize.length = 0;
  capturedRouteCallbacks.length = 0;
  setTokenFromAddressMock.mockClear();
  setTokenToAddressMock.mockClear();
  parseCurrentRouteMock.mockClear();
  updateRouteAfterSelectTokensMock.mockClear();

  tokenFromRef.value = { symbol: 'XOR', address: 'xor-address' };
  tokenToRef.value = null;
  firstRouteAddressRef.value = '';
  secondRouteAddressRef.value = '';
  isValidRouteRef.value = false;
  routeAssetLookupRef.value = {};
  window.history.replaceState({}, '', window.location.href);
});

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('Swap view widget model binding', () => {
  it('uses the versioned swap grid storage key', async () => {
    await mountSwapView();

    expect(capturedGridIds.filter(Boolean).at(-1)).toBe('swapGrid:v2');
    expect(capturedGridAutoResize.at(-1)).toBe(true);
  });

  it('passes the default widget visibility model to WidgetsGrid', async () => {
    await mountSwapView();

    const firstModel = capturedGridValues.find(Boolean);
    expect(firstModel).toMatchObject({
      swapChart: true,
      swapDistribution: true,
      swapTransactionDetails: false,
      swapTransactions: false,
      swapTokenPriceChart: false,
      swapSupplyChart: false,
    });
  });

  it('keeps default widget order and customise constraints for desktop and tablet breakpoints', async () => {
    await mountSwapView();

    const layouts = capturedDefaultLayouts.filter(Boolean).at(-1);
    expect(layouts).toBeTruthy();

    const lg = layouts?.lg ?? [];
    const lgForm = lg.find((widget) => widget.i === 'swapForm');
    const lgCustomise = lg.find((widget) => widget.i === 'customise');
    expect(lgForm?.y).toBe(0);
    expect(lgCustomise?.y).toBe(20);
    expect(lgCustomise?.h).toBe(3);
    expect(lgCustomise?.maxH).toBe(3);

    const xs = layouts?.xs ?? [];
    const xsForm = xs.find((widget) => widget.i === 'swapForm');
    const xsCustomise = xs.find((widget) => widget.i === 'customise');
    expect(xsCustomise?.y).toBe(0);
    expect(xsCustomise?.h).toBe(3);
    expect(xsCustomise?.maxH).toBe(3);
    expect(xsForm?.y).toBe(4);
  });

  it('defaults the swap route to XOR when no pair is selected', async () => {
    tokenFromRef.value = null;
    tokenToRef.value = null;

    await mountSwapView();

    expect(parseCurrentRouteMock).toHaveBeenCalledTimes(1);
    expect(setTokenFromAddressMock).toHaveBeenCalledWith('xor');
    expect(setTokenToAddressMock).toHaveBeenCalledWith('');
  });

  it('hydrates both tokens from a valid route pair', async () => {
    tokenFromRef.value = null;
    tokenToRef.value = null;
    firstRouteAddressRef.value = '0xFrom';
    secondRouteAddressRef.value = '0xTo';
    isValidRouteRef.value = true;
    routeAssetLookupRef.value = {
      '0xFrom': { symbol: 'FROM', address: '0xFrom' },
      '0xTo': { symbol: 'TO', address: '0xTo' },
    };

    await mountSwapView();

    expect(setTokenFromAddressMock).toHaveBeenCalledWith('0xFrom');
    expect(setTokenToAddressMock).toHaveBeenCalledWith('0xTo');
  });

  it('hydrates both tokens when a valid route pair resolves after mount', async () => {
    await mountSwapView();

    firstRouteAddressRef.value = '0xFrom';
    secondRouteAddressRef.value = '0xTo';
    isValidRouteRef.value = true;
    routeAssetLookupRef.value = {
      '0xFrom': { symbol: 'FROM', address: '0xFrom' },
      '0xTo': { symbol: 'TO', address: '0xTo' },
    };

    await flushPromises();

    expect(setTokenFromAddressMock).toHaveBeenCalledWith('0xFrom');
    expect(setTokenToAddressMock).toHaveBeenCalledWith('0xTo');
  });

  it('rehydrates a valid route pair when asset metadata arrives after the first parse', async () => {
    tokenFromRef.value = null;
    tokenToRef.value = null;
    firstRouteAddressRef.value = '0xFrom';
    secondRouteAddressRef.value = '0xTo';
    isValidRouteRef.value = true;

    await mountSwapView();

    setTokenFromAddressMock.mockClear();
    setTokenToAddressMock.mockClear();

    routeAssetLookupRef.value = {
      '0xFrom': { symbol: 'FROM', address: '0xFrom' },
      '0xTo': { symbol: 'TO', address: '0xTo' },
    };

    await flushPromises();

    expect(setTokenFromAddressMock).toHaveBeenCalledWith('0xFrom');
    expect(setTokenToAddressMock).toHaveBeenCalledWith('0xTo');
  });

  it('writes the selected swap pair back to the route when the page owns the navigation context', async () => {
    tokenFromRef.value = { symbol: 'XOR', address: 'xor-address' };
    tokenToRef.value = { symbol: 'VAL', address: 'val-address' };

    await mountSwapView();

    expect(updateRouteAfterSelectTokensMock).toHaveBeenCalledWith(tokenFromRef.value, tokenToRef.value);
  });

  it('keeps the order book handoff route untouched when history indicates a trade page origin', async () => {
    tokenFromRef.value = { symbol: 'XOR', address: 'xor-address' };
    tokenToRef.value = { symbol: 'VAL', address: 'val-address' };
    window.history.replaceState({ back: '/trade/XOR/VAL' }, '', window.location.href);

    await mountSwapView();

    expect(updateRouteAfterSelectTokensMock).not.toHaveBeenCalled();
  });
});
