import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import {
  api,
  historyElementsFilter,
  SubqueryExplorerService,
  SUBQUERY_TYPES,
  WALLET_CONSTS,
} from '@soramitsu/soraneo-wallet-web';
import { ethers, EtherscanProvider, Networkish, BlockTag } from 'ethers';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';

import { ZeroStringValue } from '@/consts';
import { SmartContracts, SmartContractType, KnownEthBridgeAsset } from '@/consts/evm';
import { rootActionContext } from '@/store';
import type { EthBridgeContractsAddresses } from '@/store/web3/types';
import { getEvmTransactionRecieptByHash, isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import ethersUtil from '@/utils/ethers-util';

import type { BridgeHistory, NetworkFeesObject } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { ActionContext } from 'vuex';

export default class EtherscanHistoryProvider extends EtherscanProvider {
  async getHistory(address: string, startBlock?: BlockTag, endBlock?: BlockTag): Promise<Array<any>> {
    const params = {
      action: 'txlist',
      address,
      startblock: startBlock == null ? 0 : startBlock,
      endblock: endBlock == null ? 99999999 : endBlock,
      sort: 'asc',
    };

    return this.fetch('account', params);
  }
}

const BRIDGE_INTERFACE = new ethers.Interface([
  ...SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.XOR].abi, // XOR or VAL
  ...SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other].abi, // Other
]);

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

const isLocalHistoryItem = (item: BridgeHistory, txId: string, isOutgoing: boolean, requestHash: string) => {
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

const getTransactionState = (isOutgoing: boolean, soraPartCompleted: boolean, externalHash: string, hash: string) => {
  if (!isOutgoing) return ETH_BRIDGE_STATES.SORA_COMMITED;

  if (externalHash) {
    return ETH_BRIDGE_STATES.EVM_COMMITED;
  } else if (soraPartCompleted) {
    return ETH_BRIDGE_STATES.EVM_REJECTED;
  } else if (hash) {
    return ETH_BRIDGE_STATES.SORA_PENDING;
  } else {
    return ETH_BRIDGE_STATES.SORA_REJECTED;
  }
};

const hasFinishedState = (item: Nullable<BridgeHistory>) => {
  if (!item) return false;

  const isOutgoing = isOutgoingTransaction(item);

  return isOutgoing
    ? item.transactionState === ETH_BRIDGE_STATES.EVM_COMMITED
    : item.transactionState === ETH_BRIDGE_STATES.SORA_COMMITED;
};

const getReceiptData = async (externalHash: string) => {
  return externalHash ? await getEvmTransactionRecieptByHash(externalHash) : null;
};

const getEvmBlockNumber = (ethereumTx: ethers.TransactionResponse | null) => {
  return ethereumTx?.blockNumber;
};

const getEvmBlockId = (ethereumTx: ethers.TransactionResponse | null) => {
  return ethereumTx?.blockHash;
};

const getEvmTimestamp = async (ethereumTx: ethers.TransactionResponse | null) => {
  if (ethereumTx?.blockNumber) {
    const block = await ethersUtil.getBlock(ethereumTx.blockNumber);

    if (block) {
      return block.timestamp * 1000;
    }
  }
  return Date.now();
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
  private contracts!: EthBridgeContractsAddresses;

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

  public async init(contracts: EthBridgeContractsAddresses): Promise<void> {
    const ethersInstance = await ethersUtil.getEthersInstance();
    const network = await ethersInstance.getNetwork();

    this.etherscanInstance = new EtherscanHistoryProvider(network, this.etherscanApiKey);
    this.externalNetwork = await ethersUtil.getEvmNetworkId();
    this.contracts = contracts;
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
    fromTimestamp: number
  ): Promise<ethers.TransactionResponse | null> {
    if (!(accountAddress && hash)) return null;
    const contracts = Object.values(this.contracts);
    const transactions = await this.getEthAccountTransactions(accountAddress, fromTimestamp, contracts);

    for (const tx of Object.values(transactions)) {
      try {
        const decodedInput = BRIDGE_INTERFACE.parseTransaction(tx);

        if (decodedInput?.args.txHash.toLowerCase() === hash.toLowerCase()) {
          return tx;
        }
      } catch (err) {
        continue;
      }
    }

    return null;
  }

  public async findEthTxByEthereumHash(externalHash: string): Promise<ethers.TransactionResponse | null> {
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
    networkFees: NetworkFeesObject,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const historyElements = await this.fetchHistoryElements(address, this.historySyncTimestamp);

    if (!historyElements.length) return;

    const currentHistory = ethBridgeApi.historyList as BridgeHistory[];

    const { externalNetwork } = this;

    const fromTimestamp = await this.getFromTimestamp(historyElements);
    const historySyncTimestampUpdated = first(historyElements)?.timestamp as number;

    for (const historyElement of historyElements) {
      const type = getType(historyElement.module);
      const isOutgoing = isOutgoingTransaction({ type });
      const { id: txId, blockHash: blockId, blockHeight, data: historyElementData } = historyElement;
      const { requestHash, amount, assetId: assetAddress, sidechainAddress } = historyElementData as HistoryElementData;

      const localHistoryItem = currentHistory.find((item: BridgeHistory) =>
        isLocalHistoryItem(item, txId, isOutgoing, requestHash)
      );

      // don't restore transaction what is in process in app
      if ((localHistoryItem?.id as string) in inProgressIds) continue;
      if (hasFinishedState(localHistoryItem)) continue;

      const hash = await getSoraHash(isOutgoing, requestHash);
      const asset = assetDataByAddress(assetAddress);
      const symbol = asset?.symbol;
      const soraNetworkFee = getSoraNetworkFee(isOutgoing, networkFees);
      const soraTimestamp = historyElement.timestamp * 1000;
      const soraPartCompleted = await isSoraPartCompleted(isOutgoing, hash);
      const ethereumTx = isOutgoing
        ? await this.findEthTxBySoraHash(sidechainAddress, hash, fromTimestamp)
        : await this.findEthTxByEthereumHash(requestHash);

      const externalHash = ethereumTx?.hash ?? '';
      const recieptData = await getReceiptData(externalHash);
      const to = isOutgoing ? sidechainAddress : recieptData?.from;
      const externalNetworkFee = recieptData?.fee;
      const externalBlockId = getEvmBlockId(ethereumTx);
      const externalBlockHeight = getEvmBlockNumber(ethereumTx);
      const evmTimestamp = await getEvmTimestamp(ethereumTx);

      const [startTime, endTime] = getTimes(isOutgoing, soraTimestamp, evmTimestamp);
      const transactionState = getTransactionState(isOutgoing, soraPartCompleted, externalHash, hash);

      const historyItemData = {
        txId,
        type,
        blockId,
        blockHeight: +blockHeight,
        from: address,
        amount,
        symbol,
        assetAddress,
        startTime,
        endTime,
        hash,
        externalHash,
        soraNetworkFee,
        transactionState,
        externalBlockId,
        externalBlockHeight,
        externalNetwork,
        externalNetworkType: BridgeNetworkType.EvmLegacy,
        externalNetworkFee,
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
          settings: {
            apiKeys: { etherscan: etherscanApiKey },
            networkFees,
          },
        },
        web3: { ethBridgeEvmNetwork, ethBridgeContractAddress },
        bridge: { inProgressIds },
      } = rootState;

      const networkData = rootGetters.web3.availableNetworks[BridgeNetworkType.EvmLegacy][ethBridgeEvmNetwork];

      if (!networkData) {
        throw new Error(
          `[HASHI Bridge History]: Network "${ethBridgeEvmNetwork}" is not available in app. Please check app config`
        );
      }

      await ethersUtil.switchOrAddChain(networkData.data);

      if ((await ethersUtil.getEvmNetworkId()) !== ethBridgeEvmNetwork) {
        throw new Error(
          `[HASHI Bridge History]: Restoration canceled. Network "${rootState.web3.evmNetworkProvided}" is connected, "${ethBridgeEvmNetwork}" expected`
        );
      }

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const ethBridgeHistory = new EthBridgeHistory(etherscanApiKey);

      await ethBridgeHistory.init(ethBridgeContractAddress);

      if (clearHistory) {
        await ethBridgeHistory.clearHistory(updateCallback);
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
