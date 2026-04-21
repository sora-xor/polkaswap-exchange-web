import { Operation } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/pool', () => ({
  __esModule: true,
  usePoolStore: () => ({
    removeLiquidityShareOfPool: '12.5',
    removeLiquidityFirstToken: { symbol: 'DEMO1' },
    removeLiquiditySecondToken: { symbol: 'DEMO2' },
    removeLiquidityPriceReversed: '0.25',
    removeLiquidityPrice: '4',
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    networkFees: {
      [Operation.RemoveLiquidity]: '25',
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  __esModule: true,
  useFormattedAmount: () => ({
    Zero: { isZero: () => false },
    formatStringValue: (value: string) => `formatted-${value}`,
    formatCodecNumber: (value: string) => `formatted-${value}`,
    getFiatAmountByCodecString: (value: string) => `fiat-${value}`,
  }),
}));

vi.mock('@/components/shared/TransactionDetails.vue', () => ({
  __esModule: true,
  default: { template: '<div class="transaction-details-stub"><slot /></div>' },
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

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    name: 'InfoLineStub',
    props: ['label', 'value', 'assetSymbol', 'fiatValue', 'labelTooltip'],
    template: '<div class="info-line-stub"><span>{{ label }}</span><span>{{ value }}</span><slot /></div>',
  },
}));

import RemoveLiquidityTransactionDetails from '@/modules/pool/components/RemoveLiquidity/TransactionDetails.vue';

describe('RemoveLiquidityTransactionDetails.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountComponent = () =>
    mount(RemoveLiquidityTransactionDetails, {
      props: {
        infoOnly: false,
      },
      global: {
        plugins: [createPinia()],
        stubs: {
          InfoLine: {
            props: ['label', 'value', 'assetSymbol', 'fiatValue'],
            template:
              '<div class="info-line"><span class="label">{{ label }}</span><span class="value">{{ value }}</span><span class="asset">{{ assetSymbol }}</span><span class="fiat">{{ fiatValue }}</span><slot /></div>',
          },
        },
      },
    });

  it('renders share, prices, and fees derived from store state', () => {
    const wrapper = mountComponent();

    const text = wrapper.text();
    expect(text).toContain('removeLiquidity.shareOfPool');
    expect(text).toContain('12.5%');
    expect(text).toContain('formatted-0.25');
    expect(text).toContain('formatted-4');
    expect(text).toContain('formatted-25');
    expect(text).toContain('fiat-25');

    wrapper.unmount();
  });
});
