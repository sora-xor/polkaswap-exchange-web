import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

type DistributionEntry = {
  input: string;
  output: string;
  income: string;
  outcome: string;
  market: LiquiditySourceTypes;
};

const distributionRef = ref<DistributionEntry[][]>([]);
const tokenFromRef = ref<AccountAsset | null>(null);
const tokenToRef = ref<AccountAsset | null>(null);
const fromValueRef = ref('');
const toValueRef = ref('');
const assetsByAddressRef = ref<Record<string, AccountAsset>>({});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    components: {
      TokenLogo: defineComponent({
        name: 'TokenLogoStub',
        template: '<span class="token-logo-stub"></span>',
      }),
      FormattedAmount: defineComponent({
        name: 'FormattedAmountStub',
        props: {
          value: {
            type: String,
            default: '',
          },
        },
        template: '<span class="formatted-amount-stub">{{ value }}<slot /></span>',
      }),
    },
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () =>
    defineComponent({
      name: 'LazyStub',
      setup(_, { attrs, slots }) {
        return () => h('div', { class: 'lazy-stub', ...attrs }, slots.default?.());
      },
    }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: (value: string) => value,
    getFPNumberFiatAmountByFPNumber: () => null,
  }),
}));

vi.mock('@/composables/useSwapAmounts', () => ({
  useSwapAmounts: () => ({
    tokenFrom: computed(() => tokenFromRef.value),
    tokenTo: computed(() => tokenToRef.value),
    fromValue: computed(() => fromValueRef.value),
    toValue: computed(() => toValueRef.value),
  }),
}));

vi.mock('@/stores/swap', () => ({
  useSwapStore: () => ({
    distribution: distributionRef.value,
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    assetDataByAddress: (address?: string) => (address ? (assetsByAddressRef.value[address] ?? null) : null),
  }),
}));

vi.mock('@/utils/swap', () => ({
  calcFiatDifference: () => ({
    toFixed: () => '1.23',
  }),
}));

const mountWidget = async () => {
  const module = await import('@/components/pages/Swap/Widget/Distribution.vue');

  return mount(module.default);
};

describe('SwapDistributionWidget', () => {
  beforeEach(() => {
    distributionRef.value = [];
    tokenFromRef.value = {
      address: 'xor',
      symbol: 'XOR',
      decimals: 18,
    } as AccountAsset;
    tokenToRef.value = {
      address: 'val',
      symbol: 'VAL',
      decimals: 18,
    } as AccountAsset;
    fromValueRef.value = '100';
    toValueRef.value = '50';
    assetsByAddressRef.value = {
      xor: {
        address: 'xor',
        symbol: 'XOR',
        decimals: 18,
      } as AccountAsset,
      val: {
        address: 'val',
        symbol: 'VAL',
        decimals: 18,
      } as AccountAsset,
    };
  });

  it('renders skeleton route rows when there is no distribution', async () => {
    const wrapper = await mountWidget();
    await flushPromises();

    expect(wrapper.find('div.distribution').exists()).toBe(true);
    expect(wrapper.find('.distribution-path-source-name.el-skeleton__item').exists()).toBe(true);
    expect(wrapper.findAll('.el-skeleton__item').length).toBe(6);
    expect(wrapper.findAll('.distribution-path-source').length).toBe(1);
    expect(wrapper.text()).not.toContain('XYK Pool');
  });

  it('renders resolved route rows without skeleton placeholders', async () => {
    distributionRef.value = [
      [
        { input: 'xor', output: 'val', income: '60', outcome: '30', market: LiquiditySourceTypes.XYKPool },
        { input: 'xor', output: 'val', income: '40', outcome: '20', market: LiquiditySourceTypes.OrderBook },
      ],
    ];

    const wrapper = await mountWidget();
    await flushPromises();

    const sourceNames = wrapper
      .findAll('.distribution-path-source-name')
      .map((item) => item.text().trim())
      .filter(Boolean);

    expect(wrapper.find('ul.distribution').exists()).toBe(true);
    expect(sourceNames).toEqual(['XYK Pool:', 'Order Book:']);
    expect(wrapper.findAll('.distribution-path-source').length).toBe(2);
    expect(wrapper.find('.el-skeleton__item').exists()).toBe(false);
  });

  it('falls back to skeleton layout when route assets are missing', async () => {
    distributionRef.value = [
      [{ input: 'missing', output: 'val', income: '60', outcome: '30', market: LiquiditySourceTypes.XYKPool }],
    ];

    const wrapper = await mountWidget();
    await flushPromises();

    expect(wrapper.findAll('.distribution-path-source').length).toBe(1);
    expect(wrapper.find('.el-skeleton__item').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('XYK Pool');
  });
});
