import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref, watch } from 'vue';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const capturedGridValues: Array<Record<string, boolean> | undefined> = [];
const capturedGridIds: Array<string | undefined> = [];
const capturedDefaultLayouts: Array<Record<string, Array<Record<string, unknown>>> | undefined> = [];
const capturedRouteCallbacks: Array<(params: { firstAddress: string; secondAddress: string }) => Promise<void> | void> =
  [];

const tokenFromRef = ref<{ symbol: string; address: string } | null>({ symbol: 'XOR', address: 'xor-address' });
const tokenToRef = ref<{ symbol: string; address: string } | null>(null);

const setTokenFromAddressMock = vi.fn(async () => undefined);
const setTokenToAddressMock = vi.fn(async () => undefined);
const parseCurrentRouteMock = vi.fn();
const updateRouteAfterSelectTokensMock = vi.fn();

vi.mock('@/router', () => ({
  lazyComponent: (componentPath: string) => {
    if (componentPath === 'shared/Widget/Grid') {
      return defineComponent({
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

          return () => h('div', { class: 'widgets-grid-stub' });
        },
      });
    }

    return defineComponent({
      name: 'LazySwapViewStub',
      setup() {
        return () => h('div');
      },
    });
  },
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

vi.mock('@/stores/swap', () => ({
  useSwapStore: () => ({
    isAvailable: true,
  }),
}));

vi.mock('@/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => ({
    tokenFrom: computed(() => tokenFromRef.value),
    tokenTo: computed(() => tokenToRef.value),
    setTokenFromAddress: (...args: unknown[]) => setTokenFromAddressMock(...args),
    setTokenToAddress: (...args: unknown[]) => setTokenToAddressMock(...args),
  }),
}));

vi.mock('@/composables/useSelectedTokensRoute', () => ({
  useSelectedTokensRoute: (
    callback: (params: { firstAddress: string; secondAddress: string }) => Promise<void> | void
  ) => {
    capturedRouteCallbacks.push(callback);
    return {
      firstRouteAddress: ref(''),
      secondRouteAddress: ref(''),
      isValidRoute: ref(false),
      parseCurrentRoute: (...args: unknown[]) => parseCurrentRouteMock(...args),
      updateRouteAfterSelectTokens: (...args: unknown[]) => updateRouteAfterSelectTokensMock(...args),
    };
  },
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      router: {
        prev: null,
      },
    },
  },
}));

let SwapView: typeof import('@/views/Swap.vue').default;

beforeAll(async () => {
  SwapView = (await import('@/views/Swap.vue')).default;
});

beforeEach(() => {
  capturedGridValues.length = 0;
  capturedGridIds.length = 0;
  capturedDefaultLayouts.length = 0;
  capturedRouteCallbacks.length = 0;
  setTokenFromAddressMock.mockClear();
  setTokenToAddressMock.mockClear();
  parseCurrentRouteMock.mockClear();
  updateRouteAfterSelectTokensMock.mockClear();

  tokenFromRef.value = { symbol: 'XOR', address: 'xor-address' };
  tokenToRef.value = null;
});

describe('Swap view widget model binding', () => {
  it('uses the versioned swap grid storage key', async () => {
    mount(SwapView);
    await flushPromises();

    expect(capturedGridIds.filter(Boolean).at(-1)).toBe('swapGrid:v2');
  });

  it('passes the default widget visibility model to WidgetsGrid', async () => {
    mount(SwapView);
    await flushPromises();

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
    mount(SwapView);
    await flushPromises();

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
});
