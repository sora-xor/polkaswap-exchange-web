import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

import { IndexerType } from '../../../consts';
import { createExplorerClient } from './client';
import PolkaswapExplorer from './explorer';

export * from './queries/historyElements';

const resolveStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

export const PolkaswapExplorerService = new PolkaswapExplorer({
  type: IndexerType.POLKASWAP,
  createExplorerClient,
  setStatus: (status) => resolveStore()?.setIndexerStatus({ indexer: IndexerType.POLKASWAP, status }),
  getStatus: () => resolveStore()?.indexers?.[IndexerType.POLKASWAP]?.status,
  getEndpoint: () => resolveStore()?.indexers?.[IndexerType.POLKASWAP]?.endpoint,
});
