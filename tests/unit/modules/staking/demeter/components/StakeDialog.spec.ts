import { FPNumber, Operation, type CodecString } from '@sora-substrate/sdk';
import type { DemeterLiquidityParams } from '@/stores/demeterFarming/types';
import type { DemeterAccountPool, DemeterPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { Component } from 'vue';
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import StakeDialog from '@/modules/staking/demeter/components/StakeDialog.vue';

const tokenInputStubRef = vi.hoisted(() => ({ component: null as Component | null }));

vi.mock('@/components/shared/Input/TokenInput.vue', () => {
  tokenInputStubRef.component = defineComponent({
    name: 'TokenInputStub',
    props: ['modelValue', 'balance', 'isMaxAvailable', 'title', 'token'],
    emits: ['update:modelValue', 'max'],
    template: `<div class="token-input-stub"><slot /></div>`,
  });

  return {
    default: tokenInputStubRef.component,
  };
});

vi.mock('@/modules/staking/demeter/components/DialogTitle.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'DialogTitleStub',
    props: ['baseAsset', 'poolAsset', 'isFarm'],
    template: `<div class="dialog-title-stub"></div>`,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, payload?: Record<string, unknown>) => (payload ? `${key}:${JSON.stringify(payload)}` : key),
    TranslationConsts: { APR: 'apr_label' },
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    networkFees: {
      [Operation.DemeterFarmingDepositLiquidity]: '1000000000',
      [Operation.DemeterFarmingWithdrawLiquidity]: '2000000000',
    },
    shouldBalanceBeHidden: false,
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    xor: {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
      balance: { transferable: '1000000000000000000' },
    },
  }),
}));

const useDemeterPoolStatusMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolStatus', () => ({
  useDemeterPoolStatus: (...args: unknown[]) => useDemeterPoolStatusMock(...args),
}));

const useDemeterPoolCardMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolCard', () => ({
  useDemeterPoolCard: (...args: unknown[]) => useDemeterPoolCardMock(...args),
}));

const mockPool = {} as DemeterPool;
const mockAccountPool = {} as DemeterAccountPool;
const mockPoolAsset = {
  address: 'pool',
  symbol: 'LP',
  decimals: 18,
  price: new FPNumber('1'),
  balance: { transferable: '100000000000000000000' },
} as any;
const mockRewardAsset = {
  address: 'reward',
  symbol: 'RWD',
  decimals: 18,
  price: new FPNumber('1'),
} as any;

const buildStatusApi = (overrides: Record<string, unknown> = {}) => {
  return {
    liquidity: ref(null),
    pool: ref(mockPool),
    accountPool: ref(mockAccountPool),
    poolAsset: ref(mockPoolAsset),
    rewardAsset: ref(mockRewardAsset),
    hasStake: ref(false),
    activeStatus: ref(true),
    depositDisabled: ref(false),
    isFarm: ref(false),
    pricesAvailable: ref(true),
    availableFunds: ref(new FPNumber(100)),
    lockedFunds: ref(new FPNumber(50)),
    funds: ref(new FPNumber(100)),
    getFiatAmountByFPNumber: vi.fn().mockReturnValue('10'),
    getFiatAmountByCodecString: vi.fn().mockReturnValue('0.1'),
    formatCodecNumber: (value: CodecString) => FPNumber.fromCodecValue(value).toLocaleString(),
    emitParams: ref({ baseAsset: 'base', poolAsset: 'pool', rewardAsset: 'reward' }),
    ...overrides,
  };
};

const buildPoolCardApi = (overrides: Record<string, unknown> = {}) => ({
  rewardAssetSymbol: ref('RWD'),
  poolAssetSymbol: ref('LP'),
  depositFee: ref(0.01),
  depositFeeFormatted: ref('1%'),
  poolShareFormatted: ref('0%'),
  poolShareFiat: ref('0'),
  ...overrides,
});

const DialogBaseStub = defineComponent({
  name: 'DialogBaseStub',
  props: ['visible', 'title'],
  emits: ['update:visible'],
  template: `<div class="dialog-base-stub"><slot /></div>`,
});

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  props: ['label', 'value', 'fiatValue', 'valueCanBeHidden', 'labelTooltip', 'assetSymbol', 'isFormatted'],
  template: `<div class="info-line-stub"></div>`,
});

const stubs = {
  's-form': defineComponent({ template: '<form><slot /></form>' }),
  's-float-input': defineComponent({
    name: 'SFloatInputStub',
    props: ['value', 'decimals', 'max'],
    emits: ['update:modelValue'],
    template: '<div class="float-input-stub"><slot /></div>',
  }),
  's-slider': defineComponent({
    name: 'SSliderStub',
    props: ['value', 'showTooltip'],
    emits: ['input'],
    template: '<div class="slider-stub"></div>',
  }),
  's-button': defineComponent({
    name: 'SButtonStub',
    props: ['disabled', 'loading', 'type'],
    emits: ['click'],
    template: '<button class="s-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  }),
  DialogBase: DialogBaseStub,
  InfoLine: InfoLineStub,
};

const baseProps = {
  visible: false,
  parentLoading: false,
  isAdding: true,
  liquidity: null,
  baseAsset: mockPoolAsset,
  pool: mockPool,
  accountPool: mockAccountPool,
  poolAsset: mockPoolAsset,
  rewardAsset: mockRewardAsset,
  apr: '12%',
  tvl: '100',
};

describe('Demeter StakeDialog', () => {
  beforeEach(() => {
    const statusApi = buildStatusApi();
    useDemeterPoolStatusMock.mockReturnValue(statusApi);
    useDemeterPoolCardMock.mockReturnValue(buildPoolCardApi());
  });

  it('resets the entered value whenever visibility toggles back to true', async () => {
    const wrapper = mount(StakeDialog, {
      props: baseProps,
      global: { stubs },
    });

    await wrapper.setProps({ visible: true });
    const tokenInput = wrapper.findComponent(tokenInputStubRef.component as Component);

    await tokenInput.vm.$emit('update:modelValue', '42');
    expect(tokenInput.props('modelValue')).toBe('42');

    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(wrapper.findComponent(tokenInputStubRef.component as Component).props('modelValue')).toBe('');
  });

  it('emits add event with computed FPNumber value on confirm', async () => {
    const wrapper = mount(StakeDialog, {
      props: baseProps,
      global: { stubs },
    });

    await wrapper.setProps({ visible: true });
    const tokenInput = wrapper.findComponent(tokenInputStubRef.component as Component);
    await tokenInput.vm.$emit('update:modelValue', '5');

    const confirmButton = wrapper.findComponent({ name: 'SButtonStub' });
    expect(confirmButton.exists()).toBe(true);
    confirmButton.vm.$emit('click');
    await wrapper.vm.$nextTick();
    const emitted = wrapper.emitted('add');
    expect(emitted).toBeTruthy();

    const payload = emitted?.[0]?.[0] as DemeterLiquidityParams;
    expect(payload.value.toString()).toBe('5');
  });

  it('disables confirmation button when no amount is provided', async () => {
    const wrapper = mount(StakeDialog, {
      props: baseProps,
      global: { stubs },
    });

    await wrapper.setProps({ visible: true });

    const button = wrapper.find('button.s-button-stub');
    expect(button.attributes('disabled')).toBeDefined();
  });

  it('applies the Demeter percentage input class and three-digit state for max farm removal', async () => {
    useDemeterPoolStatusMock.mockReturnValue(buildStatusApi({ isFarm: ref(true), hasStake: ref(true) }));

    const wrapper = mount(StakeDialog, {
      props: { ...baseProps, visible: true, isAdding: false },
      global: { stubs },
    });

    const slider = wrapper.findComponent({ name: 'SSliderStub' });
    slider.vm.$emit('input', 100);
    await wrapper.vm.$nextTick();

    const input = wrapper.get('.float-input-stub');
    expect(input.classes()).toContain('demeter-stake-part');
    expect(input.classes()).toContain('three-char');
  });
});
