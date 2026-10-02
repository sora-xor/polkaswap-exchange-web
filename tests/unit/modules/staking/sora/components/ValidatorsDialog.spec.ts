import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ValidatorsDialog from '@/modules/staking/sora/components/ValidatorsDialog.vue';

const stakingInfoRef = ref({ myValidators: ['validator-1'] });
const validatorsRef = ref([{ address: 'validator-1' }, { address: 'validator-2' }]);
const selectedValidatorsRef = ref([{ address: 'validator-2' }]);
const maxNominationsRef = ref(4);
const xorRef = ref({ symbol: 'XOR', balance: { transferable: '100' } });
const stashRef = ref('stash-1');

const nominateMock = vi.fn();
const getNominateNetworkFeeMock = vi.fn();
const setStakingInfoMock = vi.fn();

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    stakingInfo: computed(() => stakingInfoRef.value),
    validators: computed(() => validatorsRef.value),
    selectedValidators: computed(() => selectedValidatorsRef.value),
    selectValidators: (value: Array<{ address: string }>) => {
      selectedValidatorsRef.value = value;
    },
    maxNominations: computed(() => maxNominationsRef.value),
    xor: computed(() => xorRef.value),
    stash: computed(() => stashRef.value),
    formatCodecNumber: (value: string) => value,
    nominate: nominateMock,
    getNominateNetworkFee: getNominateNetworkFeeMock,
    setStakingInfo: setStakingInfoMock,
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
    getFiatAmountByCodecString: () => '1',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
  }),
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return {
    __esModule: true,
    ...actual,
    hasInsufficientXorForFee: (asset: { balance: { transferable: string } }, fee: string) =>
      BigInt(asset.balance.transferable) < BigInt(fee || '0'),
  };
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      DialogBase: defineComponent({
        name: 'DialogBaseStub',
        props: {
          visible: { type: Boolean, default: false },
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

vi.mock('@/modules/staking/sora/components/StakingHeader.vue', () => ({
  __esModule: true,
  default: {
    name: 'StakingHeaderStub',
    props: ['mode'],
    emits: ['back'],
    template: '<div class="stakingheader-stub" :data-mode="mode"><slot /></div>',
  },
}));

vi.mock('@/modules/staking/sora/components/ValidatorsList.vue', () => ({
  __esModule: true,
  default: {
    name: 'ValidatorsListStub',
    props: ['mode'],
    emits: ['update:selected'],
    template: '<div class="validatorslist-stub" :data-mode="mode"><slot /></div>',
  },
}));

vi.mock('@/modules/staking/sora/components/SelectValidatorsMode.vue', () => ({
  __esModule: true,
  default: {
    name: 'SelectValidatorsModeStub',
    emits: ['recommended', 'selected'],
    template: '<div class="selectvalidatorsmode-stub"><slot /></div>',
  },
}));

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

const mountComponent = () => {
  const wrapper = mount(ValidatorsDialog, {
    props: {
      visible: true,
      parentLoading: false,
    },
    global: {
      stubs: {
        's-tabs': { template: '<div class="tabs-stub"><slot /></div>' },
        's-tab': { template: '<div class="tab-stub"><slot /></div>' },
        's-button': {
          props: {
            disabled: { type: Boolean, default: false },
          },
          emits: ['click'],
          template: '<button class="s-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
};

describe('ValidatorsDialog.vue', () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  beforeEach(() => {
    stakingInfoRef.value = { myValidators: ['validator-1'] };
    validatorsRef.value = [{ address: 'validator-1' }, { address: 'validator-2' }];
    selectedValidatorsRef.value = [{ address: 'validator-2' }];
    maxNominationsRef.value = 4;
    xorRef.value = { symbol: 'XOR', balance: { transferable: '100' } };
    stashRef.value = 'stash-1';
    nominateMock.mockReset();
    getNominateNetworkFeeMock.mockReset();
    setStakingInfoMock.mockReset();
    getNominateNetworkFeeMock.mockResolvedValue('7');
  });

  it('fetches nominate fee on mount', async () => {
    mountComponent();
    await flushPromises();

    expect(getNominateNetworkFeeMock).toHaveBeenCalledTimes(1);
  });

  it('nominates and stores the updated validator set in recommended mode', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    (wrapper.vm as any).handleRecommendedMode();
    await (wrapper.vm as any).handleConfirm();

    expect(nominateMock).toHaveBeenCalledTimes(1);
    expect(setStakingInfoMock).toHaveBeenCalledWith({
      myValidators: ['validator-2'],
    });
    expect(wrapper.emitted('confirm')).toBeTruthy();
  });

  it('keeps the latest validator-set fee when requests resolve in reverse order', async () => {
    let resolveFirst!: (fee: string) => void;
    let resolveSecond!: (fee: string) => void;
    const firstFee = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondFee = new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });
    const wrapper = mountComponent();
    await flushPromises();
    (wrapper.vm as any).handleSelectedMode();
    getNominateNetworkFeeMock.mockImplementationOnce(() => firstFee).mockImplementationOnce(() => secondFee);

    selectedValidatorsRef.value = [{ address: 'validator-1' }, { address: 'validator-2' }];
    await nextTick();
    selectedValidatorsRef.value = [{ address: 'validator-2' }];
    await nextTick();

    expect(wrapper.find('.confirm').attributes('disabled')).toBeDefined();

    resolveSecond('200');
    await flushPromises();
    expect((wrapper.vm as any).nominateNetworkFee).toBe('200');
    expect(wrapper.find('.confirm').attributes('disabled')).toBeDefined();

    resolveFirst('10');
    await flushPromises();
    expect((wrapper.vm as any).nominateNetworkFee).toBe('200');
    expect(wrapper.find('.confirm').attributes('disabled')).toBeDefined();
  });

  it('keeps the current account fee when account requests resolve in reverse order', async () => {
    let resolveFirst!: (fee: string) => void;
    let resolveSecond!: (fee: string) => void;
    const firstFee = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondFee = new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });
    const wrapper = mountComponent();
    await flushPromises();
    (wrapper.vm as any).handleSelectedMode();
    getNominateNetworkFeeMock.mockImplementationOnce(() => firstFee).mockImplementationOnce(() => secondFee);

    stashRef.value = 'stash-2';
    await nextTick();
    stashRef.value = 'stash-3';
    await nextTick();

    resolveSecond('200');
    await flushPromises();
    resolveFirst('10');
    await flushPromises();

    expect((wrapper.vm as any).nominateNetworkFee).toBe('200');
    expect(wrapper.find('.confirm').attributes('disabled')).toBeDefined();
  });
});
