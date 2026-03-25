import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Operation, XOR } from '@sora-substrate/sdk';

const formatStringValue = vi.hoisted(() => vi.fn(() => 'formatted-amount'));
const formatCodecNumber = vi.hoisted(() => vi.fn(() => 'formatted-fee'));
const getFiatAmountByCodecString = vi.hoisted(() => vi.fn(() => 'fee-fiat'));
const routeName = vi.hoisted(() => ({ value: '' }));
let referralsStoreMock: { amount: string };
let settingsStoreMock: { networkFees: Record<string, string> };

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

vi.mock('@/stores/referrals', async () => {
  const { Operation } = await import('@sora-substrate/sdk');
  referralsStoreMock = {
    amount: '1000000000000',
  };
  settingsStoreMock = {
    networkFees: {
      [Operation.ReferralReserveXor]: '5000000000',
      [Operation.ReferralUnreserveXor]: '1000000000',
    },
  };

  return { useReferralsStore: () => referralsStoreMock };
});

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

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
    expect(amountArg).toBe(referralsStoreMock.amount);
    expect(decimalsArg).toBeDefined();

    const [feeArg] = formatCodecNumber.mock.calls.at(-1) ?? [];
    expect(feeArg).toBe(settingsStoreMock.networkFees[Operation.ReferralReserveXor]);

    const [fiatFeeArg] = getFiatAmountByCodecString.mock.calls.at(-1) ?? [];
    expect(fiatFeeArg).toBe(settingsStoreMock.networkFees[Operation.ReferralReserveXor]);

    await (wrapper.vm as { handleConfirmBonding: () => void }).handleConfirmBonding();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('confirm')).toEqual([[]]);
  });

  it('uses unbond network fee when route is not bonding', async () => {
    routeName.value = 'SomeOtherRoute';
    await mountComponent();

    const [feeArg] = formatCodecNumber.mock.calls.at(-1) ?? [];
    expect(feeArg).toBe(settingsStoreMock.networkFees[Operation.ReferralUnreserveXor]);
  });
});
