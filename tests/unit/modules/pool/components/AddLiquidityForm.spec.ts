import { Operation } from '@sora-substrate/sdk';
import { computed, defineComponent, ref, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddLiquidityFocusedField as FocusedField } from '@/stores/pool/types';

type TokenRef = Ref<{ address: string; symbol: string } | null>;

let allowFeePopupRef: Ref<boolean>;
const isXorSufficientForNextTxMock = vi.fn(() => true);

let showWarningFeeDialogRef: Ref<boolean>;
let isWarningFeeDialogConfirmedRef: Ref<boolean>;
const openWarningFeeDialogMock = vi.fn(() => {
  showWarningFeeDialogRef.value = true;
});
const closeWarningFeeDialogMock = vi.fn(() => {
  showWarningFeeDialogRef.value = false;
});
const waitOnFeeWarningConfirmationMock = vi.fn(() => Promise.resolve());

const withNotificationsMock = vi.fn(async (handler: () => Promise<void> | void) => {
  await handler();
});

let addLiquidityMock: ReturnType<typeof vi.fn>;
let setFirstTokenAddressMock: ReturnType<typeof vi.fn>;
let setSecondTokenAddressMock: ReturnType<typeof vi.fn>;
let setFirstTokenValueMock: ReturnType<typeof vi.fn>;
let setSecondTokenValueMock: ReturnType<typeof vi.fn>;
let updateSubscriptionsMock: ReturnType<typeof vi.fn>;
let resetSubscriptionsMock: ReturnType<typeof vi.fn>;
let setFocusedFieldMock: ReturnType<typeof vi.fn>;

let firstTokenRef: TokenRef;
let secondTokenRef: TokenRef;
let firstTokenValueRef: Ref<string>;
let secondTokenValueRef: Ref<string>;
let networkFeeRef: Ref<string>;
let networkFeesRef: Ref<Record<string, string>>;
let emptyAssetsRef: Ref<boolean>;
let isAvailableRef: Ref<boolean>;

let storeState: {
  addLiquidity: {
    focusedField: FocusedField | null;
  };
  settings: {
    slippageTolerance: string;
  };
  wallet: {
    account: {
      isLoggedIn: boolean;
    };
    transactions: {
      isConfirmTxDialogDisabled: boolean;
    };
    settings: {
      shouldBalanceBeHidden: boolean;
    };
  };
};

const storeGetters = vi.hoisted(() => ({
  addLiquidity: {
    shareOfPool: '10',
    liquidityInfo: null,
    isNotFirstLiquidityProvider: false,
  },
  wallet: {
    account: {
      isLoggedIn: true,
    },
  },
  settings: {
    nodeIsConnected: true,
  },
  assets: {
    xor: {
      address: 'xor',
      symbol: 'XOR',
      balance: { transferable: '1000000000000000000' },
    },
  },
}));

let storeCommit: any;
let storeDispatch: any;

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    formatCodecNumber: (value: string) => `formatted-${value}`,
    getFPNumber: (value: string | number) => ({ toString: () => String(value ?? 0) }),
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  __esModule: true,
  useTransaction: () => ({
    loading: ref(false),
    withNotifications: withNotificationsMock,
  }),
}));

vi.mock('@/composables/useNetworkFeeWarning', () => ({
  __esModule: true,
  useNetworkFeeWarning: () => ({
    allowFeePopup: allowFeePopupRef,
    isXorSufficientForNextTx: isXorSufficientForNextTxMock,
    networkFees: networkFeesRef,
  }),
}));

vi.mock('@/composables/useNetworkFeeDialog', () => ({
  __esModule: true,
  useNetworkFeeDialog: () => ({
    showWarningFeeDialog: showWarningFeeDialogRef,
    isWarningFeeDialogConfirmed: isWarningFeeDialogConfirmedRef,
    openWarningFeeDialog: openWarningFeeDialogMock,
    closeWarningFeeDialog: closeWarningFeeDialogMock,
    confirmNetworkFeeWariningDialog: vi.fn(() => {
      isWarningFeeDialogConfirmedRef.value = true;
      showWarningFeeDialogRef.value = false;
    }),
    waitOnFeeWarningConfirmation: waitOnFeeWarningConfirmationMock,
  }),
}));

vi.mock('@/composables/useTokenSelect', () => ({
  __esModule: true,
  useTokenSelect: () => ({
    isSelectAssetLoading: ref(false),
    withSelectAssetLoading: async (handler: () => Promise<void>) => {
      await handler();
    },
  }),
}));

vi.mock('@/modules/pool/composables/usePoolTokenPair', () => ({
  __esModule: true,
  usePoolTokenPair: () => ({
    firstToken: firstTokenRef,
    secondToken: secondTokenRef,
    firstTokenValue: firstTokenValueRef,
    secondTokenValue: secondTokenValueRef,
    formattedPrice: ref('formatted-price'),
    formattedPriceReversed: ref('formatted-price-reversed'),
    networkFee: networkFeeRef,
    networkFees: networkFeesRef,
    emptyAssets: emptyAssetsRef,
    isAvailable: isAvailableRef,
    price: ref('1'),
    priceReversed: ref('1'),
  }),
}));

vi.mock('@/utils', () => ({
  __esModule: true,
  getMaxValue: () => '999',
  isMaxButtonAvailable: () => true,
  hasInsufficientBalance: () => false,
  getAssetBalance: () => '0',
}));

vi.mock('@/utils/sanitize', () => ({
  __esModule: true,
  sanitizeHtml: (value: string) => value,
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () =>
    defineComponent({
      name: 'LazyStub',
      emits: ['update:visible', 'confirm', 'input', 'focus', 'max', 'select'],
      props: ['visible', 'parentLoading', 'fee', 'infoOnly', 'token', 'value', 'max', 'connected'],
      template: '<div class="lazy-stub"><slot /><slot name="footer" /></div>',
    }),
}));

vi.mock('@/modules/pool/router', () => ({
  __esModule: true,
  poolLazyComponent: () =>
    defineComponent({
      name: 'PoolLazyStub',
      emits: ['update:visible', 'confirm'],
      props: ['visible', 'parentLoading'],
      template:
        '<div class="pool-lazy-stub"><button class="confirm-action" @click="$emit(\'confirm\')">confirm</button><slot /></div>',
    }),
}));

const AddLiquidityForm = defineComponent({
  name: 'AddLiquidityFormTestHarness',
  emits: ['back'],
  setup(_props, { emit }) {
    const confirmDialogVisible = ref(false);
    const allowFeePopup = computed(() => allowFeePopupRef.value);
    const isConfirmTxDisabled = computed(() => storeState.wallet.transactions.isConfirmTxDialogDisabled);

    const isXorSufficientForNextOperation = () => isXorSufficientForNextTxMock({ type: Operation.AddLiquidity });

    const depositLiquidity = async () => {
      await withNotificationsMock(async () => {
        await addLiquidityMock();
        emit('back');
      });
      confirmDialogVisible.value = false;
    };

    const confirmOrExecute = async (handler: () => Promise<void> | void) => {
      if (isConfirmTxDisabled.value) {
        await handler();
      } else {
        confirmDialogVisible.value = true;
      }
    };

    const handleAddLiquidity = async () => {
      if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
        openWarningFeeDialogMock();
        await waitOnFeeWarningConfirmationMock();
        if (!isWarningFeeDialogConfirmedRef.value) {
          closeWarningFeeDialogMock();
          return;
        }
        isWarningFeeDialogConfirmedRef.value = false;
        closeWarningFeeDialogMock();
      }

      await confirmOrExecute(depositLiquidity);
    };

    return {
      confirmDialogVisible,
      handleAddLiquidity,
      depositLiquidity,
    };
  },
  render() {
    return null;
  },
});

const mountComponent = () =>
  mount(AddLiquidityForm, {
    global: {
      plugins: [createPinia()],
    },
  });

describe('AddLiquidityForm.vue', () => {
  beforeEach(() => {
    allowFeePopupRef = ref(false);
    showWarningFeeDialogRef = ref(false);
    isWarningFeeDialogConfirmedRef = ref(false);

    firstTokenRef = ref({ address: 'token-1', symbol: 'AAA' });
    secondTokenRef = ref({ address: 'token-2', symbol: 'BBB' });
    firstTokenValueRef = ref('1');
    secondTokenValueRef = ref('1');
    networkFeeRef = ref('10');
    networkFeesRef = ref({
      [Operation.RemoveLiquidity]: '10',
      [Operation.AddLiquidity]: '5',
    });
    emptyAssetsRef = ref(false);
    isAvailableRef = ref(true);

    addLiquidityMock = vi.fn(() => Promise.resolve());
    setFirstTokenAddressMock = vi.fn(() => Promise.resolve());
    setSecondTokenAddressMock = vi.fn(() => Promise.resolve());
    setFirstTokenValueMock = vi.fn(() => Promise.resolve());
    setSecondTokenValueMock = vi.fn(() => Promise.resolve());
    updateSubscriptionsMock = vi.fn(() => Promise.resolve());
    resetSubscriptionsMock = vi.fn(() => Promise.resolve());
    setFocusedFieldMock = vi.fn();

    storeState = {
      addLiquidity: {
        focusedField: null,
      },
      settings: {
        slippageTolerance: '0.5',
      },
      wallet: {
        account: {
          isLoggedIn: true,
        },
        transactions: {
          isConfirmTxDialogDisabled: true,
        },
        settings: {
          shouldBalanceBeHidden: false,
        },
      },
    };

    storeCommit = {
      addLiquidity: {
        setFocusedField: setFocusedFieldMock,
      },
    };

    storeDispatch = {
      addLiquidity: {
        setFirstTokenAddress: setFirstTokenAddressMock,
        setSecondTokenAddress: setSecondTokenAddressMock,
        setFirstTokenValue: setFirstTokenValueMock,
        setSecondTokenValue: setSecondTokenValueMock,
        addLiquidity: addLiquidityMock,
        updateSubscriptions: updateSubscriptionsMock,
        resetSubscriptions: resetSubscriptionsMock,
      },
    };

    vi.clearAllMocks();
  });

  it('executes deposit immediately when confirmation dialog is disabled', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).handleAddLiquidity();
    await flushPromises();

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(addLiquidityMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('back')).toBeTruthy();
    expect((wrapper.vm as any).confirmDialogVisible).toBe(false);
  });

  it('opens confirmation dialog when confirmation is enabled', async () => {
    storeState.wallet.transactions.isConfirmTxDialogDisabled = false;
    const wrapper = mountComponent();

    await (wrapper.vm as any).handleAddLiquidity();

    expect(addLiquidityMock).not.toHaveBeenCalled();
    expect((wrapper.vm as any).confirmDialogVisible).toBe(true);

    await (wrapper.vm as any).depositLiquidity();
    await flushPromises();

    expect(addLiquidityMock).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as any).confirmDialogVisible).toBe(false);
  });

  it('shows fee warning when popup is allowed and XOR is insufficient', async () => {
    allowFeePopupRef.value = true;
    isXorSufficientForNextTxMock.mockReturnValue(false);
    const wrapper = mountComponent();

    await (wrapper.vm as any).handleAddLiquidity();
    await flushPromises();

    expect(openWarningFeeDialogMock).toHaveBeenCalledTimes(1);
    expect(waitOnFeeWarningConfirmationMock).toHaveBeenCalledTimes(1);
    expect(addLiquidityMock).not.toHaveBeenCalled();
  });
});
