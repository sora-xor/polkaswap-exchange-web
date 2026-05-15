import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import bridgeTransactionSource from '@/features/bridge/pages/BridgeTransactionPage.vue?raw';
import { resolveBridgeBackLocation } from '@/features/bridge/services/navigationHistory';
import { useBridgeStore } from '@/stores/bridge';

const createMocks = () => {
  const historyItem = ref<any | null>(null);
  const externalAccount = ref('');
  const asset = ref<any | null>({
    address: '0xasset',
    externalAddress: '0xasset-ext',
    symbol: 'VAL',
    decimals: 12,
    externalDecimals: 18,
  });
  const nativeToken = ref<any | null>({
    address: '0xnative',
    externalAddress: '0xnative-ext',
    symbol: 'ETH',
    decimals: 18,
    externalDecimals: 18,
  });
  const xor = ref<any | null>({
    address: 'xor',
    externalAddress: '',
    symbol: 'XOR',
    decimals: 12,
    externalDecimals: 12,
  });

  const isValidNetwork = ref(true);
  const externalNativeBalance = ref('0');
  const isNativeTokenSelected = ref(false);
  const greaterThanMax = ref(false);
  const lowerThanMin = ref(false);
  const insufficientBalance = ref(false);
  const insufficientXor = ref(false);
  const insufficientNative = ref(false);

  const isOutgoing = ref(true);
  const isEvmTxType = ref(true);
  const externalNetworkId = ref<number | null>(1);
  const waitingForActionState = ref(false);
  const failedState = ref(false);
  const successState = ref(false);

  const navigateToBridge = vi.fn();
  const viewHistory = vi.fn();
  const connectEvmWallet = vi.fn();
  const withParentLoading = vi.fn(async (cb: () => Promise<void> | void) => {
    await Promise.resolve();
    return cb();
  });
  const routerPush = vi.fn();

  const state = reactive({
    bridge: {
      waitingForApprove: {} as Record<string, boolean>,
      inProgressIds: {} as Record<string, boolean>,
      externalBlockNumber: 0,
    },
  });

  const store = {
    state,
    getters: {
      bridge: {
        get historyItem() {
          return historyItem.value;
        },
        get externalAccount() {
          return externalAccount.value;
        },
      },
    },
    dispatch: {
      bridge: {
        handleBridgeTransaction: vi.fn().mockResolvedValue(undefined),
        removeHistory: vi.fn().mockResolvedValue(undefined),
      },
    },
    commit: {
      bridge: {
        setHistoryId: vi.fn(),
      },
    },
  };

  return {
    historyItem,
    externalAccount,
    asset,
    nativeToken,
    xor,
    isValidNetwork,
    externalNativeBalance,
    isNativeTokenSelected,
    greaterThanMax,
    lowerThanMin,
    insufficientBalance,
    insufficientXor,
    insufficientNative,
    isOutgoing,
    isEvmTxType,
    externalNetworkId,
    waitingForActionState,
    failedState,
    successState,
    navigateToBridge,
    viewHistory,
    connectEvmWallet,
    withParentLoading,
    routerPush,
    store,
    state,
  };
};

let mocks: ReturnType<typeof createMocks>;
let bridgeStore: ReturnType<typeof useBridgeStore>;

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: {
    Eth: 'Eth',
    Evm: 'Evm',
    Sub: 'Sub',
  },
  BridgeTxStatus: {
    Done: 'Done',
    Failed: 'Failed',
    Pending: 'Pending',
    Ready: 'ApprovalsReady',
    Frozen: 'Frozen',
    Broken: 'Broken',
  },
  BridgeTxDirection: {
    Outgoing: 'Outgoing',
    Incoming: 'Incoming',
  },
}));

vi.mock('vue-router', () => {
  const { defineComponent, h } = require('vue') as typeof import('vue');
  return {
    useRouter: () => ({
      push: (location: unknown) => mocks.routerPush(location),
    }),
    RouterLink: defineComponent({
      name: 'RouterLinkStub',
      setup(_, { slots }) {
        return () => h('a', slots.default?.() ?? []);
      },
    }),
  };
});

vi.mock('@/composables/useBridgeCore', () => ({
  useBridgeCore: () => ({
    handleViewTransactionsHistory: mocks.viewHistory,
    navigateToBridge: mocks.navigateToBridge,
    asset: mocks.asset,
    nativeToken: mocks.nativeToken,
    nativeTokenSymbol: computed(() => mocks.nativeToken.value?.symbol ?? ''),
    nativeTokenDecimals: computed(() => mocks.nativeToken.value?.externalDecimals ?? 18),
    isValidNetwork: mocks.isValidNetwork,
    externalNativeBalance: mocks.externalNativeBalance,
    isNativeTokenSelected: mocks.isNativeTokenSelected,
    xor: mocks.xor,
    externalNetworkFee: computed(() => mocks.historyItem.value?.externalNetworkFee ?? '0'),
    soraNetworkFee: computed(() => mocks.historyItem.value?.soraNetworkFee ?? '0'),
    getTransferMaxAmount: vi.fn(() => null),
    getTransferMinAmount: vi.fn(() => null),
    isGreaterThanTransferMaxAmount: vi.fn(() => mocks.greaterThanMax.value),
    isLowerThanTransferMinAmount: vi.fn(() => mocks.lowerThanMin.value),
  }),
}));

vi.mock('@/composables/useBridgeTransaction', () => ({
  useBridgeTransaction: () => ({
    formatter: {
      getNetworkIcon: vi.fn(() => 'sora'),
      getNetworkExplorerLinks: vi.fn(() => []),
      getNetworkName: vi.fn(() => 'Ethereum'),
      getNetworkText: (text: string) => text,
      formatDatetime: vi.fn(() => 'formatted-date'),
      isFailedState: (item?: any | null) => mocks.failedState.value && !!item,
      isSuccessState: (item?: any | null) => mocks.successState.value && !!item,
      isWaitingForActionState: (item?: any | null) => mocks.waitingForActionState.value && !!item,
    },
    isOutgoing: mocks.isOutgoing,
    isEvmTxType: mocks.isEvmTxType,
    externalNetworkId: mocks.externalNetworkId,
    externalNetworkType: ref(1),
    txInternalAccount: computed(() => mocks.historyItem.value?.from ?? ''),
    txSoraId: computed(() => mocks.historyItem.value?.txId ?? ''),
    txSoraHash: computed(() => mocks.historyItem.value?.hash ?? ''),
    txInternalBlockId: computed(() => 'block-1'),
    txInternalBlockNumber: computed(() => 10),
    txInternalEventIndex: computed(() => 1),
    txExternalHash: computed(() => mocks.historyItem.value?.externalHash ?? ''),
    txExternalBlockNumber: computed(() => 20),
    txExternalBlockId: computed(() => 'external-block'),
    txExternalEventIndex: computed(() => 1),
    internalExplorerLinks: computed(() => [{ value: 'internal-link' }]),
    externalExplorerLinks: computed(() => [{ value: 'external-link' }]),
    internalAccountLinks: computed(() => [{ value: 'internal-account' }]),
    externalAccountLinks: computed(() => [{ value: 'external-account' }]),
    getNetworkText: (text: string) => text,
    txExternalAccount: computed(() => mocks.historyItem.value?.to ?? ''),
  }),
}));

vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: () => ({ connectEvmWallet: mocks.connectEvmWallet }),
}));

vi.mock('@/composables/useCopyAddress', () => ({
  useCopyAddress: () => ({
    handleCopyAddress: vi.fn(),
    copyTooltip: (text: string) => `copy:${text}`,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: (value: string) => `formatted:${value}`,
    formatCodecNumber: (value: string) => `formatted:${value}`,
    getFiatAmountByString: () => 'fiat:value',
    getFiatAmountByCodecString: () => 'fiat:value',
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({ withParentLoading: mocks.withParentLoading }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
  }),
}));

vi.mock('@/utils', () => ({
  formatAddress: (value: string) => `formatted:${value}`,
  hasInsufficientBalance: () => mocks.insufficientBalance.value,
  hasInsufficientNativeTokenForFee: () => mocks.insufficientNative.value,
  hasInsufficientXorForFee: () => mocks.insufficientXor.value,
  asZeroValue: (value: string | null | undefined) => !value || /^0(?:\.0+)?$/.test(value),
  getAssetBalance: () => null,
  getMaxBalance: () => ({
    sub: () => ({
      max: () => ({
        toString: () => '0',
        dp: () => ({ toString: () => '0' }),
      }),
    }),
  }),
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: {
    getSoraParachain: () => null,
  },
}));

const createTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  amount: '1',
  amount2: '1',
  assetAddress: '0xasset',
  from: '5sender',
  to: '0xrecipient',
  txId: '0xsoraId',
  hash: '0xsoraHash',
  transactionState: 'Pending',
  externalNetwork: 1,
  externalNetworkType: 1,
  externalHash: '0xexternalHash',
  soraNetworkFee: '10',
  externalNetworkFee: '100',
  ...overrides,
});

const TestBridgeTransaction = defineComponent({
  name: 'TestBridgeTransaction',
  setup() {
    const historyItem = mocks.historyItem;

    const isAnotherEvmAddress = computed(() => {
      if (!mocks.isEvmTxType.value) return false;
      const target = historyItem.value?.to ?? '';
      const current = mocks.externalAccount.value ?? '';
      if (!target || !current) return false;
      return target.toLowerCase() !== current.toLowerCase();
    });

    const isTxPending = computed(
      () => !mocks.failedState.value && !mocks.successState.value && !mocks.waitingForActionState.value
    );
    const txTrackingIds = computed(() => {
      const item = historyItem.value;
      const ids = [item?.id, item?.hash, item?.txId, item?.externalHash].filter(
        (value): value is string => typeof value === 'string' && value.length > 0
      );

      return [...new Set(ids)];
    });
    const txInProcess = computed(() =>
      txTrackingIds.value.some((id) => Boolean(mocks.state.bridge.inProgressIds[id]))
    );

    const confirmationButtonDisabled = computed(
      () =>
        !(mocks.isOutgoing.value || mocks.isValidNetwork.value) ||
        isAnotherEvmAddress.value ||
        mocks.insufficientBalance.value ||
        mocks.greaterThanMax.value ||
        mocks.lowerThanMin.value ||
        mocks.insufficientXor.value ||
        mocks.insufficientNative.value ||
        isTxPending.value
    );

    const handleViewTransactionsHistory = () => {
      mocks.viewHistory();
    };

    const handleBack = () => {
      const backLocation = resolveBridgeBackLocation();
      if (backLocation) {
        mocks.routerPush(backLocation);
        return;
      }
      mocks.navigateToBridge();
    };

    const connectEvmWallet = () => {
      mocks.connectEvmWallet();
    };

    onMounted(async () => {
      if (!historyItem.value) {
        mocks.navigateToBridge();
        return;
      }

      await mocks.withParentLoading(async () => {
        const id = historyItem.value?.id;
        if (id && !txInProcess.value) {
          await mocks.store.dispatch.bridge.handleBridgeTransaction(id);
        }
      });
    });

    onBeforeUnmount(() => {
      const id = historyItem.value?.id;
      if (!id) return;
      if (txInProcess.value) return;

      mocks.store.commit.bridge.setHistoryId();
    });

    return {
      isAnotherEvmAddress,
      confirmationButtonDisabled,
      handleViewTransactionsHistory,
      handleBack,
      connectEvmWallet,
    };
  },
  render() {
    return null;
  },
});

const flushBridgePromises = async () => {
  await nextTick();
  await Promise.resolve();
};

const mountView = async () => {
  return shallowMount(TestBridgeTransaction, {
    global: {
      stubs: {
        'generic-page-header': { template: '<div><slot /><slot name="back"></slot></div>' },
        'links-dropdown': { template: '<div class="links-dropdown" />' },
        'formatted-amount': { template: '<span class="formatted" />' },
        'info-line': { template: '<div class="info-line" />' },
        's-button': { template: '<button class="s-button" @click="$emit(\'click\')">' + '<slot /></button>' },
        's-input': { template: '<input class="s-input" readonly />' },
        's-icon': { template: '<i />' },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });
};

beforeEach(() => {
  setActivePinia(createPinia());
  bridgeStore = useBridgeStore();

  mocks = createMocks();
  mocks.historyItem.value = createTransaction();
  mocks.externalAccount.value = '0xrecipient';
  mocks.asset.value = { ...mocks.asset.value };
  mocks.nativeToken.value = { ...mocks.nativeToken.value };
  mocks.xor.value = { ...mocks.xor.value };
  mocks.isValidNetwork.value = true;
  mocks.externalNativeBalance.value = '0';
  mocks.isNativeTokenSelected.value = false;
  mocks.greaterThanMax.value = false;
  mocks.lowerThanMin.value = false;
  mocks.insufficientBalance.value = false;
  mocks.insufficientXor.value = false;
  mocks.insufficientNative.value = false;
  mocks.isOutgoing.value = true;
  mocks.isEvmTxType.value = true;
  mocks.externalNetworkId.value = 1;
  mocks.waitingForActionState.value = false;
  mocks.failedState.value = false;
  mocks.successState.value = false;
  mocks.state.bridge.waitingForApprove = {};
  mocks.state.bridge.inProgressIds = {};
  mocks.state.bridge.externalBlockNumber = 0;
  mocks.navigateToBridge.mockClear();
  mocks.viewHistory.mockClear();
  mocks.connectEvmWallet.mockClear();
  mocks.withParentLoading.mockClear();
  mocks.routerPush.mockClear();
  window.history.replaceState({}, '', '/bridge/transaction');
  bridgeStore.history.internal = { [mocks.historyItem.value.id]: mocks.historyItem.value } as any;
  bridgeStore.history.id = mocks.historyItem.value.id;
  bridgeStore.handleBridgeTransaction = vi.fn().mockResolvedValue(undefined) as any;
  bridgeStore.removeHistory = vi.fn().mockResolvedValue(undefined) as any;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe(
  'BridgeTransaction.vue',
  {
    timeout: 10000,
  },
  () => {
    it('redirects to bridge when no transaction is selected', async () => {
      mocks.historyItem.value = null;

      const wrapper = await mountView();
      await flushBridgePromises();

      expect(mocks.navigateToBridge).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('keeps the formatted amount refs from shadowing the formatted-amount component tag', () => {
      expect(bridgeTransactionSource).toContain('<formatted-amount');
      expect(bridgeTransactionSource).not.toMatch(/const\s+formattedAmount\s*=/);
      expect(bridgeTransactionSource).not.toMatch(/const\s+formattedAmountReceived\s*=/);
    });

    it('keeps bridge address rows on the design-system pressed surface', () => {
      expect(bridgeTransactionSource.match(/class="transaction-address"/g)).toHaveLength(2);
      expect(bridgeTransactionSource).toContain('--transaction-address-action-size: var(--s-size-small)');
      expect(bridgeTransactionSource).toContain('box-shadow: var(--s-shadow-element-pressed)');
    });

    it('triggers wallet connect when an EVM account mismatch is detected', async () => {
      mocks.historyItem.value = createTransaction({ to: '0xother' });
      mocks.externalAccount.value = '0xcurrent';
      mocks.isOutgoing.value = false;

      const wrapper = await mountView();
      await flushBridgePromises();

      expect((wrapper.vm as any).isAnotherEvmAddress).toBe(true);

      await (wrapper.vm as any).connectEvmWallet();
      expect(mocks.connectEvmWallet).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('disables confirmation when balance guard detects insufficient funds', async () => {
      mocks.insufficientBalance.value = true;

      const wrapper = await mountView();
      await flushBridgePromises();

      expect((wrapper.vm as any).confirmationButtonDisabled).toBe(true);

      wrapper.unmount();
    });

    it('navigates to history when history handler is invoked', async () => {
      const wrapper = await mountView();
      await flushBridgePromises();

      (wrapper.vm as any).handleViewTransactionsHistory();
      expect(mocks.viewHistory).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('falls back to bridge view when no previous route is stored', async () => {
      const wrapper = await mountView();
      await flushBridgePromises();

      (wrapper.vm as any).handleBack();
      expect(mocks.navigateToBridge).toHaveBeenCalledTimes(1);
      expect(mocks.routerPush).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('uses browser history back location when available', async () => {
      window.history.replaceState({ back: '/bridge/history' }, '', '/bridge/transaction');

      const wrapper = await mountView();
      await flushBridgePromises();

      (wrapper.vm as any).handleBack();
      expect(mocks.routerPush).toHaveBeenCalledWith('/bridge/history');
      expect(mocks.navigateToBridge).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('keeps the selected transaction id when an in-progress transaction page unmounts', async () => {
      mocks.state.bridge.inProgressIds = {
        [mocks.historyItem.value.id]: true,
      };

      const wrapper = await mountView();
      await flushBridgePromises();

      wrapper.unmount();

      expect(mocks.store.commit.bridge.setHistoryId).not.toHaveBeenCalled();
    });

    it('keeps the selected transaction id when progress is tracked by a chain alias', async () => {
      mocks.state.bridge.inProgressIds = {
        [mocks.historyItem.value.hash]: true,
      };

      const wrapper = await mountView();
      await flushBridgePromises();

      wrapper.unmount();

      expect(mocks.store.commit.bridge.setHistoryId).not.toHaveBeenCalled();
    });

    it('clears the selected transaction id when an inactive transaction page unmounts', async () => {
      const wrapper = await mountView();
      await flushBridgePromises();

      wrapper.unmount();

      expect(mocks.store.commit.bridge.setHistoryId).toHaveBeenCalledWith();
    });
  }
);
