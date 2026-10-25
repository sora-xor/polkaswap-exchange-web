import { flushPromises, mount } from '@vue/test-utils';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { Subject } from 'rxjs';
import { computed, defineComponent, h, nextTick, reactive, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const windowWidthRef = ref(390);
const walletState = reactive({ address: 'sora-account', shouldBalanceBeHidden: false });
const feeRef = ref('0');
const debugEnabledRef = ref(false);
const getResultRpcMock = vi.fn();
const xorBalanceRef = ref('0');
const confirmVisibleRef = ref(false);
const beforeExecuteMock = vi.fn(async () => {});
const executeSwapMock = vi.fn(async (..._args: unknown[]) => {});
const exactHistoryMock = vi.fn();
const rememberSwapDraftMock = vi.fn(() => true);
const trackSwapSubmissionMock = vi.fn(() => true);
const abandonSwapDraftMock = vi.fn();
vi.mock('@/features/misc/composables/useGetTsPlan', () => ({
  useGetTsPlan: () => ({
    rememberSwapDraft: rememberSwapDraftMock,
    trackSwapSubmission: trackSwapSubmissionMock,
    abandonSwapDraft: abandonSwapDraftMock,
  }),
}));
let submittedTransaction: { txId?: string; id?: string } | undefined;
let deferRecount = false;
const queuedRecounts: Array<() => Promise<void>> = [];
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
  amountWithoutImpact: '1000000000000000000',
  selectedDexId: 0,
  minMaxReceived: '9',
  liquidityProviderFee: '0',
  price: '10',
  priceReversed: '0.1',
  route: [] as string[],
  rewards: [],
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
    getHistory: exactHistoryMock,
    api: { genesisHash: { toString: () => 'sora-genesis' } },
    swap: {
      update: swapUpdateMock,
      execute: executeSwapMock,
      getDexesSwapQuoteObservable: getDexesSwapQuoteObservableMock,
      checkSwap: checkSwapMock,
      getResultRpc: getResultRpcMock,
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

vi.mock('@/stores/wallet', () => ({ useWalletStore: () => walletState }));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: (address: string) => ({
      address,
      symbol: address.toUpperCase(),
      decimals: 18,
      balance: { transferable: xorBalanceRef.value },
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
    confirmDialogVisible: confirmVisibleRef,
    confirmOrExecute: () => {
      confirmVisibleRef.value = true;
    },
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
      try {
        await beforeExecuteMock();
        await handler();
        return { submitted: true, transaction: submittedTransaction };
      } catch (error) {
        return { submitted: false, error };
      }
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
    get windowWidth() {
      return windowWidthRef.value;
    },
    networkFees: {
      get Swap() {
        return feeRef.value;
      },
    },
    slippageTolerance: '0.1',
    get debugEnabled() {
      return debugEnabledRef.value;
    },
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
  debouncedInputHandler: (handler: () => Promise<void>) => () => {
    if (deferRecount) {
      queuedRecounts.push(handler);
      return;
    }
    return handler();
  },
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

const mountWidget = async (
  props: { fixedPair?: boolean; maxPriceImpact?: string; purchasePurpose?: 'ts' | 'xor' } = {}
) => {
  const module = await import('@/features/swap/components/widgets/Form.vue');
  return mount(module.default, {
    props,
    global: {
      stubs: {
        BaseWidget: createPassthroughStub('BaseWidgetStub'),
        SwapSettings: createPassthroughStub('SwapSettingsStub'),
        ReceiveXorDialog: createPassthroughStub('ReceiveXorDialogStub'),
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
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    windowWidthRef.value = 390;
    debugEnabledRef.value = false;
    getResultRpcMock.mockReset();
    deferRecount = false;
    queuedRecounts.length = 0;
    feeRef.value = '0';
    xorBalanceRef.value = '0';
    walletState.address = 'sora-account';
    walletState.shouldBalanceBeHidden = false;
    confirmVisibleRef.value = false;
    beforeExecuteMock.mockReset();
    beforeExecuteMock.mockResolvedValue(undefined);
    executeSwapMock.mockReset();
    executeSwapMock.mockResolvedValue(undefined);
    exactHistoryMock.mockReset();
    rememberSwapDraftMock.mockReset().mockReturnValue(true);
    trackSwapSubmissionMock.mockClear();
    abandonSwapDraftMock.mockClear();
    submittedTransaction = undefined;
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
    swapStoreMock.setAmountWithoutImpact.mockClear();
    swapStoreMock.setLiquidityProviderFee.mockClear();
    swapStoreMock.setRewards.mockClear();
    swapStoreMock.setRoute.mockClear();
    swapStoreMock.setDistribution.mockClear();
    swapStoreMock.selectDexId.mockClear();
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
    swapStoreMock.amountWithoutImpact = '1000000000000000000';
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

  it('still refreshes swap metadata when DEX metadata refresh fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    dexUpdateMock.mockRejectedValueOnce(new Error('dex metadata unavailable'));

    const wrapper = await mountWidget();
    await flushPromises();

    expect(dexUpdateMock).toHaveBeenCalledTimes(1);
    expect(swapUpdateMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[swap] quote configuration refresh partially failed',
      expect.any(Array)
    );

    consoleWarnSpy.mockRestore();
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
    expect(confirmButton.text()).toBe('exchange.Swap');
    expect(wrapper.get('[data-test-name="swapStatus"]').text()).toContain('ux.swap.status.quoteError');
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
    swapStoreMock.setAmountWithoutImpact.mockClear();
    swapStoreMock.setLiquidityProviderFee.mockClear();
    swapStoreMock.setRewards.mockClear();
    swapStoreMock.setRoute.mockClear();
    swapStoreMock.setDistribution.mockClear();
    swapStoreMock.selectDexId.mockClear();
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
    expect(swapStoreMock.setAmountWithoutImpact).toHaveBeenCalledWith();
    expect(swapStoreMock.setLiquidityProviderFee).toHaveBeenCalledWith();
    expect(swapStoreMock.setRewards).toHaveBeenCalledWith();
    expect(swapStoreMock.setRoute).toHaveBeenCalledWith();
    expect(swapStoreMock.setDistribution).toHaveBeenCalledWith();
    expect(swapStoreMock.selectDexId).toHaveBeenCalledWith();

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
    expect(confirmButton.text()).toBe('exchange.Swap');
    expect(wrapper.get('[data-test-name="swapStatus"]').text()).toContain('ux.swap.status.quoteError');
    expect(confirmButton.attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('renders network fee info line with tooltip metadata for swap details', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    expect(wrapper.find('.swap-details').attributes('inline')).toBeDefined();

    expect(wrapper.get('.swap-details').text()).toContain('ux.swap.feesDetails');
    expect(wrapper.get('[data-test-name="swapProtection"]').html()).toContain('swap.minReceived');
    expect(wrapper.get('[data-test-name="swapProtection"]').html()).toContain('swap.priceImpact');

    wrapper.unmount();
  });

  it('keeps desktop details expanded across quote changes and restores disclosure at 1024px', async () => {
    windowWidthRef.value = 1440;
    const wrapper = await mountWidget();
    await flushPromises();

    for (const width of [1440, 1025]) {
      windowWidthRef.value = width;
      await nextTick();
      expect(wrapper.get('.swap-details').attributes('expanded')).toBe('true');
      expect(wrapper.get('.swap-details-title').text()).toBe('ux.swap.feesDetails');
    }
    nodeIsConnectedRef.value = false;
    await nextTick();
    expect(wrapper.get('.swap-details').attributes('expanded')).toBe('true');

    for (const width of [1024, 768, 390]) {
      windowWidthRef.value = width;
      await nextTick();
      expect(wrapper.get('.swap-details').attributes('expanded')).toBe('false');
      expect(wrapper.find('.swap-details-title').exists()).toBe(false);
    }
    windowWidthRef.value = 1025;
    await nextTick();
    expect(wrapper.get('.swap-details').attributes('expanded')).toBe('true');
    wrapper.unmount();
  });

  it('names the price impact and keeps unquoted protection values unavailable', async () => {
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;
    swapStoreMock.priceImpact = '-1.90';

    const wrapper = await mountWidget();
    await flushPromises();

    expect(wrapper.get('[data-test-name="swapProtection"]').html()).toContain('swap.priceImpact');
    expect(wrapper.find('.price-difference__value').exists()).toBe(false);
    expect(wrapper.get('[data-test-name="swapProtection"]').text()).toContain('—');
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
    const pairStatus = wrapper.get('[data-test-name="swapStatus"]');

    expect(confirmButton.text()).toBe('buttons.enterAmount');
    expect(pairStatus.text()).toContain('ux.swap.status.noRoute');
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

  it('refreshes both swap balance subscriptions when switching between logged-in accounts', async () => {
    isLoggedInRef.value = true;
    tokenToRef.value = {
      address: '0xto',
      symbol: 'TO',
      decimals: 18,
      balance: { transferable: '0' },
    } as AccountAsset;

    const wrapper = await mountWidget();
    await flushPromises();
    swapStoreMock.updateSubscriptions.mockClear();

    walletState.address = 'second-sora-account';
    await nextTick();
    await flushPromises();

    expect(isLoggedInRef.value).toBe(true);
    expect(swapStoreMock.updateSubscriptions).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('defers account-switch balance subscriptions until the node reconnects', async () => {
    isLoggedInRef.value = true;
    nodeIsConnectedRef.value = false;
    const wrapper = await mountWidget();
    await flushPromises();
    swapStoreMock.updateSubscriptions.mockClear();

    walletState.address = 'second-sora-account';
    await nextTick();
    await flushPromises();

    expect(swapStoreMock.updateSubscriptions).not.toHaveBeenCalled();

    nodeIsConnectedRef.value = true;
    await nextTick();
    await flushPromises();

    expect(swapStoreMock.updateSubscriptions).toHaveBeenCalledTimes(1);

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

  it('does not re-add subscriptions when the node disconnects during quote configuration refresh', async () => {
    let resolveDexUpdate!: () => void;
    let resolveSwapUpdate!: () => void;
    dexUpdateMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDexUpdate = resolve;
      })
    );
    swapUpdateMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveSwapUpdate = resolve;
      })
    );

    const wrapper = await mountWidget();
    await nextTick();

    expect(dexUpdateMock).toHaveBeenCalledTimes(1);

    nodeIsConnectedRef.value = false;
    await nextTick();
    await flushPromises();

    expect(swapStoreMock.resetSubscriptions).toHaveBeenCalled();

    resolveDexUpdate();
    await flushPromises();

    expect(swapUpdateMock).toHaveBeenCalledTimes(1);

    resolveSwapUpdate();
    await flushPromises();

    expect(swapStoreMock.updateSubscriptions).not.toHaveBeenCalled();
    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('does not recreate subscriptions after unmounting during quote configuration refresh', async () => {
    let resolveDexUpdate!: () => void;
    let resolveSwapUpdate!: () => void;
    dexUpdateMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDexUpdate = resolve;
      })
    );
    swapUpdateMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveSwapUpdate = resolve;
      })
    );

    const wrapper = await mountWidget();
    await nextTick();

    expect(dexUpdateMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();

    resolveDexUpdate();
    await flushPromises();

    expect(swapUpdateMock).toHaveBeenCalledTimes(1);

    resolveSwapUpdate();
    await flushPromises();

    expect(swapStoreMock.updateSubscriptions).not.toHaveBeenCalled();
    expect(getDexesSwapQuoteObservableMock).not.toHaveBeenCalled();
    expect(swapStoreMock.reset).toHaveBeenCalled();
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
  async function mountReady(
    props: { fixedPair?: boolean; maxPriceImpact?: string; purchasePurpose?: 'ts' | 'xor' } = {}
  ) {
    isLoggedInRef.value = true;
    tokenToRef.value = { address: '0xto', symbol: 'TO', decimals: 18, balance: { transferable: '0' } } as AccountAsset;
    fromValueRef.value = '2';
    checkSwapMock.mockResolvedValue(true);
    const stream = new Subject<SwapQuoteData>();
    getDexesSwapQuoteObservableMock.mockImplementation(() => stream);
    const wrapper = await mountWidget(props);
    await flushPromises();
    stream.next(createDexQuoteData('20'));
    await flushPromises();
    return { wrapper, stream };
  }

  it('shows a recoverable path failure instead of claiming that the pair does not exist', async () => {
    tokenToRef.value = { address: '0xto', symbol: 'TO', decimals: 18 } as AccountAsset;
    checkSwapMock.mockRejectedValue(new Error('offline'));
    const wrapper = await mountWidget();
    await flushPromises();
    expect(wrapper.get('[data-test-name="swapStatus"]').text()).toContain('ux.swap.status.pathError');
    expect(wrapper.text()).toContain('ux.swap.retryQuote');
    expect(wrapper.text()).not.toContain('ux.swap.status.noRoute');
  });

  it('times out an initial quote after 15 seconds and clears the timer on unmount', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    tokenToRef.value = { address: '0xto', symbol: 'TO', decimals: 18 } as AccountAsset;
    fromValueRef.value = '3';
    checkSwapMock.mockResolvedValue(true);
    const wrapper = await mountWidget();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(wrapper.get('[data-test-name="swapStatus"]').text()).toContain('ux.swap.status.quoteError');
    expect(fromValueRef.value).toBe('3');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out hung route checks as service errors', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    tokenToRef.value = { address: '0xto', symbol: 'TO', decimals: 18 } as AccountAsset;
    checkSwapMock.mockImplementation(() => new Promise(() => {}));
    const wrapper = await mountWidget();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(wrapper.get('[data-test-name="swapStatus"]').text()).toContain('ux.swap.status.pathError');
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retries once and preserves an exact-output draft', async () => {
    const { wrapper, stream } = await mountReady();
    swapStoreMock.isExchangeB = true;
    toValueRef.value = '7';
    stream.error(new Error('quote offline'));
    await flushPromises();
    const nextStream = new Subject<SwapQuoteData>();
    getDexesSwapQuoteObservableMock.mockImplementation(() => nextStream);
    const before = getDexesSwapQuoteObservableMock.mock.calls.length;
    const first = (wrapper.vm as any).retryQuote();
    const second = (wrapper.vm as any).retryQuote();
    await Promise.all([first, second]);
    expect(getDexesSwapQuoteObservableMock).toHaveBeenCalledTimes(before + 1);
    expect(toValueRef.value).toBe('7');
    expect(swapStoreMock.isExchangeB).toBe(true);
    nextStream.next(createDexQuoteData('70'));
    await flushPromises();
    expect(fromValueRef.value).toBe('70');
    expect(wrapper.get('[data-test-name="confirmSwap"]').attributes('disabled')).toBeUndefined();
  });

  it('ignores late stream callbacks from a superseded token pair', async () => {
    const callbacks: Array<{ next: (value: SwapQuoteData) => void }> = [];
    getDexesSwapQuoteObservableMock.mockImplementation(() => ({
      subscribe: (observer: any) => {
        callbacks.push(observer);
        return { unsubscribe: vi.fn() };
      },
    }));
    tokenToRef.value = { address: '0xto', symbol: 'TO', decimals: 18 } as AccountAsset;
    fromValueRef.value = '2';
    checkSwapMock.mockResolvedValue(true);
    const wrapper = await mountWidget();
    await flushPromises();
    tokenToRef.value = { address: '0xnew', symbol: 'NEW', decimals: 18 } as AccountAsset;
    await flushPromises();
    callbacks[1].next(createDexQuoteData('200'));
    await flushPromises();
    callbacks[0].next(createDexQuoteData('999'));
    await flushPromises();
    expect(toValueRef.value).toBe('200');
    wrapper.unmount();
  });

  it('retains review after wallet rejection and closes only after submission succeeds', async () => {
    const { wrapper } = await mountReady();
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    expect(confirmVisibleRef.value).toBe(true);
    executeSwapMock.mockRejectedValueOnce(new Error('User rejected'));
    await (wrapper.vm as any).exchangeTokens();
    expect(confirmVisibleRef.value).toBe(true);
    expect(fromValueRef.value).toBe('2');
    expect((wrapper.vm as any).submissionError).toBe('ux.swap.submissionFailed');
    expect(wrapper.emitted('submitted')).toBeUndefined();
    const transactionHash = `0x${'ab'.repeat(32)}`;
    submittedTransaction = { txId: transactionHash, id: 'local-history-id' };
    await (wrapper.vm as any).exchangeTokens();
    expect(confirmVisibleRef.value).toBe(false);
    expect(fromValueRef.value).toBe('');
    expect(executeSwapMock).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('submitted')).toEqual([[{ expectedXor: '19.98', transactionHash }]]);
  });

  it('omits an unsigned history ID from the submitted event', async () => {
    const { wrapper } = await mountReady();
    submittedTransaction = { id: 'local-history-id' };
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    await (wrapper.vm as any).exchangeTokens();
    expect(wrapper.emitted('submitted')).toEqual([[{ expectedXor: '19.98' }]]);
    expect(executeSwapMock.mock.calls[0]).toHaveLength(8);
  });
  it('persists one reviewed purchase row before signing and ignores unrelated notification history', async () => {
    const { wrapper } = await mountReady({ purchasePurpose: 'xor' });
    const transactionHash = `0x${'ab'.repeat(32)}`;
    submittedTransaction = { txId: `0x${'cd'.repeat(32)}` };
    executeSwapMock.mockImplementationOnce(async (...args) => {
      expect(rememberSwapDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: args[8], amount: '2' }),
        'sora-genesis'
      );
      exactHistoryMock.mockReturnValue({ id: args[8], txId: transactionHash });
    });
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock.mock.calls[0][8]).toMatch(/^purchase-swap:xor:/);
    expect(wrapper.emitted('submitted')).toEqual([[{ expectedXor: '19.98', transactionHash }]]);
    expect(wrapper.emitted('preparing')).toEqual([[true], [false]]);
    expect(trackSwapSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({ txId: transactionHash }),
      'sora-account',
      'sora-genesis'
    );
  });
  it('retains a no-hash purchase draft after history timeout, but clears it after definite unsigned rejection', async () => {
    const { wrapper } = await mountReady({ purchasePurpose: 'xor' });
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    await (wrapper.vm as any).exchangeTokens();
    expect(wrapper.emitted('submitted')).toEqual([[{ expectedXor: '19.98' }]]);
    expect(abandonSwapDraftMock).not.toHaveBeenCalled();
    wrapper.unmount();
    const second = await mountReady({ purchasePurpose: 'xor' });
    (second.wrapper.vm as any).handleConfirm();
    await flushPromises();
    executeSwapMock.mockRejectedValueOnce(new Error('User rejected'));
    await (second.wrapper.vm as any).exchangeTokens();
    expect(abandonSwapDraftMock).toHaveBeenCalledWith(expect.stringMatching(/^purchase-swap:xor:/));
  });
  it('does not sign a purchase without a durable draft or overwrite an unresolved one', async () => {
    const { wrapper } = await mountReady({ purchasePurpose: 'xor' });
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    rememberSwapDraftMock.mockReturnValue(false);
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock).not.toHaveBeenCalled();
    expect(wrapper.emitted('submitted')).toBeUndefined();
  });

  it('blocks a changed account during wallet preparation and does not double-submit', async () => {
    const { wrapper } = await mountReady();
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    let release!: () => void;
    beforeExecuteMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const pending = (wrapper.vm as any).exchangeTokens();
    await (wrapper.vm as any).exchangeTokens();
    walletState.address = 'different-account';
    release();
    await pending;
    expect(executeSwapMock).not.toHaveBeenCalled();
    expect(beforeExecuteMock).toHaveBeenCalledTimes(1);
    expect(confirmVisibleRef.value).toBe(true);
    expect(fromValueRef.value).toBe('2');
  });

  it('requires explicit review of updated quote terms and never executes unseen amounts', async () => {
    const { wrapper, stream } = await mountReady();
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    const captured = (wrapper.vm as any).review;
    stream.next(createDexQuoteData('21'));
    await flushPromises();
    expect(captured.toValue).toBe('20');
    expect((wrapper.vm as any).confirmationReadiness.reason).toBe('reviewChanged');
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock).not.toHaveBeenCalled();
    (wrapper.vm as any).refreshReview();
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock.mock.calls[0][3]).toBe('21');
  });

  it('opens native funding in place and respects hidden balances', async () => {
    const { wrapper } = await mountReady();
    feeRef.value = '100';
    await nextTick();
    expect(wrapper.text()).toContain('ux.swap.feeShortfall');
    const fundButton = wrapper.findAll('button').find((button) => button.text() === 'ux.swap.receiveXor');
    await fundButton!.trigger('click');
    expect((wrapper.vm as any).showReceiveXor).toBe(true);
    expect(fromValueRef.value).toBe('2');
    walletState.shouldBalanceBeHidden = true;
    await nextTick();
    expect(wrapper.text()).toContain('ux.swap.feeShortfallHidden');
    expect(wrapper.text()).not.toContain('ux.swap.useMaximum');
  });

  it('blocks review synchronously during a debounced amount edit', async () => {
    const { wrapper } = await mountReady();
    deferRecount = true;
    await (wrapper.vm as any).handleInputFieldFrom('3');
    expect((wrapper.vm as any).readiness.reason).toBe('checking');
    expect((wrapper.vm as any).validTradeDetails).toBe(false);
    (wrapper.vm as any).handleConfirm();
    expect(confirmVisibleRef.value).toBe(false);
    expect(executeSwapMock).not.toHaveBeenCalled();
    await queuedRecounts.shift()!();
    expect((wrapper.vm as any).readiness.ready).toBe(true);
  });

  it('blocks confirmation until a fresh stream quote has committed its derived amounts', async () => {
    const { wrapper, stream } = await mountReady();
    (wrapper.vm as any).handleConfirm();
    deferRecount = true;
    stream.next(createDexQuoteData('22'));
    expect((wrapper.vm as any).confirmationReadiness.reason).toBe('checking');
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock).not.toHaveBeenCalled();
    expect((wrapper.vm as any).review.toValue).toBe('20');
    await queuedRecounts.shift()!();
    expect((wrapper.vm as any).confirmationReadiness.reason).toBe('reviewChanged');
    expect(toValueRef.value).toBe('22');
  });
  it('ignores an older calculation failure after a newer quote succeeds', async () => {
    const { wrapper, stream } = await mountReady();
    debugEnabledRef.value = true;
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    let rejectOld!: (error: Error) => void;
    let resolveNew!: (value: { amount: string }) => void;
    getResultRpcMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        })
    );
    getResultRpcMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNew = resolve;
        })
    );
    stream.next(createDexQuoteData('30'));
    stream.next(createDexQuoteData('40'));
    resolveNew({ amount: '40' });
    await flushPromises();
    rejectOld(new Error('Old calculation failed'));
    await flushPromises();
    expect(toValueRef.value).toBe('40');
    expect(swapStoreMock.quoteError).toBe(false);
    expect((wrapper.vm as any).readiness.ready).toBe(true);
    tableSpy.mockRestore();
  });

  it('locks the guided pair and blocks excessive impact before review', async () => {
    const { wrapper } = await mountReady({ fixedPair: true, maxPriceImpact: '5' });
    expect(wrapper.get('[data-test-name="swapFrom"]').attributes('is-select-available')).toBe('false');
    expect(wrapper.get('[data-test-name="switchToken"]').attributes('disabled')).toBeDefined();
    swapStoreMock.priceImpact = '-5.01';
    await nextTick();
    expect(wrapper.get('[data-test-name="confirmSwap"]').attributes('disabled')).toBeDefined();
    (wrapper.vm as any).handleConfirm();
    expect(confirmVisibleRef.value).toBe(false);
    expect(wrapper.text()).toContain('getTs.swapImpactBlocked');
    wrapper.unmount();
  });

  it('blocks a guided swap when no positive baseline supports the displayed impact', async () => {
    const { wrapper } = await mountReady({ maxPriceImpact: '5' });
    swapStoreMock.amountWithoutImpact = '';
    await nextTick();
    expect(wrapper.get('[data-test-name="confirmSwap"]').attributes('disabled')).toBeDefined();
    (wrapper.vm as any).handleConfirm();
    expect(confirmVisibleRef.value).toBe(false);
    wrapper.unmount();
  });

  it('rechecks the optional impact limit after asynchronous wallet preparation', async () => {
    const { wrapper } = await mountReady({ maxPriceImpact: '5' });
    (wrapper.vm as any).handleConfirm();
    await flushPromises();
    expect(confirmVisibleRef.value).toBe(true);
    beforeExecuteMock.mockImplementationOnce(async () => {
      swapStoreMock.priceImpact = '-6';
    });
    await (wrapper.vm as any).exchangeTokens();
    expect(executeSwapMock).not.toHaveBeenCalled();
    expect(confirmVisibleRef.value).toBe(true);
    wrapper.unmount();
  });

  it('keeps exact-input mode when child inputs emit their unchanged empty initial values', async () => {
    const wrapper = await mountWidget();
    await (wrapper.vm as any).handleInputFieldFrom('');
    await (wrapper.vm as any).handleInputFieldTo('');
    expect(swapStoreMock.isExchangeB).toBe(false);
    expect(wrapper.get('[data-test-name="swapProtection"]').html()).toContain('swap.minReceived');
    expect(wrapper.get('[data-test-name="swapProtection"]').html()).not.toContain('swap.maxSold');
  });
  it('does not erase an entered amount when focusing an empty receive field', async () => {
    const wrapper = await mountWidget();
    fromValueRef.value = '4';
    (wrapper.vm as any).handleFocusField(true);
    expect(fromValueRef.value).toBe('4');
    expect(swapStoreMock.isExchangeB).toBe(false);
  });
});
