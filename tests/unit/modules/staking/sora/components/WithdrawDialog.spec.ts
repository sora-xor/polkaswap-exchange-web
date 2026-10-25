import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WithdrawDialog from '@/modules/staking/sora/components/WithdrawDialog.vue';

const withdrawMock = vi.hoisted(() => vi.fn());
const withNotificationsMock = vi.hoisted(() => vi.fn());
const preciseWithdrawAmount = '9007199254740993';

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  useSoraStaking: () => ({
    stakingAsset: computed(() => null),
    xor: computed(() => null),
    withdrawableFunds: computed(() => ({
      isZero: () => false,
      toString: () => preciseWithdrawAmount,
    })),
    withdrawableFundsFiat: computed(() => null),
    withdrawableFundsFormatted: computed(() => '5'),
    formatCodecNumber: (value: string) => value,
    withdraw: withdrawMock,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ networkFees: { StakingWithdrawUnbonded: '1' } }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: ref(false),
    withNotifications: withNotificationsMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({ getFiatAmountByCodecString: () => null }),
}));

vi.mock('@/utils', () => ({
  hasInsufficientXorForFee: () => false,
}));

describe('WithdrawDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withNotificationsMock.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      return { submitted: false };
    });
  });

  it('preserves an exact withdrawal above 2^53 when submission is rejected', async () => {
    const wrapper = mount(WithdrawDialog, {
      props: { visible: true },
      shallow: true,
    });
    const exposed = (wrapper.vm as any).$?.exposed!;

    await exposed.handleConfirm();

    expect(withdrawMock).toHaveBeenCalledWith(preciseWithdrawAmount);
    expect(exposed.isVisible.value).toBe(true);
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
  });
});
