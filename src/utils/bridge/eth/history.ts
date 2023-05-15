import flatten from 'lodash/fp/flatten';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { ethers } from 'ethers';
import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import {
  api,
  historyElementsFilter,
  SubqueryExplorerService,
  SUBQUERY_TYPES,
  WALLET_CONSTS,
} from '@soramitsu/soraneo-wallet-web';

import ethersUtil from '@/utils/ethers-util';
import { getEvmTransactionRecieptByHash, isOutgoingTransaction } from '@/utils/bridge/common/utils';

import { ethBridgeApi } from '@/utils/bridge/eth/api';

import { ZeroStringValue } from '@/consts';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { BridgeHistory, NetworkFeesObject } from '@sora-substrate/util';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

const getTransactionState = (isOutgoing: boolean, soraPartCompleted: boolean, externalHash: string, hash: string) => {
  return isOutgoing
    ? externalHash
      ? ETH_BRIDGE_STATES.EVM_COMMITED
      : soraPartCompleted
      ? ETH_BRIDGE_STATES.EVM_REJECTED
      : hash
      ? ETH_BRIDGE_STATES.SORA_PENDING
      : ETH_BRIDGE_STATES.SORA_REJECTED
    : ETH_BRIDGE_STATES.SORA_COMMITED;
};

const getStatus = (isOutgoing: boolean, soraPartCompleted: boolean, externalHash: string, hash: string) => {
  return isOutgoing
    ? externalHash
      ? BridgeTxStatus.Done
      : soraPartCompleted
      ? BridgeTxStatus.Failed
      : hash
      ? BridgeTxStatus.Pending
      : BridgeTxStatus.Failed
    : BridgeTxStatus.Done;
};

type TimestampMap<T> = {
  [key: number]: T;
};

type EthLogsMap = DataMap<boolean>;
type EthTransactionsMap = DataMap<ethers.providers.TransactionResponse>;
type HistoryElement = SUBQUERY_TYPES.HistoryElement;
type HistoryElementData = SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing &
  SUBQUERY_TYPES.HistoryElementEthBridgeIncoming;

export class EthBridgeHistory {
  private externalNetwork!: number;

  private ethAccountTransactionsMap: DataMap<EthTransactionsMap> = {};
  private ethBlockLogsMap: DataMap<Promise<EthLogsMap>> = {};
  private ethStartBlock: TimestampMap<number> = {};

  private etherscanApiKey!: string;
  private etherscanInstance!: ethers.providers.EtherscanProvider;

  // Withdrawal (bytes32 txHash)
  public readonly outgoingTopic = '0x0ce781a18c10c8289803c7c4cfd532d797113c4b41c9701ffad7d0a632ac555b';

  constructor(etherscanApiKey: string) {
    this.etherscanApiKey = etherscanApiKey;
  }

  public get historySyncTimestamp(): number {
    return +(ethBridgeApi.accountStorage?.get('ethBridgeHistorySyncTimestamp') || 0);
  }

  public set historySyncTimestamp(timestamp: number) {
    ethBridgeApi.accountStorage?.set('ethBridgeHistorySyncTimestamp', timestamp);
  }

  public async init(): Promise<void> {
    const ethersInstance = await ethersUtil.getEthersInstance();
    const network = await ethersInstance.getNetwork();

    this.etherscanInstance = new ethers.providers.EtherscanProvider(network, this.etherscanApiKey);
    this.externalNetwork = await ethersUtil.getEvmNetworkId();
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

  public async getEthAccountTransactions(
    address: string,
    fromTimestamp: number,
    contracts?: string[]
  ): Promise<EthTransactionsMap> {
    const key = address.toLowerCase();
    const contractsToLower = (contracts || []).map((contract) => contract.toLowerCase());

    if (!this.ethAccountTransactionsMap[key]) {
      const ethStartBlock = await this.getEthStartBlock(fromTimestamp);
      const history = await this.etherscanInstance.getHistory(address, ethStartBlock);
      const filtered = history.reduce<EthTransactionsMap>((buffer, tx) => {
        if (!contracts || (!!tx.to && contractsToLower.includes(tx.to.toLowerCase()))) {
          buffer[tx.hash] = tx;
        }

        return buffer;
      }, {});

      this.ethAccountTransactionsMap[key] = filtered;
    }

    return this.ethAccountTransactionsMap[key];
  }

  private async getBlockLogsMap(blockHash: string, contract: string): Promise<EthLogsMap> {
    if (!this.ethBlockLogsMap[blockHash]) {
      this.ethBlockLogsMap[blockHash] = this.getLogsMap([contract], this.outgoingTopic, blockHash);
    }
    return await this.ethBlockLogsMap[blockHash];
  }

  private async getLogsMap(contracts: string[], topic: string, blockHash: string): Promise<EthLogsMap> {
    const ethersInstance = await ethersUtil.getEthersInstance();
    const getLogs = (address: string) =>
      ethersInstance.getLogs({
        topics: [topic],
        blockHash,
        address,
      });

    const logs = flatten(await Promise.all(contracts.map((contract) => getLogs(contract))));

    return logs.reduce((buffer, { data }) => {
      buffer[data] = true;
      return buffer;
    }, {});
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
    fromTimestamp: number,
    contracts?: string[]
  ): Promise<ethers.providers.TransactionResponse | null> {
    if (!accountAddress || !hash) return null;

    const transactions = await this.getEthAccountTransactions(accountAddress, fromTimestamp, contracts);

    try {
      return await Promise.any(
        Object.values(transactions).map(async (tx) => {
          const logsMap = await this.getBlockLogsMap(tx.blockHash as string, tx.to as string);
          if (hash in logsMap) return tx;
          throw new Error();
        })
      );
    } catch (error) {
      return null;
    }
  }

  public async findEthTxByEthereumHash(externalHash: string): Promise<ethers.providers.TransactionResponse> {
    for (const address in this.ethAccountTransactionsMap) {
      if (externalHash in this.ethAccountTransactionsMap[address]) {
        return this.ethAccountTransactionsMap[address][externalHash];
      }
    }

    return await ethersUtil.getEvmTransaction(externalHash);
  }

  public async fetchHistoryElements(address: string, timestamp = 0, ids?: string[]): Promise<HistoryElement[]> {
    const operations = [Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming];
    const filter = historyElementsFilter({ address, operations, timestamp, ids });
    const history: HistoryElement[] = [];

    let hasNext = true;
    let after = '';

    do {
      const variables = { after, filter, first: 100 };
      const response = await SubqueryExplorerService.account.getHistory(variables);

      if (!response) return history;

      hasNext = !!response.pageInfo?.hasNextPage;
      after = response.pageInfo?.endCursor ?? '';
      history.push(...response.nodes);
    } while (hasNext);

    return history;
  }

  public async clearHistory(updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> {
    this.historySyncTimestamp = 0;
    ethBridgeApi.clearHistory();
    await updateCallback?.();
  }

  public async updateAccountHistory(
    address: string,
    assets: Record<string, Asset>,
    networkFees: NetworkFeesObject,
    contracts?: string[],
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const currentHistory = ethBridgeApi.historyList as BridgeHistory[];
    const historyElements = await this.fetchHistoryElements(address, this.historySyncTimestamp);

    if (!historyElements.length) return;

    const { externalNetwork } = this;

    const fromTimestamp = await this.getFromTimestamp(historyElements);
    const historySyncTimestampUpdated = first(historyElements)?.timestamp as number;

    for (const historyElement of historyElements) {
      const type =
        historyElement.module === SUBQUERY_TYPES.ModuleNames.BridgeMultisig
          ? Operation.EthBridgeIncoming
          : Operation.EthBridgeOutgoing;
      const isOutgoing = isOutgoingTransaction({ type });
      const { id: txId, blockHash: blockId, data: historyElementData } = historyElement;
      const { requestHash, amount, assetId: assetAddress, sidechainAddress } = historyElementData as HistoryElementData;

      const localHistoryItem = currentHistory.find((item: BridgeHistory) => {
        return item.txId === txId || (isOutgoing ? item.hash === requestHash : item.externalHash === requestHash);
      });

      // skip, if local bridge transaction has "Done" status
      if (localHistoryItem?.status === BridgeTxStatus.Done) continue;

      // [WARNING]: api.query.ethBridge storage usage
      const hash = isOutgoing ? requestHash : await ethBridgeApi.getSoraHashByEthereumHash(requestHash);
      const symbol = assets[assetAddress]?.symbol;
      const soraNetworkFee = isOutgoing ? networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
      const soraTimestamp = historyElement.timestamp * 1000;
      // [WARNING]: api.query.ethBridge storage usage
      const soraPartCompleted =
        !isOutgoing || (!!hash && (await ethBridgeApi.getRequestStatus(hash))) === BridgeTxStatus.Ready;

      const ethereumTx = isOutgoing
        ? await this.findEthTxBySoraHash(sidechainAddress, hash, fromTimestamp, contracts)
        : await this.findEthTxByEthereumHash(requestHash);

      const externalHash = ethereumTx?.hash ?? '';
      const recieptData = externalHash ? await getEvmTransactionRecieptByHash(externalHash) : null;

      const to = isOutgoing ? sidechainAddress : recieptData?.from;
      const externalNetworkFee = recieptData?.evmNetworkFee;
      const blockHeight = ethereumTx ? String(ethereumTx.blockNumber) : undefined;
      const evmTimestamp = ethereumTx?.timestamp
        ? ethereumTx.timestamp * 1000
        : ethereumTx?.blockNumber
        ? (await ethersUtil.getBlock(ethereumTx.blockNumber)).timestamp * 1000
        : Date.now();

      const [startTime, endTime] = isOutgoing ? [soraTimestamp, evmTimestamp] : [evmTimestamp, soraTimestamp];
      const transactionState = getTransactionState(isOutgoing, soraPartCompleted, externalHash, hash);
      const status = getStatus(isOutgoing, soraPartCompleted, externalHash, hash);

      const historyItemData = {
        txId,
        type,
        blockId,
        blockHeight,
        from: address,
        amount,
        symbol,
        assetAddress,
        startTime,
        endTime,
        status,
        hash,
        externalHash,
        soraNetworkFee,
        externalNetworkFee,
        transactionState,
        externalNetwork,
        to,
      };

      // update or create local history item
      if (localHistoryItem) {
        ethBridgeApi.saveHistory({ ...localHistoryItem, ...historyItemData } as BridgeHistory);
      } else {
        ethBridgeApi.generateHistoryItem(historyItemData as BridgeHistory);
      }

      await updateCallback?.();
    }

    this.historySyncTimestamp = historySyncTimestampUpdated;
  }
}
