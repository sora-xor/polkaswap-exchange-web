import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { computed, defineComponent, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const payeeRef = ref('Stash');
const controllerRef = ref('controller-address');
const stashRef = ref('stash-address');
const pendingRewardsRef = ref([
  {
    era: 11,
    validators: [{ address: 'validator-1' }, { address: 'validator-2' }],
  },
]);
const rewardedFundsRef = ref(new FPNumber('1000000000000000000'));
const rewardAssetRef = ref({ symbol: 'VAL', decimals: 18, address: 'val-address' });
const xorRef = ref({ symbol: 'XOR', decimals: 18, address: 'xor-address' });
const payoutMock = vi.fn();
const getPayoutNetworkFeeMock = vi.fn();
const getPendingRewardsMock = vi.fn();

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    payee: payeeRef,
    controller: controllerRef,
    stash: stashRef,
    pendingRewards: computed(() => pendingRewardsRef.value),
    rewardedFunds: computed(() => rewardedFundsRef.value),
    rewardedFundsFiat: computed(() => '123'),
    rewardedFundsFormatted: computed(() => '100'),
    rewardAsset: computed(() => rewardAssetRef.value),
    xor: computed(() => xorRef.value),
    isInsufficientXorForFee: computed(() => false),
    payout: payoutMock,
    getPayoutNetworkFee: getPayoutNetworkFeeMock,
    getPendingRewards: getPendingRewardsMock,
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  __esModule: true,
  useTransaction: () => ({
    loading: ref(false),
    withNotifications: async (handler: () => Promise<void> | void) => {
      await handler();
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    getFiatAmountByCodecString: () => '10',
  }),
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

import ClaimRewardsDialog from '@/modules/staking/sora/components/ClaimRewardsDialog.vue';

const soraStakingComponentStub = defineComponent({
  name: 'SoraStakingLazyComponentStub',
  template: '<div class="sora-staking-lazy-component-stub"><slot /></div>',
});

vi.mock('@/modules/staking/router', () => ({
  __esModule: true,
  soraStakingLazyComponent: () => soraStakingComponentStub,
}));

const DialogBaseStub = defineComponent({
  name: 'DialogBaseStub',
  props: ['visible', 'title'],
  emits: ['update:visible'],
  template: '<div class="dialog-base-stub"><slot /><slot name="footer" /></div>',
});

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  props: ['label', 'value', 'fiatValue', 'assetSymbol', 'valueCanBeHidden', 'labelTooltip'],
  template: '<div class="info-line-stub"></div>',
});

const TokenLogoStub = defineComponent({
  name: 'TokenLogoStub',
  props: ['token'],
  template: '<div class="token-logo-stub"></div>',
});

const FormattedAmountWithFiatValueStub = defineComponent({
  name: 'FormattedAmountWithFiatValueStub',
  props: ['value', 'fiatValue', 'assetSymbol', 'valueCanBeHidden'],
  template: '<div class="formatted-amount-fiat-stub"><slot /></div>',
});

const walletComponentStubs = {
  DialogBase: DialogBaseStub,
  InfoLine: InfoLineStub,
  TokenLogo: TokenLogoStub,
  FormattedAmountWithFiatValue: FormattedAmountWithFiatValueStub,
};

const mountComponent = (overrides: Partial<{ visible: boolean }> = {}) =>
  mount(ClaimRewardsDialog, {
    props: {
      visible: overrides.visible ?? true,
      parentLoading: false,
    },
    global: {
      stubs: walletComponentStubs,
      components: {
        's-input': {
          props: {
            modelValue: {
              type: String,
              default: '',
            },
          },
          emits: ['update:modelValue'],
          template:
            '<input class="s-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });

describe('ClaimRewardsDialog.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    payeeRef.value = 'Stash';
    controllerRef.value = 'controller-address';
    stashRef.value = 'stash-address';
    pendingRewardsRef.value = [
      {
        era: 11,
        validators: [{ address: 'validator-1' }, { address: 'validator-2' }],
      },
    ];
    rewardedFundsRef.value = new FPNumber('1000000000000000000');
    rewardAssetRef.value = { symbol: 'VAL', decimals: 18, address: 'val-address' };
    xorRef.value = { symbol: 'XOR', decimals: 18, address: 'xor-address' };
    getPayoutNetworkFeeMock.mockResolvedValue('123');
  });

  it('initialises rewards destination and fetches payout fee', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.vm.rewardsDestination).toBe('stash-address');
    expect(getPayoutNetworkFeeMock).toHaveBeenCalledWith({
      payouts: [{ era: 11, validators: ['validator-1', 'validator-2'] }],
      payee: undefined,
    });

    wrapper.unmount();
  });

  it('recomputes payout fee when destination changes', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    getPayoutNetworkFeeMock.mockClear();
    wrapper.vm.rewardsDestination = 'custom-address';
    await flushPromises();

    expect(getPayoutNetworkFeeMock).toHaveBeenCalledWith({
      payouts: [{ era: 11, validators: ['validator-1', 'validator-2'] }],
      payee: 'custom-address',
    });

    wrapper.unmount();
  });

  it('calls payout and closes on confirm', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.vm.handleConfirm();

    expect(payoutMock).toHaveBeenCalledWith({
      payouts: [{ era: 11, validators: ['validator-1', 'validator-2'] }],
      payee: undefined,
    });
    expect(getPendingRewardsMock).toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')?.some(([value]) => value === false)).toBe(true);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('emits show-rewards when user checks pending rewards', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.vm.checkPendingRewards();
    expect(wrapper.emitted('show-rewards')).toBeTruthy();
  });
});
