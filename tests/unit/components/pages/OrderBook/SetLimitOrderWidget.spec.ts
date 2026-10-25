import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import setLimitOrderWidgetSource from '@/features/misc/components/order-book/SetLimitOrderWidget.vue?raw';
import SetLimitOrderWidget from '@/features/misc/components/order-book/SetLimitOrderWidget.vue';

const usePiniaTelemetryMock = vi.fn();
const orderBookStoreStub = { $id: 'order-book-store' };

vi.mock('@/composables/usePiniaTelemetry', () => ({
  usePiniaTelemetry: (...args: unknown[]) => usePiniaTelemetryMock(...args),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

const sideRef = ref('Buy');
const setSideMock = vi.fn();

vi.mock('@/composables/useOrderBook', () => ({
  useOrderBook: () => ({
    PriceVariant: { Buy: 'Buy', Sell: 'Sell' },
    side: sideRef,
    setSide: setSideMock,
    orderBookId: { value: 'orderbook-1' },
    baseAsset: { value: { symbol: 'AAA' } },
    quoteAsset: { value: { symbol: 'BBB' } },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SetLimitOrderWidget.vue', () => {
  it('registers telemetry metadata', async () => {
    usePiniaTelemetryMock.mockClear();

    mount(SetLimitOrderWidget, {
      global: {
        stubs: {
          'base-widget': { template: '<div><slot /></div>' },
          'buy-sell': { template: '<div class="buy-sell-stub" />' },
          's-tabs': {
            props: ['value'],
            template: '<div><slot /></div>',
          },
          's-tab': { template: '<div><slot /></div>' },
        },
      },
    });

    expect(usePiniaTelemetryMock).toHaveBeenCalledTimes(1);
    const [, targets, options] = usePiniaTelemetryMock.mock.calls[0];
    expect(targets).toEqual([{ store: orderBookStoreStub, storeId: 'orderBook' }]);
    expect(options?.metadata?.()).toEqual({
      widget: 'set-limit-order',
      orderBookId: 'orderbook-1',
      baseAsset: 'AAA',
      quoteAsset: 'BBB',
    });
  }, 30_000);

  it('keeps the buy/sell tab chrome aligned with the live trade widget', () => {
    expect(setLimitOrderWidgetSource).toContain('height: calc(#{$book-tabs-height} + #{$inner-spacing-mini} - 1px);');
    expect(setLimitOrderWidgetSource).toContain(
      'border-radius: var(--s-border-radius-small) var(--s-border-radius-small) 0 0;'
    );
    expect(setLimitOrderWidgetSource).toContain('box-shadow: var(--s-shadow-element) !important;');
    expect(setLimitOrderWidgetSource).toContain('margin-bottom: -1px;');
  });
});
