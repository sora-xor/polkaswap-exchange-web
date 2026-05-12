import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import { getCurrentIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { evmBridgeApi } from '@/utils/bridge/evm/api';

import type { HistoryElement } from '@/lib/soraneo-wallet/src/services/indexer/types';
import type { EvmHistory, EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

type BridgeActionContext<TRootState = any> = {
  rootState: TRootState;
};

const EvmBridgeOperations = [Operation.EvmOutgoing, Operation.EvmIncoming];

const hasFinishedState = (item: Nullable<EvmHistory>) => {
  if (!item) return false;

  return [BridgeTxStatus.Done, BridgeTxStatus.Failed].includes(item.transactionState as BridgeTxStatus);
};

const isSameHistoryItem = (localItem: EvmHistory, indexerItem: EvmHistory): boolean => {
  if (localItem.id && localItem.id === indexerItem.id) return true;
  if (localItem.txId && localItem.txId === indexerItem.txId) return true;
  if (localItem.hash && localItem.hash === indexerItem.hash) return true;

  return false;
};

const normalizeTransactionState = (item: EvmHistory): BridgeTxStatus => {
  if (item.transactionState) return item.transactionState as BridgeTxStatus;

  return item.status === TransactionStatus.Error ? BridgeTxStatus.Failed : BridgeTxStatus.Done;
};

const matchesNetwork = (item: EvmHistory, network: EvmNetwork): boolean => {
  if (item.externalNetwork === undefined || item.externalNetwork === null) return true;

  return Number(item.externalNetwork) === Number(network);
};

export class EvmBridgeHistory {
  public get historySyncTimestamp(): number {
    return +(evmBridgeApi.accountStorage?.get('evmBridgeHistorySyncTimestamp') || 0);
  }

  public set historySyncTimestamp(timestamp: number) {
    evmBridgeApi.accountStorage?.set('evmBridgeHistorySyncTimestamp', timestamp);
  }

  /**
   * Reads EVM bridge SORA-side history from the Polkaswap indexer.
   */
  public async fetchHistoryElements(address: string, timestamp = 0): Promise<HistoryElement[]> {
    const indexer = getCurrentIndexer();
    const filter = indexer.historyElementsFilter({
      address,
      operations: EvmBridgeOperations,
      timestamp,
    });
    const history: HistoryElement[] = [];
    let hasNext = true;
    let after = '';

    do {
      const response = await indexer.services.explorer.account.getHistoryPaged({
        after,
        filter,
        first: 100,
      });

      if (!response) return history;

      hasNext = !!response.pageInfo?.hasNextPage;
      after = response.pageInfo?.endCursor ?? '';
      history.push(...response.edges.map((edge) => edge.node as HistoryElement));
    } while (hasNext);

    return history;
  }

  /**
   * Clears restored EVM bridge history for the selected network while keeping in-progress transactions.
   */
  public async clearHistory(
    network: EvmNetwork,
    inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const ids = Object.entries(evmBridgeApi.history).reduce<string[]>((buffer, [id, item]) => {
      const historyItem = item as EvmHistory;

      if (!(id in inProgressIds) && matchesNetwork(historyItem, network)) {
        buffer.push(id);
      }

      return buffer;
    }, []);

    evmBridgeApi.removeHistory(...ids);
    this.historySyncTimestamp = 0;
    await updateCallback?.();
  }

  /**
   * Restores finalized EVM bridge transactions indexed from SORA bridgeProxy calls.
   */
  public async updateAccountHistory(
    address: string,
    network: EvmNetwork,
    inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const indexer = getCurrentIndexer();
    const historyElements = await this.fetchHistoryElements(address, this.historySyncTimestamp);

    if (!historyElements.length) return;

    const currentHistory = [...(evmBridgeApi.historyList as EvmHistory[])];
    const historySyncTimestampUpdated = historyElements[0]?.timestamp ?? this.historySyncTimestamp;

    for (const historyElement of historyElements) {
      const historyItem = (await indexer.services.dataParser.parseTransactionAsHistoryItem(
        historyElement
      )) as Nullable<EvmHistory>;

      if (!historyItem?.id) continue;
      if (![Operation.EvmIncoming, Operation.EvmOutgoing].includes(historyItem.type)) continue;
      if (!matchesNetwork(historyItem, network)) continue;

      const localHistoryItem = currentHistory.find((item) => isSameHistoryItem(item, historyItem));

      if ((localHistoryItem?.id as string) in inProgressIds) continue;
      if (hasFinishedState(localHistoryItem)) continue;

      const nextHistoryItem: EvmHistory = {
        ...localHistoryItem,
        ...historyItem,
        externalNetwork: network,
        externalNetworkType: BridgeNetworkType.Evm,
        transactionState: normalizeTransactionState(historyItem),
      };

      evmBridgeApi.saveHistory(nextHistoryItem);
      currentHistory.push(nextHistoryItem);
      await updateCallback?.();
    }

    this.historySyncTimestamp = historySyncTimestampUpdated;
  }
}

/**
 * Restores EVM bridge account transactions from the Polkaswap indexer.
 */
export const updateEvmBridgeHistory =
  (context: BridgeActionContext) =>
  async (clearHistory = false, updateCallback?: VoidFunction): Promise<void> => {
    try {
      const { rootState } = context;
      const {
        wallet: {
          account: { address },
        },
        web3: { networkSelected },
        bridge: { inProgressIds },
      } = rootState;

      if (networkSelected === undefined || networkSelected === null) return;

      const network = networkSelected as EvmNetwork;
      const evmBridgeHistory = new EvmBridgeHistory();

      if (clearHistory) {
        await evmBridgeHistory.clearHistory(network, inProgressIds, updateCallback);
      }

      await evmBridgeHistory.updateAccountHistory(address, network, inProgressIds, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
