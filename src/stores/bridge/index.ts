import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { getAssetBalance } from '@sora-substrate/sdk/build/assets';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeTxDirection, BridgeTxStatus, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { SubAssetKind, SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineStore } from 'pinia';
import { combineLatest } from 'rxjs';

import { MaxUint256, ZeroStringValue } from '@/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { beforeTransactionSign } from '@/lib/soraneo-wallet/src/util';
import { KnownEthBridgeAsset } from '@/consts/evm';
import { SUB_TRANSFER_FEES } from '@/consts/sub';
import { getDataPlaneClient, parseSubstrateHeaderNumber } from '@/services/realtime';
import { resolveNativeBridgeToken, resolveRegisteredAssets } from '@/stores/bridge/assets';
import {
  assertPositiveBridgeTransactionAmount,
  calculateBridgeReceivedAmount,
  calculateBridgeOutgoingMaxLimit,
  calculateBridgeSendAmount,
  isPositiveFiniteBridgeAmount,
} from '@/stores/bridge/amounts';
import {
  buildBridgeHistoryRecord,
  findBridgeHistoryTransaction,
  findBridgeHistoryTransactionEntry,
} from '@/stores/bridge/historyRecord';
import { useAssetsStore } from '@/stores/assets';
import { buildInitialBridgeState } from '@/stores/bridge/state';
import { resolveBridgeExternalNetworkType, resolveBridgeOperation } from '@/stores/bridge/network';
import {
  clearReconcileTimer,
  createBridgeSignDialogController,
  enqueueWorkerLifecycle,
  flushWorkerLifecycle,
  getBridgeRealtimeState,
  resolveBridgeSubscriptionEndpoint,
  resolveRealtimeProfile,
  scheduleReconcile,
  updateExternalBlockNumber,
  type BridgeRealtimeStoreLike,
} from '@/stores/bridge/realtime';
import {
  syncAmountReceivedCompat,
  syncAmountSendCompat,
  syncAssetAddressValueCompat,
  syncAssetLockedBalanceCompat,
  syncBalancesBatchCompat,
  syncBalancesFetchingCompat,
  syncBlockUpdatesSubscriptionCompat,
  syncDirectionCompat,
  syncExternalMinBalanceCompat,
  syncExternalNetworkFeeCompat,
  syncExternalTransferFeeCompat,
  syncFeesAndLockedFundsFetchingCompat,
  syncFocusedFieldCompat,
  syncHistoryIdCompat,
  syncHistoryLoadingCompat,
  syncHistoryPageCompat,
  syncInProgressCompat,
  syncIncomingMinLimitCompat,
  syncInternalHistoryCompat,
  syncNotificationCompat,
  syncOutgoingMaxLimitCompat,
  syncOutgoingMaxLimitSubscriptionCompat,
  syncOutgoingMinLimitCompat,
  syncSignDialogVisibilityCompat,
  syncSoraNetworkFeeCompat,
  syncWaitingForApproveCompat,
  type BridgeStateStoreLike,
} from '@/stores/bridge/stateMutations';
import { BridgeFocusedField, type BridgeFormPatch, type BridgeState } from '@/stores/bridge/types';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import type { Nullable } from '@/types/common';
import { BridgeTransactionSignDialogMode, type RecordEvmSubmission } from '@/utils/bridge/common/types';
import { isDenominatedAsset, isWaitingForAction, waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import ethBridge from '@/utils/bridge/eth';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import {
  getEthBridgeHistoryInstance as loadEthBridgeHistoryInstance,
  updateEthBridgeHistory,
} from '@/utils/bridge/eth/classes/history';
import {
  getEthNetworkFee,
  getIncomingEvmTransactionData,
  getOutgoingEvmTransactionData,
  waitForApprovedRequest,
} from '@/utils/bridge/eth/utils';
import evmBridge from '@/utils/bridge/evm';
import ethersUtil from '@/utils/ethers-util';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { updateEvmBridgeHistory } from '@/utils/bridge/evm/classes/history';
import subBridge from '@/utils/bridge/sub';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector, type SubNetworkConnectionState } from '@/utils/bridge/sub/classes/adapter';
import { updateSubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import { isDisplayOnlyRecoveredSubBridgeHistory } from '@/utils/bridge/sub/reconciliation';
import { withCrossTabEvmSubmissionLock } from '@/utils/bridge/eth/submissionLock';
import { getBuildVariant, trackEvent } from '@/utils/telemetry';
import { resolveRealtimeConnectionCap } from '@/utils/realtimeConnectionCap';
import {
  assertTonswapBridgeQuote,
  hasTonswapBridgeFundingTag,
  tonswapBridgeSigningIdentity,
  getTonswapBridgeFundingPurpose,
} from '@/features/misc/lib/tonswapBridgeLiquidity';

import type { IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { TransactionRequest, TransactionResponse } from 'ethers';
import type { Subscription } from 'rxjs';

type BridgeApiLike = {
  history: Record<string, IBridgeTransaction>;
  generateHistoryItem: (data: unknown) => Nullable<IBridgeTransaction>;
  removeHistory: (id: string) => void;
  getLockedAssets?: (...params: unknown[]) => Promise<CodecString>;
  getNetworkFee?: (...params: unknown[]) => Promise<CodecString>;
};

type BridgeRefreshScope =
  | 'balances'
  | 'externalMinBalance'
  | 'externalLockedBalance'
  | 'externalNetworkFee'
  | 'soraNetworkFee'
  | 'feesAndLockedFunds'
  | 'incomingMinLimit'
  | 'outgoingMinLimit'
  | 'outgoingMaxLimit';

type BridgeSelectionStoreLike = Pick<BridgeState, 'form'> & {
  asset: Nullable<RegisteredAccountAsset>;
};

type BridgeRefreshGuard = {
  (): boolean;
  isLatest: () => boolean;
};

type BridgeHistorySourceStoreLike = Pick<BridgeState, 'form'> & {
  networkHistoryId: Nullable<BridgeNetworkId>;
  subNetworkConnectionState?: SubNetworkConnectionState;
};

type BridgeHistoryRequest = {
  id: number;
  source: string;
  controller: AbortController;
};

type BridgeHistoryRequestState = {
  nextId: number;
  latestId: number;
  activeByNetwork: Map<BridgeNetworkId, BridgeHistoryRequest>;
};

type BridgeHistoryRequestGuard = {
  isCurrent: () => boolean;
  signal: AbortSignal;
  finish: () => boolean;
};

const bridgeRefreshEpochs = new WeakMap<object, Partial<Record<BridgeRefreshScope, number>>>();
const bridgeHistoryRequestStates = new WeakMap<object, BridgeHistoryRequestState>();
type BridgeTransactionTask = { promise: Promise<void>; controller: AbortController };
const bridgeTransactionTasks = new WeakMap<object, Map<string, BridgeTransactionTask>>();

/**
 * Captures the stable bridge selection fields that determine which asset and
 * network an asynchronous refresh belongs to.
 */
const getBridgeSelectionSignature = (store: BridgeSelectionStoreLike, extra: unknown[] = []): string => {
  const web3Store = useWeb3Store();
  const asset = store.asset;

  return JSON.stringify([
    store.form.assetAddress,
    store.form.isSoraToEvm,
    asset?.address,
    asset?.externalAddress,
    asset?.decimals,
    asset?.externalDecimals,
    web3Store.networkType,
    web3Store.networkSelected,
    ...extra,
  ]);
};

/**
 * Starts a scoped refresh and returns a guard that accepts only the latest
 * request while its captured asset/network selection remains active.
 */
const beginBridgeRefresh = (
  store: object,
  scope: BridgeRefreshScope,
  getSelectionSignature: () => string
): BridgeRefreshGuard => {
  const epochs = bridgeRefreshEpochs.get(store) ?? {};
  const requestId = (epochs[scope] ?? 0) + 1;
  const selectionSignature = getSelectionSignature();

  epochs[scope] = requestId;
  bridgeRefreshEpochs.set(store, epochs);

  const isLatest = () => epochs[scope] === requestId;
  const guard = (() => isLatest() && getSelectionSignature() === selectionSignature) as BridgeRefreshGuard;
  guard.isLatest = isLatest;

  return guard;
};

/**
 * Identifies the account, direction, and external network whose bridge history
 * is currently visible.
 */
const getBridgeHistorySourceSignature = (store: BridgeHistorySourceStoreLike): string => {
  const assetsStore = useAssetsStore();
  const walletStore = useWalletStore();
  const web3Store = useWeb3Store();
  const isSubBridge = web3Store.networkType === BridgeNetworkType.Sub;
  const registeredAssetAddresses = isSubBridge ? Object.keys(assetsStore.registeredAssets ?? {}).sort() : [];

  return JSON.stringify([
    store.networkHistoryId,
    web3Store.networkType,
    web3Store.networkSelected,
    walletStore.address,
    walletStore.sorametricsApiEndpoint,
    web3Store.evmAddress,
    web3Store.subAddress,
    store.form.isSoraToEvm,
    isSubBridge ? assetsStore.registeredAssetsFetching : undefined,
    registeredAssetAddresses,
    isSubBridge ? store.subNetworkConnectionState?.ready : undefined,
  ]);
};

/**
 * Starts an external-history request while coalescing only an identical active
 * source. New account/direction requests may supersede an older request for
 * the same network without allowing the older request to clear their loader.
 */
const beginBridgeHistoryRequest = (
  store: object & BridgeHistorySourceStoreLike,
  networkHistoryId: BridgeNetworkId
): Nullable<BridgeHistoryRequestGuard> => {
  const state =
    bridgeHistoryRequestStates.get(store) ??
    ({
      nextId: 0,
      latestId: 0,
      activeByNetwork: new Map<BridgeNetworkId, BridgeHistoryRequest>(),
    } satisfies BridgeHistoryRequestState);
  const source = getBridgeHistorySourceSignature(store);
  const activeRequest = state.activeByNetwork.get(networkHistoryId);

  if (activeRequest?.source === source && state.latestId === activeRequest.id) {
    return null;
  }

  const request: BridgeHistoryRequest = {
    id: ++state.nextId,
    source,
    controller: new AbortController(),
  };

  state.activeByNetwork.forEach((active) => active.controller.abort());
  state.activeByNetwork.clear();

  state.latestId = request.id;
  state.activeByNetwork.set(networkHistoryId, request);
  bridgeHistoryRequestStates.set(store, state);

  return {
    isCurrent: () => state.latestId === request.id && getBridgeHistorySourceSignature(store) === request.source,
    signal: request.controller.signal,
    finish: () => {
      if (state.activeByNetwork.get(networkHistoryId)?.id !== request.id) {
        return false;
      }

      state.activeByNetwork.delete(networkHistoryId);
      return true;
    },
  };
};

const dataPlaneClient = getDataPlaneClient();

const Direction =
  BridgeTxDirection ??
  ({
    Outgoing: 'Outgoing',
    Incoming: 'Incoming',
  } as Record<'Outgoing' | 'Incoming', string>);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

/**
 * Accepts only plain decimal balance strings from bridge providers.
 */
const normalizeBridgeBalance = (value: unknown): CodecString => {
  if (typeof value !== 'string') return ZeroStringValue;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return ZeroStringValue;

  return value as CodecString;
};

const shouldUseWorkerDataPlane = (): boolean => {
  return Boolean(useSettingsStore().featureFlags.wsWorkerDataPlane);
};

const getSoraBalance = async (accountAddress: string, asset: RegisteredAccountAsset): Promise<CodecString> => {
  const accountBalance = await getAssetBalance(api.api, accountAddress, asset.address, asset.decimals);
  return normalizeBridgeBalance(accountBalance.transferable);
};

const getExternalBalance = async (
  accountAddress: string,
  asset: RegisteredAccountAsset,
  isSub: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  const balance = isSub
    ? await subConnector.network.getTokenBalance(accountAddress, asset)
    : await ethersUtil.getAccountAssetBalance(accountAddress, asset.externalAddress);

  return normalizeBridgeBalance(balance);
};

const getAccountBridgeBalance = async (
  accountAddress: string,
  asset: Nullable<RegisteredAccountAsset>,
  isSora: boolean,
  isSub: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  if (!(asset?.address && accountAddress)) return ZeroStringValue;
  if (!isSora && !isSub) {
    const registeredAssets = resolveRegisteredAssets(useAssetsStore());

    if (!asset.externalAddress || !(asset.address in registeredAssets)) return ZeroStringValue;
  }

  try {
    return isSora
      ? await getSoraBalance(accountAddress, asset)
      : await getExternalBalance(accountAddress, asset, isSub, subConnector);
  } catch {
    return ZeroStringValue;
  }
};

/**
 * Fetches the EVM-side balance for a bridge asset while keeping SORA accounts
 * on the SORA balance API.
 */
const getEvmBridgeAssetBalance = async (
  accountAddress: string,
  asset: Nullable<RegisteredAccountAsset>,
  isRegisteredAsset: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  const tokenAddress = asset?.externalAddress;

  if (!(asset?.address && accountAddress && tokenAddress && isRegisteredAsset)) {
    return ZeroStringValue;
  }

  if (ethersUtil.isNativeEvmTokenAddress(tokenAddress)) {
    return getAccountBridgeBalance(accountAddress, asset, false, false, subConnector);
  }

  try {
    const balances = await ethersUtil.getErc20BalancesBatch([{ token: tokenAddress, account: accountAddress }]);

    return normalizeBridgeBalance(balances[0]?.balance);
  } catch {
    return getAccountBridgeBalance(accountAddress, asset, false, false, subConnector);
  }
};

/**
 * Resolves a transaction asset only when it is still present in the live bridge registry.
 */
const getRegisteredTransactionAsset = (assetAddress: string): RegisteredAccountAsset => {
  const assetsStore = useAssetsStore();
  const registeredAssets = resolveRegisteredAssets(assetsStore);
  const asset = assetsStore.assetDataByAddress(assetAddress);

  if (!asset?.externalAddress || !(assetAddress in registeredAssets)) {
    throw new Error(`Asset not registered: ${assetAddress}`);
  }

  return asset;
};

type EvmBridgeTransactionSigner = {
  getAddress: () => Promise<string>;
  getNonce: (blockTag: 'pending') => Promise<number>;
  sendTransaction: (request: TransactionRequest) => Promise<TransactionResponse>;
};

type EvmBridgeContractMethod = {
  populateTransaction: (...args: unknown[]) => Promise<TransactionRequest>;
};

const EVM_SUBMISSION_ALREADY_RECORDED = 'BRIDGE_EVM_SUBMISSION_ALREADY_RECORDED';

type ExistingEvmSubmission = 'pending' | TransactionResponse | null;

/** Returns the latest durable broadcast state while the origin-wide lock is held. */
const getExistingEvmSubmission = (id: string): ExistingEvmSubmission => {
  const transaction = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

  if (typeof transaction?.externalHash === 'string' && transaction.externalHash) {
    return { hash: transaction.externalHash } as TransactionResponse;
  }

  const payload = isRecord(transaction?.payload) ? transaction.payload : null;

  return payload && Object.prototype.hasOwnProperty.call(payload, 'evmSubmission') ? 'pending' : null;
};

/** Builds a stable, origin-local lock name without exposing private account data. */
const getEvmSubmissionLockName = (id: string, network: BridgeNetworkId): string => {
  return `polkaswap:eth-bridge:evm-submit:${String(network)}:${id}`;
};

/** Converts an EVM request value to a non-negative, lossless decimal string. */
const normalizeEvmSubmissionValue = (value: TransactionRequest['value']): string => {
  if (value == null) return ZeroStringValue;
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error('[Bridge]: EVM transaction value must be a non-negative safe integer');
  }

  try {
    const normalized = BigInt(value as string | number | bigint);

    if (normalized < 0n) throw new Error('negative value');

    return normalized.toString();
  } catch {
    throw new Error('[Bridge]: EVM transaction value is invalid');
  }
};

/**
 * Populates and pins the exact bridge request before broadcast so recovery can
 * find a transaction even when the wallet broadcasts but its RPC reply is lost.
 */
const sendPreparedEvmBridgeTransaction = async (
  contract: unknown,
  method: string,
  args: unknown[],
  recordSubmission: RecordEvmSubmission | undefined,
  lockName: string,
  getExistingSubmission: () => ExistingEvmSubmission,
  submissionGuard?: { chainId: number; validate: (signerAddress: string) => Promise<void> }
): Promise<TransactionResponse> => {
  if (!contract || typeof contract !== 'object') {
    throw new Error('[Bridge]: EVM bridge contract is unavailable');
  }

  const contractRecord = contract as Record<string, unknown> & { runner?: unknown };
  const contractMethod = contractRecord[method] as Nullable<EvmBridgeContractMethod>;
  const signer = contractRecord.runner as Nullable<EvmBridgeTransactionSigner>;

  if (typeof contractMethod?.populateTransaction !== 'function') {
    throw new Error(`[Bridge]: EVM bridge method "${method}" cannot prepare a transaction`);
  }
  if (
    typeof signer?.getAddress !== 'function' ||
    typeof signer.getNonce !== 'function' ||
    typeof signer.sendTransaction !== 'function'
  ) {
    throw new Error('[Bridge]: EVM bridge contract is not connected to a signer');
  }

  if (typeof recordSubmission !== 'function') {
    throw new Error('[Bridge]: Durable EVM submission recording is unavailable');
  }

  return await withCrossTabEvmSubmissionLock(lockName, async () => {
    const existingSubmission = getExistingSubmission();

    if (existingSubmission === 'pending') {
      throw Object.assign(new Error('[Bridge]: EVM submission is already being reconciled in another tab'), {
        code: EVM_SUBMISSION_ALREADY_RECORDED,
      });
    }
    if (existingSubmission) return existingSubmission;

    const populatedRequest = await contractMethod.populateTransaction(...args);
    const [from, nonce] = await Promise.all([signer.getAddress(), signer.getNonce('pending')]);

    if (!Number.isSafeInteger(nonce) || nonce < 0) {
      throw new Error('[Bridge]: EVM pending nonce is invalid');
    }
    if (typeof from !== 'string' || !from.trim()) {
      throw new Error('[Bridge]: EVM signer address is invalid');
    }
    if (typeof populatedRequest.to !== 'string' || !populatedRequest.to.trim()) {
      throw new Error('[Bridge]: EVM bridge transaction recipient is invalid');
    }
    if (typeof populatedRequest.data !== 'string' || !populatedRequest.data) {
      throw new Error('[Bridge]: EVM bridge transaction data is invalid');
    }
    await submissionGuard?.validate(from);

    const preparedRequest: TransactionRequest = {
      ...populatedRequest,
      from,
      nonce,
      ...(submissionGuard ? { chainId: submissionGuard.chainId } : {}),
    };

    recordSubmission({
      from: from.toLowerCase(),
      to: populatedRequest.to.toLowerCase(),
      nonce,
      data: populatedRequest.data,
      value: normalizeEvmSubmissionValue(populatedRequest.value),
      startTimestamp: Date.now(),
    });

    return await signer.sendTransaction(preparedRequest);
  });
};

/**
 * Checks that the selected Sub bridge network is ready for address formatting
 * and balance queries, not just that the websocket marked itself connected.
 */
const isSubConnectorNetworkReady = (connector?: Nullable<SubNetworksConnector>): boolean => {
  return connector?.connectionState?.ready ?? false;
};

const chainAddress = (address: string, connector: SubNetworksConnector): string => {
  if (!address) return '';

  const network = connector?.network;

  if (isSubConnectorNetworkReady(connector) && typeof network?.formatAddress === 'function') {
    try {
      const formatted = network.formatAddress(address);
      return typeof formatted === 'string' && formatted ? formatted : address;
    } catch {
      return address;
    }
  }

  return address;
};

const resolveBridgeApi = (): BridgeApiLike => {
  switch (useWeb3Store().networkType) {
    case BridgeNetworkType.Sub:
      return subBridgeApi as BridgeApiLike;
    case BridgeNetworkType.Evm:
      return evmBridgeApi as BridgeApiLike;
    default:
      return ethBridgeApi as BridgeApiLike;
  }
};

/**
 * Finds a transaction independently of the network currently selected in the
 * bridge form. This is required when users reopen persisted history after
 * switching to another bridge family.
 */
const resolvePersistedBridgeTransaction = (
  internalHistory: Record<string, IBridgeTransaction>,
  id: string
): Nullable<IBridgeTransaction> => {
  const histories = [ethBridgeApi.history, evmBridgeApi.history, subBridgeApi.history, internalHistory];

  for (const history of histories) {
    const transaction = findBridgeHistoryTransaction(history ?? {}, id);

    if (transaction) return transaction;
  }

  return null;
};

/**
 * Finds the freshest persisted bridge row and retains its actual storage key.
 * Pinned pages can belong to a bridge family other than the one selected in
 * the form, so the selected API alone is not an authoritative refresh source.
 */
const resolvePersistedBridgeTransactionEntry = (id: string) => {
  for (const history of [ethBridgeApi.history, evmBridgeApi.history, subBridgeApi.history]) {
    const entry = findBridgeHistoryTransactionEntry(history ?? {}, id);

    if (entry) return entry;
  }

  return null;
};

/** Resolves the reducer family from the operation persisted on the transaction. */
const resolveBridgeTransactionHandler = (transaction: IBridgeTransaction) => {
  switch (transaction.type) {
    case Operation.EthBridgeIncoming:
    case Operation.EthBridgeOutgoing:
      return ethBridge;
    case Operation.EvmIncoming:
    case Operation.EvmOutgoing:
      return evmBridge;
    case Operation.SubstrateIncoming:
    case Operation.SubstrateOutgoing:
      return subBridge;
  }

  throw new Error(`[Bridge]: Unsupported transaction operation: "${transaction.type}"`);
};

/**
 * Coalesces concurrent handling requests for one canonical transaction id.
 * The entry is removed after settlement so an explicit later retry can run.
 */
const runBridgeTransactionOnce = async (
  store: object,
  id: string,
  handler: { handleTransaction: (transactionId: string, signal?: AbortSignal) => Promise<void> }
): Promise<void> => {
  const tasks = bridgeTransactionTasks.get(store) ?? new Map<string, BridgeTransactionTask>();
  const activeTask = tasks.get(id);

  if (activeTask) {
    await activeTask.promise;
    return;
  }

  const controller = new AbortController();
  const walletStore = useWalletStore();
  const ownerAddress = walletStore.address;
  const stopAccountIdentityWatch = walletStore.$subscribe(
    () => {
      if (walletStore.address !== ownerAddress) {
        controller.abort();
      }
    },
    { detached: true, flush: 'sync' }
  );
  const task = Promise.resolve()
    .then(() => handler.handleTransaction(id, controller.signal))
    .catch((error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      throw error;
    });

  tasks.set(id, { promise: task, controller });
  bridgeTransactionTasks.set(store, tasks);

  try {
    await task;
  } finally {
    stopAccountIdentityWatch();
    if (tasks.get(id)?.promise === task) {
      tasks.delete(id);
    }
    if (!tasks.size) {
      bridgeTransactionTasks.delete(store);
    }
  }
};

/** Cancels one managed bridge tracker and waits for its cleanup to finish. */
const cancelBridgeTransactionTask = async (store: object, id: string): Promise<void> => {
  const task = bridgeTransactionTasks.get(store)?.get(id);

  if (!task) return;

  task.controller.abort();
  await task.promise.catch(() => undefined);
};

/** Cancels all managed bridge trackers and waits for their guarded cleanup. */
const cancelAllBridgeTransactionTasks = async (store: object): Promise<void> => {
  const tasks = [...(bridgeTransactionTasks.get(store)?.values() ?? [])];

  tasks.forEach(({ controller }) => controller.abort());
  await Promise.allSettled(tasks.map(({ promise }) => promise));
};

/** Invalidates account-derived refreshes so old results cannot commit after an identity change. */
const invalidateAccountBoundBridgeRequests = (store: object): void => {
  const refreshEpochs = bridgeRefreshEpochs.get(store);

  if (refreshEpochs) {
    (Object.keys(refreshEpochs) as BridgeRefreshScope[]).forEach((scope) => {
      refreshEpochs[scope] = (refreshEpochs[scope] ?? 0) + 1;
    });
  }

  const historyRequests = bridgeHistoryRequestStates.get(store);

  if (historyRequests) {
    historyRequests.activeByNetwork.forEach((request) => request.controller.abort());
    historyRequests.latestId = ++historyRequests.nextId;
    historyRequests.activeByNetwork.clear();
  }
};

const syncMoonpayAccountRecord = (moonpayId: string, externalHash: unknown): void => {
  if (typeof externalHash !== 'string' || !externalHash) {
    return;
  }

  useMoonpayStore().setAccountRecord(moonpayId, externalHash);
};

const resolveWalletApiKey = (key: string): string => {
  const apiKeys = useWalletStore().apiKeys;
  const value = apiKeys?.[key];

  return typeof value === 'string' ? value : '';
};

const createExternalHistoryContext = (store: BridgeStateStoreLike) => {
  const walletStore = useWalletStore();
  const web3Store = useWeb3Store();
  const assetsStore = useAssetsStore();

  return {
    rootState: {
      wallet: {
        account: {
          address: walletStore.address,
        },
        settings: {
          apiKeys: walletStore.apiKeys,
          networkFees: walletStore.networkFees,
          sorametricsApiEndpoint: walletStore.sorametricsApiEndpoint,
        },
      },
      assets: {
        registeredAssets: assetsStore.registeredAssets,
      },
      web3: {
        networkSelected: web3Store.networkSelected,
        ethBridgeContractAddress: web3Store.ethBridgeContractAddress,
        ethBridgeEvmNetwork: web3Store.ethBridgeEvmNetwork,
      },
      bridge: {
        inProgressIds: store.history.inProgressIds,
        subBridgeConnector: store.connector,
      },
    },
    rootGetters: {
      assets: {
        assetDataByAddress: assetsStore.assetDataByAddress,
      },
    },
  } as const;
};

const useBridgeStoreBase = defineStore('bridge', {
  state: (): BridgeState => buildInitialBridgeState(),
  getters: {
    asset(state): Nullable<RegisteredAccountAsset> {
      const assetsStore = useAssetsStore();
      const walletStore = useWalletStore();
      const token =
        assetsStore.assetDataByAddress?.(state.form.assetAddress) ??
        walletStore.assetsDataTable?.[state.form.assetAddress] ??
        null;

      if (!token) return null;

      const [balance, externalBalance] = state.form.isSoraToEvm
        ? [state.balances.assetSenderBalance, state.balances.assetRecipientBalance]
        : [state.balances.assetRecipientBalance, state.balances.assetSenderBalance];

      return {
        ...token,
        balance: {
          ...(token.balance ?? {}),
          transferable: balance ?? token.balance?.transferable,
        },
        externalBalance: externalBalance ?? token.externalBalance,
      } as RegisteredAccountAsset;
    },
    /**
     * Whether the current form is configured to transfer from Sora to an external network.
     */
    isSoraToEvm(state): boolean {
      return state.form.isSoraToEvm;
    },
    operation(): Operation {
      return resolveBridgeOperation(useWeb3Store().networkType, this.isSoraToEvm);
    },
    /**
     * Determines whether the user can press submit based on the amount and loading flags.
     */
    canSubmit(state): boolean {
      return (
        isPositiveFiniteBridgeAmount(state.form.amountSend) &&
        !state.flags.balancesFetching &&
        !state.flags.feesAndLockedFundsFetching
      );
    },
    historyPage(state): number {
      return state.history.page;
    },
    historyId(state): string {
      return state.history.id;
    },
    historyInternal(state): Record<string, IBridgeTransaction> {
      return state.history.internal;
    },
    historyLoading(state): Record<string, boolean> {
      return state.history.loading;
    },
    waitingForApprove(state): Record<string, boolean> {
      return state.history.waitingForApprove;
    },
    inProgressIds(state): Record<string, boolean> {
      return state.history.inProgressIds;
    },
    notificationData(state): Nullable<IBridgeTransaction> {
      return state.history.notificationData;
    },
    isSignTxDialogVisible(state): boolean {
      return state.flags.isSignTxDialogVisible;
    },
    networkHistoryId(): Nullable<BridgeNetworkId> {
      const web3Store = useWeb3Store();
      const { networkSelected } = web3Store;

      if (!networkSelected) return null;
      if (!this.isSubBridge) return networkSelected as BridgeNetworkId;

      const subNetworkId = networkSelected as SubNetwork;

      return subBridgeApi.isStandalone(subNetworkId) ? subNetworkId : subBridgeApi.getRelayChain(subNetworkId);
    },
    /**
     * Reactive identity for the account, direction, and network shown by the
     * bridge history page.
     */
    historySourceKey(): string {
      return getBridgeHistorySourceSignature(this);
    },
    nativeToken(): Nullable<RegisteredAccountAsset> {
      const walletStore = useWalletStore();
      const assetsStore = useAssetsStore();
      const registeredAssets = assetsStore.registeredAssets ?? {};
      const symbol = useWeb3Store().selectedNetworkData?.nativeCurrency?.symbol;
      const walletAssets = Array.isArray(walletStore.assets)
        ? walletStore.assets
        : Object.values(walletStore.assetsDataTable ?? {});

      return resolveNativeBridgeToken({
        nativeSymbol: symbol,
        registeredAssets,
        walletAssets,
        assetDataByAddress: assetsStore.assetDataByAddress,
      });
    },
    sender(state): string {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const soraAddress = walletStore.soraAddress;

      if (state.form.isSoraToEvm) return soraAddress;

      return this.isSubAccountType
        ? chainAddress(web3Store.subAddress ?? '', state.connector)
        : (web3Store.evmAddress ?? '');
    },
    recipient(state): string {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const soraAddress = walletStore.soraAddress;

      if (!state.form.isSoraToEvm) return soraAddress;

      return this.isSubAccountType
        ? chainAddress(web3Store.subAddress ?? '', state.connector)
        : (web3Store.evmAddress ?? '');
    },
    externalAccount(): string {
      const web3Store = useWeb3Store();

      return this.isSubAccountType ? (web3Store.subAddress ?? '') : (web3Store.evmAddress ?? '');
    },
    isNativeTokenSelected(): boolean {
      return Boolean(this.nativeToken && this.asset && this.nativeToken.address === this.asset.address);
    },
    isSidechainAsset(): boolean {
      const assetsStore = useAssetsStore();
      const registeredAssets = assetsStore.registeredAssets ?? {};
      const asset = this.asset;

      if (!asset) return false;
      if (!(asset.address in registeredAssets)) return false;

      const registered = registeredAssets[asset.address];
      const sidechainKind = this.isSubBridge ? SubAssetKind.Sidechain : EthAssetKind.Sidechain;

      return registered.kind === sidechainKind;
    },
    isValidNetwork(): boolean {
      return useWeb3Store().isValidNetwork;
    },
    isRegisteredAsset(): boolean {
      const assetsStore = useAssetsStore();
      const registeredAssets = assetsStore.registeredAssets ?? {};
      const asset = this.asset;

      if (!asset) return false;
      if (!(asset.address in registeredAssets)) return false;
      if (this.isSubBridge) return true;

      return Boolean(asset.externalAddress);
    },
    autoselectedAssetAddress(): Nullable<string> {
      const assetIds = Object.keys(useAssetsStore().registeredAssets ?? {});

      if (assetIds.length !== 1) return null;

      return assetIds[0];
    },
    hasWaitingForActionTx(): boolean {
      return Object.values(this.historyRecord).some((item) => isWaitingForAction(item));
    },
    isSubBridge(): boolean {
      return useWeb3Store().networkType === BridgeNetworkType.Sub;
    },
    isSubAccountType(): boolean {
      const web3Store = useWeb3Store();

      if (web3Store.networkType !== BridgeNetworkType.Sub) {
        return false;
      }

      return !subBridgeApi.isEvmAccount(web3Store.networkSelected as SubNetwork);
    },
    senderName(state): string {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const soraName = walletStore.account?.name ?? '';

      if (state.form.isSoraToEvm) return soraName;

      return this.isSubAccountType ? (web3Store.subAddressName ?? '') : '';
    },
    recipientName(state): string {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const soraName = walletStore.account?.name ?? '';

      if (!state.form.isSoraToEvm) return soraName;

      return this.isSubAccountType ? (web3Store.subAddressName ?? '') : '';
    },
    historyRecord(state): Record<string, IBridgeTransaction> {
      return buildBridgeHistoryRecord(state.history.internal);
    },
    activeTransaction(state): Nullable<IBridgeTransaction> {
      return findBridgeHistoryTransaction(state.history.internal, state.history.id);
    },
    subBridgeConnector(state): SubNetworksConnector {
      return state.connector;
    },
    /**
     * Exposes reactive connection readiness without proxying the Polkadot API
     * objects owned by the raw bridge connector.
     */
    subNetworkConnectionState(state): SubNetworkConnectionState {
      return state.connector.connectionState;
    },
  },
  actions: {
    /**
     * Merges partial form updates without resetting the untouched fields.
     */
    updateForm(patch: BridgeFormPatch): void {
      if (patch.isSoraToEvm !== undefined) {
        syncDirectionCompat(this, patch.isSoraToEvm);
      }

      if (patch.assetAddress !== undefined) {
        syncAssetAddressValueCompat(this, patch.assetAddress);
      }

      if (patch.amountSend !== undefined) {
        syncAmountSendCompat(this, patch.amountSend);
      }

      if (patch.amountReceived !== undefined) {
        syncAmountReceivedCompat(this, patch.amountReceived);
      }

      if (patch.focusedField !== undefined) {
        syncFocusedFieldCompat(this, patch.focusedField);
      }
    },
    setAmountSend(value: string): void {
      syncAmountSendCompat(this, value);
    },
    setAmountReceived(value: string): void {
      syncAmountReceivedCompat(this, value);
    },
    setFocusedField(field: Nullable<BridgeFocusedField>): void {
      syncFocusedFieldCompat(this, field);
    },
    toggleDirection(): void {
      syncDirectionCompat(this, !this.form.isSoraToEvm);
    },
    setBalancesFetching(flag: boolean): void {
      syncBalancesFetchingCompat(this, flag);
    },
    setFeesFetching(flag: boolean): void {
      syncFeesAndLockedFundsFetchingCompat(this, flag);
    },
    setSignTxDialogVisibility(flag: boolean): void {
      syncSignDialogVisibilityCompat(this, flag);
    },
    setHistoryPage(page?: number): void {
      syncHistoryPageCompat(this, page);
    },
    resetHistoryPage(): void {
      syncHistoryPageCompat(this, 1);
    },
    setHistoryId(id?: string): void {
      syncHistoryIdCompat(this, id);
    },
    setHistoryLoading(network: BridgeNetworkId, loading: boolean): void {
      this.history.loading = {
        ...this.history.loading,
        [network]: loading,
      };
    },
    setHistoryTransaction(id: string, tx: IBridgeTransaction): void {
      if (!id) return;

      this.history.internal = {
        ...this.history.internal,
        [id]: tx,
      };
    },
    removeHistoryTransaction(id: string): void {
      if (!(id in this.history.internal)) return;

      const next = { ...this.history.internal };
      delete next[id];
      this.history.internal = next;
    },
    setWaitingForApprove(id: string, pending: boolean): void {
      if (!id) return;

      syncWaitingForApproveCompat(this, id, pending);
    },
    setNotificationData(data: Nullable<IBridgeTransaction>): void {
      syncNotificationCompat(this, data);
    },
    trackTransferSubmitted(payload: {
      direction: 'soraToExternal' | 'externalToSora';
      asset?: Nullable<string>;
      amount?: Nullable<string>;
      network?: Nullable<string>;
    }): void {
      trackEvent('bridge.pinia.transfer.submitted', {
        ...payload,
        buildVariant: getBuildVariant(),
      });
    },
    addTransactionToProgress(id: string): void {
      if (!id) return;

      syncInProgressCompat(this, id, true);
    },
    removeTransactionFromProgress(id: string): void {
      if (!id) return;

      syncInProgressCompat(this, id, false);
    },
    getHistoryTransaction(id?: Nullable<string>): Nullable<IBridgeTransaction> {
      return findBridgeHistoryTransaction(this.history.internal, id);
    },
    setBlockUpdatesSubscription(subscription: Nullable<Subscription>): void {
      syncBlockUpdatesSubscriptionCompat(this, subscription ?? null);
    },
    resetBlockUpdatesSubscription(): void {
      syncBlockUpdatesSubscriptionCompat(this, null);
    },
    setOutgoingMaxLimitSubscription(subscription: Nullable<Subscription>): void {
      syncOutgoingMaxLimitSubscriptionCompat(this, subscription ?? null);
    },
    resetOutgoingMaxLimitSubscription(): void {
      syncOutgoingMaxLimitSubscriptionCompat(this, null);
    },
    /**
     * Refreshes cached bridge histories through the Pinia facade while keeping compat state aligned.
     */
    async updateBridgeHistory(): Promise<void> {
      await this.updateInternalHistory();
      await this.updateExternalHistory(false);
    },
    /**
     * Rebuilds the local bridge history cache from the active bridge API.
     */
    async updateInternalHistory(): Promise<void> {
      const web3Store = useWeb3Store();
      const bridgeApi = resolveBridgeApi();
      const history = Object.entries(bridgeApi.history ?? {}).reduce<Record<string, IBridgeTransaction>>(
        (buffer, [id, item]) => {
          const transaction = item as IBridgeTransaction;

          if (transaction?.externalNetwork === web3Store.networkSelected) {
            buffer[id] = transaction;
          }

          return buffer;
        },
        {}
      );

      const pinnedIds = new Set(
        [
          this.history.id,
          ...Object.keys(this.history.inProgressIds),
          ...Object.keys(this.history.waitingForApprove),
        ].filter(Boolean)
      );

      pinnedIds.forEach((id) => {
        const entry = resolvePersistedBridgeTransactionEntry(id);

        if (entry) history[entry.key] = entry.transaction;
      });

      syncInternalHistoryCompat(this, history);
    },
    /**
     * Fetches external network history through the direct bridge runtime helpers.
     * @param clearHistory Whether to clear previously cached entries before fetching.
     */
    async updateExternalHistory(clearHistory = false): Promise<void> {
      const web3Store = useWeb3Store();
      const networkHistoryId = this.networkHistoryId;

      if (!networkHistoryId) {
        return;
      }

      const request = beginBridgeHistoryRequest(this, networkHistoryId);

      if (!request) return;

      syncHistoryLoadingCompat(this, networkHistoryId, true);

      try {
        const context = createExternalHistoryContext(this);
        const updateInternalHistory = async () => {
          if (!request.isCurrent()) return;

          await this.updateInternalHistory();
        };

        if (web3Store.networkType === BridgeNetworkType.Eth) {
          const updateHistory = updateEthBridgeHistory(context as never);
          await updateHistory(clearHistory, updateInternalHistory);
        } else if (web3Store.networkType === BridgeNetworkType.Sub) {
          const updateHistory = updateSubBridgeHistory(context as never);
          await updateHistory(clearHistory, updateInternalHistory, request.isCurrent, request.signal);
        } else if (web3Store.networkType === BridgeNetworkType.Evm) {
          const updateHistory = updateEvmBridgeHistory(context as never);
          await updateHistory(clearHistory, updateInternalHistory);
        }
      } finally {
        if (request.finish()) {
          syncHistoryLoadingCompat(this, networkHistoryId, false);
        }
      }
    },
    async updateExternalBalance(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'balances', () =>
        getBridgeSelectionSignature(this, [
          this.sender,
          this.recipient,
          this.nativeToken?.address,
          this.nativeToken?.externalAddress,
        ])
      );
      const sender = this.sender;
      const recipient = this.recipient;
      const asset = this.asset;
      const nativeToken = this.nativeToken;
      const isSubBridge = this.isSubBridge;
      const isRegisteredAsset = this.isRegisteredAsset;
      const isSoraToEvm = this.form.isSoraToEvm;
      const subConnector = this.connector;
      const soraAccount = isSoraToEvm ? sender : recipient;
      const externalAccount = isSoraToEvm ? recipient : sender;

      syncBalancesFetchingCompat(this, true);

      try {
        if (isSubBridge) {
          if (!isSubConnectorNetworkReady(subConnector)) {
            if (isCurrentRequest()) {
              syncBalancesBatchCompat(this, {
                sender: ZeroStringValue,
                recipient: ZeroStringValue,
                native: ZeroStringValue,
              });
            }
            return;
          }

          if (!isRegisteredAsset) {
            if (isCurrentRequest()) {
              syncBalancesBatchCompat(this, {
                sender: ZeroStringValue,
                recipient: ZeroStringValue,
                native: ZeroStringValue,
              });
            }
            return;
          }

          const soraBalancePromise = getAccountBridgeBalance(soraAccount, asset, true, true, subConnector);
          let externalBalance = ZeroStringValue;
          let nativeBalance = ZeroStringValue;

          try {
            const balances = await subConnector.network.getTokenBalancesBatch([
              { accountAddress: externalAccount, asset },
              { accountAddress: externalAccount, asset: nativeToken },
            ]);

            if (!Array.isArray(balances)) {
              throw new Error('Invalid Sub bridge balance batch response');
            }

            externalBalance = normalizeBridgeBalance(balances[0]);
            nativeBalance = normalizeBridgeBalance(balances[1]);
          } catch {
            if (!isCurrentRequest()) return;

            [externalBalance, nativeBalance] = await Promise.all([
              getAccountBridgeBalance(externalAccount, asset, false, true, subConnector),
              getAccountBridgeBalance(externalAccount, nativeToken, false, true, subConnector),
            ]);
          }

          const soraBalance = await soraBalancePromise;
          const senderBalance = isSoraToEvm ? soraBalance : externalBalance;
          const recipientBalance = isSoraToEvm ? externalBalance : soraBalance;

          if (isCurrentRequest()) {
            syncBalancesBatchCompat(this, {
              sender: senderBalance,
              recipient: recipientBalance,
              native: nativeBalance,
            });
          }

          return;
        }

        const [soraBalance, externalBalance, nativeBalance] = await Promise.all([
          getAccountBridgeBalance(soraAccount, asset, true, false, subConnector),
          getEvmBridgeAssetBalance(externalAccount, asset, isRegisteredAsset, subConnector),
          getAccountBridgeBalance(externalAccount, nativeToken, false, false, subConnector),
        ]);
        const senderBalance = isSoraToEvm ? soraBalance : externalBalance;
        const recipientBalance = isSoraToEvm ? externalBalance : soraBalance;

        if (isCurrentRequest()) {
          syncBalancesBatchCompat(this, {
            sender: senderBalance,
            recipient: recipientBalance,
            native: nativeBalance,
          });
        }
      } finally {
        if (isCurrentRequest.isLatest()) {
          syncBalancesFetchingCompat(this, false);
        }
      }
    },
    async updateExternalMinBalance(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'externalMinBalance', () => getBridgeSelectionSignature(this));
      const asset = this.asset;
      const shouldFetchMinBalance = this.isSubBridge && asset && !this.form.isSoraToEvm;
      let minBalance = ZeroStringValue;

      try {
        if (shouldFetchMinBalance) {
          minBalance = await this.connector.network.getAssetMinDeposit(asset);
        }
      } catch {
        minBalance = ZeroStringValue;
      }

      if (isCurrentRequest()) {
        syncExternalMinBalanceCompat(this, minBalance);
      }
    },
    async updateExternalLockedBalance(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'externalLockedBalance', () =>
        getBridgeSelectionSignature(this)
      );
      const asset = this.asset;
      const web3Store = useWeb3Store();

      try {
        if (web3Store.networkType === BridgeNetworkType.Eth) {
          const { address, decimals, externalAddress, externalDecimals } = asset ?? {};
          const bridgeContractAddress = web3Store.contractAddress(KnownEthBridgeAsset.Other);
          const hasNetworkData = !!web3Store.networkSelected && web3Store.isValidNetwork && !!bridgeContractAddress;
          const hasAssetData = !!address && !!externalAddress && this.isRegisteredAsset;

          if (hasNetworkData && hasAssetData && this.isSidechainAsset) {
            const [lockedValue, bridgeValue] = await Promise.all([
              ethBridgeApi.getLockedAssets(web3Store.networkSelected as number, address),
              ethersUtil.getAccountAssetBalance(bridgeContractAddress, externalAddress),
            ]);
            const balance = FPNumber.min(
              FPNumber.fromCodecValue(lockedValue, decimals),
              FPNumber.fromCodecValue(bridgeValue, externalDecimals)
            );

            if (isCurrentRequest()) {
              syncAssetLockedBalanceCompat(this, balance);
            }
            return;
          }

          if (isCurrentRequest()) {
            syncAssetLockedBalanceCompat(this, null);
          }
          return;
        }

        if (asset?.address && web3Store.networkSelected) {
          const bridgeApi = resolveBridgeApi();
          const value = await bridgeApi.getLockedAssets?.(web3Store.networkSelected as never, asset.address);

          if (value !== undefined && isCurrentRequest()) {
            syncAssetLockedBalanceCompat(this, FPNumber.fromCodecValue(value, asset.decimals));
            return;
          }
        }
      } catch {
        // Clear stale financial state when provider data cannot be trusted.
      }

      if (isCurrentRequest()) {
        syncAssetLockedBalanceCompat(this, null);
      }
    },
    async updateExternalNetworkFee(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'externalNetworkFee', () =>
        getBridgeSelectionSignature(this, [this.sender, this.recipient])
      );
      const asset = this.asset;
      let fee = ZeroStringValue;

      try {
        if (this.isSubBridge) {
          if (!this.form.isSoraToEvm && asset && this.isRegisteredAsset && this.sender && this.recipient) {
            fee = await this.connector.network.getNetworkFee(asset, this.sender, this.recipient);
          }
        } else {
          const web3Store = useWeb3Store();
          const walletStore = useWalletStore();

          if (
            asset &&
            this.isRegisteredAsset &&
            web3Store.isValidNetwork &&
            web3Store.evmAddress &&
            walletStore.address &&
            isPositiveFiniteBridgeAmount(this.form.amountSend)
          ) {
            const registeredAssets = resolveRegisteredAssets(useAssetsStore());
            const bridgeRegisteredAsset = registeredAssets[asset.address];
            const decimals = this.form.isSoraToEvm ? asset.decimals : asset.externalDecimals;
            const maxAmount = FPNumber.fromCodecValue(this.balances.assetSenderBalance ?? 0, decimals);
            const amount = new FPNumber(this.form.amountSend ?? 0, decimals);
            const value = maxAmount.min(amount).toString();

            fee = await getEthNetworkFee(
              asset,
              bridgeRegisteredAsset.kind,
              web3Store.contractAddress,
              value,
              this.form.isSoraToEvm,
              walletStore.address,
              web3Store.evmAddress
            );
          }
        }
      } catch {
        fee = ZeroStringValue;
      }

      if (isCurrentRequest()) {
        syncExternalNetworkFeeCompat(this, fee);
      }
    },
    async updateExternalTransferFee(): Promise<void> {
      const asset = this.asset;
      const web3Store = useWeb3Store();
      let fee = ZeroStringValue;

      if (this.isSubBridge && asset && this.isRegisteredAsset) {
        const direction = this.form.isSoraToEvm ? Direction.Outgoing : Direction.Incoming;
        fee =
          SUB_TRANSFER_FEES[web3Store.networkSelected as SubNetwork]?.[asset.symbol]?.[direction] ?? ZeroStringValue;
      }

      syncExternalTransferFeeCompat(this, fee);
    },
    async updateSoraNetworkFee(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'soraNetworkFee', () => getBridgeSelectionSignature(this));
      const asset = this.asset;
      const web3Store = useWeb3Store();
      const walletStore = useWalletStore();
      let fee = ZeroStringValue;

      try {
        if (web3Store.networkSelected && asset && this.form.isSoraToEvm) {
          if (web3Store.networkType === BridgeNetworkType.Eth) {
            fee = walletStore.networkFees?.[this.operation] ?? ZeroStringValue;
          } else {
            fee =
              (await resolveBridgeApi().getNetworkFee?.(asset, web3Store.networkSelected as never)) ?? ZeroStringValue;
          }
        }
      } catch {
        fee = ZeroStringValue;
      }

      if (isCurrentRequest()) {
        syncSoraNetworkFeeCompat(this, fee);
      }
    },
    async updateFeesAndLockedFunds(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'feesAndLockedFunds', () =>
        getBridgeSelectionSignature(this, [this.sender, this.recipient])
      );
      syncFeesAndLockedFundsFetchingCompat(this, true);

      try {
        await Promise.allSettled([
          this.updateExternalLockedBalance(),
          this.updateExternalNetworkFee(),
          this.updateExternalTransferFee(),
          this.updateSoraNetworkFee(),
        ]);
      } finally {
        if (isCurrentRequest.isLatest()) {
          syncFeesAndLockedFundsFetchingCompat(this, false);
        }
      }
    },
    async updateIncomingMinLimit(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'incomingMinLimit', () => getBridgeSelectionSignature(this));
      const asset = this.asset;
      const isRegisteredAsset = this.isRegisteredAsset;
      const isSubBridge = this.isSubBridge;
      const soraParachain = this.connector.soraParachain;
      let minLimit = FPNumber.ZERO;

      if (isSubBridge && asset && isRegisteredAsset && soraParachain) {
        try {
          const value = await soraParachain.getAssetMinimumAmount(asset.address);
          minLimit = FPNumber.fromCodecValue(value, asset.externalDecimals);
        } catch (error) {
          if (isCurrentRequest()) {
            console.error(error);
          }
        }
      }

      if (isCurrentRequest()) {
        syncIncomingMinLimitCompat(this, minLimit);
      }
    },
    async updateOutgoingMinLimit(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'outgoingMinLimit', () => getBridgeSelectionSignature(this));
      const asset = this.asset;
      const isRegisteredAsset = this.isRegisteredAsset;
      const isSubBridge = this.isSubBridge;
      let minLimit = FPNumber.ZERO;

      if (isSubBridge && asset && isRegisteredAsset) {
        try {
          const value = await this.connector.network.getAssetMinDeposit(asset);
          minLimit = FPNumber.fromCodecValue(value, asset.externalDecimals);
        } catch (error) {
          if (isCurrentRequest()) {
            console.error(error);
          }
        }
      }

      if (isCurrentRequest()) {
        syncOutgoingMinLimitCompat(this, minLimit);
      }
    },
    async getEthBridgeHistoryInstance(): Promise<unknown> {
      const web3Store = useWeb3Store();

      return await loadEthBridgeHistoryInstance({
        rootState: {
          wallet: {
            settings: {
              apiKeys: {
                etherscan: resolveWalletApiKey('etherscan'),
              },
            },
          },
          web3: {
            ethBridgeContractAddress: web3Store.ethBridgeContractAddress,
            ethBridgeEvmNetwork: web3Store.ethBridgeEvmNetwork,
          },
        },
      } as never);
    },
    async signEthBridgeOutgoingEvm(id: string, recordSubmission?: RecordEvmSubmission): Promise<unknown> {
      const web3Store = useWeb3Store();
      const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

      if (!tx) throw new Error('TX cannot be empty!');
      if (!tx.id) throw new Error('TX id cannot be empty!');
      if (!tx.amount) throw new Error('TX amount cannot be empty!');
      if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
      if (!tx.to) throw new Error('TX to cannot be empty!');
      assertPositiveBridgeTransactionAmount(tx.amount);

      const asset = getRegisteredTransactionAsset(tx.assetAddress);

      if (!web3Store.isValidNetwork) {
        throw new Error('Change evm network in wallet');
      }

      const request = await waitForApprovedRequest(tx);

      if (tx.hash && request.hash.toLowerCase() !== tx.hash.toLowerCase()) {
        throw new Error('[Bridge]: Approved Ethereum bridge request does not match the transaction');
      }

      if (!ethersUtil.addressesAreEqual(web3Store.evmAddress, request.to)) {
        throw new Error(`Change account in ethereum wallet to ${request.to}`);
      }

      // Peer signatures cover the destination codec amount, including any
      // chain-side denomination. Repair stale estimates before wallet review.
      const amount = FPNumber.fromCodecValue(request.amount, asset.externalDecimals).toString();
      assertPositiveBridgeTransactionAmount(amount);

      const { contract, method, args } = await getOutgoingEvmTransactionData({
        asset,
        value: amount,
        recipient: tx.to,
        getContractAddress: web3Store.contractAddress,
        request,
      });

      const currentTransaction = (ethBridgeApi.getHistory(tx.id) as Nullable<EthHistory>) ?? tx;
      ethBridgeApi.saveHistory({ ...currentTransaction, amount2: amount });
      await this.updateInternalHistory();

      return await sendPreparedEvmBridgeTransaction(
        contract,
        method,
        args,
        recordSubmission,
        getEvmSubmissionLockName(tx.id, tx.externalNetwork),
        () => getExistingEvmSubmission(tx.id)
      );
    },
    async signEthBridgeIncomingEvm(id: string, recordSubmission?: RecordEvmSubmission): Promise<unknown> {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

      if (!tx) throw new Error('TX cannot be empty!');
      if (!tx.id) throw new Error('TX id cannot be empty!');
      if (!tx.amount) throw new Error('TX amount cannot be empty!');
      if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
      if (!tx.to) throw new Error('TX to cannot be empty!');
      assertPositiveBridgeTransactionAmount(tx.amount);

      const asset = getRegisteredTransactionAsset(tx.assetAddress);

      // ETH history keeps from=SORA and to=Ethereum in both transfer directions.
      if (!tx.from) throw new Error('TX from cannot be empty!');
      const evmAccount = tx.to;
      const recipient = tx.from;
      const network = tx.externalNetwork;
      const contractAddress = web3Store.contractAddress(KnownEthBridgeAsset.Other) as string;
      const guidedFunding = hasTonswapBridgeFundingTag(tx);
      const signingIdentity = tonswapBridgeSigningIdentity(tx);

      /** An approval may take minutes; never reuse it with a changed sender, chain or SORA destination. */
      const assertSigningContext = async (signerAddress = evmAccount): Promise<void> => {
        const chain = api.connection?.api;
        const chainGenesis = chain?.genesisHash?.toString() ?? '';
        const readFundingFees = () => ({
          swapFeeCodec: useSettingsStore().networkFees?.[Operation.Swap],
          ...(getTonswapBridgeFundingPurpose(tx) !== 'xor'
            ? { burnFeeCodec: useSettingsStore().networkFees?.[Operation.BurnWithRemark] }
            : {}),
          slippageTolerance: String(useSettingsStore().slippageTolerance ?? '2'),
        });
        const fundingFees = JSON.stringify(readFundingFees());
        const quoteExpiresAt = guidedFunding
          ? await assertTonswapBridgeQuote(tx, {
              readState: () => ({
                connected: !!chain?.isConnected && api.connection?.api === chain,
                genesis: chain?.genesisHash?.toString() ?? '',
                fees: readFundingFees(),
              }),
              quote: async (amountCodec) => {
                if (!chain?.isConnected) throw new Error('Unavailable network');
                const result = (
                  await chain.rpc.liquidityProxy.quote(
                    0,
                    DAI.address,
                    XOR.address,
                    amountCodec,
                    'WithDesiredInput',
                    ['XYKPool', 'OrderBook'],
                    'AllowSelected'
                  )
                ).unwrap();
                return { amount: result.amount.toString(), amountWithoutImpact: result.amountWithoutImpact.toString() };
              },
            })
          : null;
        const [isConnected, providedNetwork] = await Promise.all([
          ethersUtil.checkAccountIsConnected(evmAccount),
          ethersUtil.getEvmNetworkId(),
        ]);
        if (!isConnected) throw new Error('Connect account in ethereum wallet');
        if (
          !Number.isSafeInteger(network) ||
          !network ||
          !web3Store.isValidNetwork ||
          providedNetwork !== network ||
          web3Store.networkType !== BridgeNetworkType.Eth ||
          web3Store.networkSelected !== network ||
          web3Store.ethBridgeEvmNetwork !== network
        )
          throw new Error('Change evm network in wallet');
        if (
          !ethersUtil.addressesAreEqual(web3Store.evmAddress, evmAccount) ||
          !ethersUtil.addressesAreEqual(signerAddress, evmAccount) ||
          !ethersUtil.addressesAreEqual(tx.to, evmAccount)
        )
          throw new Error('[Bridge]: Ethereum account changed; review the transfer again');
        if (walletStore.address !== recipient || tx.from !== recipient)
          throw new Error('[Bridge]: SORA recipient changed; review the transfer again');
        if (web3Store.contractAddress(KnownEthBridgeAsset.Other) !== contractAddress)
          throw new Error('[Bridge]: Ethereum bridge configuration changed; review the transfer again');
        if (
          guidedFunding &&
          (quoteExpiresAt === null ||
            quoteExpiresAt <= Date.now() ||
            !chain?.isConnected ||
            api.connection?.api !== chain ||
            chain.genesisHash?.toString() !== chainGenesis ||
            JSON.stringify(readFundingFees()) !== fundingFees ||
            tonswapBridgeSigningIdentity(tx) !== signingIdentity ||
            tonswapBridgeSigningIdentity((ethBridgeApi.getHistory(id) as Nullable<EthHistory>) ?? {}) !==
              signingIdentity)
        )
          throw new Error('GET_TS_BRIDGE_CONTEXT_CHANGED');
      };

      await assertSigningContext();
      const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);

      if (!!allowance && FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(tx.amount))) {
        syncWaitingForApproveCompat(this, tx.id, true);

        let approvalTx: unknown;
        try {
          const tokenInstance = await ethersUtil.getTokenContract(asset.externalAddress);
          await assertSigningContext();
          approvalTx = await tokenInstance.approve(contractAddress, MaxUint256, {
            from: evmAccount,
            chainId: network,
          });
        } finally {
          syncWaitingForApproveCompat(this, tx.id, false);
        }

        await waitForEvmTransactionMined(approvalTx as never);
      }

      await assertSigningContext();
      const { contract, method, args } = await getIncomingEvmTransactionData({
        asset,
        value: tx.amount,
        recipient,
        getContractAddress: web3Store.contractAddress,
      });

      return await sendPreparedEvmBridgeTransaction(
        contract,
        method,
        args,
        recordSubmission,
        getEvmSubmissionLockName(tx.id, tx.externalNetwork),
        () => getExistingEvmSubmission(tx.id),
        { chainId: network!, validate: assertSigningContext }
      );
    },
    async subscribeOnBlockUpdates(): Promise<void> {
      const runtime = getBridgeRealtimeState(this);
      const settingsStore = useSettingsStore();

      syncBlockUpdatesSubscriptionCompat(this, null);
      clearReconcileTimer(this);
      runtime.reconcileInFlight = false;
      runtime.reconcilePending = false;
      await flushWorkerLifecycle(this);

      if (shouldUseWorkerDataPlane()) {
        const endpoint = resolveBridgeSubscriptionEndpoint(this);

        if (endpoint) {
          try {
            await dataPlaneClient.start({
              preferSharedWorker: Boolean(settingsStore.featureFlags.wsSharedWorker),
              profile: resolveRealtimeProfile(),
              maxConnections: resolveRealtimeConnectionCap(settingsStore.featureFlags.wsConnectionCaps),
            });

            const connectionId = `bridge-substrate:${endpoint}`;
            const subscriptionKey = `bridge:block-updates:${connectionId}`;
            const unsubscribeWorker = await dataPlaneClient.subscribeSubstrateFinalizedHeads(
              {
                connectionId,
                endpoint,
                subscriptionKey,
                priority: 'standard',
              },
              (payload) => {
                void updateExternalBlockNumber(this, parseSubstrateHeaderNumber(payload) ?? undefined);
                scheduleReconcile(this);
              }
            );

            let closed = false;
            const subscription = {
              unsubscribe: () => {
                if (closed) return;

                closed = true;
                clearReconcileTimer(this);
                void enqueueWorkerLifecycle(this, async () => {
                  try {
                    await unsubscribeWorker();
                  } finally {
                    await dataPlaneClient.disconnect(connectionId).catch(() => undefined);
                  }
                });
              },
            } as unknown as Subscription;

            syncBlockUpdatesSubscriptionCompat(this, subscription);
            return;
          } catch (error) {
            console.warn('[bridge] worker data-plane block subscription fallback', error);
          }
        }
      }

      const baseSubscription = api.system.updated.subscribe(() => {
        void updateExternalBlockNumber(this);
        scheduleReconcile(this);
      });

      let closed = false;
      const subscription = {
        unsubscribe: () => {
          if (closed) return;

          closed = true;
          clearReconcileTimer(this);
          baseSubscription.unsubscribe();
        },
      } as unknown as Subscription;

      syncBlockUpdatesSubscriptionCompat(this, subscription);
    },
    async updateOutgoingMaxLimit(): Promise<void> {
      const isCurrentRequest = beginBridgeRefresh(this, 'outgoingMaxLimit', () => getBridgeSelectionSignature(this));
      const limitAsset = this.form.assetAddress;

      syncOutgoingMaxLimitSubscriptionCompat(this, null);

      if (!limitAsset) return;

      const hasOutgoingLimit = await api.bridgeProxy.isAssetTransferLimited(limitAsset);
      if (!hasOutgoingLimit || !isCurrentRequest()) return;

      const referenceAsset = DAI.address;
      const sources = [LiquiditySourceTypes.XYKPool, LiquiditySourceTypes.XSTPool, LiquiditySourceTypes.OrderBook];
      const limitObservable = api.bridgeProxy.getCurrentTransferLimitObservable();
      const quoteObservable = api.swap.getSwapQuoteObservable(referenceAsset, limitAsset, sources, DexId.XOR);

      if (!quoteObservable || !isCurrentRequest()) return;

      let subscription: Subscription | undefined;

      await new Promise<void>((resolve) => {
        subscription = combineLatest([limitObservable, quoteObservable]).subscribe(([usdLimit, { quote }]) => {
          if (isCurrentRequest()) {
            syncOutgoingMaxLimitCompat(
              this,
              calculateBridgeOutgoingMaxLimit(limitAsset, referenceAsset, usdLimit, quote)
            );
          } else {
            subscription?.unsubscribe();
          }
          resolve();
        });
      });

      if (!isCurrentRequest()) {
        subscription?.unsubscribe();
        return;
      }

      syncOutgoingMaxLimitSubscriptionCompat(this, subscription ?? null);
    },
    async resetBridgeForm(): Promise<void> {
      await this.setAssetAddress();
      await this.setSendedAmount();
    },
    async setSendedAmount(value?: string): Promise<void> {
      const web3Store = useWeb3Store();

      this.setFocusedField(BridgeFocusedField.Sended);
      this.setAmountSend(value ?? '');
      this.setAmountReceived(
        calculateBridgeReceivedAmount({
          value,
          externalTransferFee: this.fees.externalTransferFee,
          externalDecimals: this.asset?.externalDecimals,
          isEthDenominatedAsset:
            web3Store.networkType === BridgeNetworkType.Eth && isDenominatedAsset(this.form.assetAddress),
          isSoraToEvm: this.form.isSoraToEvm,
          denominator: web3Store.denominator,
        })
      );
    },
    async setReceivedAmount(value?: string): Promise<void> {
      const web3Store = useWeb3Store();

      this.setFocusedField(BridgeFocusedField.Received);
      this.setAmountReceived(value ?? '');
      this.setAmountSend(
        calculateBridgeSendAmount({
          value,
          externalTransferFee: this.fees.externalTransferFee,
          externalDecimals: this.asset?.externalDecimals,
          isEthDenominatedAsset:
            web3Store.networkType === BridgeNetworkType.Eth && isDenominatedAsset(this.form.assetAddress),
          isSoraToEvm: this.form.isSoraToEvm,
          denominator: web3Store.denominator,
        })
      );
    },
    async switchDirection(): Promise<void> {
      syncDirectionCompat(this, !this.form.isSoraToEvm);
      syncBalancesBatchCompat(this, {
        sender: null,
        recipient: null,
      });

      await Promise.allSettled([
        this.updateExternalBalance(),
        this.updateExternalMinBalance(),
        this.updateFeesAndLockedFunds(),
      ]);

      if (this.form.focusedField === BridgeFocusedField.Received) {
        await this.setSendedAmount(this.form.amountReceived);
      } else {
        await this.setReceivedAmount(this.form.amountSend);
      }
    },
    async setAssetAddress(address?: string): Promise<void> {
      syncAssetAddressValueCompat(this, address);
      syncBalancesBatchCompat(this, {
        sender: null,
        recipient: null,
      });

      await Promise.allSettled([
        this.updateOutgoingMinLimit(),
        this.updateOutgoingMaxLimit(),
        this.updateIncomingMinLimit(),
        this.updateExternalBalance(),
        this.updateExternalMinBalance(),
        this.updateFeesAndLockedFunds(),
      ]);

      if (this.form.focusedField === BridgeFocusedField.Received) {
        await this.setReceivedAmount(this.form.amountReceived);
      } else {
        await this.setSendedAmount(this.form.amountSend);
      }
    },
    async generateHistoryItem(history?: unknown): Promise<unknown> {
      const bridgeApi = resolveBridgeApi();
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const isSubBridge = web3Store.networkType === BridgeNetworkType.Sub;
      const isEthBridge = web3Store.networkType === BridgeNetworkType.Eth;
      const input = isRecord(history) ? history : {};
      const date = typeof input.date === 'number' ? input.date : Date.now();
      const payload = isRecord(input.payload) ? input.payload : {};
      const transactionState = isEthBridge ? ETH_BRIDGE_STATES.INITIAL : BridgeTxStatus.Pending;
      const externalNetworkType = resolveBridgeExternalNetworkType(web3Store.networkType);
      const [from, to] = isSubBridge
        ? this.isSoraToEvm
          ? [this.sender, this.recipient]
          : [this.recipient, this.sender]
        : [walletStore.address, this.externalAccount];
      const historyData = {
        type: input.type ?? this.operation,
        amount: input.amount ?? this.form.amountSend,
        amount2: input.amount2 ?? this.form.amountReceived,
        symbol: input.symbol ?? this.asset?.symbol,
        assetAddress: input.assetAddress ?? this.asset?.address,
        startTime: date,
        endTime: date,
        transactionState,
        soraNetworkFee: input.soraNetworkFee ?? this.fees.soraNetworkFee,
        externalTransferFee: input.externalTransferFee ?? this.fees.externalTransferFee,
        externalNetworkFee: input.externalNetworkFee,
        externalNetwork: web3Store.networkSelected as BridgeNetworkId,
        externalNetworkType,
        from: input.from ?? from,
        to: input.to ?? to,
        payload,
      };
      const historyItem = bridgeApi.generateHistoryItem(historyData as never);

      if (!historyItem) {
        throw new Error('[Bridge]: "generateHistoryItem" failed');
      }

      await this.updateInternalHistory();
      this.setHistoryTransaction(historyItem.id, historyItem as IBridgeTransaction);

      return historyItem;
    },
    /**
     * Hands off transaction handling according to the persisted operation and
     * coalesces rapid repeated requests for the same transfer.
     */
    async handleBridgeTransaction(id: string): Promise<void> {
      const transaction = resolvePersistedBridgeTransaction(this.history.internal, id);

      if (!transaction) {
        throw new Error(`[Bridge]: Transaction not found: "${id}"`);
      }

      const transactionId = typeof transaction.id === 'string' && transaction.id ? transaction.id : id;

      // Account-indexed bridge settlements are immutable display records. They
      // have no source-chain signing evidence and must never enter a reducer.
      if (
        transaction.type === Operation.SubstrateIncoming &&
        transaction.externalNetworkType === BridgeNetworkType.Sub &&
        transaction.externalNetwork === SubNetworkId.Liberland &&
        isDisplayOnlyRecoveredSubBridgeHistory(transaction)
      ) {
        return;
      }

      const handler = resolveBridgeTransactionHandler(transaction);

      await runBridgeTransactionOnce(this, transactionId, handler);
    },
    /**
     * Removes a transaction from history, mirroring legacy behaviour.
     */
    async removeHistory(payload: { tx: Partial<IBridgeTransaction>; force?: boolean }): Promise<void> {
      const { tx, force = false } = payload;
      const { id, hash } = tx;

      if (!id) {
        return;
      }

      const bridgeApi = resolveBridgeApi();
      const item = bridgeApi.history?.[id] as Nullable<IBridgeTransaction>;

      if (!item) {
        return;
      }

      if (force) {
        await cancelBridgeTransactionTask(this, item.id || id);
      }

      const inProgress = this.history.inProgressIds[id];
      if (!force && inProgress) {
        return;
      }

      if (hash && inProgress) {
        this.addTransactionToProgress(hash);
        this.removeTransactionFromProgress(id);
      }

      if (hash && this.history.id === id) {
        syncHistoryIdCompat(this, hash);
      }

      const moonpayId = isRecord(item.payload) ? item.payload.moonpayId : null;
      if (typeof moonpayId === 'string' && moonpayId) {
        syncMoonpayAccountRecord(moonpayId, item.externalHash);
      }

      bridgeApi.removeHistory(id);
      await this.updateInternalHistory();
    },
    async beforeTransactionSign(signerApi: unknown, dialogMode?: BridgeTransactionSignDialogMode): Promise<void> {
      const walletStore = useWalletStore();

      const visibilityTarget =
        dialogMode === BridgeTransactionSignDialogMode.Bridge ? createBridgeSignDialogController(this) : undefined;

      await beforeTransactionSign(null, signerApi as never, visibilityTarget, {
        getPassword: walletStore.getPassword,
        isSignTxDialogDisabled: walletStore.isSignTxDialogDisabled,
      });
    },
    reset(): void {
      void cancelAllBridgeTransactionTasks(this);
      const initialState = buildInitialBridgeState();

      this.$patch(initialState);
    },
    /**
     * Cancels account-owned tracking before wallet identity changes without
     * tearing down bridge network subscriptions or the reusable connector.
     */
    async cancelAccountBoundTasks(): Promise<void> {
      const cancellation = cancelAllBridgeTransactionTasks(this);
      const initialState = buildInitialBridgeState();

      invalidateAccountBoundBridgeRequests(this);
      this.balances = initialState.balances;
      this.fees = initialState.fees;
      this.flags = initialState.flags;
      this.history.id = initialState.history.id;
      this.history.internal = initialState.history.internal;
      this.history.loading = initialState.history.loading;
      this.history.waitingForApprove = initialState.history.waitingForApprove;
      this.history.inProgressIds = initialState.history.inProgressIds;
      this.history.notificationData = initialState.history.notificationData;

      await cancellation;
    },
  },
});

export const useBridgeStore = useBridgeStoreBase;
