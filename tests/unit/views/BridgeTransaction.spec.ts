import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import BridgeTransactionPage from '@/features/bridge/pages/BridgeTransactionPage.vue';
import bridgeTransactionSource from '@/features/bridge/pages/BridgeTransactionPage.vue?raw';
import { resolveBridgeBackLocation } from '@/features/bridge/services/navigationHistory';
import en from '@/lang/en.json';
import { useBridgeStore } from '@/stores/bridge';
import { useWeb3Store } from '@/stores/web3';
import { SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY } from '@/utils/bridge/sub/reconciliation';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

const ss58Accounts = vi.hoisted(() => ({
  recorded: '5GrwvaEF5zXb26Fz9rcQpDWSg8M3r5LQhRL5WZrUKGQzFQY',
  other: '5FHneW46xGXgs5mUiveU4sbTyGBzmstU13MSDjaQtZpE9riLZ',
}));

const reportedLiberlandRecovery = {
  sourceHash: '0x792b4777454b691cf8a022e495d4dd84bf1ea04b41739731687f93913570a785',
  sourceAccount: '5E57f3YkfbVzZDQAyv2sQuvbzXC7BQYGCnZ7F2pYtD5coDg6',
  destinationAccount: 'cnTVhGvdvWxTYdh3e9fFukiTRpobzTj6foUEaFAkWDx5SmyGx',
} as const;

vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: async () => true,
  decodeAddress: (address: string) => {
    if (address === ss58Accounts.recorded) return new Uint8Array(32).fill(1);
    if (address === ss58Accounts.other) return new Uint8Array(32).fill(2);
    throw new Error('Invalid test SS58 account');
  },
}));

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
  const externalNetworkId = ref<number | string | null>(1);
  const externalNetworkType = ref<number | string>(1);
  const waitingForActionState = ref(false);
  const failedState = ref(false);
  const successState = ref(false);

  const navigateToBridge = vi.fn();
  const viewHistory = vi.fn();
  const connectEvmWallet = vi.fn();
  const connectSubWallet = vi.fn();
  const ensureEvmNetwork = vi.fn().mockResolvedValue(undefined);
  const formatStringValue = vi.fn((value: string, _decimals?: number) => `formatted:${value}`);
  const handleCopyAddress = vi.fn();
  const getNetworkExplorerLinks = vi.fn(() => [{ value: 'generated-external-link' }]);
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
    externalNetworkType,
    waitingForActionState,
    failedState,
    successState,
    navigateToBridge,
    viewHistory,
    connectEvmWallet,
    connectSubWallet,
    ensureEvmNetwork,
    formatStringValue,
    handleCopyAddress,
    getNetworkExplorerLinks,
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

vi.mock('@sora-substrate/sdk', async () => {
  const sdk = await vi.importActual<typeof import('@stubs/sora-sdk')>('@stubs/sora-sdk');

  return {
    ...sdk,
    isEthOperation: (operation: string) =>
      [sdk.Operation.EthBridgeIncoming, sdk.Operation.EthBridgeOutgoing].includes(operation),
    isSubstrateOperation: (operation: string) =>
      [sdk.Operation.SubstrateIncoming, sdk.Operation.SubstrateOutgoing].includes(operation),
  };
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
    TranslationConsts: {
      Sora: 'SORA',
    },
    formatter: {
      getNetworkIcon: vi.fn(() => 'sora'),
      getNetworkExplorerLinks: mocks.getNetworkExplorerLinks,
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
    externalNetworkType: mocks.externalNetworkType,
    txInternalAccount: computed(() => mocks.historyItem.value?.from ?? ''),
    txSoraId: computed(() => mocks.historyItem.value?.txId ?? ''),
    txSoraHash: computed(() => mocks.historyItem.value?.hash ?? ''),
    txInternalBlockId: computed(() => 'block-1'),
    txInternalBlockNumber: computed(() => 10),
    txInternalEventIndex: computed(() => 1),
    txExternalHash: computed(() => mocks.historyItem.value?.externalHash ?? ''),
    txExternalBlockNumber: computed(() => 20),
    txExternalBlockId: computed(() => mocks.historyItem.value?.externalBlockId ?? ''),
    txExternalEventIndex: computed(() => 1),
    internalExplorerLinks: computed(() => [{ value: 'internal-link' }]),
    externalExplorerLinks: computed(() => (mocks.historyItem.value?.externalHash ? [{ value: 'external-link' }] : [])),
    internalAccountLinks: computed(() => [{ value: 'internal-account' }]),
    externalAccountLinks: computed(() => [{ value: 'external-account' }]),
    getNetworkText: (text: string) => text,
    txExternalAccount: computed(() => mocks.historyItem.value?.to ?? ''),
  }),
}));

vi.mock('@/composables/useWeb3Connection', () => ({
  useWeb3Connection: () => ({
    connectEvmWallet: mocks.connectEvmWallet,
    connectSubWallet: mocks.connectSubWallet,
    ensureEvmNetwork: mocks.ensureEvmNetwork,
  }),
}));

vi.mock('@/composables/useCopyAddress', () => ({
  useCopyAddress: () => ({
    handleCopyAddress: mocks.handleCopyAddress,
    copyTooltip: (text: string) => `copy:${text}`,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: mocks.formatStringValue,
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
    isEvmAccount: () => false,
    isStandalone: (network: string) => network === 'Liberland',
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
    const txInProcess = computed(() => txTrackingIds.value.some((id) => Boolean(mocks.state.bridge.inProgressIds[id])));

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

const mountBridgeTransactionPage = () =>
  shallowMount(BridgeTransactionPage, {
    global: {
      stubs: {
        'generic-page-header': { template: '<div><slot /><slot name="back"></slot></div>' },
        'links-dropdown': { template: '<div class="links-dropdown" />' },
        'formatted-amount': { template: '<span class="formatted"><slot /></span>' },
        'info-line': {
          props: ['label', 'value'],
          template: '<div class="info-line">{{ label }} {{ value }}</div>',
        },
        's-button': {
          props: ['disabled'],
          emits: ['click'],
          template: '<button class="s-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        's-input': { template: '<input class="s-input" readonly />' },
        's-icon': { template: '<i />' },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

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
  mocks.externalNetworkType.value = 1;
  mocks.waitingForActionState.value = false;
  mocks.failedState.value = false;
  mocks.successState.value = false;
  mocks.state.bridge.waitingForApprove = {};
  mocks.state.bridge.inProgressIds = {};
  mocks.state.bridge.externalBlockNumber = 0;
  mocks.navigateToBridge.mockClear();
  mocks.viewHistory.mockClear();
  mocks.connectEvmWallet.mockClear();
  mocks.connectSubWallet.mockClear();
  mocks.handleCopyAddress.mockClear();
  mocks.getNetworkExplorerLinks.mockClear();
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

    it('renders visible transfer direction labels for bridge address rows', () => {
      expect(bridgeTransactionSource).toContain('transaction-address-label__direction');
      expect(bridgeTransactionSource).toContain("withAddressDirection(source, t('transaction.from'))");
      expect(bridgeTransactionSource).toContain("withAddressDirection(destination, t('transaction.to'))");
      expect(bridgeTransactionSource).toContain('buildBridgeAddressAriaLabel(direction, link.placeholder)');
    });

    it('renders pending bridge actions with a concrete network name', () => {
      expect(bridgeTransactionSource).toContain('{{ transactionPendingText }}');
      expect(bridgeTransactionSource).toContain(
        "t('bridgeTransaction.pending', { network: txPendingNetworkName.value })"
      );
    });

    it('starts bridge transaction processing without awaiting the full bridge state machine', () => {
      expect(bridgeTransactionSource).toContain('void bridgeStore');
      expect(bridgeTransactionSource).toContain('.handleBridgeTransaction(id)');
      expect(bridgeTransactionSource).not.toContain('await bridgeStore.handleBridgeTransaction');
    });

    it('keeps dark bridge recovery guidance visible against its status background', () => {
      expect(bridgeTransactionSource).toMatch(
        /\[design-system-theme='dark'\]\s*\{(?:(?!<\/style>)[\s\S])*?\.transaction-content\s+\.transaction-recovery\s*\{\s*color:\s*var\(--s-color-base-on-accent\);/
      );
    });

    it('resumes an evidenced failed Substrate incoming transfer without exposing a resend action', async () => {
      const transaction = createTransaction({
        id: 'reported-liberland-recovery',
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Failed',
        from: reportedLiberlandRecovery.destinationAccount,
        to: reportedLiberlandRecovery.sourceAccount,
        txId: reportedLiberlandRecovery.sourceHash,
        hash: '',
        externalHash: '',
        externalBlockId: '',
        blockId: '',
        errorMessage: 'Recorded attempt status is unknown.',
        payload: { startBlock: 100, submissionState: 'unknown' },
      });
      let resolveProcessing!: () => void;
      const processing = new Promise<void>((resolve) => {
        resolveProcessing = resolve;
      });

      mocks.historyItem.value = transaction;
      mocks.failedState.value = true;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      mocks.isValidNetwork.value = false;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;
      bridgeStore.handleBridgeTransaction = vi.fn(() => processing) as any;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();

      const recovery = wrapper.get('[data-testid="bridge-tracking-recovery"]');
      expect(recovery.text()).toContain('bridgeTransaction.recovery.failedTitle');
      expect(recovery.text()).toContain('bridgeTransaction.recovery.failedDescription');
      expect(recovery.text()).toContain('Recorded attempt status is unknown.');
      expect(recovery.get('.transaction-recovery__title').text().trim()).not.toBe('');
      expect(recovery.get('.transaction-recovery__description').text().trim()).not.toBe('');
      expect(wrapper.text()).toContain('bridgeTransaction.statuses.trackingInterrupted');
      expect(en.bridgeTransaction.recovery.resume).toContain('Retry');
      expect(en.bridgeTransaction.recovery.failedDescription).toContain('will not sign or send a transaction');
      expect(en.bridgeTransaction.recovery.failedDescription).toContain('transaction hashes');

      const sourceHashRow = wrapper
        .findAll('.transaction-hash-container')
        .find((row) => row.find('input').attributes('value') === `formatted:${reportedLiberlandRecovery.sourceHash}`);
      expect(sourceHashRow, wrapper.html()).toBeDefined();

      const resumeButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('bridgeTransaction.recovery.resume'));
      expect(resumeButton, wrapper.html()).toBeDefined();
      expect(resumeButton!.attributes('disabled')).toBeUndefined();

      await resumeButton!.trigger('click');
      await nextTick();

      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledWith(transaction.id);
      expect(bridgeStore.activeTransaction).toMatchObject({
        id: transaction.id,
        txId: reportedLiberlandRecovery.sourceHash,
        hash: '',
        externalHash: '',
        from: reportedLiberlandRecovery.destinationAccount,
        to: reportedLiberlandRecovery.sourceAccount,
      });
      expect(mocks.connectSubWallet).not.toHaveBeenCalled();
      expect(mocks.connectEvmWallet).not.toHaveBeenCalled();
      expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
      expect(recovery.text()).toContain('bridgeTransaction.recovery.resumingTitle');
      expect(recovery.text()).toContain('bridgeTransaction.recovery.resumingDescription');
      expect(recovery.text()).not.toContain('Recorded attempt status is unknown.');
      expect(resumeButton!.attributes()).toHaveProperty('disabled');

      resolveProcessing();
      await flushBridgePromises();
      await flushBridgePromises();

      expect(recovery.text()).toContain('bridgeTransaction.recovery.failedTitle');

      wrapper.unmount();
    });

    it('blocks a new transfer when a recorded source hash lacks automatic recovery coordinates', async () => {
      const transaction = createTransaction({
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Failed',
        txId: '0xambiguous-source-hash',
        hash: '',
        externalHash: '',
        externalBlockId: '',
        blockId: '',
        payload: { submissionState: 'unknown' },
      });

      mocks.historyItem.value = transaction;
      mocks.failedState.value = true;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();

      const recovery = wrapper.get('[data-testid="bridge-tracking-recovery"]');
      expect(recovery.text()).toContain('bridgeTransaction.recovery.manualTitle');
      expect(recovery.text()).toContain('bridgeTransaction.recovery.manualDescription');
      expect(wrapper.text()).toContain('bridgeTransaction.statuses.trackingInterrupted');
      expect(wrapper.text()).not.toContain('bridgeTransaction.recovery.resume');
      expect(wrapper.text()).not.toContain('bridgeTransaction.newTransaction');
      expect(en.bridgeTransaction.recovery.manualDescription).toContain('Do not send another Liberland transfer');
      expect(en.bridgeTransaction.recovery.manualDescription).toContain('both account addresses');
      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

      const sourceHashRow = wrapper
        .findAll('.transaction-hash-container')
        .find((row) => row.find('input').attributes('value') === 'formatted:0xambiguous-source-hash');
      expect(sourceHashRow, wrapper.html()).toBeDefined();
      expect(sourceHashRow!.find('.links-dropdown').exists()).toBe(true);
      expect(mocks.getNetworkExplorerLinks).toHaveBeenCalledWith(
        expect.objectContaining({
          networkType: 'Sub',
          networkId: 'Liberland',
          value: '0xambiguous-source-hash',
        })
      );

      await sourceHashRow!.get('.s-button--hash-copy').trigger('click');
      expect(mocks.handleCopyAddress.mock.calls.some(([value]) => value === '0xambiguous-source-hash')).toBe(true);

      wrapper.unmount();
    });

    it.each([
      {
        status: 'Failed',
        errorCode: 'SUB_BRIDGE_REQUEST_FAILED',
        titleKey: 'bridgeTransaction.recovery.rejectedTitle',
        descriptionKey: 'bridgeTransaction.recovery.rejectedDescription',
      },
      {
        status: 'Refunded',
        errorCode: 'SUB_BRIDGE_REQUEST_REFUNDED',
        titleKey: 'bridgeTransaction.recovery.refundedTitle',
        descriptionKey: 'bridgeTransaction.recovery.refundedDescription',
      },
    ])(
      'shows terminal $status guidance without another retry action',
      async ({ status, errorCode, titleKey, descriptionKey }) => {
        const transaction = createTransaction({
          type: 'SubstrateIncoming',
          externalNetwork: 'Liberland',
          externalNetworkType: 'Sub',
          transactionState: 'Failed',
          hash: '0xsora-request',
          errorMessage: errorCode,
          payload: { bridgeRecoveryStatus: status },
        });

        mocks.historyItem.value = transaction;
        mocks.failedState.value = true;
        mocks.isOutgoing.value = false;
        mocks.isEvmTxType.value = false;
        mocks.externalNetworkId.value = 'Liberland';
        mocks.externalNetworkType.value = 'Sub';
        bridgeStore.history.internal = { [transaction.id]: transaction } as any;
        bridgeStore.history.id = transaction.id;

        const wrapper = mountBridgeTransactionPage();
        await flushBridgePromises();

        const recovery = wrapper.get('[data-testid="bridge-tracking-recovery"]');
        expect(recovery.text()).toContain(titleKey);
        expect(recovery.text()).toContain(descriptionKey);
        expect(recovery.text()).not.toContain(errorCode);
        expect(wrapper.text()).not.toContain('bridgeTransaction.recovery.resume');
        expect(wrapper.text()).not.toContain('bridgeTransaction.newTransaction');
        expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

        wrapper.unmount();
      }
    );

    it('keeps terminal recovery guidance explicit about not resubmitting', () => {
      expect(en.bridgeTransaction.recovery.rejectedDescription).toContain('Do not send another Liberland transfer');
      expect(en.bridgeTransaction.recovery.refundedDescription).toContain('Do not send another Liberland transfer');
      expect(en.bridgeTransaction.recovery.rejectedDescription).toContain('transaction hashes');
      expect(en.bridgeTransaction.recovery.refundedDescription).toContain('transaction hashes');
    });

    it('does not offer tracking recovery for a failed Substrate incoming transfer without submission evidence', async () => {
      const transaction = createTransaction({
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Failed',
        txId: '',
        externalHash: '',
        externalBlockId: '',
        blockId: '',
        hash: '',
        payload: {},
      });

      mocks.historyItem.value = transaction;
      mocks.failedState.value = true;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();

      expect(wrapper.find('[data-testid="bridge-tracking-recovery"]').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('bridgeTransaction.recovery.resume');

      wrapper.unmount();
      await flushBridgePromises();

      expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
    });

    it('does not expose standalone recovery for an evidenced relay-chain transfer', async () => {
      const transaction = createTransaction({
        type: 'SubstrateIncoming',
        externalNetwork: 'Polkadot',
        externalNetworkType: 'Sub',
        transactionState: 'Failed',
        txId: '0xsubmitted-request',
      });

      mocks.historyItem.value = transaction;
      mocks.failedState.value = true;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Polkadot';
      mocks.externalNetworkType.value = 'Sub';
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();

      expect(wrapper.find('[data-testid="bridge-tracking-recovery"]').exists()).toBe(false);

      wrapper.unmount();
    });

    it('compares the recorded signer with the connected wallet and routes Substrate recovery correctly', () => {
      expect(bridgeTransactionSource).not.toContain('const externalAccount = bridgeTransaction.txExternalAccount');
      expect(bridgeTransactionSource).toContain(
        'areBridgeExternalAccountsEqual(txExternalAccount.value, currentExternalAccount.value)'
      );
      expect(bridgeTransactionSource).toContain('@click="connectExternalWallet"');
      expect(bridgeTransactionSource).toContain('connectSubWallet();');
      expect(bridgeTransactionSource).toMatch(
        /!txInProcess\.value\s*&&\s*isTxPending\.value\s*&&\s*!isAnotherExternalAddress\.value/
      );
    });

    it('renders display-only recovered history without auto-start, retry, resume, connect, or removal', async () => {
      const transaction = createTransaction({
        id: 'settlement-hash',
        txId: 'settlement-hash',
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Failed',
        hash: '',
        externalHash: '',
        externalBlockId: '',
        blockId: 'sora-block',
        payload: {
          startBlock: 100,
          submissionState: 'broadcast',
          subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
        },
      });

      mocks.historyItem.value = transaction;
      mocks.failedState.value = true;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();

      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();
      expect(wrapper.text()).not.toContain('retryText');
      expect(wrapper.text()).not.toContain('bridgeTransaction.recovery.resume');
      expect(wrapper.text()).not.toContain('connectWalletText');
      expect(wrapper.text()).not.toContain('changeAccountText');
      expect(wrapper.find('[data-testid="bridge-tracking-recovery"]').exists()).toBe(false);
      expect(
        wrapper
          .findAll('.transaction-hash-container')
          .some((row) => row.find('input').attributes('value') === 'formatted:settlement-hash')
      ).toBe(true);

      wrapper.unmount();
      await flushBridgePromises();

      expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
    });

    it('shows a corrected persisted Ethereum amount at destination precision without retrying a rejected request', async () => {
      const recipient = `0x${'1'.repeat(40)}`;
      const transaction = createTransaction({
        type: 'EthBridgeOutgoing',
        externalNetworkType: 'Eth',
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
        to: recipient,
        externalHash: '',
        amount2: '999999999999999999999999',
      });
      const proofAmount = '1.123456789012345678';

      mocks.historyItem.value = transaction;
      mocks.externalNetworkType.value = 'Eth';
      mocks.failedState.value = true;
      mocks.waitingForActionState.value = true;
      useWeb3Store().evmAddress = recipient;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();
      expect(wrapper.findAll('.header-details .formatted')[1].attributes('value')).toBe(
        `formatted:${transaction.amount2}`
      );

      // updateInternalHistory replaces the cached row after persisting the peer proof.
      bridgeStore.history.internal = { [transaction.id]: { ...transaction, amount2: proofAmount } } as any;
      await flushBridgePromises();
      expect(wrapper.findAll('.header-details .formatted')[1].attributes('value')).toBe(`formatted:${proofAmount}`);
      expect(mocks.formatStringValue).toHaveBeenCalledWith(proofAmount, 18);
      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

      // Correcting a wallet later must not bypass this row's explicit confirmation.
      useWeb3Store().evmAddress = `0x${'2'.repeat(40)}`;
      mocks.isValidNetwork.value = false;
      await flushBridgePromises();
      useWeb3Store().evmAddress = recipient;
      mocks.isValidNetwork.value = true;
      await flushBridgePromises();
      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('confirmTransactionText');

      wrapper.unmount();
    });

    it('switches a restored outgoing Hashi wallet network before confirming the existing Ethereum leg once', async () => {
      const recipient = `0x${'1'.repeat(40)}`;
      const transaction = createTransaction({
        type: 'EthBridgeOutgoing',
        externalNetworkType: 'Eth',
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
        to: recipient,
        externalHash: '',
      });
      const signedSoraHash = transaction.txId;
      const requestHash = transaction.hash;
      let finishNetworkChange!: () => void;
      let finishProcessing!: () => void;

      mocks.historyItem.value = transaction;
      mocks.externalNetworkType.value = 'Eth';
      mocks.failedState.value = true;
      mocks.waitingForActionState.value = true;
      mocks.isValidNetwork.value = false;
      useWeb3Store().evmAddress = recipient;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;
      bridgeStore.handleBridgeTransaction = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishProcessing = resolve;
          })
      ) as any;
      mocks.ensureEvmNetwork.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finishNetworkChange = resolve;
          })
      );

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();

      const changeNetwork = wrapper.findAll('button').find((button) => button.text() === 'changeNetworkText');
      expect(changeNetwork, wrapper.html()).toBeDefined();
      expect(changeNetwork!.attributes('disabled')).toBeUndefined();
      await Promise.all([changeNetwork!.trigger('click'), changeNetwork!.trigger('click')]);
      expect(mocks.ensureEvmNetwork).toHaveBeenCalledTimes(1);
      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

      mocks.isValidNetwork.value = true;
      finishNetworkChange();
      await flushBridgePromises();
      await flushBridgePromises();

      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();
      const confirm = wrapper.findAll('button').find((button) => button.text() === 'confirmTransactionText');
      expect(confirm, wrapper.html()).toBeDefined();
      await Promise.all([confirm!.trigger('click'), confirm!.trigger('click')]);

      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledWith(transaction.id);
      expect(bridgeStore.activeTransaction).toMatchObject({
        id: transaction.id,
        txId: signedSoraHash,
        hash: requestHash,
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
      });

      finishProcessing();
      await flushBridgePromises();
      wrapper.unmount();
      expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
    });

    it.each(['', `0x${'2'.repeat(40)}`])(
      'resumes a pending outgoing Hashi row only after account %s and network both match',
      async (connectedAccount) => {
        const recipient = `0x${'1'.repeat(40)}`;
        const transaction = createTransaction({
          type: 'EthBridgeOutgoing',
          externalNetworkType: 'Eth',
          transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          to: recipient,
          externalHash: '',
        });
        let finishProcessing!: () => void;

        mocks.historyItem.value = transaction;
        mocks.externalNetworkType.value = 'Eth';
        mocks.isValidNetwork.value = false;
        useWeb3Store().evmAddress = connectedAccount;
        bridgeStore.history.internal = { [transaction.id]: transaction } as any;
        bridgeStore.history.id = transaction.id;
        bridgeStore.handleBridgeTransaction = vi.fn(
          () =>
            new Promise<void>((resolve) => {
              finishProcessing = resolve;
            })
        ) as any;

        const wrapper = mountBridgeTransactionPage();
        await flushBridgePromises();
        await flushBridgePromises();

        const accountText = connectedAccount ? 'changeAccountText' : 'connectWalletText';
        const accountButton = wrapper.findAll('button').find((button) => button.text() === accountText);
        expect(accountButton, wrapper.html()).toBeDefined();
        await accountButton!.trigger('click');
        expect(mocks.connectEvmWallet).toHaveBeenCalledTimes(1);
        expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

        useWeb3Store().evmAddress = recipient;
        await flushBridgePromises();
        expect(wrapper.text()).toContain('changeNetworkText');
        expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

        mocks.isValidNetwork.value = true;
        await flushBridgePromises();
        expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
        expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledWith(transaction.id);

        mocks.isValidNetwork.value = false;
        await flushBridgePromises();
        mocks.isValidNetwork.value = true;
        await flushBridgePromises();
        expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
        expect(bridgeStore.activeTransaction?.txId).toBe(transaction.txId);
        expect(bridgeStore.activeTransaction?.hash).toBe(transaction.hash);

        finishProcessing();
        await flushBridgePromises();
        wrapper.unmount();
        expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
      }
    );

    it.each([ETH_BRIDGE_STATES.INITIAL, ETH_BRIDGE_STATES.SORA_PENDING, ETH_BRIDGE_STATES.EVM_PENDING])(
      'preserves outgoing Hashi processing in %s when the external wallet network differs',
      async (transactionState) => {
        const recipient = `0x${'1'.repeat(40)}`;
        const transaction = createTransaction({
          type: 'EthBridgeOutgoing',
          externalNetworkType: 'Eth',
          transactionState,
          to: recipient,
          ...(transactionState === ETH_BRIDGE_STATES.INITIAL ? { txId: '', hash: '' } : {}),
        });

        mocks.historyItem.value = transaction;
        mocks.externalNetworkType.value = 'Eth';
        mocks.isValidNetwork.value = false;
        useWeb3Store().evmAddress = recipient;
        bridgeStore.history.internal = { [transaction.id]: transaction } as any;
        bridgeStore.history.id = transaction.id;

        const wrapper = mountBridgeTransactionPage();
        await flushBridgePromises();
        await flushBridgePromises();

        expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
        expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledWith(transaction.id);
        expect(wrapper.text()).not.toContain('changeNetworkText');
        expect(mocks.ensureEvmNetwork).not.toHaveBeenCalled();
        wrapper.unmount();
      }
    );

    it('keeps a declined Ethereum network change retryable without processing the bridge transaction', async () => {
      const recipient = `0x${'1'.repeat(40)}`;
      const transaction = createTransaction({
        type: 'EthBridgeOutgoing',
        externalNetworkType: 'Eth',
        transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
        to: recipient,
        externalHash: '',
      });

      mocks.historyItem.value = transaction;
      mocks.externalNetworkType.value = 'Eth';
      mocks.isValidNetwork.value = false;
      mocks.ensureEvmNetwork.mockRejectedValue(Object.assign(new Error('User rejected'), { code: 4001 }));
      useWeb3Store().evmAddress = recipient;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();
      const changeNetwork = wrapper.findAll('button').find((button) => button.text() === 'changeNetworkText');
      expect(changeNetwork, wrapper.html()).toBeDefined();
      await changeNetwork!.trigger('click');
      await flushBridgePromises();

      expect(changeNetwork!.attributes('disabled')).toBeUndefined();
      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();
      wrapper.unmount();
      expect(bridgeStore.removeHistory).not.toHaveBeenCalled();
    });

    it('blocks unsigned Substrate auto-start and opens the Sub wallet for a mismatched signer', async () => {
      const transaction = createTransaction({
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Pending',
        to: ss58Accounts.recorded,
        txId: '',
        hash: '',
        externalHash: '',
        externalBlockId: '',
        blockId: '',
      });

      mocks.historyItem.value = transaction;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      useWeb3Store().subAddress = ss58Accounts.other;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();

      expect(bridgeStore.handleBridgeTransaction).not.toHaveBeenCalled();

      const accountButton = wrapper.findAll('button').find((button) => button.text().includes('changeAccountText'));
      expect(accountButton, wrapper.html()).toBeDefined();

      await accountButton!.trigger('click');
      expect(mocks.connectSubWallet).toHaveBeenCalledTimes(1);
      expect(mocks.connectEvmWallet).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('auto-starts an unsigned Substrate transfer for the matching signer', async () => {
      const transaction = createTransaction({
        type: 'SubstrateIncoming',
        externalNetwork: 'Liberland',
        externalNetworkType: 'Sub',
        transactionState: 'Pending',
        to: ss58Accounts.recorded,
        txId: '',
        hash: '',
        externalHash: '',
        externalBlockId: '',
        blockId: '',
      });

      mocks.historyItem.value = transaction;
      mocks.isOutgoing.value = false;
      mocks.isEvmTxType.value = false;
      mocks.externalNetworkId.value = 'Liberland';
      mocks.externalNetworkType.value = 'Sub';
      useWeb3Store().subAddress = ss58Accounts.recorded;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;

      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      await flushBridgePromises();

      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledTimes(1);
      expect(bridgeStore.handleBridgeTransaction).toHaveBeenCalledWith(transaction.id);

      wrapper.unmount();
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

    it('keeps the generic recovery return neutral without adopting unreviewed history', async () => {
      useGetTsPlan().clearPlan();
      const purchase = useGetTsPlan('xor');
      purchase.clearPlan();
      const hash = `0x${'1'.repeat(64)}`;
      const transaction = createTransaction({
        id: 'generic-row',
        externalHash: hash,
        payload: { buyXorFunding: 'ethereum-dai-v1' },
      });
      mocks.historyItem.value = transaction;
      bridgeStore.history.internal = { [transaction.id]: transaction } as any;
      bridgeStore.history.id = transaction.id;
      const wrapper = mountBridgeTransactionPage();
      await flushBridgePromises();
      expect(purchase.plan.value.references.bridge).toBeUndefined();
      expect(useGetTsPlan().plan.value.references).toEqual({});
      (wrapper.vm as any).handleBack();
      expect(mocks.routerPush).toHaveBeenCalledWith({ path: '/bridge/history', query: { buyXor: '1' } });
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
