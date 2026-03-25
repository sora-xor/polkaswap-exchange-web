import { flushPromises, mount } from '@vue/test-utils';
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import { Subject } from 'rxjs';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
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

const quoteSubscribeMock = vi.fn(() => ({ unsubscribe: vi.fn() }));
const getDexesSwapQuoteObservableMock = vi.fn(() => ({ subscribe: quoteSubscribeMock }));
const swapUpdateMock = vi.fn(async () => undefined);

const swapStoreMock = {
  swapQuote: null as null,
  isAvailable: false,
  isExchangeB: false,
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
      liquiditySources?: LiquiditySourceTypes[];
    }) => {
      const { quote = null, isAvailable = false, liquiditySources = [] } = payload ?? {};
      swapStoreMock.swapQuote = quote as any;
      swapStoreMock.isAvailable = isAvailable;
      swapStoreMock.liquiditySources = liquiditySources;
    }
  ),
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
};

vi.mock('@wallet', () => ({
  api: {
    swap: {
      update: swapUpdateMock,
      execute: vi.fn(),
      getDexesSwapQuoteObservable: getDexesSwapQuoteObservableMock,
      getResultRpc: vi.fn(),
    },
  },
  WALLET_CONSTS: {},
  WALLET_TYPES: {},
  INDEXER_TYPES: {},
  components: {
    FormattedAmount: defineComponent({ name: 'FormattedAmountStub', template: '<span><slot /></span>' }),
    InfoLine: defineComponent({
      name: 'InfoLineStub',
      props: {
        label: { type: String, default: '' },
        labelTooltip: { type: String, default: '' },
      },
      template: '<div class="info-line-stub" :data-label="label" :data-label-tooltip="labelTooltip"><slot /></div>',
    }),
  },
}));

vi.mock('@/router', () => ({
  lazyComponent: () =>
    defineComponent({
      name: 'LazyStub',
      setup(_, { slots }) {
        return () => h('div', [slots.reference?.(), slots.default?.()]);
      },
    }),
}));

vi.mock('@/composables/useSwapAmounts', () => ({
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

vi.mock('@/stores/swap', () => ({
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
    isLoggedIn: computed(() => false),
    connectSoraWallet: vi.fn(),
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
    getFPNumberFiatAmountByFPNumber: () => ({ toFixed: () => '0' }),
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
    nodeIsConnected: true,
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
  calcFiatDifference: () => ({ toFixed: () => '0' }),
  getDifferenceStatus: () => 'ok',
  getVisibleSwapTokenBalance: () => null,
}));

const mountWidget = async () => {
  const module = await import('@/components/pages/Swap/Widget/Form.vue');
  return mount(module.default, {
    global: {
      stubs: {
        's-button': { template: '<button><slot /></button>' },
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
    quoteSubscribeMock.mockClear();
    swapUpdateMock.mockClear();
    swapStoreMock.setSubscriptionPayload.mockClear();
    swapStoreMock.updateSubscriptions.mockClear();
    swapStoreMock.resetSubscriptions.mockClear();
    swapStoreMock.reset.mockClear();
    swapStoreMock.swapQuote = null;
    swapStoreMock.isAvailable = false;
    swapStoreMock.isExchangeB = false;
    swapStoreMock.liquiditySources = [];
  });

  it('refreshes swap configuration on mount and subscribes when token pair becomes selected', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

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

  it('renders network fee info line with tooltip metadata for swap details', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    const feeInfoLine = wrapper.find('.swap-details-info-line.info-line-stub');

    expect(feeInfoLine.exists()).toBe(true);
    expect(feeInfoLine.attributes('data-label')).toBe('networkFeeText');
    expect(feeInfoLine.attributes('data-label-tooltip')).toBe('networkFeeTooltipText');

    wrapper.unmount();
  });
});
