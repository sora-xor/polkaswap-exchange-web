import { FPNumber, Operation, TransactionStatus } from '@sora-substrate/sdk';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { decodeAddress } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { api } from '@/lib/soraneo-wallet/src/api';

import { ZeroStringValue } from '@/consts';
import { getCurrentIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import {
  fetchSorametricsLiberlandBridgeHistory,
  type SorametricsLiberlandBridgeCandidate,
} from '@/services/sorametrics';
import { areBridgeExternalAccountsEqual } from '@/utils/bridge/common/account';
import { getBlockEventsByTxIndex } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import {
  isDisplayOnlyRecoveredSubBridgeHistory,
  isSubBridgeTerminalFailureStatus,
  SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
  type SubBridgeRecoveryPayload,
} from '@/utils/bridge/sub/reconciliation';
import {
  getDepositedBalance,
  getMessageAcceptedNonces,
  getMessageDispatchedNonces,
  getParachainSystemMessageHash,
  isMessageDispatchedNonces,
  getReceivedAmount,
  isParaInclusion,
  isTransactionFeePaid,
  isBridgeProxyHash,
  isMessageAccepted,
  isQueueMessage,
} from '@/utils/bridge/sub/utils';

import type { ApiPromise } from '@polkadot/api';
import type { HistoryElement } from '@/lib/soraneo-wallet/src/services/indexer/types';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeTransactionData } from '@sora-substrate/sdk/build/bridgeProxy/types';

type BridgeActionContext<TRootState = any, TRootGetters = any> = {
  rootState: TRootState;
  rootGetters: TRootGetters;
};

type IsCurrentBridgeHistoryRequest = () => boolean;

type LiberlandSettlementHistoryElement = HistoryElement & {
  data: Record<string, unknown>;
};

const LIBERLAND_SETTLEMENT_HYDRATION_CHUNK_SIZE = 100;
const LIBERLAND_V1_PAYLOAD_LENGTH = 118;
const LIBERLAND_V1_SENTINEL = [0x04, 0x00, 0x00] as const;
const LIBERLAND_V1_SENDER_VARIANT = 2;
const LIBERLAND_V1_RECIPIENT_VARIANT = 1;
const LIBERLAND_V1_BALANCE_VARIANT = 0;
const LIBERLAND_SETTLEMENT_TIMESTAMP_TOLERANCE_MS = 15 * 60 * 1_000;
const SUBSTRATE_HASH_PATTERN = /^0x[0-9a-f]{64}$/i;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const currentBridgeHistoryRequest: IsCurrentBridgeHistoryRequest = () => true;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizePositiveInteger = (value: unknown): number | null => {
  const normalized = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

  return typeof normalized === 'number' && Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
};

const normalizeSubstrateHash = (value: unknown): string => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  return SUBSTRATE_HASH_PATTERN.test(normalized) ? normalized : '';
};

const normalizePositiveAmount = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 128 || !POSITIVE_DECIMAL_PATTERN.test(value)) return null;

  const amount = new FPNumber(value);

  if (!amount.isFinity() || !FPNumber.gt(amount, FPNumber.ZERO)) return null;

  return amount.toString();
};

const normalizeNonNegativeCodecAmount = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 128 || !/^\d+$/.test(value)) return null;

  try {
    return BigInt(value).toString();
  } catch {
    return null;
  }
};

const isAccountId32 = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    return decodeAddress(value.trim(), false).length === 32;
  } catch {
    return false;
  }
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);

const decodeLittleEndianU128 = (bytes: Uint8Array): bigint => {
  let value = 0n;

  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    value = (value << 8n) | BigInt(bytes[index]);
  }

  return value;
};

/**
 * Verifies the archived Liberland inbound v1 message layout against the
 * account-scoped candidate and the registered asset denomination.
 */
const matchesLiberlandV1Message = (
  payload: unknown,
  candidate: SorametricsLiberlandBridgeCandidate,
  asset: RegisteredAccountAsset
): boolean => {
  if (typeof payload !== 'string' || !/^0x(?:[0-9a-fA-F]{2}){118}$/.test(payload)) return false;

  const externalDecimals = asset.externalDecimals;

  if (!Number.isSafeInteger(externalDecimals) || externalDecimals < 0 || externalDecimals > 38) return false;

  try {
    const bytes = hexToU8a(payload);

    if (bytes.length !== LIBERLAND_V1_PAYLOAD_LENGTH) return false;
    if (!LIBERLAND_V1_SENTINEL.every((byte, index) => bytes[index] === byte)) return false;
    if (
      bytes[35] !== LIBERLAND_V1_SENDER_VARIANT ||
      bytes[68] !== LIBERLAND_V1_RECIPIENT_VARIANT ||
      bytes[101] !== LIBERLAND_V1_BALANCE_VARIANT
    ) {
      return false;
    }

    const assetId = hexToU8a(candidate.assetAddress);
    const sender = decodeAddress(candidate.sender, false);
    const recipient = decodeAddress(candidate.recipient, false);

    if (!(assetId.length === 32 && sender.length === 32 && recipient.length === 32)) return false;
    if (!bytesEqual(bytes.slice(3, 35), assetId)) return false;
    if (!bytesEqual(bytes.slice(36, 68), sender)) return false;
    if (!bytesEqual(bytes.slice(69, 101), recipient)) return false;

    const amountCodec = decodeLittleEndianU128(bytes.slice(102, 118)).toString();
    const candidateAmount = new FPNumber(candidate.amount, externalDecimals);
    const expectedCodec = candidateAmount.toCodecString();
    const roundTripAmount = FPNumber.fromCodecValue(expectedCodec, externalDecimals);

    return (
      candidateAmount.isFinity() &&
      roundTripAmount.isFinity() &&
      FPNumber.gt(candidateAmount, FPNumber.ZERO) &&
      expectedCodec === amountCodec &&
      roundTripAmount.toString() === candidate.amount
    );
  } catch {
    return false;
  }
};

/** Requires one and only one known v1 settlement message to match the candidate. */
export const hasExactlyOneMatchingLiberlandMessage = (
  data: Record<string, unknown>,
  candidate: SorametricsLiberlandBridgeCandidate,
  asset: RegisteredAccountAsset
): boolean => {
  const commitment = data.commitment;
  if (!isRecord(commitment) || !isRecord(commitment.sub) || !Array.isArray(commitment.sub.messages)) return false;

  const messages = commitment.sub.messages;
  if (!messages.length || messages.length > 100) return false;

  let matches = 0;

  for (const message of messages) {
    if (!isRecord(message) || typeof message.payload !== 'string') return false;
    if (matchesLiberlandV1Message(message.payload, candidate, asset)) matches += 1;
    if (matches > 1) return false;
  }

  return matches === 1;
};

/**
 * Keeps authoritative local outcomes terminal while allowing an ordinary local
 * Failed tracking state to be repaired by completed remote history.
 */
const hasCompletedState = (item: Nullable<SubHistory>) => {
  if (!item) return false;
  const recoveryStatus = (item.payload as SubBridgeRecoveryPayload | undefined)?.bridgeRecoveryStatus;

  // A fully parsed indexer/runtime row may enrich and replace the conservative
  // account-indexed settlement placeholder.
  if (item.transactionState === BridgeTxStatus.Done) return !isDisplayOnlyRecoveredSubBridgeHistory(item);

  return recoveryStatus ? isSubBridgeTerminalFailureStatus(recoveryStatus) : false;
};

const isDisplayOnlyHistoryItem = (item: Nullable<SubHistory>): boolean => isDisplayOnlyRecoveredSubBridgeHistory(item);

const SubBridgeOperations = [Operation.SubstrateOutgoing, Operation.SubstrateIncoming];

const normalizeSyncTimestamp = (timestamp: unknown, fallback = 0): number => {
  const value = Number(timestamp);

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getLatestHistoryTimestamp = (historyElements: HistoryElement[], fallback: number): number => {
  for (const historyElement of historyElements) {
    const timestamp = normalizeSyncTimestamp(historyElement?.timestamp);

    if (timestamp) return timestamp;
  }

  return fallback;
};

const notifyUpdate = async (updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> => {
  try {
    await updateCallback?.();
  } catch {
    // UI refresh callbacks must not break history restoration.
  }
};

const getType = (isOutgoing: boolean) => {
  return isOutgoing ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
};

const isSameHistoryItem = (localItem: SubHistory, indexerItem: SubHistory): boolean => {
  if (localItem.id && localItem.id === indexerItem.id) return true;
  if (localItem.txId && localItem.txId === indexerItem.txId) return true;
  if (localItem.hash && localItem.hash === indexerItem.hash) return true;

  return false;
};

const normalizeTransactionState = (item: SubHistory): BridgeTxStatus => {
  if (item.transactionState) return item.transactionState as BridgeTxStatus;

  return item.status === TransactionStatus.Error ? BridgeTxStatus.Failed : BridgeTxStatus.Done;
};

const matchesNetwork = (item: SubHistory, network: SubNetwork): boolean => item.externalNetwork === network;

const hasVisibleAsset = (assets: string[], item: SubHistory): boolean => {
  if (!assets.length) return true;

  return Boolean(item.assetAddress && assets.includes(item.assetAddress));
};

const getBlockHeights = (isOutgoing: boolean, tx: BridgeTransactionData) => {
  return isOutgoing ? [tx.startBlock, tx.endBlock] : [tx.endBlock, tx.startBlock];
};

const getTxEvents = (blockEvents: any[], txIndex: number) => {
  return blockEvents.filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === txIndex);
};

const findTxInBlock = async (blockHash: string, soraHash: string) => {
  const blockEvents = await api.system.getBlockEvents(blockHash);

  const event = blockEvents.find((e) => isBridgeProxyHash(e, soraHash));

  if (!event) throw new Error('Unable to find "bridgeProxy.RequestStatusUpdate" event');

  const txIndex = event.phase.asApplyExtrinsic.toNumber();
  const txEvents = getTxEvents(blockEvents, txIndex);
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockHash);
  const tx = extrinsics[txIndex];

  return { tx, txEvents, blockEvents };
};

export class SubBridgeHistory extends SubNetworksConnector {
  get soraApi(): ApiPromise {
    return subBridgeApi.api;
  }

  get soraParachainApi(): ApiPromise | undefined {
    return this.soraParachain?.api;
  }

  get relaychainApi(): ApiPromise | undefined {
    return this.relaychain?.api;
  }

  get externalApi(): ApiPromise {
    return this.network.api;
  }

  private getHistorySyncTimestamp(network: SubNetwork): number {
    return normalizeSyncTimestamp(subBridgeApi.accountStorage?.get(`subBridgeHistorySyncTimestamp:${network}`));
  }

  private setHistorySyncTimestamp(network: SubNetwork, timestamp: number): void {
    subBridgeApi.accountStorage?.set(`subBridgeHistorySyncTimestamp:${network}`, normalizeSyncTimestamp(timestamp));
  }

  /**
   * Reads SORA-side Sub bridge history from the Polkaswap indexer so completed
   * requests remain restorable after bridgeProxy storage no longer lists them.
   */
  public async fetchHistoryElements(address: string, timestamp = 0): Promise<HistoryElement[]> {
    const indexer = getCurrentIndexer();
    const filter = indexer.historyElementsFilter({
      address,
      operations: SubBridgeOperations,
      timestamp: normalizeSyncTimestamp(timestamp),
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

      const edges = Array.isArray(response.edges) ? response.edges : [];
      const nextAfter = response.pageInfo?.endCursor ?? '';
      const historyNodes = edges.map((edge) => edge?.node).filter((node): node is HistoryElement => Boolean(node));

      hasNext = !!response.pageInfo?.hasNextPage && !!nextAfter && nextAfter !== after;
      history.push(...historyNodes);
      after = nextAfter;
    } while (hasNext);

    return history;
  }

  public async clearHistory(
    network: SubNetwork,
    _inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs,
    isCurrent: IsCurrentBridgeHistoryRequest = currentBridgeHistoryRequest
  ): Promise<void> {
    // "Restore history" must be lossless: RPC/indexer failures must not erase
    // valid local bridge records before an authoritative replacement exists.
    if (!isCurrent()) return;
    this.setHistorySyncTimestamp(network, 0);
    await notifyUpdate(updateCallback);
  }

  public async updateAccountHistory(
    network: SubNetwork,
    address: string,
    assets: string[],
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs,
    sorametricsApiEndpoint = '',
    isCurrent: IsCurrentBridgeHistoryRequest = currentBridgeHistoryRequest,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      if (!isCurrent()) return;

      try {
        await this.updateAccountHistoryFromIndexer(
          network,
          address,
          assets,
          inProgressIds,
          assetDataByAddress,
          updateCallback,
          isCurrent
        );
      } catch (error) {
        // The SORA runtime is authoritative for live bridge requests. An
        // indexer outage must not prevent those transactions from restoring.
        console.info('[SubBridgeHistory] Indexer history restore failed', error);
      }

      if (!isCurrent()) return;

      let transactions: BridgeTransactionData[] = [];

      try {
        transactions = await subBridgeApi.getUserTransactions(address, network);
      } catch (error) {
        // Completed Liberland transfers can still be recovered from the two
        // bounded public indexes when bridgeProxy storage is unavailable.
        console.info('[SubBridgeHistory] Runtime history restore failed', error);
      }

      if (!isCurrent()) return;

      const currentHistory = subBridgeApi.historyList as SubHistory[];

      for (const tx of transactions) {
        const { soraHash: id, soraAssetAddress } = tx;

        // An empty registry means asset discovery is still loading (or its RPC
        // failed), not that every on-chain bridge transaction is hidden.
        if (assets.length && !assets.includes(soraAssetAddress)) continue;

        const localHistoryItem = currentHistory.find((item) => item.hash === id);

        // don't restore transaction what is in process in app
        if ((localHistoryItem?.id as string) in inProgressIds) continue;
        if (hasCompletedState(localHistoryItem)) continue;

        await this.start();

        const historyItemData = await this.txDataToHistory(tx, assetDataByAddress);

        if (!historyItemData) continue;
        if (!isCurrent()) return;

        const displayOnlyHistoryItem = currentHistory.find(
          (item) =>
            matchesNetwork(item, network) && isDisplayOnlyHistoryItem(item) && isSameHistoryItem(item, historyItemData)
        );
        const historyItemToUpdate = localHistoryItem ?? displayOnlyHistoryItem;

        // update or create local history item
        if (historyItemToUpdate) {
          const nextHistoryItem = { ...historyItemToUpdate, ...historyItemData } as SubHistory;

          subBridgeApi.saveHistory(nextHistoryItem);

          if (displayOnlyHistoryItem?.id && displayOnlyHistoryItem.id !== nextHistoryItem.id) {
            if (!isCurrent()) return;
            subBridgeApi.removeHistory(displayOnlyHistoryItem.id);
          }
        } else {
          subBridgeApi.generateHistoryItem(historyItemData);
        }

        await notifyUpdate(updateCallback);
      }

      if (!isCurrent()) return;

      if (network === SubNetworkId.Liberland && sorametricsApiEndpoint && address) {
        try {
          await this.updateLiberlandHistoryFromSorametrics(
            address,
            assets,
            inProgressIds,
            assetDataByAddress,
            sorametricsApiEndpoint,
            updateCallback,
            isCurrent,
            signal
          );
        } catch (error) {
          // This fallback is additive. Discovery or hydration failures must
          // never remove local or runtime-restored bridge history.
          console.info('[SubBridgeHistory] Sorametrics history restore failed', error);
        }
      }
    } finally {
      this.stop();
    }
  }

  private async updateAccountHistoryFromIndexer(
    network: SubNetwork,
    address: string,
    assets: string[],
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs,
    isCurrent: IsCurrentBridgeHistoryRequest = currentBridgeHistoryRequest
  ): Promise<void> {
    if (!address || !isCurrent()) return;

    // Always ask for the full account range. Historical bridge rows can be
    // backfilled after a wallet has already synced, so timestamp cursors would
    // permanently hide older Liberland transactions.
    const historyElements = await this.fetchHistoryElements(address, 0);
    if (!historyElements.length || !isCurrent()) return;

    const currentHistory = [...(subBridgeApi.historyList as SubHistory[])];
    const historySyncTimestampUpdated = getLatestHistoryTimestamp(
      historyElements,
      this.getHistorySyncTimestamp(network)
    );

    for (const historyElement of historyElements) {
      let historyItem: Nullable<SubHistory>;

      try {
        historyItem = (await getCurrentIndexer().services.dataParser.parseTransactionAsHistoryItem(
          historyElement
        )) as Nullable<SubHistory>;
      } catch {
        continue;
      }

      if (!isCurrent()) return;

      if (!historyItem?.id) continue;
      if (![Operation.SubstrateIncoming, Operation.SubstrateOutgoing].includes(historyItem.type)) continue;
      if (!matchesNetwork(historyItem, network)) continue;
      if (!hasVisibleAsset(assets, historyItem)) continue;

      const localHistoryItem = currentHistory.find(
        (item) => matchesNetwork(item, network) && isSameHistoryItem(item, historyItem)
      );

      if ((localHistoryItem?.id as string) in inProgressIds) continue;
      if (hasCompletedState(localHistoryItem)) continue;

      const asset = assetDataByAddress(historyItem.assetAddress);
      const nextHistoryItem: SubHistory = {
        ...localHistoryItem,
        ...historyItem,
        externalNetwork: network,
        externalNetworkType: BridgeNetworkType.Sub,
        transactionState: normalizeTransactionState(historyItem),
        payload: historyItem.payload ?? {},
        ...(asset?.symbol && !historyItem.symbol ? { symbol: asset.symbol } : {}),
      };

      if (!isCurrent()) return;
      subBridgeApi.saveHistory(nextHistoryItem);
      currentHistory.push(nextHistoryItem);
      await notifyUpdate(updateCallback);
    }

    if (!isCurrent()) return;
    this.setHistorySyncTimestamp(network, historySyncTimestampUpdated);
  }

  /**
   * Hydrates Sorametrics discovery candidates by exact settlement extrinsic ID.
   * No address or operation filter is added because inbound settlement calls are
   * signed by the bridge relayer rather than by the recipient account.
   */
  private async fetchLiberlandSettlementHistoryElements(
    candidates: SorametricsLiberlandBridgeCandidate[],
    isCurrent: IsCurrentBridgeHistoryRequest
  ): Promise<Map<string, LiberlandSettlementHistoryElement>> {
    const candidateHashes = candidates.map(({ hash }) => normalizeSubstrateHash(hash)).filter(Boolean);
    const hydrated = new Map<string, LiberlandSettlementHistoryElement>();
    const ambiguous = new Set<string>();
    const indexer = getCurrentIndexer();

    for (let offset = 0; offset < candidateHashes.length; offset += LIBERLAND_SETTLEMENT_HYDRATION_CHUNK_SIZE) {
      if (!isCurrent()) return new Map();

      const ids = candidateHashes.slice(offset, offset + LIBERLAND_SETTLEMENT_HYDRATION_CHUNK_SIZE);
      const chunkHashes = new Set(ids);
      const filter = indexer.historyElementsFilter({ ids });
      const response: unknown = await indexer.services.explorer.account.getHistoryPaged({
        filter,
        first: ids.length,
      });

      if (!isCurrent()) return new Map();
      if (!isRecord(response) || !Array.isArray(response.edges)) {
        throw new Error('Malformed Polkaswap settlement history response.');
      }
      if (response.edges.length > ids.length) {
        throw new Error('Polkaswap settlement history response exceeded its exact-ID bound.');
      }
      if (isRecord(response.pageInfo) && response.pageInfo.hasNextPage === true) {
        throw new Error('Polkaswap settlement history response was unexpectedly paginated.');
      }
      if (
        response.totalCount !== undefined &&
        (!Number.isSafeInteger(response.totalCount) || response.totalCount !== response.edges.length)
      ) {
        throw new Error('Polkaswap settlement history response has inconsistent totals.');
      }

      for (const edge of response.edges) {
        if (!isRecord(edge) || !isRecord(edge.node)) {
          throw new Error('Malformed Polkaswap settlement history row.');
        }

        const historyElement = edge.node as LiberlandSettlementHistoryElement;
        const hash = normalizeSubstrateHash(historyElement.id);

        if (!hash || !chunkHashes.has(hash)) {
          throw new Error('Polkaswap settlement history returned an unexpected transaction ID.');
        }
        if (hydrated.has(hash)) {
          ambiguous.add(hash);
          continue;
        }

        hydrated.set(hash, historyElement);
      }
    }

    ambiguous.forEach((hash) => hydrated.delete(hash));

    return hydrated;
  }

  /** Accepts only the successful Liberland inbound settlement call for a discovery candidate. */
  private isVerifiedLiberlandSettlement(
    historyElement: LiberlandSettlementHistoryElement,
    candidate: SorametricsLiberlandBridgeCandidate,
    asset: RegisteredAccountAsset
  ): boolean {
    const hash = normalizeSubstrateHash(historyElement.id);
    const blockId = normalizeSubstrateHash(historyElement.blockHash);
    const blockHeight = normalizePositiveInteger(historyElement.blockHeight);
    const timestamp = normalizePositiveInteger(historyElement.timestamp);
    const execution = historyElement.execution;
    const timestampMs = timestamp ? timestamp * 1_000 : 0;

    return Boolean(
      hash &&
      hash === normalizeSubstrateHash(candidate.hash) &&
      blockId &&
      blockHeight === candidate.block &&
      timestamp &&
      Number.isSafeInteger(timestampMs) &&
      Math.abs(candidate.timestamp - timestampMs) <= LIBERLAND_SETTLEMENT_TIMESTAMP_TOLERANCE_MS &&
      historyElement.module === 'substrateBridgeInboundChannel' &&
      historyElement.method === 'submit' &&
      isRecord(execution) &&
      execution.success === true &&
      (execution.error === undefined || execution.error === null) &&
      isRecord(historyElement.data) &&
      historyElement.data.networkId === SubNetworkId.Liberland &&
      hasExactlyOneMatchingLiberlandMessage(historyElement.data, candidate, asset)
    );
  }

  /**
   * Restores display-only completed Liberland deposits discovered by the
   * account-scoped Sorametrics endpoint and proven by an exact indexer row.
   */
  private async updateLiberlandHistoryFromSorametrics(
    address: string,
    assets: string[],
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    sorametricsApiEndpoint: string,
    updateCallback: FnWithoutArgs | AsyncFnWithoutArgs | undefined,
    isCurrent: IsCurrentBridgeHistoryRequest,
    signal?: AbortSignal
  ): Promise<void> {
    if (!isCurrent()) return;

    const discovered = await fetchSorametricsLiberlandBridgeHistory(sorametricsApiEndpoint, address, { signal });

    if (!discovered.length || !isCurrent()) return;

    // Defend again at the merge boundary: exact duplicates are harmless, but a
    // conflicting duplicate hash is ambiguous and must never be displayed.
    const candidates = new Map<string, SorametricsLiberlandBridgeCandidate>();
    const ambiguous = new Set<string>();

    for (const candidate of discovered) {
      const hash = normalizeSubstrateHash(candidate.hash);

      if (!hash || !areBridgeExternalAccountsEqual(candidate.recipient, address)) continue;

      const existing = candidates.get(hash);
      if (!existing) {
        candidates.set(hash, candidate);
        continue;
      }

      const isExactDuplicate =
        existing.block === candidate.block &&
        existing.timestamp === candidate.timestamp &&
        existing.recipient === candidate.recipient &&
        existing.sender === candidate.sender &&
        existing.assetAddress === candidate.assetAddress &&
        existing.amount === candidate.amount;

      if (!isExactDuplicate) ambiguous.add(hash);
    }

    ambiguous.forEach((hash) => candidates.delete(hash));
    if (!candidates.size || !isCurrent()) return;

    const hydrated = await this.fetchLiberlandSettlementHistoryElements([...candidates.values()], isCurrent);

    if (!isCurrent()) return;

    const currentHistory = [...(subBridgeApi.historyList as SubHistory[])];

    for (const [hash, candidate] of candidates) {
      const historyElement = hydrated.get(hash);

      if (!historyElement) continue;

      const amount = normalizePositiveAmount(candidate.amount);
      const visibleAssetAddress = assets.find(
        (assetAddress) => assetAddress.toLowerCase() === candidate.assetAddress.toLowerCase()
      );

      // Unlike runtime restoration, this display-only fallback requires a
      // fully registered and currently visible asset before persisting a row.
      if (!amount || !visibleAssetAddress) continue;

      const asset = assetDataByAddress(visibleAssetAddress);

      if (!asset || asset.address.toLowerCase() !== candidate.assetAddress.toLowerCase()) continue;
      if (!this.isVerifiedLiberlandSettlement(historyElement, candidate, asset)) continue;
      if (!isAccountId32(candidate.sender)) continue;

      let formattedSender: string;

      try {
        formattedSender = this.network.formatAddress(candidate.sender);
      } catch {
        continue;
      }

      const localHistoryItem = currentHistory.find((item) => {
        if (!matchesNetwork(item, SubNetworkId.Liberland)) return false;

        return [item.id, item.txId, item.hash].some((value) => normalizeSubstrateHash(value) === hash);
      });
      const localId = typeof localHistoryItem?.id === 'string' ? localHistoryItem.id : '';

      if ((localId && localId in inProgressIds) || hash in inProgressIds) continue;
      if (hasCompletedState(localHistoryItem)) continue;

      const timestamp = normalizePositiveInteger(historyElement.timestamp);
      const blockHeight = normalizePositiveInteger(historyElement.blockHeight);
      const blockId = normalizeSubstrateHash(historyElement.blockHash);

      const timestampMs = timestamp ? timestamp * 1_000 : 0;

      if (!(timestamp && Number.isSafeInteger(timestampMs) && blockHeight && blockId)) continue;

      const nextHistoryItem: SubHistory = {
        ...localHistoryItem,
        id: hash,
        txId: hash,
        hash: undefined,
        externalHash: undefined,
        blockId,
        blockHeight,
        externalBlockId: undefined,
        externalBlockHeight: undefined,
        externalEventIndex: undefined,
        parachainBlockId: undefined,
        parachainBlockHeight: undefined,
        parachainHash: undefined,
        parachainEventIndex: undefined,
        relaychainBlockId: undefined,
        relaychainBlockHeight: undefined,
        relaychainHash: undefined,
        relaychainEventIndex: undefined,
        type: Operation.SubstrateIncoming,
        status: TransactionStatus.Finalized,
        transactionState: BridgeTxStatus.Done,
        externalNetwork: SubNetworkId.Liberland,
        externalNetworkType: BridgeNetworkType.Sub,
        assetAddress: asset.address,
        symbol: asset.symbol,
        amount,
        amount2: amount,
        from: address,
        to: formattedSender,
        startTime: timestampMs,
        endTime: timestampMs,
        soraNetworkFee: normalizeNonNegativeCodecAmount(historyElement.networkFee) ?? ZeroStringValue,
        externalNetworkFee: ZeroStringValue,
        externalTransferFee: ZeroStringValue,
        errorMessage: undefined,
        payload: {
          subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
        },
      };

      // Account/network switches invalidate the result before it can touch
      // shared account storage, not merely before the Pinia refresh callback.
      if (!isCurrent()) return;

      subBridgeApi.saveHistory(nextHistoryItem);

      if (localId && localId !== hash) {
        if (!isCurrent()) return;
        subBridgeApi.removeHistory(localId);
      }

      currentHistory.push(nextHistoryItem);
      await notifyUpdate(updateCallback);
    }
  }

  private async txDataToHistory(
    tx: BridgeTransactionData,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>
  ): Promise<Nullable<SubHistory>> {
    const id = tx.soraHash;
    try {
      const isOutgoing = tx.direction === BridgeTxDirection.Outgoing;
      const [blockHeight, externalBlockHeight] = getBlockHeights(isOutgoing, tx);

      if (!externalBlockHeight) {
        console.info(`[${id}] External network block number is: ${externalBlockHeight}, skip;`);
        return null;
      }

      const asset = assetDataByAddress(tx.soraAssetAddress);

      if (!asset) {
        console.info(`[${this.constructor.name}] Asset is not exists: "${tx.soraAssetAddress}, skip;"`);
        return null;
      }

      const amount = FPNumber.fromCodecValue(tx.amount, asset.decimals).toString();
      const type = getType(isOutgoing);

      const history: SubHistory = {
        id,
        blockHeight,
        type,
        hash: id,
        transactionState: tx.status,
        externalBlockHeight,
        externalNetwork: this.network.subNetwork,
        externalNetworkType: BridgeNetworkType.Sub,
        amount,
        assetAddress: asset.address,
        symbol: asset.symbol,
        from: tx.soraAccount,
        to: tx.externalAccount,
        soraNetworkFee: ZeroStringValue, // overrides in Outgoing
        externalNetworkFee: ZeroStringValue, // overrides in Incoming
        payload: {},
      };

      const networkApi = this.getIntermediateApi(history);

      const [blockId, externalBlockId] = await Promise.all([
        api.system.getBlockHash(blockHeight, this.soraApi),
        api.system.getBlockHash(externalBlockHeight, networkApi),
      ]);

      history.blockId = blockId;
      history.externalBlockId = externalBlockId;

      const [{ tx: soraTx, txEvents: soraTxEvents, blockEvents: soraBlockEvents }, startTime] = await Promise.all([
        findTxInBlock(blockId, id),
        api.system.getBlockTimestamp(blockId, this.soraApi),
      ]);

      history.txId = soraTx.hash.toString();
      history.startTime = history.endTime = startTime;

      if (isOutgoing) {
        return await this.processOutgoingTx({
          history,
          asset,
          events: soraTxEvents,
        });
      } else {
        return await this.processIncomingTx({
          history,
          txEvents: soraTxEvents,
          blockEvents: soraBlockEvents,
        });
      }
    } catch (error) {
      console.info(`[${id}]`, error);
      return null;
    }
  }

  private getIntermediateApi(history: SubHistory): ApiPromise {
    if (!history.externalNetwork) throw new Error(`[${history.txId}] externalNetwork is not defined`);

    if (subBridgeApi.isStandalone(history.externalNetwork)) return this.externalApi;

    if (!this.soraParachainApi) throw new Error(`[${history.txId}] SORA Parachain Api is not exists`);

    return this.soraParachainApi;
  }

  private async processOutgoingTx({
    history,
    asset,
    events,
  }: {
    history: SubHistory;
    asset: RegisteredAccountAsset;
    events: any[];
  }): Promise<Nullable<SubHistory>> {
    // update SORA network fee
    const soraFeeEvent = events.find((e) => isTransactionFeePaid(e));
    history.soraNetworkFee = soraFeeEvent.event.data[1].toString();
    // sended from SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageAcceptedNonces(events);
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    const networkEventsReversed = [...networkEvents].reverse();
    // Network received nonces
    const messageDispatchedIndex = networkEventsReversed.findIndex((e) =>
      isMessageDispatchedNonces(soraBatchNonce, soraMessageNonce, e)
    );

    if (messageDispatchedIndex === -1) {
      throw new Error(`[${history.id}] Message sent from SORA to network is not found in block "${networkBlockId}"`);
    }

    const externalNetwork = history.externalNetwork as SubNetwork;

    if (externalNetwork === SubNetworkId.Liberland) {
      return await this.processOutgoingToLiberland(history);
    }

    const { soraParachainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // SORA Parachain extrinsic events for next search
    const parachainExtrinsicEvents = networkEventsReversed.slice(messageDispatchedIndex);
    // sended from SORA Parachain message hash (1)
    const messageHash = getParachainSystemMessageHash(parachainExtrinsicEvents);

    if (!messageHash) {
      return await this.processOutgoingToSoraParachain(history, asset, parachainExtrinsicEvents);
    }

    const isRelaychain = subBridgeApi.isRelayChain(externalNetwork);
    const isParachain = subBridgeApi.isParachain(externalNetwork);

    if (!isRelaychain && !isParachain) {
      console.info(`[${history.id}] not "${externalNetwork}" transaction, skip;`);
      return null;
    }

    this.updateSoraParachainBlockData(history);

    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      soraParachainApi
    );

    let startSearch!: number;
    let endSearch!: number;

    if (isRelaychain) {
      // Relaychain should have received message in this blocks range
      [startSearch, endSearch] = [relayChainBlockNumber + 2, relayChainBlockNumber + 4];
    } else {
      // Parachain block, found through relaychain validation data (start block for search)
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber, true);
      const parachainBlockNumber = await api.system.getBlockNumber(parachainBlockId, this.externalApi);
      // Parachain should have receive message in this blocks range
      [startSearch, endSearch] = [parachainBlockNumber, parachainBlockNumber + 6];
    }

    return await this.processOutgoingTxOnDestination(history, asset, messageHash, startSearch, endSearch);
  }

  private async processOutgoingToLiberland(history: SubHistory): Promise<SubHistory> {
    history.amount2 = history.amount;
    history.externalTransferFee = ZeroStringValue;
    history.to = this.network.formatAddress(history.to as string);

    return history;
  }

  private async processOutgoingToSoraParachain(
    history: SubHistory,
    asset: RegisteredAccountAsset,
    extrinsicEvents: any[]
  ) {
    const { soraParachain, soraParachainApi } = this;

    if (!(soraParachain && soraParachainApi)) throw new Error('SORA Parachain Api is not exists');

    try {
      const [receivedAmount, externalEventIndex] = getDepositedBalance(
        extrinsicEvents,
        history.to as string,
        soraParachain
      );
      // balances.Deposit event index
      history.externalEventIndex = externalEventIndex;

      const { amount, transferFee } = getReceivedAmount(
        history.amount as string,
        receivedAmount,
        asset?.externalDecimals
      );

      history.amount2 = amount;
      history.externalTransferFee = transferFee;
    } catch {
      // refunded
      history.transactionState = BridgeTxStatus.Failed;
    }

    history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
    history.to = soraParachain.formatAddress(history.to as string);

    return history;
  }

  private async processIncomingTx({
    history,
    txEvents,
    blockEvents,
  }: {
    history: SubHistory;
    txEvents: any[];
    blockEvents: any[];
  }): Promise<Nullable<SubHistory>> {
    // Token is minted to account event
    const [_, eventIndex] = getDepositedBalance(blockEvents, history.from as string, subBridgeApi);
    history.payload.eventIndex = eventIndex;

    // find SORA hash event index
    const requestStatusUpdateEventIndex = txEvents.findIndex((e) => isBridgeProxyHash(e, history.id as string));
    // Received on SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageDispatchedNonces(
      txEvents.slice(requestStatusUpdateEventIndex)
    );
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    // Network message sended to SORA
    const messageToSoraEvent = networkEvents.find((e) => {
      if (!isMessageAccepted(e)) return false;

      const [networkBatchNonce, networkMessageNonce] = getMessageAcceptedNonces([e]);

      return networkBatchNonce === soraBatchNonce && networkMessageNonce === soraMessageNonce;
    });

    if (!messageToSoraEvent) {
      throw new Error(
        `[${history.id}] Message sended to SORA from external network not found. Block "${networkBlockId}"`
      );
    }

    const networkExtrinsicIndex = messageToSoraEvent.phase.asApplyExtrinsic.toNumber();
    const networkExtrinsicEvents = getTxEvents(networkEvents, networkExtrinsicIndex);

    // is tx signed on SORA Parachain or Standalone network
    const feeEvent = networkExtrinsicEvents.find((e) => isTransactionFeePaid(e));

    if (feeEvent) {
      const signer = feeEvent.event.data[0].toString(); // signer is spent balance for fee

      if (!subBridgeApi.isStandalone(history.externalNetwork as SubNetwork)) {
        history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
      }

      history.externalNetworkFee = feeEvent.event.data[1].toString();
      history.to = this.network.formatAddress(signer);

      return history;
    }

    const { soraParachainApi } = this;
    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // If transfer received from Parachain, extrinsic events should have xcmpQueue.Success event
    const messageEvent = networkExtrinsicEvents.find((e) => isQueueMessage(e));
    const externalNetwork = history.externalNetwork as SubNetwork;
    const isRelayChain = subBridgeApi.isRelayChain(externalNetwork) && !messageEvent;
    const isParachain =
      subBridgeApi.isParachain(externalNetwork) && !subBridgeApi.isSoraParachain(externalNetwork) && messageEvent;

    if (!isRelayChain && !isParachain) {
      console.info(`[${history.id}] not "${externalNetwork}" transaction, skip;`);
      return null;
    }

    this.updateSoraParachainBlockData(history);

    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      soraParachainApi
    );

    if (isParachain) {
      const messageHash = messageEvent.event.data[0].toString();
      // Parachain block, found through relaychain validation data
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber, false);

      return await this.processIncomingFromParachain(history, parachainBlockId, messageHash);
    } else {
      return await this.processIncomingFromRelaychain(history, relayChainBlockNumber);
    }
  }

  private async processIncomingFromRelaychain(history: SubHistory, relayChainBlockNumber: number): Promise<SubHistory> {
    const { soraParachain, soraParachainApi } = this;

    if (!(soraParachain && soraParachainApi)) throw new Error('SORA Parachain Api is not exists');

    const soraParachainId = soraParachain.getParachainId();

    // relay chain should have send message in this blocks range
    const startSearch = relayChainBlockNumber;
    const endSearch = startSearch - 10;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight >= endSearch; relaychainBlockHeight--) {
      const blockId = await api.system.getBlockHash(relaychainBlockHeight, this.externalApi);
      const extrinsics = await api.system.getExtrinsicsFromBlock(blockId, this.externalApi);

      for (const [extrinsicIndex, extrinsic] of extrinsics.entries()) {
        try {
          if (
            !(
              extrinsic.method.section === 'xcmPallet' &&
              ['reserveTransferAssets', 'limitedReserveTransferAssets'].includes(extrinsic.method.method)
            )
          )
            continue;

          const [dest, beneficiary] = extrinsic.args;
          const parachainId = (dest as any).asV3.interior.asX1.asParachain.toNumber();
          const accountId = (beneficiary as any).asV3.interior.asX1.asAccountId32.id.toString();
          const receiver = subBridgeApi.formatAddress(accountId);
          const from = subBridgeApi.formatAddress(history.from as string);

          if (!(parachainId === soraParachainId && receiver === from)) {
            continue;
          }

          const signer = extrinsic.signer.toString();
          const extrinsicEvents = await getBlockEventsByTxIndex(blockId, extrinsicIndex, this.externalApi);
          const feeEvent = extrinsicEvents.find((e) => isTransactionFeePaid(e));

          history.externalNetworkFee = feeEvent.event.data[1].toString();
          history.externalBlockId = blockId;
          history.externalBlockHeight = relaychainBlockHeight;
          history.externalHash = extrinsic.hash.toString();
          history.to = this.network.formatAddress(signer);

          return history;
        } catch {
          continue;
        }
      }
    }

    console.info(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );

    return history;
  }

  private async findParachainBlockIdOnRelaychain(
    history: SubHistory,
    relayChainBlockNumber: number,
    isOutgoing: boolean
  ) {
    const { network, soraParachainApi, relaychainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');
    if (!relaychainApi) throw new Error('Relaychain Api is not exists');

    // relay chain should have send validation data in this blocks range
    const startSearch = relayChainBlockNumber;
    const blocksRange = 10;
    const endSearch = isOutgoing ? startSearch + blocksRange : startSearch - blocksRange;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight !== endSearch; ) {
      const blockId = await api.system.getBlockHash(relaychainBlockHeight, relaychainApi);
      const events = await api.system.getBlockEvents(blockId, relaychainApi);

      for (const e of events) {
        if (!isParaInclusion(e)) continue;

        const { descriptor } = e.event.data[0];

        const descriptorParaId = descriptor.paraId.toNumber();
        const paraId = network.getParachainId();

        if (descriptorParaId !== paraId) continue;

        history.relaychainBlockHeight = relaychainBlockHeight;
        history.relaychainBlockId = blockId;

        // parachain block hash
        return descriptor.paraHead.toString();
      }

      relaychainBlockHeight = isOutgoing ? relaychainBlockHeight + 1 : relaychainBlockHeight - 1;
    }

    throw new Error(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );
  }

  private async processIncomingFromParachain(history: SubHistory, parachainBlockId: string, messageHash: string) {
    const { externalApi } = this;

    const [parachainBlockEvents, parachainBlockExtrinsics] = await Promise.all([
      api.system.getBlockEvents(parachainBlockId, externalApi),
      api.system.getExtrinsicsFromBlock(parachainBlockId, externalApi),
    ]);

    for (const [extrinsicIndex, extrinsic] of parachainBlockExtrinsics.entries()) {
      if (!(extrinsic.method.section === 'xTokens' || extrinsic.method.section === 'polkadotXcm')) continue;

      try {
        const extrinsicEvents = parachainBlockEvents.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
        );

        const messageSentHash = getParachainSystemMessageHash(extrinsicEvents);

        if (messageSentHash !== messageHash) continue;

        const parachainBlockHeight = await api.system.getBlockNumber(parachainBlockId, externalApi);
        const signer = extrinsic.signer.toString();
        const feeEvent = extrinsicEvents.find((e) => isTransactionFeePaid(e));

        history.externalNetworkFee = feeEvent.event.data[1].toString();
        history.externalBlockId = parachainBlockId;
        history.externalBlockHeight = parachainBlockHeight;
        history.externalHash = extrinsic.hash.toString();
        history.to = this.network.formatAddress(signer);

        return history;
      } catch (error) {
        continue;
      }
    }

    return history;
  }

  private async processOutgoingTxOnDestination(
    history: SubHistory,
    asset: RegisteredAccountAsset,
    messageHash: string,
    startSearch: number,
    endSearch: number
  ) {
    for (let blockHeight = startSearch; blockHeight <= endSearch; blockHeight++) {
      let isReliableMessage = false;

      try {
        const blockId = await api.system.getBlockHash(blockHeight, this.externalApi);
        const blockEvents = await api.system.getBlockEvents(blockId, this.externalApi);

        const messageEventIndex = blockEvents.findIndex((e) => {
          if (isQueueMessage(e)) {
            isReliableMessage = e.event.data[0].toString() === messageHash;

            return true;
          }
          return false;
        });

        if (messageEventIndex === -1) continue;

        history.externalBlockId = blockId;
        history.externalBlockHeight = blockHeight;
        history.to = this.network.formatAddress(history.to as string);

        const [receivedAmount, externalEventIndex] = getDepositedBalance(
          blockEvents.slice(0, messageEventIndex),
          history.to,
          this.network
        );

        // Deposit event index
        history.externalEventIndex = externalEventIndex;

        const { amount, transferFee } = getReceivedAmount(
          history.amount as string,
          receivedAmount,
          asset?.externalDecimals
        );

        history.amount2 = amount;
        history.externalTransferFee = transferFee;

        return history;
      } catch {
        if (isReliableMessage) {
          break;
        } else {
          continue;
        }
      }
    }

    console.info(`[${history.id}] Transaction not found in blocks range [${startSearch}; ${endSearch}]`);

    history.transactionState = BridgeTxStatus.Failed;

    return history;
  }

  private updateSoraParachainBlockData(history: SubHistory): void {
    history.parachainBlockId = history.externalBlockId;
    history.parachainBlockHeight = history.externalBlockHeight;
    history.externalBlockId = undefined;
    history.externalBlockHeight = undefined;
  }
}

/**
 * Restore Sub bridge account transactions, using parachain & external network connections
 * @param context store context
 */
export const updateSubBridgeHistory =
  (context: BridgeActionContext) =>
  async (
    clearHistory = false,
    updateCallback?: VoidFunction,
    isCurrent: IsCurrentBridgeHistoryRequest = currentBridgeHistoryRequest,
    signal?: AbortSignal
  ): Promise<void> => {
    try {
      const { rootState, rootGetters } = context;
      const {
        wallet: {
          account: { address },
          settings: { sorametricsApiEndpoint = '' },
        },
        assets: { registeredAssets },
        web3: { networkSelected },
        bridge: { inProgressIds, subBridgeConnector },
      } = rootState;

      if (!networkSelected) return;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const subBridgeHistory = new SubBridgeHistory();
      const network = networkSelected as SubNetwork;
      const assets = Object.keys(registeredAssets);

      await subBridgeHistory.init(network, subBridgeConnector);

      if (clearHistory) {
        await subBridgeHistory.clearHistory(network, inProgressIds, updateCallback, isCurrent);
      }

      await subBridgeHistory.updateAccountHistory(
        network,
        address,
        assets,
        inProgressIds,
        assetDataByAddress,
        updateCallback,
        sorametricsApiEndpoint,
        isCurrent,
        signal
      );
    } catch (error) {
      console.error(error);
    }
  };
