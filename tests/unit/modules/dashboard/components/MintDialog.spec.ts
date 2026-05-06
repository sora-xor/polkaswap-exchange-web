import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MintDialog from '@/modules/dashboard/components/MintDialog.vue';

const walletMocks = vi.hoisted(() => ({
  mintMock: vi.fn(),
  validateAddressMock: vi.fn((value: string) => value === 'valid-address'),
}));

const storeStateMocks = vi.hoisted(() => ({
  networkFees: { Mint: '1' },
  accountXor: { balance: { transferable: '10' } },
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
      isLtZero() {
        return value < 0;
      },
    };
  };

  return {
    getFPNumberFromCodec: vi.fn((value: string) => createFp(value)),
    formatCodecNumber: vi.fn((value: string) => `formatted-${value}`),
    getFiatAmountByCodecString: vi.fn((value: string) => `fiat-${value}`),
  };
});

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      mint: walletMocks.mintMock,
    },
    validateAddress: walletMocks.validateAddressMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
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
}));

vi.mock('@/lib/soraneo-wallet/src/components/AddressBook/Input.vue', () => ({
  default: {
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
}));

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    name: 'InfoLineStub',
    setup: () => () => null,
  },
}));

vi.mock('@/components/shared/Input/TokenInput.vue', () => ({
  default: {
    name: 'TokenInputStub',
    props: {
      modelValue: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue'],
    setup: () => () => null,
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get networkFees() {
      return storeStateMocks.networkFees;
    },
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    get xor() {
      return storeStateMocks.accountXor;
    },
  }),
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

let mintMock: ReturnType<typeof vi.fn>;
let validateAddressMock: ReturnType<typeof vi.fn>;
let storeState: { networkFees: Record<string, string>; accountXor: { balance: { transferable: string } } | null };
let transactionState: { loading: { value: boolean }; withNotifications: ReturnType<typeof vi.fn> };

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(MintDialog, {
    props: {
      visible: true,
      editableFiat: false,
      asset: {
        symbol: 'TKN',
        address: '0x01',
      },
      ...props,
    },
    global: {
      stubs: {
        's-tooltip': { template: '<span><slot /></span>' },
        's-icon': { template: '<i />' },
        's-button': {
          props: {
            disabled: {
              type: Boolean,
              default: false,
            },
          },
          emits: ['click'],
          template: '<button class="action-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });

beforeEach(() => {
  mintMock = walletMocks.mintMock;
  validateAddressMock = walletMocks.validateAddressMock;
  storeState = storeStateMocks;
  transactionState = transactionMocks;

  mintMock.mockClear();
  validateAddressMock.mockClear();
  transactionState.withNotifications.mockClear();
  transactionState.loading.value = false;
  storeState.networkFees.Mint = '1';
  storeState.accountXor = { balance: { transferable: '10' } };
});

describe('MintDialog.vue', () => {
  it('disables action button when inputs are empty', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    expect(exposed.disabled.value).toBe(true);
  });

  it('submits mint transaction when form is valid', async () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    exposed.value.value = '5';
    exposed.address.value = 'valid-address';
    await wrapper.vm.$nextTick();

    expect(exposed.disabled.value).toBe(false);

    await exposed.handleMint();

    expect(transactionState.withNotifications).toHaveBeenCalledTimes(1);
    expect(mintMock).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0x01', symbol: 'TKN' }),
      '5',
      'valid-address'
    );
    expect(exposed.isVisible.value).toBe(false);
    expect(wrapper.emitted()['update:visible']).toBeTruthy();
  });

  it('clears form values via reset helper', () => {
    const wrapper = mountComponent();
    const exposed = (wrapper.vm as any).$?.exposed!;
    exposed.value.value = '10';
    exposed.address.value = 'valid-address';

    exposed.resetForm();

    expect(exposed.value.value).toBe('');
    expect(exposed.address.value).toBe('');
  });
});
