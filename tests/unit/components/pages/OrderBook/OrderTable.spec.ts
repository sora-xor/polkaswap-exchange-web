import { FPNumber } from '@sora-substrate/sdk';
import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import dayjs from 'dayjs/esm';
import durationPlugin from 'dayjs/esm/plugin/duration';

dayjs.extend(durationPlugin);

import type { OrderData } from '@/types/orderBook';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

const walletConstants = vi.hoisted(() => ({
  PaginationButton: {
    Prev: 'prev',
    Next: 'next',
    Last: 'last',
    First: 'first',
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    WALLET_CONSTS: walletConstants,
    INDEXER_TYPES: {
      OrderStatus: {
        Active: 'Active',
        Aligned: 'Aligned',
        Canceled: 'Canceled',
        Expired: 'Expired',
        Filled: 'Filled',
        PartialFill: 'PartialFill',
        Stop: 'Stop',
      },
    },
    components: {
      HistoryPagination: defineComponent({
        name: 'HistoryPaginationStub',
        emits: ['pagination-click'],
        setup(_, { emit }) {
          return () =>
            h(
              'button',
              {
                class: 'history-pagination-stub',
                onClick: () => emit('pagination-click', walletConstants.PaginationButton.Prev),
              },
              'Pagination'
            );
        },
      }),
    },
  });
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assetsDataTable: {
      'base-asset': {
        address: 'base-asset',
        symbol: 'BASE',
        decimals: 18,
        balance: {},
      },
      'quote-asset': {
        address: 'quote-asset',
        symbol: 'QUOTE',
        decimals: 18,
        balance: {},
      },
    },
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    percentFormat: new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2 }),
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumberFiatAmountByFPNumber: (value: FPNumber) => value,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const createOrder = (overrides: Partial<OrderData> = {}): OrderData =>
  ({
    id: Math.random(),
    orderBookId: { base: 'base-asset', quote: 'quote-asset', dexId: 0 },
    originalAmount: FPNumber.fromNatural(10),
    amount: FPNumber.fromNatural(4),
    price: FPNumber.fromNatural(2),
    side: 'Buy',
    status: 'Filled',
    time: Date.now(),
    lifespan: 86_400_000,
    ...overrides,
  }) as unknown as OrderData;

const TableStub = defineComponent({
  name: 'STableStub',
  props: {
    data: { type: Array, default: () => [] },
  },
  emits: ['cell-click', 'selection-change', 'select'],
  setup(props) {
    return () =>
      h('div', {
        class: 'table-stub',
        'data-length': props.data?.length ?? 0,
      });
  },
});

const mountComponent = async (options: { props?: Record<string, unknown> } = {}) => {
  const module = await import('@/components/pages/OrderBook/Tables/OrderTable.vue');

  return mount(module.default, {
    props: {
      orders: [],
      ...options.props,
    },
    global: {
      stubs: {
        's-table': TableStub,
        's-table-column': defineComponent({
          name: 'STableColumnStub',
          setup: () => () => null,
        }),
      },
      directives: {
        loading: {
          created: () => undefined,
          mounted: () => undefined,
        },
      },
    },
  });
};

describe('OrderTable.vue', () => {
  it('emits mapped rows via sync event', async () => {
    const order = createOrder();
    vi.useFakeTimers();
    const wrapper = await mountComponent({ props: { orders: [order] } });

    await flushPromises();
    vi.runAllTimers();
    await flushPromises();
    vi.useRealTimers();

    const syncEvents = wrapper.emitted('sync');
    expect(syncEvents?.[0]?.[0]).toHaveLength(1);
    const firstRow = syncEvents?.[0]?.[0]?.[0] as LimitOrder & { pair: string; total: string; filled: string };
    expect(firstRow.pair).toBe('BASE-QUOTE');
    expect(firstRow.total).toBe('20');
    expect(firstRow.filled).toBe('60%');
  });

  it('emits page-updated after pagination change', async () => {
    const manyOrders = Array.from({ length: 12 }, () => createOrder());
    vi.useFakeTimers();
    const wrapper = await mountComponent({ props: { orders: manyOrders } });

    await flushPromises();
    vi.runAllTimers();
    await flushPromises();
    vi.useRealTimers();

    // move to the next page
    await (wrapper.vm as any).handlePagination(walletConstants.PaginationButton.Next);

    const pageEvents = wrapper.emitted('page-updated');
    expect(pageEvents?.at(-1)).toEqual([2, expect.any(Array)]);
    const [, rows] = pageEvents?.at(-1) ?? [];
    expect(rows).toHaveLength(2);
  });
});
