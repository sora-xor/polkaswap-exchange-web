import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BurnDialog from '@/modules/dashboard/components/BurnDialog.vue';
import { Operation } from '@sora-substrate/sdk';

const walletMocks = vi.hoisted(() => ({
  burnMock: vi.fn(),
}));

const storeStateMocks = vi.hoisted(() => ({
  networkFees: {
    Burn: '1',
  } as Record<string, string>,
  accountXor: { balance: { transferable: '10' } } as { balance: { transferable: string } } | null,
}));

const transactionMocks = vi.hoisted(() => ({
  loading: { value: false },
  withNotifications: vi.fn(async (handler: () => unknown | Promise<unknown>) => {
    await handler();
  }),
}));

const formattedAmountMocks = vi.hoisted(() => {
  const createFp = (input: string | number) => {
    const value = Number(input);
    return {
      value,
      sub(other: ReturnType<typeof createFp>) {
        return createFp(value - other.value);
      },
      mul(n: number) {
        return createFp(value * n);
      },
      div(other: ReturnType<typeof createFp>) {
        return createFp(value / other.value);
      },
      toNumber(_precision?: number) {
        return value;
      },
      toString() {
        return String(value);
      },
      isLtZero() {
        return value < 0;
      },
      isZero() {
        return value === 0;
      },
    };
  };

  return {
    Zero: createFp(0),
    getFPNumber: vi.fn((input: string | number) => createFp(input)),
    getFPNumberFromCodec: vi.fn((input: string | number) => createFp(input)),
    formatCodecNumber: vi.fn((value: string) => `formatted-${value}`),
    getFiatAmountByCodecString: vi.fn((value: string) => `fiat-${value}`),
  };
});

const isMaxButtonAvailableMock = vi.hoisted(() => vi.fn(() => true));

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
          title: {
            type: String,
            default: '',
          },
          tooltip: {
            type: String,
            default: '',
          },
        },
        emits: ['update:visible'],
        setup:
          (_props, { slots }) =>
          () =>
            slots.default?.(),
      },
      InfoLine: {
        name: 'InfoLineStub',
        setup: () => () => null,
      },
    },
    api: {
      assets: {
        burn: walletMocks.burnMock,
      },
    },
    WALLET_CONSTS: {
      HiddenValue: '***',
    },
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'TokenInputStub',
    props: {
      modelValue: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue', 'max', 'slide'],
    setup: () => () => null,
  }),
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      wallet: {
        settings: {
          get networkFees() {
            return storeStateMocks.networkFees;
          },
        },
      },
    },
    getters: {
      assets: {
        get xor() {
          return storeStateMocks.accountXor;
        },
      },
    },
  },
  __mocks: storeStateMocks,
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: transactionMocks.loading,
    withNotifications: transactionMocks.withNotifications,
  }),
  __mocks: transactionMocks,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'insufficientBalanceText') {
        return `insufficient-${params?.tokenSymbol ?? ''}`;
      }
      return key;
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => formattedAmountMocks,
  __mocks: formattedAmountMocks,
}));

vi.mock('@/utils', () => ({
  isMaxButtonAvailable: isMaxButtonAvailableMock,
}));

let burnMock: ReturnType<typeof vi.fn>;
let wrapperStoreState: typeof storeStateMocks;
let wrapperTransactionState: typeof transactionMocks;

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(BurnDialog, {
    props: {
      visible: true,
      balance: '10',
      editableFiat: false,
      asset: {
        address: '0x01',
        symbol: 'TKN',
        decimals: 18,
      },
      ...props,
    },
    global: {
      stubs: {
        's-button': {
          props: {
            disabled: { type: Boolean, default: false },
          },
          emits: ['click'],
          template: '<button class="action-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        's-tooltip': { template: '<span><slot /></span>' },
        's-icon': { template: '<i />' },
      },
    },
  });

beforeEach(() => {
  burnMock = walletMocks.burnMock;
  wrapperStoreState = storeStateMocks;
  wrapperTransactionState = transactionMocks;

  burnMock.mockClear();
  wrapperTransactionState.withNotifications.mockClear();
  wrapperTransactionState.loading.value = false;
  wrapperStoreState.networkFees[Operation.Burn] = '1';
  wrapperStoreState.accountXor = { balance: { transferable: '10' } };
  isMaxButtonAvailableMock.mockClear();
});

describe('BurnDialog.vue', () => {
  it('disables action button when value is empty', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    expect(exposed.disabled.value).toBe(true);
  });

  it('submits burn transaction when form is valid', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.value.value = '5';
    await exposed.handleBurn();

    expect(wrapperTransactionState.withNotifications).toHaveBeenCalledTimes(1);
    expect(burnMock).toHaveBeenCalledWith(expect.objectContaining({ address: '0x01' }), '5');
    expect(exposed.isVisible.value).toBe(false);
    expect(wrapper.emitted()['update:visible']).toBeTruthy();
  });

  it('shows alert when balance is insufficient', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    const alertMock = vi.fn();
    const proxy = (wrapper.vm as any).$?.proxy as { $alert?: ReturnType<typeof vi.fn> };
    proxy.$alert = alertMock;

    exposed.value.value = '100';

    await exposed.handleBurn();

    expect(wrapperTransactionState.withNotifications).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('insufficient-TKN', { title: 'errorText' });
    expect(exposed.isVisible.value).toBe(true);
  });

  it('resets value using helper', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.value.value = '9';
    exposed.resetForm();

    expect(exposed.value.value).toBe('');
  });
});
