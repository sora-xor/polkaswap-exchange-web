import { flushPromises, mount } from '@vue/test-utils';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { Subject } from 'rxjs';
import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import { DexId } from '@/lib/substrate/sdk/dex/consts';
import { SwapModule } from '@/lib/substrate/sdk/swap';
import type { SwapQuoteData } from '@/lib/substrate/sdk/swap/types';

const tokenFromRef = ref<AccountAsset | null>(null);
const tokenToRef = ref<AccountAsset | null>(null);
const fromValueRef = ref('');
const toValueRef = ref('');

const setTokenFromAddressMock = vi.fn((address: string) => {
  tokenFromRef.value = address ? ({ address, symbol: address.toUpperCase(), decimals: 18 } as AccountAsset) : null;
});

const setTokenToAddressMock = vi.fn((address: string) => {
  tokenToRef.value = address ? ({ address, symbol: address.toUpperCase(), decimals: 18 } as AccountAsset) : null;
});

const setFromValueMock = vi.fn((value: string) => {
  fromValueRef.value = value;
});

const setToValueMock = vi.fn((value: string) => {
  toValueRef.value = value;
});

const isLoggedInRef = ref(false);
const isSoraAccountDialogVisibleRef = ref(false);
const nodeIsConnectedRef = ref(true);
const connectSoraWalletMock = vi.fn(() => {
  isSoraAccountDialogVisibleRef.value = true;
});
const quoteSubscribeMock = vi.fn(() => ({ unsubscribe: vi.fn() }));
const getDexesSwapQuoteObservableMock = vi.fn(() => ({ subscribe: quoteSubscribeMock }));
const checkSwapMock = vi.fn(async () => false);
const swapUpdateMock = vi.fn(async () => undefined);
const dexUpdateMock = vi.fn(async () => undefined);

const swapStoreMock = reactive({
  swapQuote: null as null,
  isPathAvailable: false,
  isAvailable: false,
  quoteError: false,
  isExchangeB: false,
  priceImpact: '0',
  selectedDexId: 0,
  allowLossPopup: true,
  swapLiquiditySource: undefined,
  swapMarketAlgorithm: 'SMART',
  setAmountWithoutImpact: vi.fn(),
  setLiquidityProviderFee: vi.fn(),
  setRewards: vi.fn(),
  setRoute: vi.fn(),
  setDistribution: vi.fn(),
  liquiditySources: [] as LiquiditySourceTypes[],
  selectDexId: vi.fn(),
  updateSubscriptions: vi.fn(),
  resetSubscriptions: vi.fn(),
  setSubscriptionPayload: vi.fn(
    (payload?: {
      quote?: SwapQuoteData['quote'] | null;
      isAvailable?: boolean;
      isPathAvailable?: boolean;
      liquiditySources?: LiquiditySourceTypes[];
    }) => {
      if (!payload) {
        swapStoreMock.swapQuote = null;
        swapStoreMock.isAvailable = false;
        swapStoreMock.isPathAvailable = false;
        swapStoreMock.quoteError = false;
        swapStoreMock.liquiditySources = [];
        return;
      }

      const { quote = null, isAvailable = false, liquiditySources = [] } = payload;
      swapStoreMock.swapQuote = quote as any;
      swapStoreMock.isAvailable = isAvailable;
      if ('isPathAvailable' in payload) {
        swapStoreMock.isPathAvailable = payload.isPathAvailable ?? false;
      }
      swapStoreMock.liquiditySources = liquiditySources;
    }
  ),
  setPathAvailability: vi.fn((flag = false) => {
    swapStoreMock.isPathAvailable = flag;
  }),
  setQuoteError: vi.fn((flag = false) => {
    swapStoreMock.quoteError = flag;
  }),
  setExchangeB: vi.fn((flag: boolean) => {
    swapStoreMock.isExchangeB = flag;
  }),
  switchTokens: vi.fn(async () => {
    const from = tokenFromRef.value;
    const to = tokenToRef.value;
    tokenFromRef.value = to;
    tokenToRef.value = from;
  }),
  reset: vi.fn(),
});

const createPassthroughStub = (name: string) =>
  defineComponent({
    name,
    setup(_, { slots }) {
      return () => h('div', [slots.reference?.(), slots.default?.()]);
    },
  });

const FormattedAmountStub = defineComponent({
  name: 'FormattedAmountStub',
  props: {
    value: { type: [String, Number], default: '' },
  },
  template: '<span class="formatted-amount-stub" :data-value="value"><slot /></span>',
});

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  props: {
    label: { type: String, default: '' },
    labelTooltip: { type: String, default: '' },
  },
  template: '<div class="info-line-stub" :data-label="label" :data-label-tooltip="labelTooltip"><slot /></div>',
});

const TokenInputStub = defineComponent({
  name: 'TokenInputStub',
  setup(_, { attrs, slots }) {
    return () =>
      h('div', { ...attrs, class: ['token-input-stub', attrs.class] }, [
        slots.default?.(),
        slots['fiat-amount-append']?.(),
      ]);
  },
});

const ValueStatusWrapperStub = defineComponent({
  name: 'ValueStatusWrapperStub',
  props: {
    value: { type: [String, Number], default: '' },
    badge: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['value-status-wrapper-stub', attrs.class],
          'data-value': String(props.value),
          'data-badge': String(props.badge),
        },
        slots.default?.()
      );
  },
});

const SwapLossWarningDialogStub = defineComponent({
  name: 'SwapLossWarningDialogStub',
  props: {
    value: { type: String, default: '' },
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'confirm'],
  setup(props) {
    return () =>
      h('div', {
        class: 'swap-loss-warning-dialog-stub',
        'data-value': props.value,
        'data-visible': String(props.visible),
      });
  },
});

vi.mock('@tests/stubs/walletRuntime', () => ({
  api: {
    swap: {
      update: swapUpdateMock,
      execute: vi.fn(),
      getDexesSwapQuoteObservable: getDexesSwapQuoteObservableMock,
      checkSwap: checkSwapMock,
      getResultRpc: vi.fn(),
    },
    dex: {
      publicDexes: [],
      update: dexUpdateMock,
    },
  },
  WALLET_CONSTS: {},
  WALLET_TYPES: {},
  INDEXER_TYPES: {},
  components: {
    FormattedAmount: FormattedAmountStub,
    InfoLine: InfoLineStub,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  __esModule: true,
  default: FormattedAmountStub,
}));

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  __esModule: true,
  default: InfoLineStub,
}));

vi.mock('@/features/swap/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => ({
    tokenFrom: tokenFromRef,
    tokenTo: tokenToRef,
    fromValue: fromValueRef,
    toValue: toValueRef,
    areTokensSelected: computed(() => Boolean(tokenFromRef.value && tokenToRef.value)),
    hasZeroAmount: computed(() => !fromValueRef.value || !toValueRef.value),
    areZeroAmounts: computed(() => !fromValueRef.value && !toValueRef.value),
    isZeroFromAmount: computed(() => !fromValueRef.value),
    isZeroToAmount: computed(() => !toValueRef.value),
    setTokenFromAddress: setTokenFromAddressMock,
    setTokenToAddress: setTokenToAddressMock,
    setFromValue: setFromValueMock,
    setToValue: setToValueMock,
  }),
}));

vi.mock('@/features/swap/stores/useSwapStore', () => ({
  useSwapStore: () => swapStoreMock,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: (address: string) => ({
      address,
      symbol: address.toUpperCase(),
      decimals: 18,
      balance: { transferable: '0' },
    }),
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: computed(() => isLoggedInRef.value),
    isSoraAccountDialogVisible: computed(() => isSoraAccountDialogVisibleRef.value),
    connectSoraWallet: connectSoraWalletMock,
  }),
}));

vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirmDialogVisible: ref(false),
    confirmOrExecute: vi.fn(),
  }),
}));

vi.mock('@/composables/useTokenSelect', () => ({
  useTokenSelect: () => ({
    isSelectAssetLoading: ref(false),
    withSelectAssetLoading: async (handler: () => Promise<void>) => {
      await handler();
    },
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: ref(false),
    withApi: async (handler: () => Promise<void>) => {
      await handler();
    },
    withChainApi: async (_apiRef: unknown, handler: () => Promise<void>) => {
      await handler();
    },
    withNotifications: async (handler: () => Promise<void>) => {
      await handler();
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumber: () => ({ sub: () => ({}) }),
    getFPNumberFromCodec: (value: string | number) => ({ toString: () => String(value), sub: () => ({}) }),
    formatCodecNumber: () => '0',
    formatStringValue: (value: string) => value,
    getFiatAmountByCodecString: () => '0',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    networkFees: {
      Swap: '0',
    },
    slippageTolerance: '0.1',
    debugEnabled: false,
    get nodeIsConnected() {
      return nodeIsConnectedRef.value;
    },
    appConnection: {
      connection: {},
    },
  }),
}));

vi.mock('@/utils', () => ({
  asZeroValue: (value: string) => !value || Number(value) === 0,
  debouncedInputHandler: (handler: () => Promise<void>) => handler,
  getMaxValue: () => '0',
  hasInsufficientBalance: () => false,
  hasInsufficientXorForFee: () => false,
  isMaxButtonAvailable: () => false,
}));

vi.mock('@/utils/swap', () => ({
  DifferenceStatus: { Error: 'error' },
  getDifferenceStatus: (value: number) => {
    if (value > 0) return 'success';
    if (value < -10) return 'error';
    if (value < -1) return 'warning';
    return '';
  },
  getVisibleSwapTokenBalance: () => null,
}));

const mountWidget = async () => {
  const module = await import('@/features/swap/components/widgets/Form.vue');
  return mount(module.default, {
    global: {
      stubs: {
        BaseWidget: createPassthroughStub('BaseWidgetStub'),
        SwapSettings: createPassthroughStub('SwapSettingsStub'),
        SwapConfirm: createPassthroughStub('SwapConfirmStub'),
        SwapStatusActionBadge: createPassthroughStub('SwapStatusActionBadgeStub'),
        SwapTransactionDetails: createPassthroughStub('SwapTransactionDetailsStub'),
        SwapLossWarningDialog: SwapLossWarningDialogStub,
        SlippageTolerance: createPassthroughStub('SlippageToleranceStub'),
        SelectToken: createPassthroughStub('SelectTokenStub'),
        TokenInput: TokenInputStub,
        ValueStatusWrapper: ValueStatusWrapperStub,
        's-button': defineComponent({
          name: 'SButtonStub',
          props: {
            loading: { type: Boolean, default: false },
            disabled: { type: Boolean, default: false },
          },
          setup(props, { attrs, slots }) {
            return () =>
              h(
                'button',
                {
                  ...attrs,
                  disabled: props.loading || props.disabled,
                  'data-loading': String(props.loading),
                },
                slots.default?.()
              );
          },
        }),
        's-icon': { template: '<i></i>' },
      },
      directives: {
        button: {
          mounted() {},
        },
      },
    },
  });
};

const createDexQuoteData = (amount: string): SwapQuoteData => ({
  quote: () =>
    ({
      dexId: DexId.XOR,
      result: {
        amount,
        amountWithoutImpact: amount,
        fee: '0',
        rewards: [],
        route: [],
        distribution: [],
      },
    }) as any,
  isAvailable: true,
  liquiditySources: [LiquiditySourceTypes.Default],
});

describe('SwapFormWidget quote subscription lifecycle', () => {
  beforeEach(() => {
    tokenFromRef.value = {
      address: '0xfrom',
      symbol: 'FROM',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    tokenToRef.value = null;
    fromValueRef.value = '';
    toValueRef.value = '';

    setTokenFromAddressMock.mockClear();
    setTokenToAddressMock.mockClear();
    setFromValueMock.mockClear();
    setToValueMock.mockClear();
    getDexesSwapQuoteObservableMock.mockClear();
    getDexesSwapQuoteObservableMock.mockImplementation(() => ({ subscribe: quoteSubscribeMock }));
    quoteSubscribeMock.mockClear();
    checkSwapMock.mockClear();
    checkSwapMock.mockResolvedValue(false);
    swapUpdateMock.mockClear();
    swapUpdateMock.mockResolvedValue(undefined);
    dexUpdateMock.mockClear();
    dexUpdateMock.mockResolvedValue(undefined);
    swapStoreMock.setSubscriptionPayload.mockClear();
    swapStoreMock.setPathAvailability.mockClear();
    swapStoreMock.setQuoteError.mockClear();
    swapStoreMock.updateSubscriptions.mockClear();
    swapStoreMock.resetSubscriptions.mockClear();
    swapStoreMock.reset.mockClear();
    swapStoreMock.swapQuote = null;
    swapStoreMock.isPathAvailable = false;
    swapStoreMock.isAvailable = false;
    swapStoreMock.quoteError = false;
    swapStoreMock.isExchangeB = false;
    swapStoreMock.priceImpact = '0';
    swapStoreMock.liquiditySources = [];
    isLoggedInRef.value = false;
    isSoraAccountDialogVisibleRef.value = false;
    nodeIsConnectedRef.value = true;
    connectSoraWalletMock.mockClear();
  });

  it('shows the swap connect CTA as loading while the SORA account dialog is opening', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    const connectButton = wrapper.findAll('button').find((button) => button.text().includes('connectWalletText'));

    expect(connectButton?.attributes('data-loading')).toBe('false');

    await connectButton?.trigger('click');
    await nextTick();

    expect(connectSoraWalletMock).toHaveBeenCalledTimes(1);
    expect(connectButton?.attributes('data-loading')).toBe('true');

    wrapper.unmount();
  });

  it('refreshes swap configuration on mount and subscribes when token pair becomes selected', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    expect(dexUpdateMock).toHaveBeenCalledTimes(1);
    expect(swapUpdateMock).toHaveBeenCalledTimes(1);
    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();

    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    await nextTick();
    await flushPromises();

    expect(getDexesSwapQuoteObservableMock).toHaveBeenCalledWith('0xfrom', '0xto');
    expect(quoteSubscribeMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('resets subscription payload when selected tokens become incomplete', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    const wrapper = await mountWidget();
    await flushPromises();
    getDexesSwapQuoteObservableMock.mockClear();
    swapStoreMock.setSubscriptionPayload.mockClear();

    tokenToRef.value = null;
    await nextTick();
    await flushPromises();

    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();
    expect(swapStoreMock.setSubscriptionPayload).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('uses output amount as quote source when typing in the output field', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    const wrapper = await mountWidget();
    await flushPromises();

    swapStoreMock.swapQuote = (() => ({
      dexId: DexId.XOR,
      result: {
        amount: '321',
        amountWithoutImpact: '321',
        fee: '0',
        rewards: [],
        route: [],
        distribution: [],
      },
    })) as SwapQuoteData['quote'];
    swapStoreMock.isAvailable = true;
    swapStoreMock.isExchangeB = false;
    swapStoreMock.setExchangeB.mockClear();
    setFromValueMock.mockClear();

    await (wrapper.vm as any).handleInputFieldTo('5');
    await flushPromises();

    expect(swapStoreMock.setExchangeB).toHaveBeenCalledWith(true);
    expect(setFromValueMock).toHaveBeenLastCalledWith('321');

    wrapper.unmount();
  });

  it('keeps updating quote values when one DEX quote stream fails', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    fromValueRef.value = '1';

    const activeDexQuote$ = new Subject<SwapQuoteData>();
    const failingDexQuote$ = new Subject<SwapQuoteData>();

    const swapModule = new SwapModule({
      dex: {
        publicDexes: [{ dexId: DexId.XOR }, { dexId: DexId.XSTUSD }],
      },
    } as any);

    vi.spyOn(swapModule, 'getSwapQuoteObservable').mockImplementation(
      (_firstAssetAddress, _secondAssetAddress, _sources, dexId) => {
        return dexId === DexId.XOR ? activeDexQuote$ : failingDexQuote$;
      }
    );

    getDexesSwapQuoteObservableMock.mockImplementation(() => {
      return swapModule.getDexesSwapQuoteObservable('0xfrom', '0xto');
    });

    const wrapper = await mountWidget();
    await flushPromises();

    activeDexQuote$.next(createDexQuoteData('100'));
    await flushPromises();

    expect(setToValueMock).toHaveBeenLastCalledWith('100');

    failingDexQuote$.error(new Error('Secondary DEX failure'));
    await flushPromises();

    activeDexQuote$.next(createDexQuoteData('250'));
    await flushPromises();

    expect(setToValueMock).toHaveBeenLastCalledWith('250');

    wrapper.unmount();
    activeDexQuote$.complete();
  });

  it('shows quote errors instead of mislabeling failed quote math as insufficient liquidity', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    fromValueRef.value = '1';
    toValueRef.value = '10';
    checkSwapMock.mockResolvedValue(true);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const wrapper = await mountWidget();
    await flushPromises();

    swapStoreMock.swapQuote = (() => {
      throw new Error('quote failed');
    }) as SwapQuoteData['quote'];
    swapStoreMock.isPathAvailable = true;

    await (wrapper.vm as any).handleInputFieldFrom('2');
    await flushPromises();

    const confirmButton = wrapper.get('[data-test-name="confirmSwap"]');

    expect(swapStoreMock.setQuoteError).toHaveBeenLastCalledWith(true);
    expect(setToValueMock).toHaveBeenLastCalledWith('');
    expect(confirmButton.text()).toBe('swap.errorFetching');
    expect(confirmButton.text()).not.toContain('swap.insufficientLiquidity');

    consoleErrorSpy.mockRestore();
    wrapper.unmount();
  });

  it('clears stale quotes and opposite amounts while loading a new token pair', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    fromValueRef.value = '1';

    const wrapper = await mountWidget();
    await flushPromises();

    toValueRef.value = '10';
    swapStoreMock.swapQuote = (() => ({
      dexId: DexId.XOR,
      result: {
        amount: '10',
        amountWithoutImpact: '10',
        fee: '0',
        rewards: [],
        route: [],
        distribution: [],
      },
    })) as SwapQuoteData['quote'];
    swapStoreMock.isPathAvailable = true;
    swapStoreMock.setSubscriptionPayload.mockClear();
    setToValueMock.mockClear();

    tokenToRef.value = {
      address: '0xnext',
      symbol: 'NEXT',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    await nextTick();
    await flushPromises();

    expect(swapStoreMock.setSubscriptionPayload).toHaveBeenCalledWith();
    expect(swapStoreMock.swapQuote).toBeNull();
    expect(setToValueMock).toHaveBeenLastCalledWith('');

    wrapper.unmount();
  });

  it('shows quote errors when a quote stream completes without data', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    fromValueRef.value = '1';
    toValueRef.value = '10';
    checkSwapMock.mockResolvedValue(true);
    getDexesSwapQuoteObservableMock.mockImplementationOnce(() => ({
      subscribe: ({ complete }: { complete?: () => void }) => {
        complete?.();
        return { unsubscribe: vi.fn() };
      },
    }));

    const wrapper = await mountWidget();
    await flushPromises();

    const confirmButton = wrapper.get('[data-test-name="confirmSwap"]');

    expect(swapStoreMock.setQuoteError).toHaveBeenLastCalledWith(true);
    expect(confirmButton.text()).toBe('swap.errorFetching');
    expect(confirmButton.attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('renders network fee info line with tooltip metadata for swap details', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    expect(wrapper.find('.swap-details').attributes('inline')).toBeDefined();

    const feeInfoLine = wrapper.find('.swap-details-info-line.info-line-stub');

    expect(feeInfoLine.exists()).toBe(true);
    expect(feeInfoLine.attributes('data-label')).toBe('networkFeeText');
    expect(feeInfoLine.attributes('data-label-tooltip')).toBe('networkFeeTooltipText');

    wrapper.unmount();
  });

  it('renders the receive badge and loss warning from the store price impact', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    swapStoreMock.priceImpact = '-1.90';

    const wrapper = await mountWidget();
    await flushPromises();

    const badge = wrapper.get('.price-difference__value');

    expect(badge.attributes('data-value')).toBe('-1.90');
    expect(badge.attributes('data-badge')).toBe('true');
    expect(badge.get('.formatted-amount-stub').attributes('data-value')).toBe('-1.90');
    expect(wrapper.get('.swap-loss-warning-dialog-stub').attributes('data-value')).toBe('-1.90');

    wrapper.unmount();
  });

  it('opens the output token selector from the main choose-tokens action', async () => {
    isLoggedInRef.value = true;

    const wrapper = await mountWidget();
    await flushPromises();

    const confirmButton = wrapper.get('[data-test-name="confirmSwap"]');

    expect(confirmButton.text()).toBe('buttons.chooseTokens');
    expect(confirmButton.attributes('disabled')).toBeUndefined();

    await confirmButton.trigger('click');
    await nextTick();

    expect((wrapper.vm as any).showSelectTokenDialog).toBe(true);
    expect((wrapper.vm as any).isTokenFromSelected).toBe(false);

    wrapper.unmount();
  });

  it('renders pair creation errors outside the confirm button', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    checkSwapMock.mockResolvedValue(false);

    const wrapper = await mountWidget();
    await flushPromises();

    const confirmButton = wrapper.get('[data-test-name="confirmSwap"]');
    const pairStatus = wrapper.get('[data-test-name="swapPairStatus"]');

    expect(confirmButton.text()).toBe('buttons.enterAmount');
    expect(pairStatus.text()).toContain('pairIsNotCreated');
    expect(confirmButton.text()).not.toContain('pairIsNotCreated');

    wrapper.unmount();
  });

  it('does not render pair creation errors for existing swap paths', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    fromValueRef.value = '1';
    checkSwapMock.mockResolvedValue(true);

    const wrapper = await mountWidget();
    await flushPromises();

    const confirmButton = wrapper.get('[data-test-name="confirmSwap"]');

    expect(confirmButton.text()).not.toContain('pairIsNotCreated');
    expect(wrapper.find('[data-test-name="swapPairStatus"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('refreshes swap balance subscriptions after login on the open swap page', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    const wrapper = await mountWidget();
    await flushPromises();

    swapStoreMock.updateSubscriptions.mockClear();
    swapStoreMock.resetSubscriptions.mockClear();

    isLoggedInRef.value = true;
    await nextTick();
    await flushPromises();

    expect(swapStoreMock.updateSubscriptions).toHaveBeenCalledTimes(1);
    expect(swapStoreMock.resetSubscriptions).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('waits for a live node connection before subscribing or showing pair errors', async () => {
    isLoggedInRef.value = true;
    nodeIsConnectedRef.value = false;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    const wrapper = await mountWidget();
    await flushPromises();

    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();
    expect(checkSwapMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-name="swapPairStatus"]').exists()).toBe(false);

    nodeIsConnectedRef.value = true;
    await nextTick();
    await flushPromises();

    expect(dexUpdateMock).toHaveBeenCalledTimes(1);
    expect(swapUpdateMock).toHaveBeenCalledTimes(1);
    expect(getDexesSwapQuoteObservableMock).toHaveBeenCalledWith('0xfrom', '0xto');
    expect(checkSwapMock).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('does not start quote streams when tokens change while the node is disconnected', async () => {
    isLoggedInRef.value = true;
    nodeIsConnectedRef.value = false;

    const wrapper = await mountWidget();
    await flushPromises();

    getDexesSwapQuoteObservableMock.mockClear();
    checkSwapMock.mockClear();
    swapStoreMock.setSubscriptionPayload.mockClear();
    swapStoreMock.setPathAvailability.mockClear();

    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    await nextTick();
    await flushPromises();

    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();
    expect(checkSwapMock).not.toHaveBeenCalled();
    expect(swapStoreMock.setSubscriptionPayload).toHaveBeenCalled();
    expect(swapStoreMock.setPathAvailability).toHaveBeenLastCalledWith(false);
    expect(wrapper.find('[data-test-name="swapPairStatus"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
