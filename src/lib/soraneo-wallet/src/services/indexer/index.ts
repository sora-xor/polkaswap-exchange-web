import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { IndexerType } from '../../consts';
import IndexerDataParser from './parser';
import { SubqueryExplorerService, historyElementsFilter as subqueryHistoryElementsFilter } from './subquery';
import { SubsquidExplorerService, historyElementsFilter as subsquidHistoryElementsFilter } from './subsquid';

const resolveWalletStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

export interface SubqueryIndexer {
  type: IndexerType.SUBQUERY;
  services: {
    explorer: typeof SubqueryExplorerService;
    dataParser: IndexerDataParser;
  };
  historyElementsFilter: typeof subqueryHistoryElementsFilter;
}

export interface SubsquidIndexer {
  type: IndexerType.SUBSQUID;
  services: {
    explorer: typeof SubsquidExplorerService;
    dataParser: IndexerDataParser;
  };
  historyElementsFilter: typeof subsquidHistoryElementsFilter;
}

type IndexerTypeMap = {
  [IndexerType.SUBQUERY]: SubqueryIndexer;
  [IndexerType.SUBSQUID]: SubsquidIndexer;
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
    case IndexerType.SUBQUERY:
      return {
        type: IndexerType.SUBQUERY,
        services: {
          explorer: SubqueryExplorerService,
          dataParser: IndexerDataParserService,
        },
        historyElementsFilter: subqueryHistoryElementsFilter,
      } as IndexerTypeMap[T];
    case IndexerType.SUBSQUID:
      return {
        type: IndexerType.SUBSQUID,
        services: {
          explorer: SubsquidExplorerService,
          dataParser: IndexerDataParserService,
        },
        historyElementsFilter: subsquidHistoryElementsFilter,
      } as IndexerTypeMap[T];
    default:
      throw new Error(`Unsupported indexer type: ${type}`);
  }
}

/**
 * Convenience helper that resolves the indexer configuration based on the
 * value stored in the active Pinia wallet settings.
 */
export function getCurrentIndexer() {
  const indexerType = resolveWalletStore()?.indexerType ?? IndexerType.SUBQUERY;
  return getIndexer(indexerType);
}
