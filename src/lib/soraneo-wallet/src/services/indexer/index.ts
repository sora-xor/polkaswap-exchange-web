import { IndexerType } from '../../consts';
import IndexerDataParser from './parser';
import { PolkaswapExplorerService, historyElementsFilter as polkaswapHistoryElementsFilter } from './polkaswap';

export interface PolkaswapIndexer {
  type: IndexerType.POLKASWAP;
  services: {
    explorer: typeof PolkaswapExplorerService;
    dataParser: IndexerDataParser;
  };
  historyElementsFilter: typeof polkaswapHistoryElementsFilter;
}

type IndexerTypeMap = {
  [IndexerType.POLKASWAP]: PolkaswapIndexer;
};

/**
 * Shared instance of the indexer data parser so the heavy parsing helpers can
 * maintain internal caches between calls.
 */
const IndexerDataParserService = new IndexerDataParser();

/**
 * Returns the descriptor for a given indexer type. The descriptor bundles the
 * explorer service, data parser and history filter that should be used for the
 * selected backend.
 */
function getIndexer<T extends IndexerType>(type: T): IndexerTypeMap[T] {
  switch (type) {
    case IndexerType.POLKASWAP:
      return {
        type: IndexerType.POLKASWAP,
        services: {
          explorer: PolkaswapExplorerService,
          dataParser: IndexerDataParserService,
        },
        historyElementsFilter: polkaswapHistoryElementsFilter,
      } as IndexerTypeMap[T];
    default:
      throw new Error(`Unsupported indexer type: ${type}`);
  }
}

/**
 * Convenience helper that returns the single supported Polkaswap indexer.
 */
export function getCurrentIndexer() {
  return getIndexer(IndexerType.POLKASWAP);
}
