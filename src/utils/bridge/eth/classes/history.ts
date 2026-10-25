import { FPNumber, Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { ethers, EtherscanProvider } from 'ethers';

import { ZeroStringValue } from '@/consts';
import { getCurrentIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import * as POLKASWAP_TYPES from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import { SmartContracts, SmartContractType, KnownEthBridgeAsset } from '@/consts/evm';
import type { EthBridgeContractsAddresses } from '@/stores/web3';
import { getEvmTransactionReceiptByHash, isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import { getOutgoingClaimStatus, type OutgoingClaimStatus } from '@/utils/bridge/eth/claimStatus';
import ethersUtil from '@/utils/ethers-util';

import type { NetworkFeesObject } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { BlockTag } from 'ethers';

type BridgeActionContext<TRootState = any, TRootGetters = any> = {
  rootState: TRootState;
  rootGetters: TRootGetters;
};

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

const BRIDGE_INTERFACE = new ethers.Interface([
  ...SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.XOR], // XOR or VAL
  ...SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other], // Other
]);

const isLocalHistoryItem = (item: EthHistory, txId: string, isOutgoing: boolean, requestHash: string) => {
  if (item.txId === txId) return true;

  return isOutgoing ? item.hash === requestHash : item.externalHash === requestHash;
};

const getType = (module: string) => {
  return module === POLKASWAP_TYPES.ModuleNames.BridgeMultisig
    ? Operation.EthBridgeIncoming
    : Operation.EthBridgeOutgoing;
};

const MAX_SYNC_TIMESTAMP_FUTURE_SKEW_SECONDS = 5 * 60;

const normalizeSyncTimestamp = (timestamp: unknown, fallback = 0): number => {
  const value = Number(timestamp);
  const latestPlausibleTimestamp = Math.floor(Date.now() / 1000) + MAX_SYNC_TIMESTAMP_FUTURE_SKEW_SECONDS;

  return Number.isSafeInteger(value) && value > 0 && value <= latestPlausibleTimestamp ? value : fallback;
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
  return externalHash ? await getEvmTransactionReceiptByHash(externalHash) : null;
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
type HistoryElement = POLKASWAP_TYPES.HistoryElement;
type HistoryElementData = POLKASWAP_TYPES.HistoryElementEthBridgeOutgoing &
  POLKASWAP_TYPES.HistoryElementEthBridgeIncoming;
type NormalizedEthBridgeData = {
  requestHash: string;
  amount: string;
  assetAddress: string;
  sidechainAddress: string;
  recipient?: string;
};
type DecodedIncomingRequest = {
  requestHash: string;
  amountCodec: string;
  assetAddress: string;
  sidechainAddress: string;
  recipient: string;
};

/** Immutable evidence captured before an EVM bridge transaction is broadcast. */
export type EthBridgeEvmSubmissionFingerprint = {
  from: string;
  to: string;
  nonce: string | number | bigint;
  data: string;
  value: string | number | bigint;
  /** Local bridge start time in Unix milliseconds. */
  startTimestamp: number;
};

const ETH_BRIDGE_HISTORY_FULL_SYNC_TIMESTAMP_KEY = 'ethBridgeHistoryFullSyncTimestamp';
const EVM_SUBMISSION_CLOCK_SKEW_MS = 5 * 60 * 1_000;

/** Normalizes an EVM address without allowing malformed provider data to throw. */
const normalizeEvmAddress = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  try {
    return ethers.getAddress(value.trim()).toLowerCase();
  } catch {
    return null;
  }
};

/** Normalizes exact EVM calldata while retaining byte-for-byte equality. */
const normalizeEvmCalldata = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const data = value.trim();

  return /^0x(?:[0-9a-f]{2})*$/i.test(data) ? data.toLowerCase() : null;
};

/** Normalizes decimal, hexadecimal, bigint, and ethers BigNumberish integer values. */
const normalizeEvmInteger = (value: unknown): string | null => {
  if (typeof value === 'bigint') return value >= 0n ? value.toString() : null;

  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value).toString() : null;
  }

  if (typeof value === 'string') {
    const integer = value.trim();

    if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(integer)) return null;

    try {
      return BigInt(integer).toString();
    } catch {
      return null;
    }
  }

  if (value && typeof value === 'object') {
    try {
      const serialized = (value as { toString?: () => string }).toString?.();

      return typeof serialized === 'string' ? normalizeEvmInteger(serialized) : null;
    } catch {
      return null;
    }
  }

  return null;
};

/** Converts provider timestamps expressed in seconds or milliseconds to Unix milliseconds. */
const normalizeProviderTimestampMs = (value: unknown): number | null => {
  const normalized = normalizeEvmInteger(value);
  if (normalized === null) return null;

  const timestamp = BigInt(normalized);
  const milliseconds = timestamp < 1_000_000_000_000n ? timestamp * 1_000n : timestamp;

  return milliseconds > 0n && milliseconds <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(milliseconds) : null;
};

/** Sorts merged indexer pages in the same newest-first order requested from GraphQL. */
const sortHistoryElements = (historyElements: HistoryElement[]): HistoryElement[] => {
  return [...historyElements].sort((a, b) => {
    const timestampDiff = (b.timestamp ?? 0) - (a.timestamp ?? 0);
    if (timestampDiff) return timestampDiff;

    return String(b.id ?? '').localeCompare(String(a.id ?? ''));
  });
};

/** Merges independently queried history pages without surfacing duplicate indexer rows. */
const mergeHistoryElements = (historyElementGroups: HistoryElement[][]): HistoryElement[] => {
  const seen = new Set<string>();
  const merged: HistoryElement[] = [];

  for (const historyElements of historyElementGroups) {
    for (const historyElement of historyElements) {
      const id = historyElement?.id;
      if (!id || seen.has(id)) continue;

      seen.add(id);
      merged.push(historyElement);
    }
  }

  return sortHistoryElements(merged);
};

/** Reads asset ids from both legacy decoded JSON and SCALE decoded `{ code }` wrappers. */
const normalizeAssetAddress = (value: unknown): string => {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    const code = (value as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }

  return '';
};

/** Formats a raw bridge amount from decoded SCALE call data into the natural app amount. */
const formatCodecAmount = (amount: unknown, decimals?: number): string => {
  const value = String(amount ?? '');
  if (!value) return '';

  try {
    return FPNumber.fromCodecValue(value, decimals).toString();
  } catch {
    return '';
  }
};

/** Decodes the new indexer shape where ETH incoming transfer details are stored as a raw multisig call. */
const decodeIncomingRequest = (historyElement: HistoryElement): Nullable<DecodedIncomingRequest> => {
  const callHex = (historyElement.data as { call?: unknown })?.call;
  const registry = api.connection?.api?.registry;

  if (typeof callHex !== 'string' || !callHex || !registry?.createType) return null;

  try {
    const call = registry.createType('Call', callHex) as any;

    if (call.section !== 'ethBridge' || call.method !== 'importIncomingRequest') return null;

    const args = call.toJSON?.()?.args ?? {};
    const loadRequest = args.load_incoming_request ?? args.loadIncomingRequest ?? {};
    const loadTransaction = loadRequest.transaction ?? loadRequest.Transaction ?? {};
    const incomingResult = args.incoming_request_result ?? args.incomingRequestResult ?? {};
    const okResult = incomingResult.ok ?? incomingResult.Ok ?? {};
    const transfer = okResult.transfer ?? okResult.Transfer;

    if (!transfer || typeof transfer !== 'object') return null;

    const requestHash = String(
      transfer.txHash ?? transfer.tx_hash ?? loadTransaction.hash ?? loadTransaction.hash_ ?? ''
    );
    const amountCodec = String(transfer.amount ?? '');
    const assetAddress = normalizeAssetAddress(transfer.assetId ?? transfer.asset_id);
    const sidechainAddress = String(transfer.from ?? '');
    const recipient = String(transfer.to ?? '');

    if (!(requestHash && amountCodec && assetAddress && recipient)) return null;

    return {
      requestHash,
      amountCodec,
      assetAddress,
      sidechainAddress,
      recipient,
    };
  } catch {
    return null;
  }
};

/** Normalizes old decoded indexer payloads and new raw incoming payloads into one history shape. */
const getHistoryElementData = (
  historyElement: HistoryElement,
  isOutgoing: boolean,
  assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>
): Nullable<NormalizedEthBridgeData> => {
  const data = (historyElement.data ?? {}) as HistoryElementData;
  const assetAddress = data.assetId;

  if (data.amount && assetAddress) {
    return {
      requestHash: data.requestHash || historyElement.id,
      amount: data.amount,
      assetAddress,
      sidechainAddress: data.sidechainAddress,
      recipient: data.to,
    };
  }

  if (isOutgoing) return null;

  const decoded = decodeIncomingRequest(historyElement);
  if (!decoded) return null;

  const asset = assetDataByAddress(decoded.assetAddress);
  const amount = formatCodecAmount(decoded.amountCodec, asset?.decimals);

  if (!amount) return null;

  return {
    requestHash: decoded.requestHash,
    amount,
    assetAddress: decoded.assetAddress,
    sidechainAddress: decoded.sidechainAddress,
    recipient: decoded.recipient,
  };
};

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
    return normalizeSyncTimestamp(ethBridgeApi.accountStorage?.get('ethBridgeHistorySyncTimestamp'));
  }

  public set historySyncTimestamp(timestamp: number) {
    ethBridgeApi.accountStorage?.set('ethBridgeHistorySyncTimestamp', normalizeSyncTimestamp(timestamp));
  }

  public get fullHistorySyncTimestamp(): number {
    return normalizeSyncTimestamp(ethBridgeApi.accountStorage?.get(ETH_BRIDGE_HISTORY_FULL_SYNC_TIMESTAMP_KEY));
  }

  public set fullHistorySyncTimestamp(timestamp: number) {
    ethBridgeApi.accountStorage?.set(ETH_BRIDGE_HISTORY_FULL_SYNC_TIMESTAMP_KEY, normalizeSyncTimestamp(timestamp));
  }

  public async init(contracts: EthBridgeContractsAddresses, evmId: number): Promise<void> {
    this.externalNetwork = evmId;
    this.contracts = contracts;
    this.etherscanInstance = new EtherscanHistoryProvider(evmId, this.etherscanApiKey);
  }

  private async getEthStartBlock(timestampMs: number): Promise<number> {
    // Etherscan timestamps are second-granular. Rounding up can skip a
    // transaction broadcast later in the same second as the persisted start.
    const timestamp = Math.floor(timestampMs / 1000);

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

  /** Fetches and filters account history without consulting the local provider cache. */
  private async fetchEthAccountTransactions(
    address: string,
    contracts?: string[],
    fromTimestamp?: number
  ): Promise<EthTransactionsMap> {
    const normalizedContracts = contracts?.map(normalizeEvmAddress).filter((value): value is string => !!value);
    const ethStartBlock = fromTimestamp ? await this.getEthStartBlock(fromTimestamp) : undefined;
    const response = await this.etherscanInstance.getHistory(address, ethStartBlock);
    const history = Array.isArray(response) ? response : [];

    return history.reduce<EthTransactionsMap>((buffer, transaction) => {
      if (!transaction || typeof transaction !== 'object') return buffer;

      const hash = (transaction as { hash?: unknown }).hash;
      const to = normalizeEvmAddress((transaction as { to?: unknown }).to);

      if (typeof hash !== 'string' || !hash) return buffer;
      if (contracts && (!to || !normalizedContracts?.includes(to))) return buffer;

      buffer[hash] = transaction as ethers.TransactionResponse;

      return buffer;
    }, {});
  }

  /** Resolves a provider timestamp, falling back to the block for ethers transaction shapes. */
  private async getEthTransactionTimestampMs(transaction: ethers.TransactionResponse): Promise<number | null> {
    const providerTransaction = transaction as ethers.TransactionResponse & {
      timeStamp?: unknown;
      timestamp?: unknown;
    };
    const directTimestamp = normalizeProviderTimestampMs(
      providerTransaction.timeStamp ?? providerTransaction.timestamp
    );

    if (directTimestamp !== null) return directTimestamp;

    const blockNumber = normalizeEvmInteger(providerTransaction.blockNumber);
    if (blockNumber === null || BigInt(blockNumber) > BigInt(Number.MAX_SAFE_INTEGER)) return null;

    try {
      const block = await this.etherscanInstance.getBlock(Number(blockNumber));

      return normalizeProviderTimestampMs(block?.timestamp);
    } catch {
      return null;
    }
  }

  public async getEthAccountTransactions(
    address: string,
    contracts?: string[],
    fromTimestamp?: number
  ): Promise<EthTransactionsMap> {
    const key = address.toLowerCase();

    if (!this.ethAccountTransactionsMap[key]) {
      this.ethAccountTransactionsMap[key] = await this.fetchEthAccountTransactions(address, contracts, fromTimestamp);
    }

    return this.ethAccountTransactionsMap[key];
  }

  /**
   * Force-refreshes Etherscan history and finds a prior EVM submission using
   * immutable pre-broadcast evidence. Every field must match; the timestamp is
   * a lower bound with five minutes of clock/block skew so a valid broadcast is
   * not missed. This lookup deliberately bypasses cached empty account history.
   */
  public async findEthTxBySubmissionFingerprint(
    fingerprint: EthBridgeEvmSubmissionFingerprint
  ): Promise<ethers.TransactionResponse | null> {
    const from = normalizeEvmAddress(fingerprint.from);
    const to = normalizeEvmAddress(fingerprint.to);
    const nonce = normalizeEvmInteger(fingerprint.nonce);
    const data = normalizeEvmCalldata(fingerprint.data);
    const value = normalizeEvmInteger(fingerprint.value);
    const startTimestamp = normalizeProviderTimestampMs(fingerprint.startTimestamp);

    if (!(from && to && nonce !== null && data && value !== null && startTimestamp !== null)) return null;

    const earliestTimestamp = Math.max(0, Math.floor(startTimestamp / 1_000) * 1_000 - EVM_SUBMISSION_CLOCK_SKEW_MS);
    const transactions = await this.fetchEthAccountTransactions(fingerprint.from, [fingerprint.to], earliestTimestamp);
    this.ethAccountTransactionsMap[from] = transactions;

    for (const transaction of Object.values(transactions)) {
      const providerTransaction = transaction as ethers.TransactionResponse & {
        input?: unknown;
      };
      const transactionFrom = normalizeEvmAddress(providerTransaction.from);
      const transactionTo = normalizeEvmAddress(providerTransaction.to);
      const transactionNonce = normalizeEvmInteger(providerTransaction.nonce);
      const transactionData = normalizeEvmCalldata(providerTransaction.input ?? providerTransaction.data);
      const transactionValue = normalizeEvmInteger(providerTransaction.value);

      if (
        transactionFrom !== from ||
        transactionTo !== to ||
        transactionNonce !== nonce ||
        transactionData !== data ||
        transactionValue !== value
      ) {
        continue;
      }

      const transactionTimestamp = await this.getEthTransactionTimestampMs(transaction);

      if (transactionTimestamp !== null && transactionTimestamp >= earliestTimestamp) return transaction;
    }

    return null;
  }

  private getFromTimestamp(historyElements: HistoryElement[]) {
    const timestamp = [...historyElements]
      .reverse()
      .filter((item) => item.module !== POLKASWAP_TYPES.ModuleNames.BridgeMultisig)
      .map((item) => normalizeSyncTimestamp(item.timestamp))
      .find(Boolean);

    return timestamp ? timestamp * 1000 : Date.now();
  }

  public async findEthTxBySoraHash(
    accountAddress: string,
    hash: string,
    fromTimestamp?: number
  ): Promise<ethers.TransactionResponse | null> {
    if (!(accountAddress && hash)) return null;
    const contracts = Object.values(this.contracts);
    let claimStatus: OutgoingClaimStatus = 'inconclusive';
    // A successful read from the correct chain can establish that this claim
    // remains unsigned even when the explorer is unavailable. No wallet
    // connection or signature is requested by these provider reads.
    try {
      claimStatus = await getOutgoingClaimStatus(
        ethersUtil.getEthersInstance(),
        this.externalNetwork,
        contracts,
        accountAddress,
        hash
      );
      if (claimStatus === 'unclaimed') {
        return null;
      }
    } catch {
      // A disconnected wallet, wrong network, or failed RPC is inconclusive.
    }

    // A cached empty result (or old failed claim) must not hide a newer claim.
    const transactions = await this.fetchEthAccountTransactions(accountAddress, contracts, fromTimestamp);
    this.ethAccountTransactionsMap[accountAddress.toLowerCase()] = transactions;

    let failedTransaction: ethers.TransactionResponse | null = null;

    for (const tx of Object.values(transactions).reverse()) {
      try {
        const data = (tx as ethers.TransactionResponse & { input?: string }).input ?? tx.data;
        const decodedInput = BRIDGE_INTERFACE.parseTransaction({ data });

        if (decodedInput?.args.getValue('txHash')?.toLowerCase() === hash.toLowerCase()) {
          if (Number((tx as ethers.TransactionResponse & { isError?: string }).isError ?? 0) !== 0) {
            failedTransaction ??= tx;
            continue;
          }
          return tx;
        }
      } catch (err) {
        console.info(err);
        continue;
      }
    }

    if (claimStatus === 'consumed' || claimStatus === 'pending') {
      throw new Error('[Bridge]: Ethereum claim settlement is awaiting transaction history');
    }
    return failedTransaction;
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

  /**
   * Reads all pages for one prepared Polkaswap history filter.
   */
  private async fetchHistoryElementsByFilter(filter: unknown): Promise<HistoryElement[]> {
    const indexer = getCurrentIndexer();
    const history: HistoryElement[] = [];
    let hasNext = true;
    let after = '';

    do {
      const variables = { after, filter, first: 100 };
      const response = await indexer.services.explorer.account.getHistoryPaged(variables);

      if (!response) return history;

      const edges = Array.isArray(response.edges) ? response.edges : [];
      const nextAfter = response.pageInfo?.endCursor ?? '';

      hasNext = !!response.pageInfo?.hasNextPage && !!nextAfter && nextAfter !== after;
      after = nextAfter;
      history.push(...edges.map((edge) => edge?.node).filter((node): node is HistoryElement => Boolean(node)));
    } while (hasNext);

    return history;
  }

  public async fetchHistoryElements(address: string, timestamp = 0, ids?: string[]): Promise<HistoryElement[]> {
    const indexer = getCurrentIndexer();
    const outgoingFilter = indexer.historyElementsFilter({
      address,
      operations: [Operation.EthBridgeOutgoing],
      timestamp,
      ids,
    });
    // Raw bridge-multisig incoming rows store the SORA recipient inside data.call, not in the indexer address.
    const incomingFilter = indexer.historyElementsFilter({
      operations: [Operation.EthBridgeIncoming],
      timestamp,
      ids,
    });
    const historyElementGroups = await Promise.all([
      this.fetchHistoryElementsByFilter(outgoingFilter),
      this.fetchHistoryElementsByFilter(incomingFilter),
    ]);

    return mergeHistoryElements(historyElementGroups);
  }

  public async clearHistory(
    inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    // don't remove history, what in progress
    const ids = Object.keys(ethBridgeApi.history).filter((id) => !(id in inProgressIds));
    ethBridgeApi.removeHistory(...ids);
    this.historySyncTimestamp = 0;
    this.fullHistorySyncTimestamp = 0;
    await updateCallback?.();
  }

  private async restoreHistoryElements(
    historyElements: HistoryElement[],
    address: string,
    networkFees: NetworkFeesObject,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    currentHistory: EthHistory[],
    initialSyncTimestamp: number,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<{ matchedHistory: boolean; syncTimestamp: number }> {
    const { externalNetwork } = this;
    const fromTimestamp = this.getFromTimestamp(historyElements);
    let matchedHistory = false;
    let historySyncTimestampUpdated = initialSyncTimestamp;

    for (const historyElement of historyElements) {
      const type = getType(historyElement.module);
      const isOutgoing = isOutgoingTransaction({ type });
      const { id: txId, blockHash: blockId, blockHeight } = historyElement;
      const historyElementData = getHistoryElementData(historyElement, isOutgoing, assetDataByAddress);
      const syncTimestamp = normalizeSyncTimestamp(historyElement.timestamp);

      if (!historyElementData || !syncTimestamp) continue;
      if (!isOutgoing && historyElementData.recipient !== address) continue;

      matchedHistory = true;

      const { requestHash, amount, assetAddress, sidechainAddress } = historyElementData;
      const localHistoryItem = currentHistory.find((item: EthHistory) =>
        isLocalHistoryItem(item, txId, isOutgoing, requestHash)
      );

      // don't restore transaction what is in process in app
      if ((localHistoryItem?.id as string) in inProgressIds) continue;
      if (hasFinishedState(localHistoryItem)) {
        historySyncTimestampUpdated = Math.max(historySyncTimestampUpdated, syncTimestamp);
        continue;
      }

      const soraHash = await getSoraHash(isOutgoing, requestHash);
      const asset = assetDataByAddress(assetAddress);
      const symbol = asset?.symbol;
      const soraNetworkFee = getSoraNetworkFee(isOutgoing, networkFees);
      const soraTimestamp = syncTimestamp * 1000;
      const soraPartCompleted = await isSoraPartCompleted(isOutgoing, soraHash);
      let ethereumTx: ethers.TransactionResponse | null;

      try {
        ethereumTx = isOutgoing
          ? await this.findEthTxBySoraHash(sidechainAddress, soraHash, fromTimestamp)
          : await this.findEthTxByEthereumHash(requestHash);
      } catch (error) {
        if (!isOutgoing) throw error;
        // Preserve existing broadcast evidence. New SORA rows can still be
        // restored and opened; the reducer checks for an Ethereum submission
        // again before offering a signature.
        if (localHistoryItem) continue;
        ethereumTx = null;
      }

      // A missing explorer row or unused claim cannot erase a known broadcast
      // hash: another RPC may not have seen that pending transaction yet.
      if (!ethereumTx && localHistoryItem?.externalHash) continue;
      if (
        localHistoryItem?.externalHash &&
        ethereumTx?.hash !== localHistoryItem.externalHash &&
        Number((ethereumTx as (ethers.TransactionResponse & { isError?: string }) | null)?.isError ?? 0) !== 0
      ) {
        continue;
      }

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
      let savedHistoryItem: EthHistory | null;
      if (localHistoryItem) {
        savedHistoryItem = { ...localHistoryItem, ...historyItemData } as EthHistory;
        ethBridgeApi.saveHistory(savedHistoryItem);
      } else {
        savedHistoryItem = ethBridgeApi.generateHistoryItem(historyItemData as EthHistory);
      }

      if (savedHistoryItem) {
        const currentIndex = localHistoryItem ? currentHistory.indexOf(localHistoryItem) : -1;

        if (currentIndex >= 0) {
          currentHistory[currentIndex] = savedHistoryItem;
        } else {
          currentHistory.push(savedHistoryItem);
        }

        historySyncTimestampUpdated = Math.max(historySyncTimestampUpdated, syncTimestamp);
      }

      await updateCallback?.();
    }

    return { matchedHistory, syncTimestamp: historySyncTimestampUpdated };
  }

  public async updateAccountHistory(
    address: string,
    networkFees: NetworkFeesObject,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    const initialSyncTimestamp = this.historySyncTimestamp;
    const currentHistory = ethBridgeApi.historyList as EthHistory[];
    let historyElements = await this.fetchHistoryElements(address, initialSyncTimestamp);
    let fetchedFromBeginning = initialSyncTimestamp === 0;

    if (
      !historyElements.length &&
      initialSyncTimestamp &&
      (!currentHistory.length || this.fullHistorySyncTimestamp < initialSyncTimestamp)
    ) {
      historyElements = await this.fetchHistoryElements(address, 0);
      fetchedFromBeginning = true;
    }

    if (!historyElements.length) return;

    let result = await this.restoreHistoryElements(
      historyElements,
      address,
      networkFees,
      inProgressIds,
      assetDataByAddress,
      currentHistory,
      initialSyncTimestamp,
      updateCallback
    );

    if (!result.matchedHistory && initialSyncTimestamp && !fetchedFromBeginning) {
      const fallbackHistoryElements = await this.fetchHistoryElements(address, 0);

      if (fallbackHistoryElements.length) {
        const fallbackResult = await this.restoreHistoryElements(
          fallbackHistoryElements,
          address,
          networkFees,
          inProgressIds,
          assetDataByAddress,
          currentHistory,
          0,
          updateCallback
        );

        if (fallbackResult.matchedHistory) {
          result = fallbackResult;
          fetchedFromBeginning = true;
        }
      }
    } else if (
      !fetchedFromBeginning &&
      initialSyncTimestamp &&
      result.syncTimestamp &&
      this.fullHistorySyncTimestamp < result.syncTimestamp
    ) {
      const fallbackHistoryElements = await this.fetchHistoryElements(address, 0);

      if (fallbackHistoryElements.length) {
        const fallbackResult = await this.restoreHistoryElements(
          fallbackHistoryElements,
          address,
          networkFees,
          inProgressIds,
          assetDataByAddress,
          currentHistory,
          0,
          updateCallback
        );

        if (fallbackResult.matchedHistory) {
          result = fallbackResult;
          fetchedFromBeginning = true;
        }
      }
    }

    this.historySyncTimestamp = result.syncTimestamp;
    if (fetchedFromBeginning && result.syncTimestamp) {
      this.fullHistorySyncTimestamp = result.syncTimestamp;
    }
  }
}

export const getEthBridgeHistoryInstance = async (context: BridgeActionContext): Promise<EthBridgeHistory> => {
  const { rootState } = context;

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
 * Restore ETH bridge account transactions, using Polkaswap & Etherscan
 * @param context store context
 */
export const updateEthBridgeHistory =
  (context: BridgeActionContext) =>
  async (clearHistory = false, updateCallback?: VoidFunction): Promise<void> => {
    try {
      const { rootState, rootGetters } = context;

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
