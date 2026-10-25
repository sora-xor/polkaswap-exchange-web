import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/lib/soraneo-wallet/src/consts';

const parserInstance = vi.hoisted(() => ({ parse: vi.fn() }));
const IndexerDataParserMock = vi.hoisted(() =>
  vi.fn(function MockIndexerDataParser() {
    return parserInstance;
  })
);
const polkaswapHistoryElementsFilterMock = vi.hoisted(() => vi.fn());
const PolkaswapExplorerServiceMock = vi.hoisted(() => ({ service: 'polkaswap' }));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/parser', () => ({
  default: IndexerDataParserMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/polkaswap', () => ({
  PolkaswapExplorerService: PolkaswapExplorerServiceMock,
  historyElementsFilter: polkaswapHistoryElementsFilterMock,
}));

describe('getCurrentIndexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns the Polkaswap indexer descriptor', async () => {
    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    expect(getCurrentIndexer()).toEqual({
      type: IndexerType.POLKASWAP,
      services: {
        explorer: PolkaswapExplorerServiceMock,
        dataParser: parserInstance,
      },
      historyElementsFilter: polkaswapHistoryElementsFilterMock,
    });
  });

  it('reuses the shared parser instance across calls', async () => {
    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    const firstIndexer = getCurrentIndexer();
    const secondIndexer = getCurrentIndexer();

    expect(firstIndexer.services.dataParser).toBe(parserInstance);
    expect(secondIndexer.services.dataParser).toBe(parserInstance);
    expect(IndexerDataParserMock).toHaveBeenCalledTimes(1);
  });
});
