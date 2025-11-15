import { IndexerType } from '@/consts';
import { getWalletStore } from '../../../store/instance';

import { createExplorerClient } from './client';
import SubsquidExplorer from './explorer';

export * from './queries/historyElements';

const resolveStore = () => getWalletStore();

export const SubsquidExplorerService = new SubsquidExplorer({
  type: IndexerType.SUBSQUID,
  createExplorerClient,
  setStatus: (status) =>
    resolveStore().dispatch.wallet.settings.setIndexerStatus({ indexer: IndexerType.SUBSQUID, status }),
  getStatus: () => resolveStore().state.wallet.settings.indexers[IndexerType.SUBSQUID].status,
  getEndpoint: () => resolveStore().state.wallet.settings.indexers[IndexerType.SUBSQUID].endpoint,
});
