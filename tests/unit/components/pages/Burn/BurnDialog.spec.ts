import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Operation } from '@sora-substrate/sdk';

const walletMocks = vi.hoisted(() => ({
  burn: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  networkFees: {} as Record<string, string>,
  accountXor: { balance: { transferable: '0' } } as { balance: { transferable: string } } | null,
  isLoggedIn: true,
}));

const transactionMocks = vi.hoisted(() => ({
  loading: { value: false },
  withNotifications: vi.fn(async (handler: () => Promise<unknown> | unknown) => {
    await handler();
  }),
}));

const formattedAmountMocks = vi.hoisted(() => {
  const createFp = (input: string | number) => {
    const numeric = Number(input);

    return {
      value: numeric,
      mul(other: ReturnType<typeof createFp> | string | number) {
        const multiplier = typeof other === 'object' ? other.value : Number(other);
        return createFp(numeric * multiplier);
      },
      sub(other: ReturnType<typeof createFp>) {
        return createFp(numeric - other.value);
      },
      isLtZero() {
        return numeric < 0;
      },
      toLocaleString() {
        return String(numeric);
      },
      toString() {
        return String(numeric);
      },
    };
  };

  return {
    Zero: createFp(0),
    getFPNumber: vi.fn((input: string | number) => createFp(input)),
    getFPNumberFromCodec: vi.fn((input: string | number) => createFp(input)),
    formatCodecNumber: vi.fn((value: string) => `formatted-${value}`),
    getFiatAmountByFPNumber: vi.fn(() => 'fiat-fp'),
    getFiatAmountByCodecString: vi.fn((value: string) => `fiat-${value}`),
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
    template: '<div><slot /><slot name="footer" /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    name: 'InfoLineStub',
    template: '<div class="info-line"><slot /></div>',
  },
}));

vi.mock('@/components/shared/Input/TokenInput.vue', () => ({
  default: {
    name: 'TokenInputStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="token-input-stub"><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      burn: walletMocks.burn,
    },
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get networkFees() {
      return storeMocks.networkFees;
    },
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    get xor() {
      return storeMocks.accountXor;
    },
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get isLoggedIn() {
      return storeMocks.isLoggedIn;
    },
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: transactionMocks.loading,
    withNotifications: transactionMocks.withNotifications,
  }),
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
}));

let BurnDialog: typeof import('@/components/pages/Burn/BurnDialog.vue').default;
let alertMock: ReturnType<typeof vi.fn>;

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(BurnDialog, {
    props: {
      visible: true,
      receivedAsset: {
        symbol: 'RCV',
        decimals: 18,
        address: '0xreceived',
      },
      burnedAsset: {
        symbol: 'BRN',
        decimals: 18,
        address: '0xburned',
      },
      rate: '1',
      max: 1000,
      min: 1,
      ...props,
    },
    global: {
      config: {
        globalProperties: {
          $alert: alertMock,
        },
      },
      stubs: {
        's-button': {
          props: {
            disabled: { type: Boolean, default: false },
          },
          emits: ['click'],
          template: '<button class="confirm-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
        's-icon': { template: '<i />' },
      },
    },
  });

beforeEach(async () => {
  vi.clearAllMocks();
  storeMocks.networkFees = { [Operation.Burn]: '0' };
  storeMocks.accountXor = { balance: { transferable: '0' } };
  storeMocks.isLoggedIn = true;
  alertMock = vi.fn();

  ({ default: BurnDialog } = await import('@/components/pages/Burn/BurnDialog.vue'));
});

describe('BurnDialog (pages)', () => {
  it('alerts and emits confirm without burning when balance is insufficient', async () => {
    storeMocks.networkFees[Operation.Burn] = '5';
    storeMocks.accountXor = { balance: { transferable: '10' } };

    const wrapper = mountComponent();

    (wrapper.vm as unknown as { handleInputField: (value: string) => void }).handleInputField('7');
    await wrapper.vm.$nextTick();

    await (wrapper.vm as unknown as { handleConfirmBurn: () => Promise<void> }).handleConfirmBurn();
    await wrapper.vm.$nextTick();

    expect(alertMock).toHaveBeenCalledWith('insufficient-BRN', { title: 'errorText' });
    expect(transactionMocks.withNotifications).not.toHaveBeenCalled();
    expect(walletMocks.burn).not.toHaveBeenCalled();

    const confirmEvents = wrapper.emitted('confirm');
    expect(confirmEvents?.[0]).toEqual([]);

    const visibilityEvents = wrapper.emitted('update:visible');
    expect(visibilityEvents).toContainEqual([false]);
  });

  it('burns tokens and emits confirm success when balance is sufficient', async () => {
    storeMocks.networkFees[Operation.Burn] = '1';
    storeMocks.accountXor = { balance: { transferable: '100' } };

    const wrapper = mountComponent();

    (wrapper.vm as unknown as { handleInputField: (value: string) => void }).handleInputField('2');
    await wrapper.vm.$nextTick();

    await (wrapper.vm as unknown as { handleConfirmBurn: () => Promise<void> }).handleConfirmBurn();
    await wrapper.vm.$nextTick();

    expect(transactionMocks.withNotifications).toHaveBeenCalledTimes(1);
    expect(walletMocks.burn).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'BRN' }), '2');

    const confirmEvents = wrapper.emitted('confirm');
    expect(confirmEvents?.[0]).toEqual([true]);

    const visibilityEvents = wrapper.emitted('update:visible');
    expect(visibilityEvents).toContainEqual([false]);
  });
});
