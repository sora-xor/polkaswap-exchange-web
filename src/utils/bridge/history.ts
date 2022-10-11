import flatten from 'lodash/fp/flatten';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { ethers } from 'ethers';
import { BridgeNetworks, BridgeTxStatus, Operation } from '@sora-substrate/util';
import { SubqueryExplorerService, historyElementsFilter, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';

import ethersUtil from '@/utils/ethers-util';
import { bridgeApi } from './api';
import { STATES } from './types';
import {
  isOutgoingTransaction,
  getSoraHashByEthereumHash,
  getEvmTxRecieptByHash,
  getSoraBlockHash,
  getSoraBlockTimestamp,
} from './utils';
import { ZeroStringValue } from '@/consts';

import type { BridgeHistory, NetworkFeesObject } from '@sora-substrate/util';
import type { RegisteredAccountAssetObject } from '@/store/assets/types';

type TimestampMap<T> = {
  [key: number]: T;
};

type EthLogsMap = DataMap<boolean>;
type EthTransactionsMap = DataMap<ethers.providers.TransactionResponse>;
type HistoryElement = SUBQUERY_TYPES.HistoryElement;
type HistoryElementData = SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing &
  SUBQUERY_TYPES.HistoryElementEthBridgeIncoming;

export class EthBridgeHistory {
  private readonly externalNetwork = BridgeNetworks.ETH_NETWORK_ID;

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
    return +(bridgeApi.accountStorage?.get('bridgeHistorySyncTimestamp') || 0);
  }

  public set historySyncTimestamp(timestamp: number) {
    bridgeApi.accountStorage?.set('bridgeHistorySyncTimestamp', timestamp);
  }

  public async init(): Promise<void> {
    const ethersInstance = await ethersUtil.getEthersInstance();
    const network = await ethersInstance.getNetwork();

    this.etherscanInstance = new ethers.providers.EtherscanProvider(network, this.etherscanApiKey);
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
      const soraStartBlock = await getSoraBlockHash(1);
      const soraStartTimestamp = await getSoraBlockTimestamp(soraStartBlock);

      return soraStartTimestamp;
    }

    return historyElement.timestamp * 1000;
  }

  public async findEthTxBySoraHash(
    address: string,
    hash: string,
    fromTimestamp: number,
    contracts?: string[]
  ): Promise<ethers.providers.TransactionResponse | null> {
    if (!address || !hash) return null;

    const transactions = await this.getEthAccountTransactions(address, fromTimestamp, contracts);

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

  public async findEthTxByEthereumHash(ethereumHash: string): Promise<ethers.providers.TransactionResponse> {
    for (const address in this.ethAccountTransactionsMap) {
      if (ethereumHash in this.ethAccountTransactionsMap[address]) {
        return this.ethAccountTransactionsMap[address][ethereumHash];
      }
    }

    return await ethersUtil.getEvmTransaction(ethereumHash);
  }

  public async fetchHistoryElements(address: string, timestamp = 0, ids?: string[]): Promise<HistoryElement[]> {
    const operations = [Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming];
    const filter = historyElementsFilter({ address, operations, timestamp, ids });
    const history: HistoryElement[] = [];

    let hasNext = true;
    let after = '';

    do {
      const variables = { after, filter, first: 100 };
      const {
        edges,
        pageInfo: { hasNextPage, endCursor },
      } = await SubqueryExplorerService.getAccountTransactions(variables);
      const elements = edges.map((edge) => edge.node) as HistoryElement[];
      hasNext = hasNextPage;
      after = endCursor;
      history.push(...elements);
    } while (hasNext);

    return history as HistoryElement[];
  }

  public async updateAccountHistory(
    address: string,
    assets: RegisteredAccountAssetObject,
    networkFees: NetworkFeesObject,
    contracts?: string[],
    updateCallback?: AsyncVoidFn | VoidFunction
  ): Promise<void> {
    const currentHistory = bridgeApi.historyList as BridgeHistory[];
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
      const historyElementData = historyElement.data as HistoryElementData;
      const requestHash = historyElementData.requestHash;

      const localHistoryItem = currentHistory.find((item: BridgeHistory) => {
        return (
          item.txId === historyElement.id ||
          (isOutgoing ? item.hash === requestHash : item.ethereumHash === requestHash)
        );
      });

      // skip, if local bridge transaction has "Done" status
      if (localHistoryItem?.status === BridgeTxStatus.Done) continue;

      const hash = isOutgoing ? requestHash : await getSoraHashByEthereumHash(this.externalNetwork, requestHash);
      const amount = historyElementData.amount;
      const assetAddress = historyElementData.assetId;
      const from = address;
      const symbol = assets[assetAddress]?.symbol;
      const blockId = historyElement.blockHash;
      const txId = historyElement.id;
      const soraNetworkFee = isOutgoing ? networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
      const soraTimestamp = historyElement.timestamp * 1000;
      const soraPartCompleted =
        !isOutgoing ||
        (!!hash && (await bridgeApi.api.query.ethBridge.requestStatuses(externalNetwork, hash))).toString() ===
          BridgeTxStatus.Ready;
      const transactionStep = soraPartCompleted ? 2 : 1;

      const ethereumTx = isOutgoing
        ? soraPartCompleted
          ? await this.findEthTxBySoraHash(historyElementData.sidechainAddress, hash, fromTimestamp, contracts)
          : null
        : await this.findEthTxByEthereumHash(requestHash);

      const ethereumHash = ethereumTx?.hash ?? '';
      const recieptData = ethereumHash ? await getEvmTxRecieptByHash(ethereumHash) : null;

      const to = isOutgoing ? historyElementData.sidechainAddress : recieptData?.from;
      const ethereumNetworkFee = recieptData?.ethereumNetworkFee;
      const blockHeight = ethereumTx ? String(ethereumTx.blockNumber) : undefined;
      const evmTimestamp = ethereumTx?.timestamp
        ? ethereumTx.timestamp * 1000
        : ethereumTx?.blockNumber
        ? (await ethersUtil.getBlock(ethereumTx.blockNumber)).timestamp * 1000
        : Date.now();

      const [startTime, endTime] = isOutgoing ? [soraTimestamp, evmTimestamp] : [evmTimestamp, soraTimestamp];

      const transactionState = isOutgoing
        ? ethereumHash
          ? STATES.EVM_COMMITED
          : soraPartCompleted
          ? STATES.EVM_REJECTED
          : hash
          ? STATES.SORA_PENDING
          : STATES.SORA_REJECTED
        : STATES.SORA_COMMITED;

      const status = isOutgoing
        ? ethereumHash
          ? BridgeTxStatus.Done
          : soraPartCompleted
          ? BridgeTxStatus.Failed
          : hash
          ? BridgeTxStatus.Pending
          : BridgeTxStatus.Failed
        : BridgeTxStatus.Done;

      const historyItemData = {
        txId,
        type,
        blockId,
        blockHeight,
        from,
        amount,
        symbol,
        assetAddress,
        startTime,
        endTime,
        status,
        transactionStep,
        hash,
        ethereumHash,
        soraNetworkFee,
        ethereumNetworkFee,
        transactionState,
        externalNetwork,
        to,
      };

      // update or create local history item
      if (localHistoryItem) {
        bridgeApi.saveHistory({ ...localHistoryItem, ...historyItemData } as BridgeHistory);
      } else {
        bridgeApi.generateHistoryItem(historyItemData as BridgeHistory);
      }

      await updateCallback?.();
    }

    this.historySyncTimestamp = historySyncTimestampUpdated;
  }
}
