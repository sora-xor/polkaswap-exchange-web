import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SendTokenDialog from '@/modules/dashboard/components/SendTokenDialog.vue';
import { Operation } from '@sora-substrate/sdk';

const walletMocks = vi.hoisted(() => ({
  transferMock: vi.fn(),
  validateAddressMock: vi.fn((value: string) => value === 'valid-address'),
}));

const storeStateMocks = vi.hoisted(() => ({
  networkFees: {
    XorlessTransfer: '1',
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
      AddressBookInput: {
        name: 'AddressBookInputStub',
        props: {
          modelValue: {
            type: String,
            default: '',
          },
        },
        emits: ['update:modelValue'],
        setup: () => () => null,
      },
    },
    api: {
      assets: {
        transfer: walletMocks.transferMock,
      },
      validateAddress: walletMocks.validateAddressMock,
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

let transferMock: ReturnType<typeof vi.fn>;
let validateAddressMock: ReturnType<typeof vi.fn>;
let storeState: typeof storeStateMocks;
let transactionState: typeof transactionMocks;

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SendTokenDialog, {
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
        's-input': {
          props: {
            modelValue: {
              type: String,
              default: '',
            },
            disabled: {
              type: [Boolean, Object],
              default: false,
            },
          },
          emits: ['update:modelValue'],
          template:
            '<textarea class="comment-input" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
        },
        's-tooltip': { template: '<span><slot /></span>' },
        's-icon': { template: '<i />' },
      },
    },
  });

beforeEach(() => {
  transferMock = walletMocks.transferMock;
  validateAddressMock = walletMocks.validateAddressMock;
  storeState = storeStateMocks;
  transactionState = transactionMocks;

  transferMock.mockClear();
  validateAddressMock.mockClear();
  transactionState.withNotifications.mockClear();
  transactionState.loading.value = false;
  storeState.networkFees.XorlessTransfer = '1';
  storeState.accountXor = { balance: { transferable: '10' } };
  isMaxButtonAvailableMock.mockClear();
});

describe('SendTokenDialog.vue', () => {
  it('disables action button when requirements are not met', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    expect(exposed.disabled.value).toBe(true);
  });

  it('submits transfer when form is valid', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.value.value = '5';
    exposed.address.value = 'valid-address';
    exposed.comment.value = 'note';

    await exposed.handleSend();

    expect(transactionState.withNotifications).toHaveBeenCalledTimes(1);
    expect(transferMock).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0x01', symbol: 'TKN' }),
      'valid-address',
      '5',
      { feeType: 'xor', comment: 'note' }
    );
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
    exposed.address.value = 'valid-address';

    await exposed.handleSend();

    expect(transactionState.withNotifications).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('insufficient-TKN', { title: 'errorText' });
    expect(exposed.isVisible.value).toBe(true);
  });

  it('rejects invalid comment characters', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    const preventDefault = vi.fn();

    exposed.handleCommentInput({ key: 'a', preventDefault } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();

    exposed.handleCommentInput({ key: '!', preventDefault } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('reset helper clears state', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;

    exposed.value.value = '10';
    exposed.address.value = 'valid-address';
    exposed.comment.value = 'note';

    exposed.resetForm();

    expect(exposed.value.value).toBe('');
    expect(exposed.address.value).toBe('');
    expect(exposed.comment.value).toBe('');
  });
});
