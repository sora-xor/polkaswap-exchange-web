import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { Operation } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    networkFees: {
      [Operation.OrderBookPlaceLimitOrder]: '11',
      [Operation.Swap]: '22',
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', async () => {
  const { FPNumber } = await vi.importActual<typeof import('@sora-substrate/sdk')>('@sora-substrate/sdk');

  return {
    useFormattedAmount: () => ({
      getFPNumber: (value: string) => new FPNumber(value || '0'),
      formatCodecNumber: (value: string) => `formatted-${value}`,
      getFiatAmountByCodecString: (value: string) => `fiat-${value}`,
    }),
  };
});

vi.mock('@/composables/useSwapAmounts', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue');
  return { useSwapAmounts: () => ({ toValue: ref('') }) };
});

vi.mock('@/composables/useOrderBook', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue');

  return {
    useOrderBook: () => ({
      baseValue: ref('2'),
      quoteValue: ref('3'),
      side: ref(PriceVariant.Buy),
      baseAsset: ref({ address: 'base', symbol: 'BASE', decimals: 18 }),
      quoteAsset: ref({ address: 'quote', symbol: 'QUOTE', decimals: 18 }),
    }),
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/shared/TransactionDetails.vue', () => ({
  default: { template: '<div class="transaction-details-stub"><slot /></div>' },
}));

vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    name: 'InfoLineStub',
    props: ['value'],
    template: '<div class="info-line-stub">{{ value }}</div>',
  },
}));

import TransactionDetails from '@/features/misc/components/order-book/TransactionDetails.vue';

describe('OrderBook TransactionDetails', () => {
  it('formats the swap fee for market orders and the place-limit-order fee for limit orders', () => {
    const marketWrapper = mount(TransactionDetails, { props: { isMarketType: true } });
    const limitWrapper = mount(TransactionDetails, { props: { isMarketType: false } });

    expect(marketWrapper.vm.networkFee).toBe('22');
    expect(marketWrapper.vm.formattedNetworkFee).toBe('formatted-22');
    expect(marketWrapper.text()).toContain('formatted-22');
    expect(limitWrapper.vm.networkFee).toBe('11');
    expect(limitWrapper.vm.formattedNetworkFee).toBe('formatted-11');
    expect(limitWrapper.text()).toContain('formatted-11');

    marketWrapper.unmount();
    limitWrapper.unmount();
  });
});
