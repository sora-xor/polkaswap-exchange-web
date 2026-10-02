import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref, watch } from 'vue';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VueWrapper } from '@vue/test-utils';

const capturedGridValues: Array<Record<string, boolean> | undefined> = [];
const capturedGridIds: Array<string | undefined> = [];
const capturedDefaultLayouts: Array<Record<string, Array<Record<string, unknown>>> | undefined> = [];
const capturedGridAutoResize: Array<boolean> = [];
const windowWidthRef = ref(1440);
const resetGridMock = vi.fn();
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
      draggable: Boolean,
      resizable: Boolean,
      persistOnlyUserEdits: Boolean,
      migrateStoredLayouts: Function,
      breakpoints: Object,
    },
    emits: ['input', 'update:modelValue'],
    setup(props, { slots }) {
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

      return () =>
        h('div', { class: 'widgets-grid-stub' }, [
          slots.swapForm?.({ reset: resetGridMock }),
          props.modelValue?.swapChart ? slots.swapChart?.({}) : null,
        ]);
    },
  }),
}));

vi.mock('@/features/swap/components/widgets/Form.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'SwapFormWidgetStub',
    setup(_, { slots }) {
      return () => h('div', { class: 'swap-form-stub' }, slots['header-actions']?.());
    },
  }),
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
  default: defineComponent({
    name: 'CustomiseWidgetStub',
    props: { options: Object, compact: Boolean, widgets: Object },
    setup(_, { slots }) {
      return () => h('div', { class: 'customise-widget-stub' }, slots.default?.());
    },
  }),
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

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get windowWidth() {
      return windowWidthRef.value;
    },
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
  const wrapper = mount(SwapView, {
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  });
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
  windowWidthRef.value = 1440;
  resetGridMock.mockClear();
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
  it('keeps the swap controls visible without duplicating the shared Buy XOR entry', async () => {
    const wrapper = await mountSwapView();
    expect(wrapper.find('[data-test-name="swapBuyXor"]').exists()).toBe(false);
    expect(wrapper.get('.swap-form-stub').isVisible()).toBe(true);
    expect(wrapper.get('.customise-widget-stub').isVisible()).toBe(true);
  });

  it('uses the versioned swap grid storage key', async () => {
    await mountSwapView();

    expect(capturedGridIds.filter(Boolean).at(-1)).toBe('swapGrid:v3');
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

  it('keeps equal desktop columns and a form-first mobile layout with no Customize row', async () => {
    await mountSwapView();

    const layouts = capturedDefaultLayouts.filter(Boolean).at(-1);
    expect(layouts).toBeTruthy();

    const lg = layouts?.lg ?? [];
    const lgForm = lg.find((widget) => widget.i === 'swapForm');
    const lgChart = lg.find((widget) => widget.i === 'swapChart');
    const lgCustomise = lg.find((widget) => widget.i === 'customise');
    expect(lgForm).toMatchObject({ x: 4, w: 8 });
    expect(lgChart).toMatchObject({ x: 12, w: 8 });
    expect(lgForm?.y).toBe(0);
    expect(lgCustomise).toBeUndefined();

    const sm = layouts?.sm ?? [];
    const smForm = sm.find((widget) => widget.i === 'swapForm');
    const smChart = sm.find((widget) => widget.i === 'swapChart');
    expect(smForm).toMatchObject({ x: 0, w: 6 });
    expect(smChart).toMatchObject({ x: 6, w: 6 });

    const xs = layouts?.xs ?? [];
    const xsForm = xs.find((widget) => widget.i === 'swapForm');
    const xsCustomise = xs.find((widget) => widget.i === 'customise');
    expect(xsCustomise).toBeUndefined();
    expect(xsForm).toMatchObject({ y: 0, x: 0, w: 8 });
  });

  it('places compact Customize inside the swap form header', async () => {
    const wrapper = await mountSwapView();
    const customize = wrapper.getComponent({ name: 'CustomiseWidgetStub' });
    expect(customize.props('compact')).toBe(true);
    expect(wrapper.get('.swap-form-stub').find('.customise-widget-stub').exists()).toBe(true);
    const grid = wrapper.getComponent({ name: 'WidgetsGridStub' });
    expect(grid.props('persistOnlyUserEdits')).toBe(true);
    expect(grid.props('migrateStoredLayouts')).toBeTypeOf('function');
  });

  it.each([1025, 1200])(
    'uses a desktop layout at a %ipx viewport even with a narrower grid container',
    async (width) => {
      windowWidthRef.value = width;
      const wrapper = await mountSwapView();
      const grid = wrapper.getComponent({ name: 'WidgetsGridStub' });
      expect(grid.props('breakpoints')).toMatchObject({ sm: 1, xs: 0 });
      expect(wrapper.find('details').exists()).toBe(false);
      expect(grid.props('autoResize')).toBe(true);
    }
  );

  it('collapses chart body at 1024px and expands without changing saved chart visibility', async () => {
    windowWidthRef.value = 1024;
    const wrapper = await mountSwapView();
    const grid = wrapper.getComponent({ name: 'WidgetsGridStub' });
    const details = wrapper.get('details');
    expect(details.element.open).toBe(false);
    expect(wrapper.findComponent({ name: 'PriceChartWidgetStub' }).exists()).toBe(false);
    expect(grid.props()).toMatchObject({ autoResize: false, draggable: false, resizable: false });

    details.element.open = true;
    await details.trigger('toggle');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'PriceChartWidgetStub' }).exists()).toBe(true);
    expect(capturedGridValues.at(-1)?.swapChart).toBe(true);

    windowWidthRef.value = 1025;
    await flushPromises();
    expect(wrapper.find('details').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'PriceChartWidgetStub' }).exists()).toBe(true);
    expect(grid.props('autoResize')).toBe(true);
  });

  it('keeps a hidden chart absent on both sides of the viewport breakpoint', async () => {
    const wrapper = await mountSwapView();
    const grid = wrapper.getComponent({ name: 'WidgetsGridStub' });
    grid.vm.$emit('update:modelValue', { ...grid.props('modelValue'), swapChart: false });
    windowWidthRef.value = 768;
    await flushPromises();
    expect(wrapper.find('details').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'PriceChartWidgetStub' }).exists()).toBe(false);
    windowWidthRef.value = 1440;
    await flushPromises();
    expect(wrapper.findComponent({ name: 'PriceChartWidgetStub' }).exists()).toBe(false);
    grid.vm.$emit('update:modelValue', { ...grid.props('modelValue'), swapChart: true });
  });

  it('resets grid preferences and closes the mobile chart disclosure', async () => {
    windowWidthRef.value = 768;
    const wrapper = await mountSwapView();
    const details = wrapper.get('details');
    details.element.open = true;
    await details.trigger('toggle');
    await wrapper.get('.customise-widget-stub button').trigger('click');
    await flushPromises();
    expect(resetGridMock).toHaveBeenCalledOnce();
    expect(wrapper.get('details').element.open).toBe(false);
  });

  it('clears transient disclosure and model state after leaving the page', async () => {
    windowWidthRef.value = 768;
    const wrapper = await mountSwapView();
    const details = wrapper.get('details');
    details.element.open = true;
    await details.trigger('toggle');
    const grid = wrapper.getComponent({ name: 'WidgetsGridStub' });
    grid.vm.$emit('update:modelValue', { ...grid.props('modelValue'), swapChart: false });
    wrapper.unmount();
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1);

    const reopened = await mountSwapView();
    expect(reopened.get('details').element.open).toBe(false);
    expect(reopened.getComponent({ name: 'WidgetsGridStub' }).props('modelValue').swapChart).toBe(true);
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
