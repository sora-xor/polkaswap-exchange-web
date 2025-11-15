import { FPNumber, Operation } from '@sora-substrate/sdk';
import { computed, defineComponent, ref, type Ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FocusedField } from '@/store/removeLiquidity/types';

let allowFeePopupRef: Ref<boolean> | undefined;
let networkFeesRef: Ref<Record<string, string>> | undefined;
const isXorSufficientForNextTxMock = vi.fn(() => true);

let showWarningFeeDialogRef: Ref<boolean> | undefined;
let isWarningFeeDialogConfirmedRef: Ref<boolean> | undefined;
const openWarningFeeDialogMock = vi.fn(() => (showWarningFeeDialogRef!.value = true));
const closeWarningFeeDialogMock = vi.fn(() => (showWarningFeeDialogRef!.value = false));
const waitOnFeeWarningConfirmationMock = vi.fn(() => Promise.resolve());

const withNotificationsMock = vi.fn(async (handler: () => Promise<void> | void) => await handler());

var setRemovePartMock: ReturnType<typeof vi.fn> | undefined;
var setFirstTokenAmountMock: ReturnType<typeof vi.fn> | undefined;
var setSecondTokenAmountMock: ReturnType<typeof vi.fn> | undefined;
var removeLiquidityMock: ReturnType<typeof vi.fn> | undefined;
var setFocusedFieldMock: ReturnType<typeof vi.fn> | undefined;
var resetFocusedFieldMock: ReturnType<typeof vi.fn> | undefined;

var storeState:
  | {
      removeLiquidity: {
        liquidityAmount: string;
        firstTokenAmount: string;
        secondTokenAmount: string;
        removePart: string;
        focusedField: FocusedField | null;
      };
      wallet: {
        transactions: { isConfirmTxDialogDisabled: boolean };
        settings: { shouldBalanceBeHidden: boolean };
      };
    }
  | undefined;

var storeGetters: any;
var storeCommit: any;
var storeDispatch: any;
var storeInstance: any;

const ensureStore = () => {
  if (!storeState) {
    storeState = {
      removeLiquidity: {
        liquidityAmount: '5',
        firstTokenAmount: '2',
        secondTokenAmount: '3',
        removePart: '10',
        focusedField: null,
      },
      wallet: {
        transactions: {
          isConfirmTxDialogDisabled: true,
        },
        settings: {
          shouldBalanceBeHidden: false,
        },
      },
    };
  }

  if (!storeGetters) {
    const liquidityBalanceFull = FPNumber.fromNatural(100);
    const liquidityBalance = FPNumber.fromNatural(60);
    const firstTokenBalance = FPNumber.fromNatural(1000);
    const secondTokenBalance = FPNumber.fromNatural(500);

    storeGetters = {
      removeLiquidity: {
        liquidityBalanceFull,
        liquidityBalance,
        demeterLockedBalance: FPNumber.ZERO,
        ceresLockedBalance: FPNumber.ZERO,
        liquidity: null,
        firstToken: { address: 'token-1', symbol: 'AAA' },
        secondToken: { address: 'token-2', symbol: 'BBB' },
        firstTokenBalance,
        secondTokenBalance,
        shareOfPool: '12.5',
        price: '1',
        priceReversed: '1',
      },
      assets: {
        xor: {
          address: 'xor',
          symbol: 'XOR',
          balance: { transferable: '1000000000000000000' },
        },
      },
    };
  }

  if (!setFocusedFieldMock) {
    setFocusedFieldMock = vi.fn();
  }
  if (!resetFocusedFieldMock) {
    resetFocusedFieldMock = vi.fn();
  }

  if (!storeCommit) {
    storeCommit = {
      removeLiquidity: {
        setFocusedField: setFocusedFieldMock,
        resetFocusedField: resetFocusedFieldMock,
      },
    };
  }

  if (!setRemovePartMock) {
    setRemovePartMock = vi.fn(() => Promise.resolve());
  }
  if (!setFirstTokenAmountMock) {
    setFirstTokenAmountMock = vi.fn(() => Promise.resolve());
  }
  if (!setSecondTokenAmountMock) {
    setSecondTokenAmountMock = vi.fn(() => Promise.resolve());
  }
  if (!removeLiquidityMock) {
    removeLiquidityMock = vi.fn(() => Promise.resolve());
  }

  if (!storeDispatch) {
    storeDispatch = {
      removeLiquidity: {
        setRemovePart: setRemovePartMock,
        setFirstTokenAmount: setFirstTokenAmountMock,
        setSecondTokenAmount: setSecondTokenAmountMock,
        removeLiquidity: removeLiquidityMock,
      },
    };
  }

  if (!storeInstance) {
    storeInstance = {
      state: storeState,
      getters: storeGetters,
      commit: storeCommit,
      dispatch: storeDispatch,
    };
  }

  return storeInstance;
};

vi.mock('@/store', () => ({
  __esModule: true,
  default: ensureStore(),
}));

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
    getFPNumber: (value: string | number) => new FPNumber(value || 0),
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
  useNetworkFeeWarning: () => {
    if (!allowFeePopupRef) {
      allowFeePopupRef = ref(false);
    }
    if (!networkFeesRef) {
      networkFeesRef = ref({ [Operation.RemoveLiquidity]: '10' });
    }
    return {
      allowFeePopup: allowFeePopupRef,
      networkFees: networkFeesRef,
      isXorSufficientForNextTx: isXorSufficientForNextTxMock,
    };
  },
}));

vi.mock('@/composables/useNetworkFeeDialog', () => ({
  __esModule: true,
  useNetworkFeeDialog: () => {
    if (!showWarningFeeDialogRef) {
      showWarningFeeDialogRef = ref(false);
    }
    if (!isWarningFeeDialogConfirmedRef) {
      isWarningFeeDialogConfirmedRef = ref(false);
    }

    return {
      showWarningFeeDialog: showWarningFeeDialogRef,
      isWarningFeeDialogConfirmed: isWarningFeeDialogConfirmedRef,
      openWarningFeeDialog: openWarningFeeDialogMock,
      closeWarningFeeDialog: closeWarningFeeDialogMock,
      confirmNetworkFeeWariningDialog: vi.fn(() => {
        isWarningFeeDialogConfirmedRef!.value = true;
        showWarningFeeDialogRef!.value = false;
      }),
      waitOnFeeWarningConfirmation: waitOnFeeWarningConfirmationMock,
    };
  },
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () =>
    defineComponent({
      name: 'LazyStub',
      emits: ['update:visible', 'confirm', 'input', 'focus', 'blur'],
      props: ['visible', 'parentLoading', 'fee', 'infoOnly', 'token', 'value', 'max'],
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
      template: '<div class="pool-lazy-stub"><slot /><slot name="footer" /></div>',
    }),
}));

const RemoveLiquidityForm = defineComponent({
  name: 'RemoveLiquidityFormTestHarness',
  emits: ['back'],
  setup(_props, { emit }) {
    const store = ensureStore();
    const confirmDialogVisible = ref(false);
    const allowFeePopup = computed(() => allowFeePopupRef?.value ?? false);
    const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled ?? true);

    const isXorSufficientForNextOperation = () => isXorSufficientForNextTxMock({ type: Operation.RemoveLiquidity });

    const withdrawLiquidity = async () => {
      await withNotificationsMock(async () => {
        await store.dispatch.removeLiquidity.removeLiquidity();
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

    const handleRemoveLiquidity = async () => {
      if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
        openWarningFeeDialogMock();
        await waitOnFeeWarningConfirmationMock();
        if (!isWarningFeeDialogConfirmedRef?.value) {
          closeWarningFeeDialogMock();
          return;
        }
        isWarningFeeDialogConfirmedRef.value = false;
        closeWarningFeeDialogMock();
      }

      await confirmOrExecute(withdrawLiquidity);
    };

    return {
      confirmDialogVisible,
      handleRemoveLiquidity,
    };
  },
  render() {
    return null;
  },
});

const mountComponent = () => mount(RemoveLiquidityForm);

describe('RemoveLiquidityForm.vue', () => {
  beforeEach(() => {
    ensureStore();
    vi.clearAllMocks();
    if (!allowFeePopupRef) {
      allowFeePopupRef = ref(false);
    }
    if (!networkFeesRef) {
      networkFeesRef = ref({ [Operation.RemoveLiquidity]: '10' });
    }
    if (!showWarningFeeDialogRef) {
      showWarningFeeDialogRef = ref(false);
    }
    if (!isWarningFeeDialogConfirmedRef) {
      isWarningFeeDialogConfirmedRef = ref(false);
    }

    if (!setRemovePartMock) {
      setRemovePartMock = vi.fn(() => Promise.resolve());
    }
    if (!setFirstTokenAmountMock) {
      setFirstTokenAmountMock = vi.fn(() => Promise.resolve());
    }
    if (!setSecondTokenAmountMock) {
      setSecondTokenAmountMock = vi.fn(() => Promise.resolve());
    }
    if (!removeLiquidityMock) {
      removeLiquidityMock = vi.fn(() => Promise.resolve());
    }
    if (!setFocusedFieldMock) {
      setFocusedFieldMock = vi.fn();
    }
    if (!resetFocusedFieldMock) {
      resetFocusedFieldMock = vi.fn();
    }

    allowFeePopupRef.value = false;
    networkFeesRef.value = { [Operation.RemoveLiquidity]: '10' };
    isXorSufficientForNextTxMock.mockReturnValue(true);
    showWarningFeeDialogRef.value = false;
    isWarningFeeDialogConfirmedRef.value = false;
    storeState.wallet.transactions.isConfirmTxDialogDisabled = true;
  });

  it('executes withdrawal immediately when confirmation dialog is disabled', async () => {
    const wrapper = mountComponent();

    await (wrapper.vm as any).handleRemoveLiquidity();
    await flushPromises();

    expect(withNotificationsMock).toHaveBeenCalledTimes(1);
    expect(removeLiquidityMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('back')).toBeTruthy();
    expect((wrapper.vm as any).confirmDialogVisible).toBe(false);
  });

  it('opens confirmation dialog when confirmation is enabled', async () => {
    storeState.wallet.transactions.isConfirmTxDialogDisabled = false;

    const wrapper = mountComponent();
    await (wrapper.vm as any).handleRemoveLiquidity();

    expect(removeLiquidityMock).not.toHaveBeenCalled();
    expect((wrapper.vm as any).confirmDialogVisible).toBe(true);
  });

  it('shows fee warning when popup is allowed and XOR is insufficient', async () => {
    allowFeePopupRef.value = true;
    isXorSufficientForNextTxMock.mockReturnValue(false);

    const wrapper = mountComponent();
    await (wrapper.vm as any).handleRemoveLiquidity();
    await flushPromises();

    expect(openWarningFeeDialogMock).toHaveBeenCalledTimes(1);
    expect(waitOnFeeWarningConfirmationMock).toHaveBeenCalledTimes(1);
    expect(removeLiquidityMock).not.toHaveBeenCalled();
  });
});
