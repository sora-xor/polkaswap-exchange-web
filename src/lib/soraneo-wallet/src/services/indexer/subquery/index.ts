import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { IndexerType } from '../../../consts';
import { createExplorerClient } from './client';
import SubqueryExplorer from './explorer';

export * from './queries/historyElements';

const resolveStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

export const SubqueryExplorerService = new SubqueryExplorer({
  type: IndexerType.SUBQUERY,
  createExplorerClient,
  setStatus: (status) => resolveStore()?.setIndexerStatus({ indexer: IndexerType.SUBQUERY, status }),
  getStatus: () => resolveStore()?.indexers?.[IndexerType.SUBQUERY]?.status,
  getEndpoint: () => resolveStore()?.indexers?.[IndexerType.SUBQUERY]?.endpoint,
});
