import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { api, SUBQUERY_TYPES, WALLET_CONSTS, getCurrentIndexer } from '@soramitsu/soraneo-wallet-web';
import { ethers, EtherscanProvider } from 'ethers';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';

import { ZeroStringValue } from '@/consts';
import { SmartContracts, SmartContractType } from '@/consts/evm';
import { rootActionContext } from '@/store';
import type { EthBridgeContractAddress } from '@/store/web3/types';
import { getEvmTransactionRecieptByHash, isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';

import type { NetworkFeesObject } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { BlockTag } from 'ethers';
import type { ActionContext } from 'vuex';

export default class EtherscanHistoryProvider extends EtherscanProvider {
  async getHistory(address: string, startBlock?: BlockTag, endBlock?: BlockTag): Promise<Array<any>> {
    const params = {
      action: 'txlist',
      address,
      startblock: startBlock ?? 0,
      endblock: endBlock ?? 99999999,
      sort: 'asc',
    };

    return this.fetch('account', params);
  }
}

const BRIDGE_INTERFACE = new ethers.Interface([...SmartContracts[SmartContractType.EthBridge]]);

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

const isLocalHistoryItem = (item: EthHistory, txId: string, isOutgoing: boolean, requestHash: string) => {
  if (item.txId === txId) return true;

  return isOutgoing ? item.hash === requestHash : item.externalHash === requestHash;
};

const getType = (module: string) => {
  return module === SUBQUERY_TYPES.ModuleNames.BridgeMultisig
    ? Operation.EthBridgeIncoming
    : Operation.EthBridgeOutgoing;
};

// [WARNING]: api.query.ethBridge storage usage
const getSoraHash = async (isOutgoing: boolean, requestHash: string) => {
  return isOutgoing ? requestHash : await ethBridgeApi.getSoraHashByEthereumHash(requestHash);
};

const getSoraNetworkFee = (isOutgoing: boolean, networkFees: NetworkFeesObject) => {
  return isOutgoing ? networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
};

// [WARNING]: api.query.ethBridge storage usage
const isSoraPartCompleted = async (isOutgoing: boolean, soraHash: string) => {
  if (!isOutgoing) return true;

  if (soraHash) {
    const requestStatus = await ethBridgeApi.getRequestStatus(soraHash);

    return requestStatus === BridgeTxStatus.Ready;
  }

  return false;
};

const getTransactionState = (
  isOutgoing: boolean,
  soraPartCompleted: boolean,
  soraHash: string,
  ethereumTx: ethers.TransactionResponse | null
) => {
  if (!isOutgoing) return ETH_BRIDGE_STATES.SORA_COMMITED;

  const externalHash = getEvmTxHash(ethereumTx);
  const externalError = !!Number((ethereumTx as any)?.isError ?? 0);

  if (externalError) {
    return ETH_BRIDGE_STATES.EVM_REJECTED;
  } else if (externalHash) {
    return ETH_BRIDGE_STATES.EVM_COMMITED;
  } else if (soraPartCompleted) {
    return ETH_BRIDGE_STATES.EVM_REJECTED;
  } else if (soraHash) {
    return ETH_BRIDGE_STATES.SORA_PENDING;
  } else {
    return ETH_BRIDGE_STATES.SORA_REJECTED;
  }
};

const hasFinishedState = (item: Nullable<EthHistory>) => {
  if (!item) return false;

  const isOutgoing = isOutgoingTransaction(item);

  return isOutgoing
    ? item.transactionState === ETH_BRIDGE_STATES.EVM_COMMITED
    : item.transactionState === ETH_BRIDGE_STATES.SORA_COMMITED;
};

const getReceiptData = async (externalHash: string) => {
  return externalHash ? await getEvmTransactionRecieptByHash(externalHash) : null;
};

const getEvmTxHash = (ethereumTx: ethers.TransactionResponse | null) => {
  return ethereumTx?.hash ?? '';
};

const getEvmBlockNumber = (ethereumTx: ethers.TransactionResponse | null) => {
  const blockNumber = ethereumTx?.blockNumber; // could be a string
  return blockNumber ? +blockNumber : null;
};

const getEvmBlockId = (ethereumTx: ethers.TransactionResponse | null) => {
  return ethereumTx?.blockHash;
};

const getTimes = (isOutgoing: boolean, soraTimestamp: number, evmTimestamp: number) => {
  return isOutgoing ? [soraTimestamp, evmTimestamp] : [evmTimestamp, soraTimestamp];
};

type TimestampMap<T> = {
  [key: number]: T;
};

type EthTransactionsMap = DataMap<ethers.TransactionResponse>;
type HistoryElement = SUBQUERY_TYPES.HistoryElement;
type HistoryElementData = SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing &
  SUBQUERY_TYPES.HistoryElementEthBridgeIncoming;

export class EthBridgeHistory {
  private externalNetwork!: number;
  private contract!: EthBridgeContractAddress;

  private ethAccountTransactionsMap: DataMap<EthTransactionsMap> = {};
  private ethStartBlock: TimestampMap<number> = {};

  private etherscanApiKey!: string;
  private etherscanInstance!: EtherscanHistoryProvider;

  constructor(etherscanApiKey: string) {
    this.etherscanApiKey = etherscanApiKey;
  }

  public get historySyncTimestamp(): number {
    return +(ethBridgeApi.accountStorage?.get('ethBridgeHistorySyncTimestamp') || 0);
  }

  public set historySyncTimestamp(timestamp: number) {
    ethBridgeApi.accountStorage?.set('ethBridgeHistorySyncTimestamp', timestamp);
  }

  public async init(contract: EthBridgeContractAddress, evmId: number): Promise<void> {
    this.externalNetwork = evmId;
    this.contract = contract;
    this.etherscanInstance = new EtherscanHistoryProvider(evmId, this.etherscanApiKey);
  }

  private async getEthStartBlock(timestampMs: number): Promise<number> {
    const timestamp = Math.round(timestampMs / 1000); // in seconds

    if (!this.ethStartBlock[timestamp]) {
      this.ethStartBlock[timestamp] = +(await this.etherscanInstance.fetch('block', {
        action: 'getblocknobytime',
        closest: 'before',
        timestamp,
      }));
    }
    return this.ethStartBlock[timestamp];
  }

  private async getEvmTimestamp(ethereumTx: ethers.TransactionResponse | null) {
    if (ethereumTx?.blockNumber) {
      const block = await this.etherscanInstance.getBlock(+ethereumTx.blockNumber);

      if (block) {
        return block.timestamp * 1000;
      }
    }
    return Date.now();
  }

  public async getEthAccountTransactions(
    address: string,
    contract?: string,
    fromTimestamp?: number
  ): Promise<EthTransactionsMap> {
    const key = address.toLowerCase();

    if (!this.ethAccountTransactionsMap[key]) {
      const contractToLower = (contract || '').toLowerCase();
      const ethStartBlock = fromTimestamp ? await this.getEthStartBlock(fromTimestamp) : undefined;
      const history = await this.etherscanInstance.getHistory(address, ethStartBlock);
      const filtered = history.reduce<EthTransactionsMap>((buffer, tx) => {
        if (!contract || (!!tx.to && contractToLower === tx.to.toLowerCase())) {
          buffer[tx.hash] = tx;
        }

        return buffer;
      }, {});

      this.ethAccountTransactionsMap[key] = filtered;
    }

    return this.ethAccountTransactionsMap[key];
  }

  private async getFromTimestamp(historyElements: HistoryElement[]) {
    const historyElement = last(historyElements) as HistoryElement;

    // if the last item is Incoming trasfer, timestamp will be sora network start time
    if (historyElement.module === SUBQUERY_TYPES.ModuleNames.BridgeMultisig) {
      const soraStartBlock = await api.system.getBlockHash(1);
      const soraStartTimestamp = await api.system.getBlockTimestamp(soraStartBlock);

      return soraStartTimestamp;
    }

    return historyElement.timestamp * 1000;
  }

  public async findEthTxBySoraHash(
    accountAddress: string,
    hash: string,
    fromTimestamp?: number
  ): Promise<ethers.TransactionResponse | null> {
    if (!(accountAddress && hash)) return null;
    const transactions = await this.getEthAccountTransactions(accountAddress, this.contract, fromTimestamp);

    for (const tx of Object.values(transactions)) {
      try {
        const data = (tx as any).input; // 'data' is named as 'input'
        const decodedInput = BRIDGE_INTERFACE.parseTransaction({ data });

        if (decodedInput?.args.getValue('txHash')?.toLowerCase() === hash.toLowerCase()) {
          return tx;
        }
      } catch (err) {
        console.info(err);
        continue;
      }
    }

    return null;
  }

  public async findEthTxByEthereumHash(hash: string): Promise<ethers.TransactionResponse | null> {
    for (const address in this.ethAccountTransactionsMap) {
      if (hash in this.ethAccountTransactionsMap[address]) {
        return this.ethAccountTransactionsMap[address][hash];
      }
    }

    const tx = await this.etherscanInstance.getTransaction(hash);

    return tx;
  }

  public async fetchHistoryElements(address: string, timestamp = 0, ids?: string[]): Promise<HistoryElement[]> {
    const indexer = getCurrentIndexer();
    const operations = [Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming];
    const filter = indexer.historyElementsFilter({ address, operations, timestamp, ids });
    const history: HistoryElement[] = [];

    let hasNext = true;
    let after = '';

    do {
      const variables = { after, filter, first: 100 };
      const response = await indexer.services.explorer.account.getHistoryPaged(variables);

      if (!response) return history;

      hasNext = !!response.pageInfo?.hasNextPage;
      after = response.pageInfo?.endCursor ?? '';
      history.push(...response.edges.map((edge) => edge.node));
    } while (hasNext);

    return history;
  }

  public async clearHistory(
    inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    // don't remove history, what in progress
    const ids = Object.keys(ethBridgeApi.history).filter((id) => !(id in inProgressIds));
    ethBridgeApi.removeHistory(...ids);
    this.historySyncTimestamp = 0;
    await updateCallback?.();
  }

  public async updateAccountHistory(
    address: string,
    networkFees: NetworkFeesObject,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const historyElements = await this.fetchHistoryElements(address, this.historySyncTimestamp);

    if (!historyElements.length) return;

    const currentHistory = ethBridgeApi.historyList as EthHistory[];

    const { externalNetwork } = this;

    const fromTimestamp = await this.getFromTimestamp(historyElements);
    const historySyncTimestampUpdated = first(historyElements)?.timestamp as number;

    for (const historyElement of historyElements) {
      const type = getType(historyElement.module);
      const isOutgoing = isOutgoingTransaction({ type });
      const { id: txId, blockHash: blockId, blockHeight, data: historyElementData } = historyElement;
      const { requestHash, amount, assetId: assetAddress, sidechainAddress } = historyElementData as HistoryElementData;

      const localHistoryItem = currentHistory.find((item: EthHistory) =>
        isLocalHistoryItem(item, txId, isOutgoing, requestHash)
      );

      // don't restore transaction what is in process in app
      if ((localHistoryItem?.id as string) in inProgressIds) continue;
      if (hasFinishedState(localHistoryItem)) continue;

      const soraHash = await getSoraHash(isOutgoing, requestHash);
      const asset = assetDataByAddress(assetAddress);
      const symbol = asset?.symbol;
      const symbol2 = (asset as any)?.externalSymbol ?? symbol;
      const soraNetworkFee = getSoraNetworkFee(isOutgoing, networkFees);
      const soraTimestamp = historyElement.timestamp * 1000;
      const soraPartCompleted = await isSoraPartCompleted(isOutgoing, soraHash);
      const ethereumTx = isOutgoing
        ? await this.findEthTxBySoraHash(sidechainAddress, soraHash, fromTimestamp)
        : await this.findEthTxByEthereumHash(requestHash);

      const externalHash = getEvmTxHash(ethereumTx);
      const recieptData = await getReceiptData(externalHash);
      const to = isOutgoing ? sidechainAddress : recieptData?.from;
      const externalNetworkFee = recieptData?.fee;
      const externalBlockId = getEvmBlockId(ethereumTx);
      const externalBlockHeight = getEvmBlockNumber(ethereumTx);
      const evmTimestamp = await this.getEvmTimestamp(ethereumTx);

      const [startTime, endTime] = getTimes(isOutgoing, soraTimestamp, evmTimestamp);
      const transactionState = getTransactionState(isOutgoing, soraPartCompleted, soraHash, ethereumTx);

      const historyItemData = {
        txId,
        type,
        blockId,
        blockHeight: +blockHeight,
        from: address,
        amount,
        symbol,
        symbol2,
        assetAddress,
        startTime,
        endTime,
        hash: soraHash,
        externalHash,
        soraNetworkFee,
        transactionState,
        externalBlockId,
        externalBlockHeight,
        externalNetwork,
        externalNetworkType: BridgeNetworkType.Eth,
        externalNetworkFee,
        to,
      };

      // update or create local history item
      if (localHistoryItem) {
        ethBridgeApi.saveHistory({ ...localHistoryItem, ...historyItemData } as EthHistory);
      } else {
        ethBridgeApi.generateHistoryItem(historyItemData as EthHistory);
      }

      await updateCallback?.();
    }

    this.historySyncTimestamp = historySyncTimestampUpdated;
  }
}

export const getEthBridgeHistoryInstance = async (context: ActionContext<any, any>): Promise<EthBridgeHistory> => {
  const { rootState } = rootActionContext(context);

  const {
    wallet: {
      settings: {
        apiKeys: { etherscan: etherscanApiKey },
      },
    },
    web3: { ethBridgeContractAddress, ethBridgeEvmNetwork },
  } = rootState;

  const bridgeHistory = new EthBridgeHistory(etherscanApiKey);

  await bridgeHistory.init(ethBridgeContractAddress, ethBridgeEvmNetwork);

  return bridgeHistory;
};

/**
 * Restore ETH bridge account transactions, using Subquery & Etherscan
 * @param context store context
 */
export const updateEthBridgeHistory =
  (context: ActionContext<any, any>) =>
  async (clearHistory = false, updateCallback?: VoidFunction): Promise<void> => {
    try {
      const { rootState, rootGetters } = rootActionContext(context);

      const {
        wallet: {
          account: { address },
          settings: { networkFees },
        },
        bridge: { inProgressIds },
      } = rootState;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const ethBridgeHistory = await getEthBridgeHistoryInstance(context);

      if (clearHistory) {
        await ethBridgeHistory.clearHistory(inProgressIds, updateCallback);
      }

      await ethBridgeHistory.updateAccountHistory(
        address,
        networkFees,
        inProgressIds,
        assetDataByAddress,
        updateCallback
      );
    } catch (error) {
      console.error(error);
    }
  };
