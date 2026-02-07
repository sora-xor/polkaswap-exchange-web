import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { Operation, XOR } from '@sora-substrate/sdk';

const formatStringValue = vi.hoisted(() => vi.fn(() => 'formatted-amount'));
const formatCodecNumber = vi.hoisted(() => vi.fn(() => 'formatted-fee'));
const getFiatAmountByCodecString = vi.hoisted(() => vi.fn(() => 'fee-fiat'));
const toggleVisibility = vi.hoisted(() => vi.fn());
const routeName = vi.hoisted(() => ({ value: '' }));
let storeMock: { state: any };

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue,
    formatCodecNumber,
    getFiatAmountByCodecString,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value;
    },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useDialogModel', () => ({
  useDialogModel: () => ({
    isVisible: ref(true),
    closeDialog: toggleVisibility,
  }),
}));

vi.mock('@/store', async () => {
  const { Operation } = await import('@sora-substrate/sdk');
  storeMock = {
    state: {
      referrals: { amount: '1000000000000' },
      wallet: {
        settings: {
          networkFees: {
            [Operation.ReferralReserveXor]: '5000000000',
            [Operation.ReferralUnreserveXor]: '1000000000',
          },
        },
      },
    },
  };

  return { default: storeMock };
});

const mountComponent = async () => {
  const module = await import('@/components/pages/Referrals/ConfirmBonding.vue');
  return mount(module.default, {
    props: { visible: true },
    global: {
      stubs: {
        's-button': { template: '<button><slot /></button>' },
        's-divider': { template: '<hr />' },
        TokenLogo: { template: '<i />' },
        InfoLine: { template: '<div class="info-line" />' },
        AccountConfirmationOption: { template: '<div class="account-option" />' },
        DialogBase: {
          template: '<div class="dialog-base"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
};

describe('ReferralsConfirmBonding.vue', () => {
  beforeEach(() => {
    formatStringValue.mockClear();
    formatCodecNumber.mockClear();
    getFiatAmountByCodecString.mockClear();
  });

  it('formats the amount and network fee for bonding flow', async () => {
    routeName.value = 'ReferralBonding';
    const wrapper = await mountComponent();

    expect(formatStringValue).toHaveBeenCalled();
    const [amountArg, decimalsArg] = formatStringValue.mock.calls.at(-1) ?? [];
    expect(amountArg).toBe(storeMock.state.referrals.amount);
    expect(decimalsArg).toBeDefined();

    const [feeArg] = formatCodecNumber.mock.calls.at(-1) ?? [];
    expect(feeArg).toBe(storeMock.state.wallet.settings.networkFees[Operation.ReferralReserveXor]);

    const [fiatFeeArg] = getFiatAmountByCodecString.mock.calls.at(-1) ?? [];
    expect(fiatFeeArg).toBe(storeMock.state.wallet.settings.networkFees[Operation.ReferralReserveXor]);

    await (wrapper.vm as { handleConfirmBonding: () => void }).handleConfirmBonding();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('confirm')).toEqual([[]]);
  });

  it('uses unbond network fee when route is not bonding', async () => {
    routeName.value = 'SomeOtherRoute';
    await mountComponent();

    const [feeArg] = formatCodecNumber.mock.calls.at(-1) ?? [];
    expect(feeArg).toBe(storeMock.state.wallet.settings.networkFees[Operation.ReferralUnreserveXor]);
  });
});
