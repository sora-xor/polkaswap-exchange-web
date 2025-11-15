import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pendingRewardsRef = ref([
  {
    era: '10',
    validators: [
      { address: 'validator-1', value: '1000000000000000000' },
      { address: 'validator-2', value: '500000000000000000' },
    ],
  },
]);

const validatorsRef = ref([
  {
    address: 'validator-1',
    identity: { info: { display: 'Validator One' } },
    apy: '0',
  },
  {
    address: 'validator-2',
    identity: { info: { display: 'Validator Two' } },
    apy: '0',
  },
]);

const rewardAssetRef = ref({ symbol: 'VAL', decimals: 18, address: 'val-address' });
const stakingAssetRef = ref({ symbol: 'XOR', decimals: 18, address: 'xor-address' });
const xorRef = ref({ symbol: 'XOR', decimals: 18, address: 'xor-address' });
const payoutMock = vi.fn();
const getPayoutNetworkFeeMock = vi.fn();
const getPendingRewardsMock = vi.fn();

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    pendingRewards: computed(() => pendingRewardsRef.value),
    rewardAsset: computed(() => rewardAssetRef.value),
    stakingAsset: computed(() => stakingAssetRef.value),
    validators: computed(() => validatorsRef.value),
    currentEra: computed(() => 20),
    formatCodecNumber: (value: string) => value,
    xor: computed(() => xorRef.value),
    getPayoutNetworkFee: getPayoutNetworkFeeMock,
    getPendingRewards: getPendingRewardsMock,
    payout: payoutMock,
  }),
}));

vi.mock('@/modules/staking/sora/composables/useValidatorsFormatting', () => ({
  __esModule: true,
  useValidatorsFormatting: () => ({
    historyDepth: computed(() => 28),
    formatName: (validator: { identity?: { info?: { display?: string } }; address: string }) =>
      validator.identity?.info?.display ?? validator.address,
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  __esModule: true,
  useTransaction: () => ({
    loading: ref(false),
    withNotifications: async (handler: () => Promise<void> | void) => {
      await handler();
    },
    withApi: async (handler: () => Promise<void> | void) => {
      await handler();
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    getFiatAmountByFPNumber: () => '42',
    getFiatAmountByCodecString: () => '10',
  }),
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return {
    __esModule: true,
    ...actual,
    hasInsufficientXorForFee: () => false,
  };
});

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    }),
  };
});

import PendingRewardsDialog from '@/modules/staking/sora/components/PendingRewardsDialog.vue';

const soraStakingComponentStub = defineComponent({
  name: 'SoraStakingLazyComponentStub',
  template: '<div class="sora-staking-lazy-component-stub"><slot /></div>',
});

vi.mock('@/modules/staking/router', () => ({
  __esModule: true,
  soraStakingLazyComponent: () => soraStakingComponentStub,
}));

const mountComponent = () =>
  mount(PendingRewardsDialog, {
    props: {
      visible: true,
      parentLoading: false,
    },
    global: {
      stubs: {
        DialogBase: { template: '<div class="dialog-base-stub"><slot /></div>' },
        InfoLine: { template: '<div class="info-line-stub"><slot /></div>' },
        FormattedAmount: { template: '<div class="formatted-amount-stub"><slot /></div>' },
        ValidatorAvatar: { template: '<div class="validator-avatar-stub"><slot /></div>' },
        's-card': {
          template: '<div class="s-card-stub" @click="$emit(\'click\')"><slot /></div>',
        },
        's-scrollbar': { template: '<div class="scrollbar-stub"><slot /></div>' },
        's-button': { template: '<button class="button-stub"><slot /></button>' },
        's-icon': { template: '<i class="icon-stub"></i>' },
      },
    },
  });

describe('PendingRewardsDialog.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    pendingRewardsRef.value = [
      {
        era: '10',
        validators: [
          { address: 'validator-1', value: '1000000000000000000' },
          { address: 'validator-2', value: '500000000000000000' },
        ],
      },
    ];
    validatorsRef.value = [
      {
        address: 'validator-1',
        identity: { info: { display: 'Validator One' } },
        apy: '0',
      },
      {
        address: 'validator-2',
        identity: { info: { display: 'Validator Two' } },
        apy: '0',
      },
    ];
    rewardAssetRef.value = { symbol: 'VAL', decimals: 18, address: 'val-address' };
    stakingAssetRef.value = { symbol: 'XOR', decimals: 18, address: 'xor-address' };
    xorRef.value = { symbol: 'XOR', decimals: 18, address: 'xor-address' };
    getPayoutNetworkFeeMock.mockResolvedValue('123');
  });

  it('fetches payout fee on mount and toggles selection via card click', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(getPayoutNetworkFeeMock).not.toHaveBeenCalled();

    const reward = (wrapper.vm as any).rewards[0];
    expect(reward).toBeDefined();

    (wrapper.vm as any).toggleRewardSelection(reward);
    await flushPromises();

    expect((wrapper.vm as any).selectedRewards.length).toBe(1);
    expect(getPayoutNetworkFeeMock).toHaveBeenLastCalledWith({
      payouts: [{ era: '10', validators: ['validator-1', 'validator-2'] }],
    });

    wrapper.unmount();
  });

  it('runs payout flow and closes dialog on confirm', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    // select all rewards to enable confirm
    const reward = (wrapper.vm as any).rewards[0];
    (wrapper.vm as any).toggleRewardSelection(reward);
    await flushPromises();

    await (wrapper.vm as any).handleConfirm();

    expect(payoutMock).toHaveBeenCalledWith({
      payouts: [{ era: '10', validators: ['validator-1', 'validator-2'] }],
    });
    expect(getPendingRewardsMock).toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')?.some(([value]) => value === false)).toBe(true);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });
});
