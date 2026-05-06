import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, inject, provide } from 'vue';

const mockGetHistory = vi.fn();
const mockParseHistoryItem = vi.fn();
const mockHistoryElementsFilter = vi.fn((params) => params);

const mockIndexer = {
  historyElementsFilter: mockHistoryElementsFilter,
  services: {
    explorer: {
      account: {
        getHistory: mockGetHistory,
      },
    },
    dataParser: {
      parseTransactionAsHistoryItem: mockParseHistoryItem,
    },
  },
};

const TokenLogoStub = defineComponent({
  name: 'TokenLogoStub',
  props: ['token', 'tokenSymbol'],
  template: '<span class="token-logo">{{ token?.symbol ?? tokenSymbol ?? "?" }}</span>',
});

const FormattedAmountWithFiatValueStub = defineComponent({
  name: 'FormattedAmountWithFiatValueStub',
  props: ['value', 'fiatValue'],
  template: '<div class="formatted-amount">{{ value }}|{{ fiatValue }}</div>',
});

const FormattedAddressStub = defineComponent({
  name: 'FormattedAddressStub',
  props: ['value'],
  template: '<div class="formatted-address">{{ value }}</div>',
});

const HistoryPaginationStub = defineComponent({
  name: 'HistoryPaginationStub',
  props: ['currentPage', 'pageAmount', 'total', 'lastPage', 'loading'],
  emits: ['pagination-click'],
  template: '<div class="history-pagination"><slot /></div>',
});

const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@tests/stubs/walletRuntime', () => ({
  __esModule: true,
  WALLET_CONSTS: {
    FontSizeRate: { SMALL: 'SMALL' },
    PaginationButton: { Prev: 'Prev', Next: 'Next', Last: 'Last' },
    ExplorerType: { Sorametrics: 'sorametrics', Subscan: 'subscan', Polkadot: 'polkadot' },
  },
  WALLET_TYPES: {
    AssetsTable: Object,
  },
  storage: storageMock,
  settingsStorage: storageMock,
  runtimeStorage: storageMock,
  getExplorerLinks: () => [{ type: 'sorametrics', value: 'https://sorametrics.org/#tx=0x123' }],
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  __esModule: true,
  default: TokenLogoStub,
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue', () => ({
  __esModule: true,
  default: FormattedAmountWithFiatValueStub,
}));

vi.mock('@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue', () => ({
  __esModule: true,
  default: FormattedAddressStub,
}));

vi.mock('@/lib/soraneo-wallet/src/components/HistoryPagination.vue', () => ({
  __esModule: true,
  default: HistoryPaginationStub,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  __esModule: true,
  getCurrentIndexer: () => mockIndexer,
}));

const assetsTable = {
  xor: { address: 'xor', symbol: 'XOR', decimals: 18 },
  val: { address: 'val', symbol: 'VAL', decimals: 12 },
};

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    soraNetwork: 'testnet',
  }),
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => ({
    assetsDataTable: assetsTable,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
  }),
}));

const BaseWidgetStub = defineComponent({
  name: 'BaseWidgetStub',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'base-widget' }, [
        slots.types ? h('div', { class: 'base-widget__types' }, slots.types()) : null,
        slots.default ? slots.default() : null,
      ]);
  },
});

const LinksDropdownStub = defineComponent({
  name: 'LinksDropdownStub',
  props: ['links'],
  template: '<div class="links-dropdown">{{ links.length }}</div>',
});

const TokenSelectButtonStub = defineComponent({
  name: 'TokenSelectButtonStub',
  props: ['disabled'],
  emits: ['click'],
  template: '<button class="token-select-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const SelectTokenStub = defineComponent({
  name: 'SelectTokenStub',
  props: ['visible', 'asset'],
  emits: ['update:visible', 'select'],
  template: '<div class="select-token" v-if="visible"><slot /></div>',
});

const TABLE_INJECTION_KEY = Symbol('s-table');

const STableStub = defineComponent({
  name: 'STableStub',
  props: {
    data: {
      type: Array,
      default: () => [],
    },
  },
  setup(props, { slots }) {
    provide(TABLE_INJECTION_KEY, () => props.data as any[]);
    return () => h('div', { class: 's-table-stub' }, slots.default ? slots.default() : null);
  },
});

const STableColumnStub = defineComponent({
  name: 'STableColumnStub',
  props: {
    width: [String, Number],
    headerAlign: String,
    align: String,
  },
  setup(_, { slots }) {
    const getRows = inject<() => any[]>(TABLE_INJECTION_KEY, () => []);
    return () => {
      const rows = getRows();
      return rows.map((row, index) =>
        h('div', { class: 's-table-column-stub', 'data-row-index': index }, [
          slots.header ? h('div', { class: 's-table-column-stub__header' }, slots.header()) : null,
          slots.default ? slots.default({ row }) : null,
        ])
      );
    };
  },
});

const SIconStub = defineComponent({
  name: 'SIconStub',
  template: '<span class="s-icon" />',
});

let SwapTransactionsWidget: typeof import('@/features/swap/components/widgets/Transactions.vue').default;

const mountWidget = async () => {
  if (!SwapTransactionsWidget) {
    ({ default: SwapTransactionsWidget } = await import('@/features/swap/components/widgets/Transactions.vue'));
  }

  return mount(SwapTransactionsWidget, {
    global: {
      stubs: {
        BaseWidget: BaseWidgetStub,
        LinksDropdown: LinksDropdownStub,
        TokenSelectButton: TokenSelectButtonStub,
        SelectToken: SelectTokenStub,
        's-table': STableStub,
        's-table-column': STableColumnStub,
        's-icon': SIconStub,
      },
      directives: {
        loading: () => undefined,
      },
    },
  });
};

const advanceFetchQueue = async () => {
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
};

describe('SwapTransactionsWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetHistory.mockReset();
    mockParseHistoryItem.mockReset();
    mockHistoryElementsFilter.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders fetched swap transactions with token metadata', async () => {
    const historyItem = {
      id: 'tx-1',
      blockId: 'block-1',
      from: 'addr-1',
      assetAddress: 'xor',
      asset2Address: 'val',
      amount: '1000000000000000000',
      amount2: '2000000000000000000',
      payload: {
        amountUSD: '10',
        amount2USD: '20',
      },
      startTime: Date.now(),
    };

    mockGetHistory.mockResolvedValue({
      nodes: [{ id: 'node-1' }],
      totalCount: 1,
    });
    mockParseHistoryItem.mockImplementation(async () => historyItem as any);

    const wrapper = await mountWidget();

    await advanceFetchQueue();

    expect(mockGetHistory).toHaveBeenCalledTimes(1);
    const historyCall = mockGetHistory.mock.calls[0][0];
    expect(historyCall.first).toBe(100);
    expect(historyCall.filter.assetAddress).toBe('xor');

    const tokens = wrapper.findAll('.explore-table-item-token').map((node) => node.text());
    expect(tokens).toContain('XOR');
    expect(tokens).toContain('VAL');

    wrapper.unmount();
  });

  it('refetches when token selection changes', async () => {
    const xorHistory = {
      id: 'tx-1',
      blockId: 'block-1',
      from: 'addr-1',
      assetAddress: 'xor',
      asset2Address: 'val',
      amount: '1',
      amount2: '2',
      payload: { amountUSD: '3', amount2USD: '4' },
      startTime: Date.now(),
    };
    const valHistory = {
      ...xorHistory,
      id: 'tx-2',
      assetAddress: 'val',
      asset2Address: 'xor',
    };

    mockGetHistory.mockImplementation(async (variables) => ({
      nodes: [{ id: variables.filter.assetAddress ?? 'xor' }],
      totalCount: 1,
    }));
    mockParseHistoryItem.mockImplementation(async (node: any) => (node.id === 'val' ? valHistory : xorHistory));

    const wrapper = await mountWidget();
    await advanceFetchQueue();

    expect(mockGetHistory).toHaveBeenCalledTimes(1);

    const selectToken = wrapper.findComponent(SelectTokenStub);
    selectToken.vm.$emit('select', { address: 'val', symbol: 'VAL' });

    await advanceFetchQueue();

    expect(mockGetHistory).toHaveBeenCalledTimes(2);
    const lastCall = mockGetHistory.mock.calls.at(-1)?.[0];
    expect(lastCall?.filter.assetAddress).toBe('val');

    wrapper.unmount();
  });

  it('keeps transaction token symbols and token-logo props when assets table misses addresses', async () => {
    const historyItem = {
      id: 'tx-symbol-fallback',
      blockId: 'block-1',
      from: 'addr-1',
      assetAddress: 'unknown-input',
      asset2Address: 'unknown-output',
      symbol: 'XOR',
      symbol2: 'VAL',
      amount: '1',
      amount2: '2',
      payload: {
        amountUSD: '3',
        amount2USD: '4',
      },
      startTime: Date.now(),
    };

    mockGetHistory.mockResolvedValue({
      nodes: [{ id: 'node-1' }],
      totalCount: 1,
    });
    mockParseHistoryItem.mockResolvedValue(historyItem as any);

    const wrapper = await mountWidget();
    await advanceFetchQueue();

    const tokens = wrapper.findAll('.explore-table-item-token').map((node) => node.text());
    expect(tokens).toContain('XOR');
    expect(tokens).toContain('VAL');

    const tokenLogos = wrapper.findAllComponents({ name: 'TokenLogoStub' });
    expect(tokenLogos).toHaveLength(2);
    expect(tokenLogos[0]?.props('tokenSymbol')).toBe('XOR');
    expect(tokenLogos[1]?.props('tokenSymbol')).toBe('VAL');

    wrapper.unmount();
  });
});
