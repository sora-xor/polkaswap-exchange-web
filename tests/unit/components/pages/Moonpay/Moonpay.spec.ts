import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MoonpayNotifications } from '@/components/pages/Moonpay/consts';
import Moonpay from '@/components/pages/Moonpay/Moonpay.vue';

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

  const store = {
    state,
    getters: {
      libraryTheme: 'light',
      wallet: {
        account: {
          account: { address: '5FAKEADDRESS' },
          isLoggedIn: true,
        },
      },
    },
  };

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
    store,
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

vi.mock('@/store', async () => {
  const ctx = await getContext();
  return {
    default: ctx.store,
  };
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: {
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
    },
  });
});

vi.mock('@/router', () => ({
  lazyComponent: (name: string) => {
    if (name === 'shared/Widget/IFrame') {
      return {
        name: 'IFrameWidgetStub',
        props: {
          src: {
            type: String,
            default: '',
          },
        },
        template: '<div class="iframe-widget" :data-src="src" />',
      };
    }

    return {
      name: 'LazyComponentStub',
      template: '<div class="lazy-component-stub"><slot /></div>',
    };
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
  consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  const ctx = await getContext();
  ctx.reset();
});

afterEach(() => {
  vi.useRealTimers();
  consoleInfoSpy.mockRestore();
});

describe('Moonpay.vue', () => {
  it('initialises the widget URL via Moonpay API', async () => {
    const ctx = await getContext();
    const wrapper = mountComponent();

    await (await import('vue')).nextTick();
    vi.runAllTimers();
    await (await import('vue')).nextTick();

    expect(ctx.withApiMock).toHaveBeenCalled();
    expect(ctx.initMoonpayApiMock).toHaveBeenCalled();
    expect(ctx.moonpayApiMock.createWidgetUrl).toHaveBeenCalledWith({
      colorCode: '#112233',
      externalTransactionId: ctx.store.getters.wallet.account.account.address,
      language: 'en',
    });
    expect((wrapper.vm as unknown as { widgetUrl: string }).widgetUrl).toBe('https://widget.example');
  });

  it('starts polling when dialog becomes visible without timestamp', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.pollingTimestamp = 0;
    ctx.state.moonpay.dialogVisibility = true;

    mountComponent();
    await (await import('vue')).nextTick();

    expect(ctx.createTransactionsPollingMock).toHaveBeenCalledTimes(1);
  });

  it('handles completed transactions by preparing bridge transfer', async () => {
    const ctx = await getContext();
    ctx.state.moonpay.pollingTimestamp = 0;
    ctx.state.moonpay.dialogVisibility = true;

    mountComponent();
    await (await import('vue')).nextTick();

    expect(ctx.createTransactionsPollingMock).toHaveBeenCalledTimes(1);

    ctx.state.moonpay.pollingTimestamp = Date.now();
    ctx.state.moonpay.transactions = [
      {
        id: 'tx-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
        walletAddress: '0x123',
        baseCurrencyId: 'usd',
        baseCurrencyAmount: 100,
        currencyId: 'xor',
        quoteCurrencyAmount: 1,
        returnUrl: 'https://return.example',
      } as MoonpayTransaction,
    ];

    const { nextTick } = await import('vue');
    await nextTick();
    await nextTick();

    expect(ctx.setDialogVisibilityMock).toHaveBeenCalledWith(false);
    expect(ctx.stopPollingMock).toHaveBeenCalled();
    expect(ctx.showNotificationMock).toHaveBeenCalledWith(MoonpayNotifications.Success);
    expect(ctx.prepareMoonpayTxForBridgeTransferMock).toHaveBeenCalledWith(ctx.state.moonpay.transactions[0], true);
  });
});
