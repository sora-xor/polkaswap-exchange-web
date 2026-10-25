import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MoonpayNotifications } from '@/features/deposit/components/moonpay/consts';
import Moonpay from '@/features/deposit/components/moonpay/Moonpay.vue';

import type { MoonpayTransaction } from '@/utils/moonpay';

const shared = vi.hoisted(() => ({
  ctx: null as Nullable<Awaited<ReturnType<typeof createContext>>>,
}));

let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

async function createContext() {
  const { reactive, ref, computed } = await import('vue');

  const state = reactive({
    moonpay: {
      transactions: [] as MoonpayTransaction[],
      pollingTimestamp: 0,
      dialogVisibility: true,
    },
    settings: {
      language: 'en',
    },
  });

  const moonpayStore = reactive({
    get transactions() {
      return state.moonpay.transactions;
    },
    get pollingTimestamp() {
      return state.moonpay.pollingTimestamp;
    },
    get dialogVisibility() {
      return state.moonpay.dialogVisibility;
    },
    setDialogVisibility: vi.fn((flag: boolean) => {
      state.moonpay.dialogVisibility = flag;
    }),
  });
  const settingsStore = reactive({ libraryTheme: 'light' });
  const walletStore = reactive({
    account: { address: '5FAKEADDRESS' },
  });

  const isLoggedInRef = ref(true);
  const moonpayApiMock = {
    createWidgetUrl: vi.fn((_params: Record<string, string>) => 'https://widget.example'),
  };
  const initMoonpayApiMock = vi.fn();
  const showNotificationMock = vi.fn();
  const prepareMoonpayTxForBridgeTransferMock = vi.fn();
  const stopPollingMock = vi.fn();
  const setDialogVisibilityMock = vi.fn((flag: boolean) => {
    state.moonpay.dialogVisibility = flag;
  });
  const createTransactionsPollingMock = vi.fn(async () => stopPollingMock);
  const withApiMock = vi.fn(async (handler: () => unknown | Promise<unknown>) => {
    await handler();
  });
  const bridgeTransactionRef = ref(null);

  const reset = () => {
    state.moonpay.transactions = [];
    state.moonpay.pollingTimestamp = 0;
    state.moonpay.dialogVisibility = true;
    state.settings.language = 'en';
    isLoggedInRef.value = true;
    walletStore.account = { address: '5FAKEADDRESS' };
    moonpayStore.setDialogVisibility.mockClear();
    moonpayApiMock.createWidgetUrl.mockReset().mockReturnValue('https://widget.example');
    initMoonpayApiMock.mockClear();
    showNotificationMock.mockClear();
    prepareMoonpayTxForBridgeTransferMock.mockClear();
    stopPollingMock.mockClear();
    setDialogVisibilityMock.mockClear();
    createTransactionsPollingMock.mockReset().mockResolvedValue(stopPollingMock);
    withApiMock.mockClear();
    bridgeTransactionRef.value = null;
  };

  return {
    state,
    moonpayStore,
    settingsStore,
    walletStore,
    isLoggedInRef,
    moonpayApiMock,
    initMoonpayApiMock,
    showNotificationMock,
    prepareMoonpayTxForBridgeTransferMock,
    stopPollingMock,
    setDialogVisibilityMock,
    createTransactionsPollingMock,
    withApiMock,
    bridgeTransactionRef,
    reset,
    computed,
  };
}

async function getContext() {
  if (!shared.ctx) {
    shared.ctx = await createContext();
  }
  return shared.ctx;
}

vi.mock('@/stores/moonpay', async () => {
  const ctx = await getContext();
  return {
    useMoonpayStore: () => ctx.moonpayStore,
  };
});

vi.mock('@/stores/settings', async () => {
  const ctx = await getContext();
  return {
    useSettingsStore: () => ctx.settingsStore,
  };
});

vi.mock('@/stores/wallet', async () => {
  const ctx = await getContext();
  return {
    useWalletStore: () => ctx.walletStore,
  };
});

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBaseStub',
    props: {
      visible: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['update:visible'],
    template: '<div class="dialog-base-stub"><slot name="title" /><slot /></div>',
  },
}));

vi.mock('@/components/shared/Widget/IFrame.vue', () => ({
  default: {
    name: 'IFrameWidgetStub',
    props: {
      src: {
        type: String,
        default: '',
      },
    },
    template: '<div class="iframe-widget" :data-src="src" />',
  },
}));

vi.mock('@/components/shared/Logo/Moonpay.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'MoonpayLogoStub',
    template: '<div class="moonpay-logo-stub" />',
  },
}));

vi.mock('@/composables/useTranslation', async () => {
  const ctx = await getContext();
  return {
    useTranslation: () => ({
      t: (key: string) => key,
      language: ctx.computed(() => ctx.state.settings.language),
    }),
  };
});

vi.mock('@/utils', () => ({
  getCssVariableValue: vi.fn(() => '#112233'),
}));

vi.mock('@/composables/useMoonpayBridge', async () => {
  const ctx = await getContext();
  return {
    useMoonpayBridge: () => ({
      internalWallet: {
        isLoggedIn: ctx.computed(() => ctx.isLoggedInRef.value),
      },
      moonpayApi: ctx.computed(() => ctx.moonpayApiMock),
      withApi: ctx.withApiMock,
      initMoonpayApi: ctx.initMoonpayApiMock,
      showNotification: ctx.showNotificationMock,
      prepareMoonpayTxForBridgeTransfer: ctx.prepareMoonpayTxForBridgeTransferMock,
      setDialogVisibility: ctx.setDialogVisibilityMock,
      createTransactionsPolling: ctx.createTransactionsPollingMock,
      setNotificationVisibility: vi.fn(),
      setNotificationKey: vi.fn(),
      setBridgeTxData: vi.fn(),
      bridgeTransactionData: ctx.bridgeTransactionRef,
    }),
  };
});

const mountComponent = (
  props: {
    currencyCode?: 'eth';
    baseCurrencyAmount?: string;
    receivingAddress?: string;
    autoPrepareBridge?: boolean;
  } = {}
) => mount(Moonpay, { props });

const guidedProps = {
  currencyCode: 'eth' as const,
  baseCurrencyAmount: '25',
  receivingAddress: '0x' + '1'.repeat(40),
  autoPrepareBridge: false,
};
function guidedTransaction(overrides: Record<string, unknown> = {}): MoonpayTransaction {
  return {
    id: 'guided-new',
    createdAt: new Date(Date.now() + 1000).toISOString(),
    status: 'completed',
    currency: { code: 'eth', type: 'crypto' },
    baseCurrency: { code: 'usd', type: 'fiat' },
    baseCurrencyAmount: 25,
    areFeesIncluded: true,
    externalTransactionId: '5FAKEADDRESS',
    walletAddress: guidedProps.receivingAddress,
    ...overrides,
  } as unknown as MoonpayTransaction;
}

beforeEach(async () => {
  vi.useFakeTimers();

  const ctx = await getContext();
  ctx.reset();

  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleInfoSpy.mockRestore();
  vi.useRealTimers();
});

describe('Moonpay.vue', () => {
  it('rebuilds a closed guided checkout for the newly reviewed budget before reopening', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.dialogVisibility = false;
    ctx.moonpayApiMock.createWidgetUrl.mockImplementation(
      (params) => `https://widget.example?amount=${params.baseCurrencyAmount}`
    );
    const wrapper = mountComponent({ currencyCode: 'eth', baseCurrencyAmount: '25', autoPrepareBridge: false });
    await vi.runAllTimersAsync();
    ctx.state.moonpay.dialogVisibility = true;
    await wrapper.vm.$nextTick();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.state.moonpay.dialogVisibility = false;
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ baseCurrencyAmount: '30' });
    await vi.runAllTimersAsync();
    ctx.state.moonpay.dialogVisibility = true;
    await vi.runAllTimersAsync();

    expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('https://widget.example?amount=30');
    expect(ctx.stopPollingMock).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('resumes the same hidden checkout without replacing its iframe or polling window', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.moonpayApiMock.createWidgetUrl.mockClear();
    ctx.state.moonpay.dialogVisibility = false;
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ baseCurrencyAmount: '25.00' });
    ctx.state.moonpay.dialogVisibility = true;
    await vi.runAllTimersAsync();
    expect(ctx.createTransactionsPollingMock).toHaveBeenCalledTimes(1);
    expect(ctx.stopPollingMock).not.toHaveBeenCalled();
    expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('does not reload a visible checkout or complete a changed plan with its old purchase', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.moonpayApiMock.createWidgetUrl.mockClear();
    await wrapper.setProps({ baseCurrencyAmount: '30' });
    ctx.state.moonpay.transactions = [guidedTransaction()];
    await vi.runAllTimersAsync();
    expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
    expect(ctx.state.moonpay.dialogVisibility).toBe(true);
    expect(wrapper.emitted('completed')).toBeUndefined();
    ctx.state.moonpay.dialogVisibility = false;
    await vi.runAllTimersAsync();
    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseCurrencyAmount: '30' })
    );
    wrapper.unmount();
  });

  it('ignores delayed old-budget and old-window completions after a different budget is reopened', async () => {
    const ctx = await getContext();
    vi.setSystemTime(Date.parse('2026-09-25T00:00:00Z'));
    const originalCreatedAt = new Date().toISOString();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.state.moonpay.dialogVisibility = false;
    await wrapper.vm.$nextTick();
    vi.setSystemTime(Date.now() + 10_000);
    await wrapper.setProps({ baseCurrencyAmount: '30' });
    ctx.state.moonpay.dialogVisibility = true;
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.state.moonpay.transactions = [
      guidedTransaction({ id: 'old-budget' }),
      guidedTransaction({ id: 'old-window', baseCurrencyAmount: 30, createdAt: originalCreatedAt }),
    ];
    await vi.runAllTimersAsync();
    expect(wrapper.emitted('completed')).toBeUndefined();
    const current = guidedTransaction({ id: 'new-budget', baseCurrencyAmount: 30 });
    ctx.state.moonpay.transactions = [current];
    await vi.runAllTimersAsync();
    expect(wrapper.emitted('completed')).toEqual([[current]]);
    wrapper.unmount();
  });

  it.each([
    { currency: { code: 'eth_base', type: 'crypto' } },
    { currency: undefined },
    { baseCurrency: { code: 'eur', type: 'fiat' } },
    { baseCurrency: undefined },
    { baseCurrencyAmount: 30 },
    { baseCurrencyAmount: undefined },
    { areFeesIncluded: undefined },
    { areFeesIncluded: false },
    { areFeesIncluded: false, feeAmount: -1, extraFeeAmount: 0, networkFeeAmount: 1 },
    { externalTransactionId: 'another-sora-account' },
    { walletAddress: '0x' + '2'.repeat(40) },
    { walletAddress: undefined },
  ])('does not claim guided completion with mismatched or incomplete provider evidence (%j)', async (override) => {
    const ctx = await getContext();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.state.moonpay.transactions = [guidedTransaction(override)];
    await vi.runAllTimersAsync();
    expect(wrapper.emitted('completed')).toBeUndefined();
    expect(ctx.state.moonpay.dialogVisibility).toBe(true);
    wrapper.unmount();
  });

  it('matches the exact all-in USD budget when provider amounts exclude separate fees', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    const transaction = guidedTransaction({
      areFeesIncluded: false,
      baseCurrencyAmount: 21.21,
      feeAmount: 2.99,
      extraFeeAmount: 0.21,
      networkFeeAmount: 0.59,
    });
    ctx.state.moonpay.transactions = [transaction];
    await vi.runAllTimersAsync();
    expect(wrapper.emitted('completed')).toEqual([[transaction]]);
    wrapper.unmount();
  });

  it.each(['sora', 'ethereum'])('revokes and closes the old checkout when its %s account changes', async (kind) => {
    const ctx = await getContext();
    const wrapper = mountComponent(guidedProps);
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    if (kind === 'sora') ctx.walletStore.account = { address: '5OTHERACCOUNT' };
    else await wrapper.setProps({ receivingAddress: '0x' + '2'.repeat(40) });
    ctx.state.moonpay.transactions = [guidedTransaction()];
    await vi.runAllTimersAsync();
    expect(ctx.state.moonpay.dialogVisibility).toBe(false);
    expect(ctx.stopPollingMock).toHaveBeenCalled();
    expect(wrapper.emitted('completed')).toBeUndefined();
    wrapper.unmount();
  });

  it('stops a late-created polling handle after unmount rather than leaking it', async () => {
    const ctx = await getContext();
    let resolve!: (stop: () => void) => void;
    ctx.createTransactionsPollingMock.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const stop = vi.fn();
    const wrapper = mountComponent(guidedProps);
    wrapper.unmount();
    resolve(stop);
    await vi.runAllTimersAsync();
    expect(stop).toHaveBeenCalledOnce();
    expect(ctx.createTransactionsPollingMock).toHaveBeenCalledOnce();
  });

  it('initialises the widget URL via Moonpay API', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent();

    await vi.runAllTimersAsync();
    await wrapper.vm.$nextTick();

    expect(ctx.withApiMock).toHaveBeenCalledTimes(1);
    expect(ctx.initMoonpayApiMock).toHaveBeenCalled();
    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenCalledWith({
      colorCode: '#112233',
      externalTransactionId: '5FAKEADDRESS',
      language: 'en',
    });
    expect((wrapper.vm as unknown as { widgetUrl: string }).widgetUrl).toBe('https://widget.example');
    expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('https://widget.example');
  });

  it('matches the guided preview payment method and native Ethereum without unsigned address prefilling', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent({ currencyCode: 'eth' });

    await vi.runAllTimersAsync();

    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenCalledWith({
      colorCode: '#112233',
      externalTransactionId: '5FAKEADDRESS',
      language: 'en',
      currencyCode: 'eth',
      paymentMethod: 'credit_debit_card',
    });
    const params = ctx.moonpayApiMock.createWidgetUrl.mock.calls[0]?.[0];
    expect(params).not.toHaveProperty('walletAddress');
    expect(params).not.toHaveProperty('walletAddresses');
    expect(params).not.toHaveProperty('defaultCurrencyCode');
    expect(params).not.toHaveProperty('lockAmount');
    expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('https://widget.example');
    wrapper.unmount();
  });

  it.each(['xor', 'eth_base', 'ETH', '', 'eth&walletAddress=unexpected'])(
    'does not open an unrestricted purchase when the requested currency is invalid: %s',
    async (currencyCode) => {
      const ctx = await getContext();
      const wrapper = mountComponent({ currencyCode: currencyCode as 'eth' });

      await vi.runAllTimersAsync();

      expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
      expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('');
      wrapper.unmount();
    }
  );

  it('updates the currency lock while no purchase is being polled', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.dialogVisibility = false;
    const wrapper = mountComponent();
    await vi.runAllTimersAsync();

    await wrapper.setProps({ currencyCode: 'eth' });
    await vi.runAllTimersAsync();

    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenLastCalledWith({
      colorCode: '#112233',
      externalTransactionId: '5FAKEADDRESS',
      language: 'en',
      currencyCode: 'eth',
      paymentMethod: 'credit_debit_card',
    });
    wrapper.unmount();
  });

  it.each(['50', '50.25', '0.01'])(
    'carries the exact USD budget into the ETH widget: %s',
    async (baseCurrencyAmount) => {
      const ctx = await getContext();
      const wrapper = mountComponent({ currencyCode: 'eth', baseCurrencyAmount });
      await vi.runAllTimersAsync();
      const params = ctx.moonpayApiMock.createWidgetUrl.mock.calls[0]?.[0];
      expect(params).toMatchObject({
        currencyCode: 'eth',
        paymentMethod: 'credit_debit_card',
        baseCurrencyCode: 'usd',
        baseCurrencyAmount,
        lockAmount: true,
      });
      expect(params).not.toHaveProperty('walletAddress');
      expect(params).not.toHaveProperty('walletAddresses');
      expect(params).not.toHaveProperty('quoteCurrencyAmount');
      wrapper.unmount();
    }
  );

  it.each([
    '0',
    '0.00',
    '-1',
    '+1',
    '01',
    '.5',
    '5.',
    '1e2',
    'NaN',
    ' 20',
    '10.001',
    '',
    '9'.repeat(33),
    '20&walletAddress=bad',
  ])(
    'rejects a noncanonical or nonpositive USD budget without opening an unrestricted widget: %s',
    async (baseCurrencyAmount) => {
      const ctx = await getContext();
      const wrapper = mountComponent({ currencyCode: 'eth', baseCurrencyAmount });
      await vi.runAllTimersAsync();
      expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
      expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('');
      wrapper.unmount();
    }
  );

  it('requires an exact ETH lock when a USD budget is supplied', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent({ baseCurrencyAmount: '20' });
    await vi.runAllTimersAsync();
    expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('updates the budget before purchase while preserving a widget already polling a purchase', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.dialogVisibility = false;
    const wrapper = mountComponent({ currencyCode: 'eth', baseCurrencyAmount: '20' });
    await vi.runAllTimersAsync();
    await wrapper.setProps({ baseCurrencyAmount: '25.50' });
    await vi.runAllTimersAsync();
    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseCurrencyAmount: '25.50' })
    );
    ctx.state.moonpay.dialogVisibility = true;
    await wrapper.vm.$nextTick();
    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.moonpayApiMock.createWidgetUrl.mockClear();
    await wrapper.setProps({ baseCurrencyAmount: '30' });
    await vi.runAllTimersAsync();
    expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('keeps the current widget during an active purchase when the currency prop changes', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent({ currencyCode: 'eth' });
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.parse('2026-09-25T00:00:00.000Z');
    ctx.moonpayApiMock.createWidgetUrl.mockClear();

    await wrapper.setProps({ currencyCode: undefined });
    await vi.runAllTimersAsync();

    expect(ctx.moonpayApiMock.createWidgetUrl).not.toHaveBeenCalled();
    expect(wrapper.find('.iframe-widget').attributes('data-src')).toBe('https://widget.example');
    wrapper.unmount();
  });

  it('stops polling when the wallet disconnects', async () => {
    const ctx = await getContext();
    mountComponent();

    expect(ctx.createTransactionsPollingMock).toHaveBeenCalledTimes(1);

    ctx.isLoggedInRef.value = false;
    await vi.runAllTimersAsync();

    expect(ctx.stopPollingMock).toHaveBeenCalled();
  });

  it('prepares bridge transfer when a new completed transaction appears', async () => {
    const ctx = await getContext();
    vi.setSystemTime(Date.parse('2025-01-01T00:00:00.000Z'));
    mountComponent();

    ctx.state.moonpay.pollingTimestamp = Date.parse('2025-01-01T00:00:00.000Z');
    ctx.state.moonpay.transactions = [
      {
        id: 'tx-1',
        createdAt: '2025-01-01T00:00:01.000Z',
        status: 'completed',
      } as MoonpayTransaction,
    ];

    await vi.runAllTimersAsync();

    expect(ctx.setDialogVisibilityMock).toHaveBeenCalledWith(false);
    expect(ctx.showNotificationMock).toHaveBeenCalledWith(MoonpayNotifications.Success);
    expect(ctx.prepareMoonpayTxForBridgeTransferMock).toHaveBeenCalledWith(ctx.state.moonpay.transactions[0], true);
  });

  it('emits a provider-completed purchase without starting an ETH bridge in the guided flow', async () => {
    const ctx = await getContext();
    vi.setSystemTime(Date.parse('2025-01-01T00:00:00.000Z'));
    const wrapper = mountComponent({
      currencyCode: 'eth',
      baseCurrencyAmount: '25',
      receivingAddress: '0x' + '1'.repeat(40),
      autoPrepareBridge: false,
    });
    await vi.runAllTimersAsync();
    ctx.state.moonpay.pollingTimestamp = Date.parse('2025-01-01T00:00:00.000Z');
    const transaction = {
      id: 'guided-tx',
      createdAt: '2025-01-01T00:00:01.000Z',
      status: 'completed',
      currency: { code: 'eth', type: 'crypto' },
      baseCurrency: { code: 'usd', type: 'fiat' },
      baseCurrencyAmount: 25,
      areFeesIncluded: true,
      externalTransactionId: '5FAKEADDRESS',
      walletAddress: '0x' + '1'.repeat(40),
    } as MoonpayTransaction;
    ctx.state.moonpay.transactions = [transaction];
    await vi.runAllTimersAsync();

    expect(wrapper.emitted('completed')).toEqual([[transaction]]);
    expect(ctx.setDialogVisibilityMock).toHaveBeenCalledWith(false);
    expect(ctx.stopPollingMock).toHaveBeenCalled();
    expect(ctx.prepareMoonpayTxForBridgeTransferMock).not.toHaveBeenCalled();
    expect(ctx.showNotificationMock).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
