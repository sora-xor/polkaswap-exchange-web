import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Operation } from '@sora-substrate/sdk';

import burnDialogSource from '@/components/pages/Burn/BurnDialog.vue?raw';

const walletMocks = vi.hoisted(() => ({
  burn: vi.fn(),
  burnWithRemark: vi.fn(),
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
      div(other: ReturnType<typeof createFp> | string | number) {
        const divisor = typeof other === 'object' ? other.value : Number(other);
        return createFp(numeric / divisor);
      },
      sub(other: ReturnType<typeof createFp>) {
        return createFp(numeric - other.value);
      },
      lt(other: ReturnType<typeof createFp> | string | number) {
        const target = typeof other === 'object' ? other.value : Number(other);
        return numeric < target;
      },
      isZero() {
        return numeric === 0;
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
    props: ['max', 'modelValue', 'title', 'token'],
    emits: ['update:modelValue'],
    template: '<div class="token-input-stub" :data-title="title" :data-symbol="token?.symbol"><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      burn: walletMocks.burn,
      burnWithRemark: walletMocks.burnWithRemark,
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
        's-input': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="nexus-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });

beforeEach(async () => {
  vi.clearAllMocks();
  storeMocks.networkFees = { [Operation.Burn]: '0', [Operation.BurnWithRemark]: '0' };
  storeMocks.accountXor = { balance: { transferable: '0' } };
  storeMocks.isLoggedIn = true;
  alertMock = vi.fn();

  ({ default: BurnDialog } = await import('@/components/pages/Burn/BurnDialog.vue'));
});

describe('BurnDialog (pages)', () => {
  const validNexusRecipient = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

  it('keeps dedicated burn dialog hooks for the neumorphic UI treatment', () => {
    expect(burnDialogSource).toContain('custom-class="dialog--confirm-burn"');
    expect(burnDialogSource).toContain('class="burn-dialog__amount-fields"');
    expect(burnDialogSource).toContain('handleBurnedInputField');
    expect(burnDialogSource).toContain('class="burn-dialog__metrics"');
    expect(burnDialogSource).toContain('class="burn-dialog__submit s-typography-button--large"');
    expect(burnDialogSource).toContain('.dialog-card.dialog--confirm-burn');
    expect(burnDialogSource).toContain('--burn-highlight');
    expect(burnDialogSource).toContain('box-shadow:');
    expect(burnDialogSource).toContain('inset');
  });

  it('keeps the SORA v3 XOR and reserved token inputs synchronized with the fixed rate', async () => {
    const wrapper = mountComponent({ rate: '0.02' });
    const [burnedInput, receivedInput] = wrapper.findAllComponents({ name: 'TokenInputStub' });

    expect(burnedInput.props('title')).toBe('burnPage.soraV3XorAmountTitle');
    expect(burnedInput.props('modelValue')).toBe('');
    expect(receivedInput.props('title')).toBe('HOW MUCH RCV DO YOU WANT?');
    expect(receivedInput.props('modelValue')).toBe('');

    await receivedInput.vm.$emit('update:modelValue', '10');
    await wrapper.vm.$nextTick();

    expect(receivedInput.props('modelValue')).toBe('10');
    expect(burnedInput.props('modelValue')).toBe('0.2');

    await burnedInput.vm.$emit('update:modelValue', '0.5');
    await wrapper.vm.$nextTick();

    expect(receivedInput.props('modelValue')).toBe('25');
    expect(burnedInput.props('modelValue')).toBe('0.5');
  });

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
    expect(walletMocks.burnWithRemark).not.toHaveBeenCalled();

    const confirmEvents = wrapper.emitted('confirm');
    expect(confirmEvents?.[0]).toEqual([true]);

    const visibilityEvents = wrapper.emitted('update:visible');
    expect(visibilityEvents).toContainEqual([false]);
  });

  it('burns with a SORA Nexus recipient remark when required', async () => {
    storeMocks.networkFees[Operation.BurnWithRemark] = '2';
    storeMocks.accountXor = { balance: { transferable: '100' } };

    const wrapper = mountComponent({ requiresNexusRecipient: true });

    (wrapper.vm as unknown as { handleInputField: (value: string) => void }).handleInputField('2');
    (wrapper.vm as unknown as { nexusRecipient: string }).nexusRecipient = validNexusRecipient;
    await wrapper.vm.$nextTick();

    await (wrapper.vm as unknown as { handleConfirmBurn: () => Promise<void> }).handleConfirmBurn();
    await wrapper.vm.$nextTick();

    expect(transactionMocks.withNotifications).toHaveBeenCalledTimes(1);
    expect(walletMocks.burn).not.toHaveBeenCalled();
    expect(walletMocks.burnWithRemark).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BRN' }),
      '2',
      expect.any(String)
    );

    const remark = JSON.parse(walletMocks.burnWithRemark.mock.calls[0][2]);
    expect(remark).toEqual({
      type: 'soraNexusXorClaim',
      version: 1,
      recipient: validNexusRecipient,
    });
  });

  it('asks for the required SORA Nexus recipient before showing insufficient balance', async () => {
    storeMocks.networkFees[Operation.BurnWithRemark] = '2';
    storeMocks.accountXor = { balance: { transferable: '0' } };

    const wrapper = mountComponent({ requiresNexusRecipient: true });

    (wrapper.vm as unknown as { handleInputField: (value: string) => void }).handleInputField('2');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.confirm-button').text()).toBe('burnPage.enterNexusRecipient');

    await (wrapper.vm as unknown as { handleConfirmBurn: () => Promise<void> }).handleConfirmBurn();
    await wrapper.vm.$nextTick();

    expect(alertMock).toHaveBeenCalledWith('burnPage.enterNexusRecipient', { title: 'errorText' });
    expect(transactionMocks.withNotifications).not.toHaveBeenCalled();
    expect(walletMocks.burn).not.toHaveBeenCalled();
    expect(walletMocks.burnWithRemark).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
  });

  it('does not burn when the required SORA Nexus recipient is invalid', async () => {
    storeMocks.accountXor = { balance: { transferable: '100' } };

    const wrapper = mountComponent({ requiresNexusRecipient: true });

    (wrapper.vm as unknown as { handleInputField: (value: string) => void }).handleInputField('2');
    (wrapper.vm as unknown as { nexusRecipient: string }).nexusRecipient = 'not-a-nexus-account';
    await wrapper.vm.$nextTick();

    await (wrapper.vm as unknown as { handleConfirmBurn: () => Promise<void> }).handleConfirmBurn();
    await wrapper.vm.$nextTick();

    expect(alertMock).toHaveBeenCalledWith('burnPage.invalidNexusRecipient', { title: 'errorText' });
    expect(transactionMocks.withNotifications).not.toHaveBeenCalled();
    expect(walletMocks.burn).not.toHaveBeenCalled();
    expect(walletMocks.burnWithRemark).not.toHaveBeenCalled();
  });
});
