import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StakeDialog from '@/modules/staking/sora/components/StakeDialog.vue';
import { StakeDialogMode } from '@/modules/staking/sora/consts';

const stakingAssetRef = ref({ symbol: 'VAL', decimals: 18, address: 'val' });
const rewardAssetRef = ref({ symbol: 'REWARD', decimals: 18, address: 'reward' });
const xorRef = ref({ symbol: 'XOR', decimals: 18, address: 'xor', balance: { transferable: '0' } });
const validatorsRef = ref([{ address: 'validator-1', apy: '0' }]);
const selectedValidatorsRef = ref([{ address: 'validator-1' }]);
const stakeAmountRef = ref('0');
const lockedFundsRef = ref(new FPNumber(0));
const availableFundsRef = ref(new FPNumber(10));
const bondAndNominateMock = vi.fn();
const bondExtraMock = vi.fn();
const unbondMock = vi.fn();
const getBondAndNominateNetworkFeeMock = vi.fn();

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    stakingAsset: computed(() => stakingAssetRef.value),
    rewardAsset: computed(() => rewardAssetRef.value),
    xor: computed(() => xorRef.value),
    validators: computed(() => validatorsRef.value),
    selectedValidators: computed({
      get: () => selectedValidatorsRef.value,
      set: (value) => {
        selectedValidatorsRef.value = value as typeof selectedValidatorsRef.value;
      },
    }),
    selectValidators: (value: unknown) => {
      selectedValidatorsRef.value = value as typeof selectedValidatorsRef.value;
    },
    lockedFunds: computed(() => lockedFundsRef.value),
    availableFunds: computed(() => availableFundsRef.value),
    stakeAmount: computed({
      get: () => stakeAmountRef.value,
      set: (value: string) => {
        stakeAmountRef.value = value;
      },
    }),
    formatCodecNumber: (value: string) => value,
    bondAndNominate: bondAndNominateMock,
    bondExtra: bondExtraMock,
    unbond: unbondMock,
    getBondAndNominateNetworkFee: getBondAndNominateNetworkFeeMock,
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    networkFees: {
      [Operation.StakingBondExtra]: '5',
      [Operation.StakingUnbond]: '6',
    },
    shouldBalanceBeHidden: false,
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
      t: (key: string) => key,
    }),
  };
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: defineComponent({
        name: 'DialogBaseStub',
        props: {
          visible: { type: Boolean, default: false },
          title: { type: String, default: '' },
        },
        emits: ['update:visible'],
        setup(_, { slots }) {
          return () => h('div', { class: 'dialog-base-stub' }, slots.default?.());
        },
      }),
      InfoLine: defineComponent({
        name: 'InfoLineStub',
        setup(_, { slots }) {
          return () => h('div', { class: 'info-line-stub' }, slots.default?.());
        },
      }),
    },
  });
});

const mountComponent = (mode: StakeDialogMode) =>
  mount(StakeDialog, {
    props: {
      visible: true,
      parentLoading: false,
      mode,
    },
    global: {
      stubs: {
        DialogBase: {
          props: {
            visible: { type: Boolean, default: false },
            title: { type: String, default: '' },
          },
          emits: ['update:visible'],
          template: '<div class="dialog-base-stub"><slot /></div>',
        },
        TokenInput: {
          template: '<div class="token-input-stub"><slot /></div>',
          props: ['value'],
        },
        's-card': { template: '<div class="s-card-stub"><slot /></div>' },
        's-button': { template: '<button class="s-button-stub"><slot /></button>' },
        's-form': { template: '<form class="s-form-stub"><slot /></form>' },
      },
    },
  });

describe('StakeDialog.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    selectedValidatorsRef.value = [{ address: 'validator-1' }];
    stakeAmountRef.value = '0';
    lockedFundsRef.value = new FPNumber(0);
    availableFundsRef.value = new FPNumber(10);
    getBondAndNominateNetworkFeeMock.mockResolvedValue('1');
  });

  it('fetches bond and nominate fee when mounted in NEW mode and submits nomination', async () => {
    const wrapper = mountComponent(StakeDialogMode.NEW);
    await flushPromises();

    expect(getBondAndNominateNetworkFeeMock).toHaveBeenCalledTimes(1);

    (wrapper.vm as any).handleValue('1');
    await (wrapper.vm as any).handleConfirm();

    expect(bondAndNominateMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('confirm')).toBeTruthy();

    wrapper.unmount();
  });

  it('submits unbond transaction in REMOVE mode', async () => {
    lockedFundsRef.value = new FPNumber(5);
    availableFundsRef.value = new FPNumber(0);

    const wrapper = mountComponent(StakeDialogMode.REMOVE);
    await flushPromises();

    (wrapper.vm as any).handleValue('1');
    await (wrapper.vm as any).handleConfirm();

    expect(unbondMock).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('confirm')).toBeTruthy();

    wrapper.unmount();
  });
});
