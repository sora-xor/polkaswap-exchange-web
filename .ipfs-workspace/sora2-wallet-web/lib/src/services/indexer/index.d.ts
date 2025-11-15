import { IndexerType } from '@/consts';
import IndexerDataParser from './parser';
import { SubqueryExplorerService, historyElementsFilter as subqueryHistoryElementsFilter } from './subquery';
import { SubsquidExplorerService, historyElementsFilter as subsquidHistoryElementsFilter } from './subsquid';
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
/**
 * Convenience helper that resolves the indexer configuration based on the
 * value stored in Vuex settings.
 */
export declare function getCurrentIndexer(): SubqueryIndexer | SubsquidIndexer;
