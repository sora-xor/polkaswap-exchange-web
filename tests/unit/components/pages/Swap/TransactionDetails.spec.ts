import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { SwapReview } from '@/features/swap/types/review';

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatStringValue: (value: string) => value,
    formatCodecNumber: (value: string) => value,
    getFiatAmountByCodecString: () => null,
    getFiatAmountByString: () => null,
  }),
}));
vi.mock('@/features/swap/stores/useSwapStore', () => ({
  useSwapStore: () => ({
    price: '100',
    priceReversed: '0.01',
    rewards: [],
    route: [],
    priceImpact: '0',
    minMaxReceived: '0',
  }),
}));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => ({ networkFees: {} }) }));
vi.mock('@/stores/assets', () => ({ useAssetsStore: () => ({ assetDataByAddress: () => null }) }));
vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    props: ['value'],
    template: '<div class="info-line" :data-value="value"><slot /></div>',
  },
}));
import TransactionDetails from '@/features/swap/components/TransactionDetails.vue';

describe('reviewed swap details', () => {
  it('uses the captured forward and reciprocal prices rather than live quotes', async () => {
    const review = {
      tokenFrom: { symbol: 'XOR' },
      tokenTo: { symbol: 'VAL' },
      price: '6.25',
      priceReversed: '0.16',
      rewards: [],
      route: [],
      priceImpact: '-0.1',
      networkFee: '100',
      minMaxReceived: '1',
      liquidityProviderFee: '0',
    } as unknown as SwapReview;
    const wrapper = mount(TransactionDetails, {
      props: { expanded: true, review },
      global: {
        stubs: {
          TransactionDetails: { template: '<div><slot /></div>' },
          ValueStatusWrapper: { template: '<div><slot /></div>' },
          FormattedAmount: true,
          's-icon': true,
        },
      },
    });
    await flushPromises();
    const values = wrapper.findAll('.info-line').map((line) => line.attributes('data-value'));
    expect(values.slice(0, 2)).toEqual(['6.25', '0.16']);
  });
});
