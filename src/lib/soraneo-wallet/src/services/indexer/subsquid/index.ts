import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { IndexerType } from '../../../consts';
import { createExplorerClient } from './client';
import SubsquidExplorer from './explorer';

export * from './queries/historyElements';

const resolveStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

export const SubsquidExplorerService = new SubsquidExplorer({
  type: IndexerType.SUBSQUID,
  createExplorerClient,
  setStatus: (status) => resolveStore()?.setIndexerStatus({ indexer: IndexerType.SUBSQUID, status }),
  getStatus: () => resolveStore()?.indexers?.[IndexerType.SUBSQUID]?.status,
  getEndpoint: () => resolveStore()?.indexers?.[IndexerType.SUBSQUID]?.endpoint,
});
