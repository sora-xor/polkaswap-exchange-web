import { FPNumber, Operation } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, ref, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import CalculatorDialog from '@/modules/staking/demeter/components/CalculatorDialog.vue';

const tokenInputStubHolder = vi.hoisted(() => ({ value: null as Component | null }));

const STabsStub = defineComponent({
  name: 'STabsStub',
  props: ['value', 'type'],
  emits: ['input'],
  template: `<div class="tabs-stub"><slot /></div>`,
});

const STabStub = defineComponent({
  name: 'STabStub',
  props: ['name', 'label'],
  template: `<div class="tab-stub"></div>`,
});

const DialogBaseStub = defineComponent({
  name: 'DialogBaseStub',
  props: ['visible', 'title'],
  emits: ['update:visible'],
  template: `<div class="dialog-base-stub"><slot /></div>`,
});

const InfoLineStub = defineComponent({
  name: 'InfoLineStub',
  props: ['label', 'value', 'fiatValue', 'labelTooltip'],
  template: `<div class="info-line-stub"></div>`,
});

vi.mock('@/router', () => {
  tokenInputStubHolder.value = defineComponent({
    name: 'TokenInputStub',
    props: ['balance', 'isMaxAvailable', 'title', 'token', 'value'],
    emits: ['input', 'max'],
    template: `<div class="token-input-stub"></div>`,
  });
  return {
    lazyComponent: () => tokenInputStubHolder.value,
  };
});

vi.mock('@/modules/staking/demeter/router', () => ({
  demeterStakingLazyComponent: () =>
    defineComponent({
      name: 'DialogTitleStub',
      props: ['baseAsset', 'poolAsset', 'isFarm'],
      template: `<div class="dialog-title-stub"></div>`,
    }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, payload?: Record<string, unknown>) => (payload ? `${key}:${JSON.stringify(payload)}` : key),
    TranslationConsts: { APR: 'APR_TEXT', ROI: 'ROI_TEXT' },
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    networkFees: {
      [Operation.DemeterFarmingDepositLiquidity]: '1000000000000',
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

vi.mock('@/store', () => {
  const state = {
    wallet: {
      settings: {
        shouldBalanceBeHidden: false,
      },
    },
  };
  return {
    __esModule: true,
    default: { state },
  };
});

const useDemeterPoolStatusMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolStatus', () => ({
  useDemeterPoolStatus: (...args: unknown[]) => useDemeterPoolStatusMock(...args),
}));

const useDemeterPoolCardMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolCard', () => ({
  useDemeterPoolCard: (...args: unknown[]) => useDemeterPoolCardMock(...args),
}));

const buildStatusApi = () => ({
  liquidity: ref({ firstBalance: '1000000000000', secondBalance: '2000000000000' }),
  pool: ref({
    totalTokensInPool: new FPNumber(1000),
  }),
  accountPool: ref({}),
  poolAsset: ref({ symbol: 'LP', decimals: 18, price: new FPNumber(1) }),
  rewardAsset: ref({ symbol: 'RWD', decimals: 18, price: new FPNumber(1) }),
  hasStake: ref(false),
  isFarm: ref(true),
  pricesAvailable: ref(true),
  lpBalance: ref(new FPNumber(100)),
  availableFunds: ref(new FPNumber(0)),
  lockedFunds: ref(new FPNumber(0)),
  funds: ref(new FPNumber(0)),
  getFiatAmountByFPNumber: vi.fn().mockReturnValue('1'),
  getFiatAmountByCodecString: vi.fn().mockReturnValue('0.1'),
  getAssetFiatPrice: vi.fn().mockReturnValue('1000000000000'),
});

const buildPoolCardApi = () => ({
  rewardAssetSymbol: ref('RWD'),
  rewardsFormatted: ref('10'),
  rewardsFiat: ref('$10'),
  rewardAssetPrice: ref(new FPNumber(1)),
  networkFee: ref('1000000000000'),
  networkFeeFormatted: ref('0.001'),
  depositFee: ref(0.01),
  depositFeeFormatted: ref('1%'),
  poolShareFormatted: ref(''),
  poolShareFiat: ref(null),
  poolAssetPrice: ref(new FPNumber(1)),
  isInsufficientXorForFee: ref(false),
});

const baseProps = {
  visible: true,
  baseAsset: { decimals: 18, symbol: 'BASE' },
  poolAsset: { decimals: 18, symbol: 'LP' },
  rewardAsset: { decimals: 18, symbol: 'RWD' },
  pool: { totalTokensInPool: new FPNumber(0) },
  accountPool: {},
  liquidity: { firstBalance: '1000000000000', secondBalance: '2000000000000' },
  emission: new FPNumber(1),
};

const createGlobalComponents = () => ({
  's-form': defineComponent({ template: '<form><slot /></form>' }),
  's-icon': defineComponent({ template: '<i />' }),
  's-tabs': STabsStub,
  's-tab': STabStub,
  DialogBase: DialogBaseStub,
  InfoLine: InfoLineStub,
});

describe('Demeter CalculatorDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useDemeterPoolStatusMock.mockReturnValue(buildStatusApi());
    useDemeterPoolCardMock.mockReturnValue(buildPoolCardApi());
  });

  it('keeps pool input synchronized with base asset input while visible', async () => {
    const wrapper = mount(CalculatorDialog, {
      props: baseProps,
      global: {
        components: createGlobalComponents(),
      },
    });

    const inputs = wrapper.findAllComponents(tokenInputStubHolder.value as Component);
    const baseInput = inputs[0];
    const poolInput = inputs[1];

    await baseInput.vm.$emit('input', '1');
    expect(poolInput.props('value')).toBe('2');
  });

  it('resets both amounts when dialog visibility toggles off and on', async () => {
    const wrapper = mount(CalculatorDialog, {
      props: baseProps,
      global: {
        components: createGlobalComponents(),
      },
    });

    const inputs = wrapper.findAllComponents(tokenInputStubHolder.value as Component);
    await inputs[0].vm.$emit('input', '3');
    await wrapper.setProps({ visible: false });
    await wrapper.setProps({ visible: true });
    const refreshedInputs = wrapper.findAllComponents(tokenInputStubHolder.value as Component);
    expect(refreshedInputs[0].props('value')).toBe('');
    expect(refreshedInputs[1].props('value')).toBe('');
  });

  it('updates selected period when tabs emit input', async () => {
    const wrapper = mount(CalculatorDialog, {
      props: baseProps,
      global: {
        components: createGlobalComponents(),
      },
    });

    const tabs = wrapper.findComponent(STabsStub as Component);
    expect(tabs.props('value')).toBe('1');
    await tabs.vm.$emit('input', '7');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(STabsStub as Component).props('value')).toBe('7');
  });

  it('derives rewards and ROI using FPNumber helpers', async () => {
    const statusApi = buildStatusApi();
    statusApi.pool.value = {
      totalTokensInPool: new FPNumber(1000),
    } as any;
    statusApi.lpBalance.value = new FPNumber(100);
    statusApi.poolAsset.value = { decimals: 18, symbol: 'LP' } as any;
    useDemeterPoolStatusMock.mockReturnValue(statusApi);

    const poolCardApi = buildPoolCardApi();
    poolCardApi.depositFee.value = 0.05;
    poolCardApi.poolAssetPrice.value = new FPNumber(2);
    poolCardApi.rewardAssetPrice.value = new FPNumber(3);
    useDemeterPoolCardMock.mockReturnValue(poolCardApi);

    const wrapper = mount(CalculatorDialog, {
      props: {
        ...baseProps,
        emission: new FPNumber(1),
      },
      global: {
        components: createGlobalComponents(),
      },
    });

    const vm = wrapper.vm as any;
    vm.baseAssetValue = '10';
    vm.poolAssetValue = '20';
    await wrapper.vm.$nextTick();

    const rewards = vm.calculatedRewards as FPNumber;
    const roiPercent = vm.calculatedRoiPercent as FPNumber;

    expect(rewards.gt(FPNumber.ZERO)).toBe(true);
    expect(roiPercent.gt(FPNumber.ZERO)).toBe(true);
  });
});
