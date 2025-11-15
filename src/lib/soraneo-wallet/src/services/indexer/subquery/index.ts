import { IndexerType } from '@/consts';
import { getWalletStore } from '../../../store/instance';

import { createExplorerClient } from './client';
import SubqueryExplorer from './explorer';

export * from './queries/historyElements';

const resolveStore = () => getWalletStore();

export const SubqueryExplorerService = new SubqueryExplorer({
  type: IndexerType.SUBQUERY,
  createExplorerClient,
  setStatus: (status) =>
    resolveStore().dispatch.wallet.settings.setIndexerStatus({ indexer: IndexerType.SUBQUERY, status }),
  getStatus: () => resolveStore().state.wallet.settings.indexers[IndexerType.SUBQUERY].status,
  getEndpoint: () => resolveStore().state.wallet.settings.indexers[IndexerType.SUBQUERY].endpoint,
});
