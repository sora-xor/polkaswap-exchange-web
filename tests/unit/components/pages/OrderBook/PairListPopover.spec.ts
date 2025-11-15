import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { computed } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { OrderBookStats } from '@/types/orderBook';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const pairListMocks = vi.hoisted(() => ({
  orderBooks: {} as Record<string, OrderBook>,
  orderBooksStats: {} as Record<string, OrderBookStats>,
  selectOrderBook: vi.fn<(id: OrderBookId) => void>(),
}));

vi.doMock('@/composables/useOrderBookPairList', () => ({
  useOrderBookPairList: () => ({
    orderBooks: computed(() => pairListMocks.orderBooks),
    orderBooksStats: computed(() => pairListMocks.orderBooksStats),
    selectOrderBook: pairListMocks.selectOrderBook,
  }),
}));

vi.doMock('@wallet', () => ({
  components: {
    FormattedAmount: { template: '<span class="formatted-amount"><slot /></span>' },
  },
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({ template: '<div><slot /></div>' }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PairListPopover.vue', () => {
  let assets: Record<string, AccountAsset>;

  beforeEach(() => {
    assets = {
      'base-1': { address: 'base-1', symbol: 'XOR' } as AccountAsset,
      'quote-1': { address: 'quote-1', symbol: 'VAL' } as AccountAsset,
      'base-2': { address: 'base-2', symbol: 'ETH' } as AccountAsset,
      'quote-2': { address: 'quote-2', symbol: 'USDT' } as AccountAsset,
    };

    (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE = {
      assetDataByAddress: (address?: string) => {
        if (!address) return null;
        return assets[address] ?? null;
      },
    };

    const firstOrderBook = {
      orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 0 },
      status: OrderBookStatus.Trade,
      stepLotSize: '0.01',
      tickSize: '0.001',
    } as unknown as OrderBook;

    const secondOrderBook = {
      orderBookId: { base: 'base-2', quote: 'quote-2', dexId: 1 },
      status: OrderBookStatus.Stop,
      stepLotSize: '0.01',
      tickSize: '0.001',
    } as unknown as OrderBook;

    pairListMocks.orderBooks = {
      'order-book-1': firstOrderBook,
      'order-book-2': secondOrderBook,
    };

    pairListMocks.orderBooksStats = {
      'order-book-1': {
        price: new FPNumber(2.5),
        priceChange: new FPNumber(0.1),
        volume: new FPNumber(10),
        status: OrderBookStatus.Trade,
      } as OrderBookStats,
      'order-book-2': {
        price: new FPNumber(4.75),
        priceChange: new FPNumber(-0.25),
        volume: new FPNumber(3.5),
        status: OrderBookStatus.Stop,
      } as OrderBookStats,
    };

    pairListMocks.selectOrderBook = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE;
    pairListMocks.selectOrderBook.mockReset();
    pairListMocks.orderBooks = {};
    pairListMocks.orderBooksStats = {};
  });

  const createWrapper = async () => {
    const module = await import('@/components/pages/OrderBook/Popovers/PairListPopover.vue');

    return mount(module.default, {
      global: {
        stubs: {
          PairTokenLogo: { template: '<div class="pair-token-logo" />' },
          PriceChange: { template: '<span class="price-change">{{ $attrs.value }}</span>' },
          'formatted-amount': { props: ['value'], template: '<span class="formatted-amount">{{ value }}</span>' },
          's-table': { template: '<div class="table-stub" />' },
          's-table-column': { template: '<div class="table-column-stub" />' },
        },
      },
    });
  };

  it('builds formatted table items from order book state', async () => {
    const wrapper = await createWrapper();
    const { tableItems } = wrapper.vm as unknown as {
      tableItems: Array<{
        pair: string;
        price: string;
        volume: string;
        status: string;
      }>;
    };

    const expectedFirstPrice = new FPNumber(2.5).dp(2).toLocaleString();
    const expectedSecondPrice = new FPNumber(4.75).dp(2).toLocaleString();
    const expectedFirstVolume = new FPNumber(10).toLocaleString();
    const expectedSecondVolume = new FPNumber(3.5).toLocaleString();

    expect(tableItems).toHaveLength(2);
    expect(tableItems[0]).toMatchObject({
      pair: 'XOR-VAL',
      price: expectedFirstPrice,
      volume: expectedFirstVolume,
      status: OrderBookStatus.Trade,
    });
    expect(tableItems[1]).toMatchObject({
      pair: 'ETH-USDT',
      price: expectedSecondPrice,
      volume: expectedSecondVolume,
      status: OrderBookStatus.Stop,
    });
  });

  it('commits the selected order book and emits close event', async () => {
    const wrapper = await createWrapper();
    const { tableItems, chooseBook } = wrapper.vm as unknown as {
      tableItems: NonNullable<unknown>[];
      chooseBook: (row: any) => void;
    };

    chooseBook(tableItems[0]);

    expect(pairListMocks.selectOrderBook).toHaveBeenCalledTimes(1);
    expect(pairListMocks.selectOrderBook).toHaveBeenCalledWith(tableItems[0].id);
    expect(wrapper.emitted().close).toBeTruthy();
  });

  it('maps status helpers for colour and tooltip text', async () => {
    const wrapper = await createWrapper();
    const exposed = wrapper.vm as unknown as {
      calculateColor: (status: OrderBookStatus) => string | undefined;
      getTooltipText: (status: OrderBookStatus) => string;
      mapBookStatus: (status: OrderBookStatus) => string;
    };

    expect(exposed.calculateColor(OrderBookStatus.Trade)).toBe('status-live');
    expect(exposed.calculateColor(OrderBookStatus.Stop)).toBe('status-stop');
    expect(exposed.calculateColor('Unknown' as OrderBookStatus)).toBeUndefined();

    expect(exposed.getTooltipText(OrderBookStatus.Trade)).toBe('orderBook.tooltip.bookStatus.active');
    expect(exposed.mapBookStatus(OrderBookStatus.Stop)).toBe('orderBook.bookStatus.inactive');
  });
});
