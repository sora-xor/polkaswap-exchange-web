import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/lib/soraneo-wallet/src/consts';

const resolveGlobalPiniaMock = vi.hoisted(() => vi.fn(() => 'pinia'));
const useWalletStoreMock = vi.hoisted(() => vi.fn());
const parserInstance = vi.hoisted(() => ({ parse: vi.fn() }));
const IndexerDataParserMock = vi.hoisted(() =>
  vi.fn(function MockIndexerDataParser() {
    return parserInstance;
  })
);
const subqueryHistoryElementsFilterMock = vi.hoisted(() => vi.fn());
const subsquidHistoryElementsFilterMock = vi.hoisted(() => vi.fn());
const SubqueryExplorerServiceMock = vi.hoisted(() => ({ service: 'subquery' }));
const SubsquidExplorerServiceMock = vi.hoisted(() => ({ service: 'subsquid' }));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: resolveGlobalPiniaMock,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/parser', () => ({
  default: IndexerDataParserMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/subquery', () => ({
  SubqueryExplorerService: SubqueryExplorerServiceMock,
  historyElementsFilter: subqueryHistoryElementsFilterMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/subsquid', () => ({
  SubsquidExplorerService: SubsquidExplorerServiceMock,
  historyElementsFilter: subsquidHistoryElementsFilterMock,
}));

describe('getCurrentIndexer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    resolveGlobalPiniaMock.mockReturnValue('pinia');
  });

  it('falls back to the subquery descriptor when the wallet store is unavailable', async () => {
    useWalletStoreMock.mockImplementation(() => {
      throw new Error('pinia unavailable');
    });

    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    expect(getCurrentIndexer()).toEqual({
      type: IndexerType.SUBQUERY,
      services: {
        explorer: SubqueryExplorerServiceMock,
        dataParser: parserInstance,
      },
      historyElementsFilter: subqueryHistoryElementsFilterMock,
    });
    expect(resolveGlobalPiniaMock).toHaveBeenCalledTimes(1);
    expect(useWalletStoreMock).toHaveBeenCalledWith('pinia');
  });

  it('returns the subsquid descriptor from the active wallet settings', async () => {
    useWalletStoreMock.mockReturnValue({ indexerType: IndexerType.SUBSQUID });

    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    expect(getCurrentIndexer()).toEqual({
      type: IndexerType.SUBSQUID,
      services: {
        explorer: SubsquidExplorerServiceMock,
        dataParser: parserInstance,
      },
      historyElementsFilter: subsquidHistoryElementsFilterMock,
    });
  });

  it('reuses the shared parser instance across indexer types', async () => {
    useWalletStoreMock
      .mockReturnValueOnce({ indexerType: IndexerType.SUBQUERY })
      .mockReturnValueOnce({ indexerType: IndexerType.SUBSQUID });

    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    const subqueryIndexer = getCurrentIndexer();
    const subsquidIndexer = getCurrentIndexer();

    expect(subqueryIndexer.services.dataParser).toBe(parserInstance);
    expect(subsquidIndexer.services.dataParser).toBe(parserInstance);
    expect(IndexerDataParserMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the wallet store reports an unsupported indexer', async () => {
    useWalletStoreMock.mockReturnValue({ indexerType: 'broken' });

    const { getCurrentIndexer } = await import('@/lib/soraneo-wallet/src/services/indexer');

    expect(() => getCurrentIndexer()).toThrow('Unsupported indexer type: broken');
  });
});
