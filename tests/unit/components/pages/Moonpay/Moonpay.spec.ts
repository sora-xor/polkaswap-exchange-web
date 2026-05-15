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
    createWidgetUrl: vi.fn(() => 'https://widget.example'),
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
    moonpayStore.setDialogVisibility.mockClear();
    moonpayApiMock.createWidgetUrl.mockClear();
    initMoonpayApiMock.mockClear();
    showNotificationMock.mockClear();
    prepareMoonpayTxForBridgeTransferMock.mockClear();
    stopPollingMock.mockClear();
    setDialogVisibilityMock.mockClear();
    createTransactionsPollingMock.mockClear();
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

const mountComponent = () => mount(Moonpay);

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
});
