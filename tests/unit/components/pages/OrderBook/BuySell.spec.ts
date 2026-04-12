import { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { OrderBookStats } from '@/types/orderBook';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, reactive, ref } from 'vue';

import { LimitOrderType } from '@/consts';

const storeRef = vi.hoisted(() => ({ value: null as any }));
let walletRestore: (() => void) | null = null;

const swapStore = vi.hoisted(() => ({
  setLiquiditySource: vi.fn(),
  selectDexId: vi.fn(),
}));

vi.mock('@/stores/swap', () => ({
  useSwapStore: () => swapStore,
}));

const routerStoreStub = vi.hoisted(() => ({
  prev: null as string | null,
  navigate: vi.fn(),
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStoreStub,
}));

const assetsStoreStub = vi.hoisted(() => ({
  xor: { symbol: 'XOR', balance: { transferable: '0' } } as AccountAsset,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreStub,
}));

const settingsStoreStub = vi.hoisted(() => ({
  networkFees: {
    OrderBookPlaceLimitOrder: '1',
  } as Record<string, string>,
  slippageTolerance: '0.01',
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreStub,
}));

const walletStoreStub = vi.hoisted(() => ({
  currencySymbol: '$',
  exchangeRate: 1,
  currency: null,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreStub,
}));

const swapInternals: Record<string, any> = {};

vi.mock('@/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => swapInternals,
}));

const resetSwapState = () => {
  const tokenFrom = ref<AccountAsset | null>(null);
  const tokenTo = ref<AccountAsset | null>(null);
  const fromValue = ref('');
  const toValue = ref('');

  swapInternals.tokenFrom = tokenFrom;
  swapInternals.tokenTo = tokenTo;
  swapInternals.fromValue = fromValue;
  swapInternals.toValue = toValue;
  swapInternals.areTokensSelected = computed(() => Boolean(tokenFrom.value && tokenTo.value));
  swapInternals.setTokenFromAddress = vi.fn((address: string) => {
    tokenFrom.value = address ? ({ address, symbol: address.toUpperCase(), decimals: 18 } as AccountAsset) : null;
  });
  swapInternals.setTokenToAddress = vi.fn((address: string) => {
    tokenTo.value = address ? ({ address, symbol: address.toUpperCase(), decimals: 18 } as AccountAsset) : null;
  });
  swapInternals.setFromValue = vi.fn((value: string) => {
    fromValue.value = value;
  });
  swapInternals.setToValue = vi.fn((value: string) => {
    toValue.value = value;
  });
};

const internalConnect: Record<string, any> = {};

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => internalConnect,
}));

const resetInternalConnect = () => {
  internalConnect.isLoggedIn = ref(false);
  internalConnect.connectSoraWallet = vi.fn();
};

const confirmDialog: Record<string, any> = {};

vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirmDialogVisible: confirmDialog.confirmDialogVisible,
    confirmOrExecute: confirmDialog.confirmOrExecute,
    closeConfirmDialog: confirmDialog.closeConfirmDialog,
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

const walletModulePromise = import('@wallet');

const resetConfirmDialog = () => {
  confirmDialog.state = { handler: undefined as undefined | (() => Promise<void> | void) };
  confirmDialog.confirmDialogVisible = ref(false);
  confirmDialog.confirmOrExecute = vi.fn((handler: () => Promise<void> | void) => {
    confirmDialog.state.handler = handler;
    confirmDialog.confirmDialogVisible.value = true;
  });
  confirmDialog.closeConfirmDialog = vi.fn(() => {
    confirmDialog.confirmDialogVisible.value = false;
  });
};

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumber: (value: string) => new FPNumber(value || '0'),
    getFPNumberFromCodec: (value: string) => new FPNumber(value || '0'),
    formatCodecNumber: (value: string) => value,
    formatStringValue: (value: string) => value,
    getStringFromCodec: (value: string) => value,
  }),
}));

const transaction: Record<string, any> = {};

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => transaction,
}));

const resetTransaction = () => {
  transaction.withNotifications = vi.fn(async (handler: () => Promise<void> | void) => {
    await handler();
  });
};

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    baseAsset: computed(() => storeRef.value?.getters?.orderBook?.baseAsset ?? null),
    quoteAsset: computed(() => storeRef.value?.getters?.orderBook?.quoteAsset ?? null),
    asks: computed(() => storeRef.value?.state?.orderBook?.asks ?? []),
    bids: computed(() => storeRef.value?.state?.orderBook?.bids ?? []),
    dexId: computed(() => storeRef.value?.state?.orderBook?.dexId ?? 0),
    baseValue: computed({
      get: () => storeRef.value?.state?.orderBook?.baseValue ?? '',
      set: (value: string) => {
        storeRef.value?.commit?.orderBook?.setBaseValue?.(value);
      },
    }),
    quoteValue: computed({
      get: () => storeRef.value?.state?.orderBook?.quoteValue ?? '',
      set: (value: string) => {
        storeRef.value?.commit?.orderBook?.setQuoteValue?.(value);
      },
    }),
    limitOrderType: computed({
      get: () => storeRef.value?.state?.orderBook?.limitOrderType ?? LimitOrderType.limit,
      set: (value: LimitOrderType) => {
        storeRef.value?.commit?.orderBook?.setLimitOrderType?.(value);
      },
    }),
    side: computed({
      get: () => storeRef.value?.state?.orderBook?.side ?? PriceVariant.Buy,
      set: (value: PriceVariant) => {
        storeRef.value?.commit?.orderBook?.setSide?.(value);
      },
    }),
    amountSliderValue: computed({
      get: () => storeRef.value?.state?.orderBook?.amountSliderValue ?? 0,
      set: (value: number) => {
        storeRef.value?.commit?.orderBook?.setAmountSliderValue?.(value);
      },
    }),
    baseAssetAddress: computed(() => storeRef.value?.state?.orderBook?.baseAssetAddress ?? null),
    currentOrderBook: computed(() => storeRef.value?.getters?.orderBook?.currentOrderBook ?? null),
    orderBookStats: computed(() => storeRef.value?.getters?.orderBook?.orderBookStats ?? null),
  }),
}));

vi.mock('@/composables/useOrderBookManagement', () => ({
  useOrderBookManagement: () => ({
    updateBalanceSubscription: async (reset = false) => {
      await storeRef.value?.dispatch?.orderBook?.updateBalanceSubscription?.(reset);
    },
    updateOrderBooksStats: async () => {
      await storeRef.value?.dispatch?.orderBook?.updateOrderBooksStats?.();
    },
  }),
}));

vi.mock('@/composables/useOrderBookUserOrders', () => ({
  useOrderBookUserOrders: () => ({
    userLimitOrders: computed(() => storeRef.value?.state?.orderBook?.userLimitOrders ?? []),
  }),
}));

const utils: Record<string, any> = {};

vi.mock('@/utils', () => utils);

const resetUtils = () => {
  utils.asZeroValue = vi.fn((value: string) => value === '' || value === '0');
  utils.delay = vi.fn(async () => undefined);
  utils.getAssetBalance = vi.fn(() => '100');
  utils.getMaxValue = vi.fn(() => '100');
  utils.hasInsufficientBalance = vi.fn(() => false);
  utils.hasInsufficientXorForFee = vi.fn(() => false);
  utils.isMaxButtonAvailable = vi.fn(() => true);
};

vi.mock('@/utils/orderBook', () => ({
  getBookDecimals: () => 2,
  MAX_ORDERS_PER_SIDE: 3,
  MAX_ORDERS_PER_USER: 3,
}));

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          class: ['s-button-stub', props.disabled ? 'is-disabled' : ''],
          disabled: props.disabled,
          onClick: () => {
            if (!props.disabled) {
              emit('click');
            }
          },
        },
        slots.default?.()
      );
  },
});

const STabsStub = defineComponent({
  name: 'STabsStub',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'input', 'click'],
  setup(_props, { slots }) {
    return () => h('div', { class: 's-tabs-stub' }, slots.default?.());
  },
});

const STabStub = defineComponent({
  name: 'STabStub',
  setup(_, { slots }) {
    return () => h('div', { class: 's-tab-stub' }, [slots.label?.(), slots.default?.()]);
  },
});

const STooltipStub = defineComponent({
  name: 'STooltipStub',
  setup(_, { slots }) {
    return () => h('span', { class: 's-tooltip-stub' }, slots.default?.());
  },
});

const SIconStub = defineComponent({
  name: 'SIconStub',
  setup() {
    return () => h('span', { class: 's-icon-stub' });
  },
});

const SPopoverPanelStub = defineComponent({
  name: 'SPopoverPanelStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'el-popover-stub' }, [slots.reference?.(), slots.default?.()]);
  },
});

const globalStubs = {
  's-button': SButtonStub,
  's-tabs': STabsStub,
  's-tab': STabStub,
  's-tooltip': STooltipStub,
  's-icon': SIconStub,
  's-popover-panel': SPopoverPanelStub,
};

type StoreOverrides = {
  orderBook?: Partial<{
    asks: OrderBookPriceVolume[];
    bids: OrderBookPriceVolume[];
    baseAssetAddress: string;
    amountSliderValue: number;
    userLimitOrders: LimitOrder[];
    dexId: number;
    limitOrderType: LimitOrderType;
    baseValue: string;
    quoteValue: string;
    side: PriceVariant;
  }>;
  currentOrderBook?: Partial<OrderBook>;
  orderBookStats?: Partial<OrderBookStats>;
  networkFee?: string;
  slippageTolerance?: string;
  prevRoute?: string | null;
  baseAsset?: AccountAsset;
  quoteAsset?: AccountAsset;
  xorAsset?: AccountAsset;
};

const withDecimals = (value: FPNumber, decimals: number) => {
  (value as unknown as { decimals: number }).decimals = decimals;
  return value;
};

const createStoreMock = (overrides: StoreOverrides = {}) => {
  const defaultAsk = [FPNumber.fromNatural(2), FPNumber.fromNatural(1)] as unknown as OrderBookPriceVolume;
  const defaultBid = [FPNumber.fromNatural(1), FPNumber.fromNatural(1)] as unknown as OrderBookPriceVolume;

  const orderBookState = reactive({
    asks: overrides.orderBook?.asks ?? [defaultAsk],
    bids: overrides.orderBook?.bids ?? [defaultBid],
    baseAssetAddress: overrides.orderBook?.baseAssetAddress ?? 'base',
    amountSliderValue: overrides.orderBook?.amountSliderValue ?? 0,
    userLimitOrders: overrides.orderBook?.userLimitOrders ?? [],
    dexId: overrides.orderBook?.dexId ?? 0,
    limitOrderType: overrides.orderBook?.limitOrderType ?? LimitOrderType.limit,
    baseValue: overrides.orderBook?.baseValue ?? '',
    quoteValue: overrides.orderBook?.quoteValue ?? '',
    side: overrides.orderBook?.side ?? PriceVariant.Buy,
  });

  const baseAsset = overrides.baseAsset ?? ({ address: 'base', symbol: 'BASE', decimals: 18 } as AccountAsset);
  const quoteAsset = overrides.quoteAsset ?? ({ address: 'quote', symbol: 'QUOTE', decimals: 18 } as AccountAsset);

  const maxLotSize = overrides.currentOrderBook?.maxLotSize ?? FPNumber.fromNatural(100);
  const minLotSize = overrides.currentOrderBook?.minLotSize ?? FPNumber.fromNatural(1);
  const stepLotSize = overrides.currentOrderBook?.stepLotSize ?? withDecimals(FPNumber.fromNatural(1), 2);
  const tickSize = overrides.currentOrderBook?.tickSize ?? withDecimals(FPNumber.fromNatural(1), 2);
  const currentOrderBook = {
    status: overrides.currentOrderBook?.status ?? OrderBookStatus.Trade,
    maxLotSize,
    minLotSize,
    stepLotSize,
    tickSize,
  } as unknown as OrderBook;

  const orderBookStats =
    overrides.orderBookStats ??
    ({
      price: FPNumber.fromNatural(10),
      priceChange: FPNumber.fromNatural(1),
      volume: FPNumber.fromNatural(100),
    } as OrderBookStats);

  const store = {
    state: {
      router: { prev: overrides.prevRoute ?? null },
      wallet: {
        settings: {
          networkFees: {
            [Operation.OrderBookPlaceLimitOrder]: overrides.networkFee ?? '1',
          } as Record<string, string>,
        },
      },
      settings: {
        slippageTolerance: overrides.slippageTolerance ?? '0.01',
      },
      orderBook: orderBookState,
    },
    getters: {
      assets: {
        xor: overrides.xorAsset ?? ({ address: 'xor', symbol: 'XOR', decimals: 18 } as AccountAsset),
      },
      orderBook: {
        baseAsset,
        quoteAsset,
        currentOrderBook,
        orderBookStats,
      },
    },
    commit: {
      orderBook: {
        setAmountSliderValue: vi.fn((value: number) => {
          orderBookState.amountSliderValue = value;
        }),
        setLimitOrderType: vi.fn((value: LimitOrderType) => {
          orderBookState.limitOrderType = value;
        }),
        setBaseValue: vi.fn((value: string) => {
          orderBookState.baseValue = value;
        }),
        setQuoteValue: vi.fn((value: string) => {
          orderBookState.quoteValue = value;
        }),
        setSide: vi.fn((value: PriceVariant) => {
          orderBookState.side = value;
        }),
      },
    },
    dispatch: {
      orderBook: {
        updateBalanceSubscription: vi.fn(),
        updateOrderBooksStats: vi.fn(),
      },
    },
  };

  return { store, orderBookState };
};

const patchWalletModule = async () => {
  const walletModule = await walletModulePromise;

  const original = {
    placeLimitOrder: walletModule.api?.orderBook?.placeLimitOrder,
    isOrderPlaceable: walletModule.api?.orderBook?.isOrderPlaceable,
    execute: walletModule.api?.swap?.execute,
    getSwapQuoteObservable: walletModule.api?.swap?.getSwapQuoteObservable,
  };

  if (!walletModule.api.orderBook) {
    walletModule.api.orderBook = {} as any;
  }

  const unsubscribe = vi.fn();
  const walletMocks = {
    placeLimitOrder: vi.fn(async () => undefined),
    isOrderPlaceable: vi.fn(async () => true),
    execute: vi.fn(async () => undefined),
    getSwapQuoteObservable: vi.fn(() => ({
      subscribe: (callback: (...args: unknown[]) => void) => {
        callback({
          quote: () => ({
            result: { amount: '1' },
          }),
        });
        return { unsubscribe };
      },
    })),
  };

  walletModule.api.orderBook.placeLimitOrder = walletMocks.placeLimitOrder;
  walletModule.api.orderBook.isOrderPlaceable = walletMocks.isOrderPlaceable;
  walletModule.api.swap.execute = walletMocks.execute;
  walletModule.api.swap.getSwapQuoteObservable = walletMocks.getSwapQuoteObservable;

  const restore = () => {
    if (original.placeLimitOrder) {
      walletModule.api.orderBook.placeLimitOrder = original.placeLimitOrder;
    }
    if (original.isOrderPlaceable) {
      walletModule.api.orderBook.isOrderPlaceable = original.isOrderPlaceable;
    }
    if (original.execute) {
      walletModule.api.swap.execute = original.execute;
    }
    if (original.getSwapQuoteObservable) {
      walletModule.api.swap.getSwapQuoteObservable = original.getSwapQuoteObservable;
    }
  };

  return { walletMocks, restore };
};

let buySellModulePromise: Promise<typeof import('@/components/pages/OrderBook/BuySell.vue')> | null = null;

const loadBuySellModule = async () => {
  if (!buySellModulePromise) {
    buySellModulePromise = import('@/components/pages/OrderBook/BuySell.vue');
  }
  return buySellModulePromise;
};

const mountComponent = async (overrides: StoreOverrides = {}) => {
  const { store, orderBookState } = createStoreMock(overrides);
  storeRef.value = store;
  const { walletMocks, restore } = await patchWalletModule();
  const module = await loadBuySellModule();
  walletRestore = restore;
  const wrapper = mount(module.default, {
    global: {
      stubs: globalStubs,
    },
  });
  await flushPromises();
  return { wrapper, walletMocks, orderBookState };
};

beforeEach(() => {
  setActivePinia(createPinia());
  resetSwapState();
  resetInternalConnect();
  resetConfirmDialog();
  resetTransaction();
  resetUtils();
  swapStore.setLiquiditySource.mockClear();
  swapStore.selectDexId.mockClear();
});

afterEach(() => {
  walletRestore?.();
  walletRestore = null;
  storeRef.value = null;
});

describe('BuySell.vue', () => {
  it('renders pair chooser and action button inside popover reference slots', async () => {
    const { wrapper } = await mountComponent();

    expect(wrapper.find('.order-book-choose-pair').exists()).toBe(true);
    expect(wrapper.find('.s-button-stub').exists()).toBe(true);
  });

  it('renders disabled action prompting to set price when limit order lacks a quote value', async () => {
    internalConnect.isLoggedIn.value = true;
    const { wrapper } = await mountComponent({
      orderBook: {
        baseValue: '0',
        quoteValue: '',
      },
    });

    const disabledButton = wrapper.find('button[disabled]');
    expect(disabledButton.exists()).toBe(true);
    expect(disabledButton.text()).toBe('orderBook.setPrice');
    expect(confirmDialog.confirmOrExecute).not.toHaveBeenCalled();
    const walletModuleDisabled = await import('@wallet');
    expect((walletModuleDisabled.api.orderBook.placeLimitOrder as any).mock.calls).toHaveLength(0);
  });

  it('renders a disabled stopped-book button when trading is unavailable', async () => {
    internalConnect.isLoggedIn.value = true;
    const { wrapper } = await mountComponent({
      currentOrderBook: {
        status: OrderBookStatus.Stop,
      },
      orderBook: {
        baseValue: '1',
        quoteValue: '1',
      },
    });

    const disabledButton = wrapper.find('button[disabled]');
    expect(disabledButton.exists()).toBe(true);
    expect(disabledButton.text()).toBe('orderBook.stop');
    expect(confirmDialog.confirmOrExecute).not.toHaveBeenCalled();
  });

  it('executes place limit order when inputs are valid and confirmation is accepted', async () => {
    internalConnect.isLoggedIn.value = true;
    const { wrapper, orderBookState } = await mountComponent();

    storeRef.value.commit.orderBook.setBaseValue('1');
    storeRef.value.commit.orderBook.setQuoteValue('1');
    await flushPromises();

    expect(orderBookState.baseValue).toBe('1');
    expect(orderBookState.quoteValue).toBe('1');

    const walletModule = await import('@wallet');
    expect(typeof walletModule.api.orderBook.placeLimitOrder).toBe('function');
    expect(typeof walletModule.api.orderBook.isOrderPlaceable).toBe('function');

    expect(orderBookState.limitOrderType).toBe(LimitOrderType.limit);

    await (wrapper.vm as unknown as { handleOrderPlacement: () => Promise<void> }).handleOrderPlacement();

    expect(confirmDialog.confirmOrExecute).toHaveBeenCalledTimes(1);
    expect(typeof confirmDialog.state.handler).toBe('function');

    await confirmDialog.state.handler?.();

    expect(transaction.withNotifications).toHaveBeenCalledTimes(1);
  });

  it('does not throw on unmount when XOR asset is unavailable', async () => {
    const previousXor = assetsStoreStub.xor;
    assetsStoreStub.xor = null as unknown as AccountAsset;

    const { wrapper } = await mountComponent();

    expect(() => wrapper.unmount()).not.toThrow();

    assetsStoreStub.xor = previousXor;
  });
});
