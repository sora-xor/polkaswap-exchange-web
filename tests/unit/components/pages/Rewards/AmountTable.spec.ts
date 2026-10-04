import { shallowMount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const translationMock = {
  t: vi.fn((key: string) => key),
  te: vi.fn(() => true),
};

const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

const FormattedAmountStub = defineComponent({
  name: 'FormattedAmount',
  setup(_props, { slots }) {
    return () => h('span', slots.default?.());
  },
});

const FormattedAmountWithFiatValueStub = defineComponent({
  name: 'FormattedAmountWithFiatValue',
  setup(_props, { slots }) {
    return () => h('span', slots.default?.());
  },
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: FormattedAmountStub,
      FormattedAmountWithFiatValue: FormattedAmountWithFiatValueStub,
    },
    WALLET_CONSTS: {
      FontSizeRate: {
        MEDIUM: 'medium',
      },
    },
  });
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => translationMock,
}));

const formattedAmountMocks = {
  formatCodecNumber: vi.fn((value: string) => `codec:${value}`),
  getFPNumberFromCodec: vi.fn(() => ({
    toLocaleString: () => 'decoded',
  })),
  getFiatAmountByCodecString: vi.fn(() => 'fiat-codec'),
  getFiatAmountByString: vi.fn(() => 'fiat-string'),
  getFPNumber: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    toLocaleString: () => '1000.00',
  })),
  getFPNumberFiatAmountByFPNumber: vi.fn(() => ({
    add: vi.fn().mockReturnThis(),
    toLocaleString: () => '2000.00',
  })),
  Zero: {
    add: vi.fn().mockReturnThis(),
    toLocaleString: () => '0.00',
  },
};

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => formattedAmountMocks,
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: vi.fn(() => 'formatted'),
  }),
}));

const CheckboxGroupStub = defineComponent({
  name: 'ElCheckboxGroup',
  props: {
    modelValue: {
      type: [Boolean, Array],
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(_props, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const CheckboxStub = defineComponent({
  name: 'ElCheckbox',
  props: {
    label: { type: [String, Boolean], default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(_props, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const PopoverStub = defineComponent({
  name: 'ElPopover',
  setup(_props, { slots }) {
    return () => h('div', [slots.default?.(), slots.reference?.()]);
  },
});

const RewardsItemTooltipStub = defineComponent({
  name: 'RewardsItemTooltip',
  setup() {
    return () => h('span');
  },
});

vi.mock('@/features/rewards/components/rewards/ItemTooltip.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: RewardsItemTooltipStub,
}));

let AmountTable: (typeof import('@/features/rewards/components/rewards/AmountTable.vue'))['default'];
let MountTarget: (typeof import('@/features/rewards/components/rewards/AmountTable.vue'))['default'];

beforeEach(async () => {
  Object.values(formattedAmountMocks).forEach((mock) => {
    if (typeof mock === 'function') vi.mocked(mock).mockClear();
  });
  translationMock.t.mockClear();
  translationMock.te.mockClear();

  const module = await import('@/features/rewards/components/rewards/AmountTable.vue');
  AmountTable = module.default;
  MountTarget = { ...module.default, render: () => h('div') } as typeof module.default;
});

describe('RewardsAmountTable.vue', () => {
  it('maps reward groups into formatted items and emits v-model updates', async () => {
    const asset = { symbol: 'PSWAP', decimals: 12 } as never;

    const wrapper = shallowMount(MountTarget, {
      props: {
        items: [
          {
            type: ['internal', 'rewarded'] as never,
            limit: [{ asset, amount: '100' }],
            total: { asset, amount: '200' },
            rewards: [
              {
                type: ['internal', 'rewarded'] as never,
                asset,
                amount: '50',
                total: '75',
                title: 'Child title',
              } as never,
            ],
          } as never,
        ],
        modelValue: [],
      },
      global: {
        stubs: {
          'el-checkbox-group': CheckboxGroupStub,
          'el-checkbox': CheckboxStub,
          's-divider': true,
          'el-popover': PopoverStub,
          'formatted-amount-with-fiat-value': FormattedAmountWithFiatValueStub,
          'formatted-amount': FormattedAmountStub,
          'rewards-item-tooltip': RewardsItemTooltipStub,
        },
      },
    });

    const formatted = (wrapper.vm as { formattedItems: unknown[] }).formattedItems;
    expect(formatted).toHaveLength(1);
    expect(formatted[0]).toMatchObject({
      total: { asset, amount: '200' },
      limit: [{ asset, amount: '100' }],
    });

    (wrapper.vm as { innerModel: boolean | string[] }).innerModel = ['reward'];
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['reward']]);
  });

  it('disables reward items when limit amount resolves to zero', async () => {
    const wrapper = shallowMount(MountTarget, {
      props: {
        items: [
          {
            type: ['internal', 'rewarded'] as never,
            asset: { symbol: 'VAL', decimals: 12 } as never,
            amount: '0',
          } as never,
        ],
      },
      global: {
        stubs: {
          'el-checkbox-group': CheckboxGroupStub,
          'el-checkbox': CheckboxStub,
          's-divider': true,
          'el-popover': PopoverStub,
          'formatted-amount-with-fiat-value': FormattedAmountWithFiatValueStub,
          'formatted-amount': FormattedAmountStub,
          'rewards-item-tooltip': RewardsItemTooltipStub,
        },
      },
    });

    const formatted = (wrapper.vm as { formattedItems: RewardsAmountTableItem[] }).formattedItems;
    const isDisabled = (
      wrapper.vm as { isDisabledRewardItem: (item: RewardsAmountTableItem) => boolean }
    ).isDisabledRewardItem(formatted[0]);
    expect(isDisabled).toBe(true);
  });
});

type RewardsAmountTableItem = {
  limit?: Array<{ asset: { symbol: string }; amount: string; total?: string }>;
};

describe('RewardsAmountTable.vue selection', () => {
  const asset = { symbol: 'PSWAP', decimals: 18, address: '0xpswap' } as never;
  const stubs = {
    's-divider': true,
    'formatted-amount-with-fiat-value': FormattedAmountWithFiatValueStub,
    'rewards-item-tooltip': RewardsItemTooltipStub,
  };
  const mountTable = (props: Record<string, unknown>) => shallowMount(AmountTable, { props, global: { stubs } });
  const group = (tag: string, amount = '5') => ({ type: ['Crowdloan', tag], limit: [{ asset, amount }] }) as never;

  it('ticks a single source with a boolean model and emits the new flag', async () => {
    const wrapper = mountTable({
      items: [{ type: ['Provision', 'LiquidityProvision'], asset, amount: '5' } as never],
      modelValue: true,
      source: 'liquidity',
    });
    const input = wrapper.get('input[type="checkbox"]');

    expect(wrapper.classes()).toContain('amount-table--liquidity');
    expect((input.element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.get('label').classes()).toContain('is-checked');

    await input.setValue(false);

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('adds and removes tags for a list model', async () => {
    const wrapper = mountTable({ items: [group('tagA'), group('tagB')], modelValue: ['tagA'] });
    const inputs = wrapper.findAll('input[type="checkbox"]');

    expect(inputs.map((input) => (input.element as HTMLInputElement).checked)).toEqual([true, false]);

    await inputs[1].setValue(true);
    await inputs[0].setValue(false);

    expect(wrapper.emitted('update:modelValue')).toEqual([[['tagA', 'tagB']], [[]]]);
  });

  it('does not tick the same tag twice', () => {
    const wrapper = mountTable({ items: [group('tagA')], modelValue: ['tagA'] });
    const vm = wrapper.vm as unknown as {
      formattedItems: unknown[];
      handleToggle: (item: unknown, event: Event) => void;
    };

    vm.handleToggle(vm.formattedItems[0], { target: { checked: true } } as unknown as Event);

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['tagA']]);
  });

  it('disables a group with nothing to claim and never shows it as ticked', () => {
    const wrapper = mountTable({ items: [group('tagA', '0')], modelValue: ['tagA'] });
    const input = wrapper.get('input[type="checkbox"]');

    expect((input.element as HTMLInputElement).disabled).toBe(true);
    expect((input.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.get('label').classes()).toContain('is-disabled');
  });

  it('has no accent class without a source', () => {
    const wrapper = mountTable({ items: [group('tagA')], modelValue: [] });

    expect(wrapper.classes().some((name) => name.startsWith('amount-table--'))).toBe(false);
  });

  it('renders no list when the table is hidden but still renders its slot', () => {
    const wrapper = shallowMount(AmountTable, {
      props: { items: [group('tagA')], modelValue: [], showTable: false },
      slots: { default: '<p class="footer">footer</p>' },
      global: { stubs },
    });

    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.find('.footer').exists()).toBe(true);
  });
});
