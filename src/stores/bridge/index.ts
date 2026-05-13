import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { getAssetBalance } from '@sora-substrate/sdk/build/assets';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeTxDirection, BridgeTxStatus, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { SubAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineStore } from 'pinia';
import { combineLatest } from 'rxjs';

import { MaxUint256, ZeroStringValue } from '@/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { beforeTransactionSign } from '@/lib/soraneo-wallet/src/util';
import { KnownEthBridgeAsset } from '@/consts/evm';
import { SUB_TRANSFER_FEES } from '@/consts/sub';
import { getDataPlaneClient, normalizeRealtimeProfile, parseSubstrateHeaderNumber } from '@/services/realtime';
import { resolveRegisteredAssets } from '@/stores/bridge/assets';
import { useAssetsStore } from '@/stores/assets';
import { BridgeFocusedField, type BridgeFormPatch, type BridgeState } from '@/stores/bridge/types';
import { useMoonpayStore } from '@/stores/moonpay';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import type { Nullable } from '@/types/common';
import type { TransactionSignVisibilityController } from '@/lib/soraneo-wallet/src/util';
import { BridgeTransactionSignDialogMode } from '@/utils/bridge/common/types';
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
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { updateSubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import { getBuildVariant, trackEvent } from '@/utils/telemetry';

import type { IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { SwapQuote } from '@sora-substrate/liquidity-proxy/build/types';
import type { Subscription } from 'rxjs';
import type { RealtimeProfile } from '@/services/realtime';

const normalizeHistoryPage = (page?: number): number => {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
};

const buildInitialState = (): BridgeState => ({
  form: {
    isSoraToEvm: true,
    assetAddress: '',
    amountSend: '',
    amountReceived: '',
    focusedField: null,
  },
  balances: {
    assetSenderBalance: null,
    assetRecipientBalance: null,
    assetLockedBalance: null,
    assetExternalMinBalance: ZeroStringValue,
    incomingMinLimit: FPNumber.ZERO,
    outgoingMinLimit: null,
    outgoingMaxLimit: null,
  },
  fees: {
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalNativeBalance: ZeroStringValue,
    externalBlockNumber: 0,
  },
  flags: {
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    isSignTxDialogVisible: false,
  },
  history: {
    internal: {},
    page: 1,
    id: '',
    loading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
  },
  subscriptions: {
    outgoingMaxLimit: null,
    blockUpdates: null,
  },
  connector: new SubNetworksConnector(),
});

type BridgeStateStoreLike = {
  $patch: (state: Partial<BridgeState> | ((state: BridgeState) => void)) => void;
} & Pick<BridgeState, 'history' | 'flags' | 'balances' | 'fees' | 'subscriptions' | 'form'>;
type BridgeRealtimeStoreLike = BridgeStateStoreLike &
  Pick<BridgeState, 'connector'> & {
    $subscribe: (...args: any[]) => () => void;
    updateExternalBalance: () => Promise<void>;
    updateExternalMinBalance: () => Promise<void>;
    updateFeesAndLockedFunds: () => Promise<void>;
  };
type BridgeApiLike = {
  history: Record<string, IBridgeTransaction>;
  generateHistoryItem: (data: unknown) => Nullable<IBridgeTransaction>;
  removeHistory: (id: string) => void;
  getLockedAssets?: (...params: any[]) => Promise<CodecString>;
  getNetworkFee?: (...params: any[]) => Promise<CodecString>;
};
type BridgeRealtimeRuntimeState = {
  reconcileTimer: ReturnType<typeof setTimeout> | null;
  reconcileInFlight: boolean;
  reconcileLastRunTs: number;
  reconcilePending: boolean;
  workerLifecycle: Promise<void>;
};

const BRIDGE_REALTIME_RUNTIME_STATE = new WeakMap<object, BridgeRealtimeRuntimeState>();
const PROFILE_RECONCILE_INTERVAL_MS: Record<RealtimeProfile, { visible: number; hidden: number }> = {
  balanced: { visible: 1000, hidden: 5000 },
  ultra: { visible: 250, hidden: 1000 },
  load_first: { visible: 2000, hidden: 7000 },
};
const dataPlaneClient = getDataPlaneClient();

let lastEvmBlockPollTs = 0;

const Direction =
  BridgeTxDirection ??
  ({
    Outgoing: 'Outgoing',
    Incoming: 'Incoming',
  } as Record<'Outgoing' | 'Incoming', string>);

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object';

// Bridge signing still relies on wallet-level password checks, but the dialog
// itself is owned by the bridge Pinia UI state instead of a root-store mutation.
const createBridgeSignDialogController = (store: BridgeRealtimeStoreLike): TransactionSignVisibilityController => {
  return {
    setVisibility: (visible: boolean) => {
      store.setSignTxDialogVisibility(visible);
    },
    subscribe: (handler: (visible: boolean) => void) => {
      let previous = Boolean(store.flags.isSignTxDialogVisible);

      return store.$subscribe(
        (_mutation, state) => {
          const next = Boolean(state.flags?.isSignTxDialogVisible);

          if (next === previous) {
            return;
          }

          previous = next;
          handler(next);
        },
        { detached: true, flush: 'sync' }
      );
    },
  };
};

const getBridgeRealtimeState = (store: BridgeRealtimeStoreLike): BridgeRealtimeRuntimeState => {
  const key = store as object;
  const existing = BRIDGE_REALTIME_RUNTIME_STATE.get(key);

  if (existing) {
    return existing;
  }

  const created: BridgeRealtimeRuntimeState = {
    reconcileTimer: null,
    reconcileInFlight: false,
    reconcileLastRunTs: 0,
    reconcilePending: false,
    workerLifecycle: Promise.resolve(),
  };

  BRIDGE_REALTIME_RUNTIME_STATE.set(key, created);

  return created;
};

const enqueueWorkerLifecycle = (store: BridgeRealtimeStoreLike, task: () => Promise<void>): Promise<void> => {
  const runtime = getBridgeRealtimeState(store);
  runtime.workerLifecycle = runtime.workerLifecycle.then(task, task).catch(() => undefined);

  return runtime.workerLifecycle;
};

const flushWorkerLifecycle = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  await getBridgeRealtimeState(store).workerLifecycle;
};

const resolveConnectionCap = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (value === true) {
    return 4;
  }

  return Number.MAX_SAFE_INTEGER;
};

const resolveRealtimeProfile = (): RealtimeProfile => {
  return normalizeRealtimeProfile(useSettingsStore().featureFlags.wsProfile) as RealtimeProfile;
};

const resolveReconcileInterval = (): number => {
  const profile = resolveRealtimeProfile();
  const visible = typeof document === 'undefined' ? true : document.visibilityState === 'visible';
  const schedule = PROFILE_RECONCILE_INTERVAL_MS[profile];

  return visible ? schedule.visible : schedule.hidden;
};

const clearReconcileTimer = (store: BridgeRealtimeStoreLike): void => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileTimer) {
    clearTimeout(runtime.reconcileTimer);
  }

  runtime.reconcileTimer = null;
  runtime.reconcilePending = false;
};

const refreshRealtimeBridgeData = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  await Promise.allSettled([
    store.updateExternalBalance(),
    store.updateExternalMinBalance(),
    store.updateFeesAndLockedFunds(),
  ]);
};

const runScheduledReconcile = async (store: BridgeRealtimeStoreLike): Promise<void> => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileInFlight) {
    runtime.reconcilePending = true;
    return;
  }

  runtime.reconcileInFlight = true;
  runtime.reconcilePending = false;
  runtime.reconcileLastRunTs = Date.now();

  try {
    await refreshRealtimeBridgeData(store);
  } finally {
    runtime.reconcileInFlight = false;

    if (runtime.reconcilePending) {
      runtime.reconcilePending = false;
      scheduleReconcile(store);
    }
  }
};

const scheduleReconcile = (store: BridgeRealtimeStoreLike): void => {
  const runtime = getBridgeRealtimeState(store);

  if (runtime.reconcileInFlight) {
    runtime.reconcilePending = true;
    return;
  }

  if (runtime.reconcileTimer) {
    return;
  }

  const interval = resolveReconcileInterval();
  const now = Date.now();
  const delay = Math.max(0, interval - (now - runtime.reconcileLastRunTs));

  runtime.reconcileTimer = setTimeout(() => {
    runtime.reconcileTimer = null;
    void runScheduledReconcile(store);
  }, delay);
};

const resolveBridgeSubscriptionEndpoint = (store: BridgeRealtimeStoreLike): string | null => {
  if (useWeb3Store().networkType === BridgeNetworkType.Sub) {
    return (
      store.connector.network?.subNetworkConnection?.connection?.endpoint ??
      store.connector.network?.subNetworkConnection?.node?.address ??
      null
    );
  }

  const settingsStore = useSettingsStore();

  return settingsStore.appConnection?.connection?.endpoint ?? settingsStore.appConnection?.node?.address ?? null;
};

const shouldUseWorkerDataPlane = (): boolean => {
  return Boolean(useSettingsStore().featureFlags.wsWorkerDataPlane);
};

const getSoraBalance = async (accountAddress: string, asset: RegisteredAccountAsset): Promise<CodecString> => {
  const accountBalance = await getAssetBalance(api.api, accountAddress, asset.address, asset.decimals);
  return accountBalance.transferable;
};

const getExternalBalance = async (
  accountAddress: string,
  asset: RegisteredAccountAsset,
  isSub: boolean,
  subConnector: SubNetworksConnector
): Promise<CodecString> => {
  return isSub
    ? await subConnector.network.getTokenBalance(accountAddress, asset)
    : await ethersUtil.getAccountAssetBalance(accountAddress, asset.externalAddress);
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

    return balances[0]?.balance ?? ZeroStringValue;
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

const isPositiveFiniteAmount = (amount?: Nullable<string>): boolean => {
  const normalized = amount?.trim();

  if (!normalized) return false;

  const value = new FPNumber(normalized);

  return value.isFinity() && value.isGtZero();
};

/**
 * Prevents zero, negative, or non-finite transaction amounts from reaching wallet signing helpers.
 */
const assertPositiveTransactionAmount = (amount: string): void => {
  const value = new FPNumber(amount);

  if (!value.isFinity() || !value.isGtZero()) {
    throw new Error('TX amount must be greater than zero!');
  }
};

const calculateMaxLimit = (
  limitAsset: string,
  referenceAsset: string,
  usdLimit: CodecString,
  quote: SwapQuote
): Nullable<FPNumber> => {
  const outgoingLimitUSD = FPNumber.fromCodecValue(usdLimit);

  if (outgoingLimitUSD.isZero() || limitAsset === referenceAsset) return outgoingLimitUSD;

  try {
    const quoteAmount = FPNumber.ONE;
    const {
      result: { amount },
    } = quote(limitAsset, referenceAsset, quoteAmount.toString(), false, [], false);
    const assetPriceUSD = FPNumber.fromCodecValue(amount);

    if (!assetPriceUSD.isFinity() || assetPriceUSD.isZero()) return null;

    return outgoingLimitUSD.div(assetPriceUSD);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const chainAddress = (address: string, connector: SubNetworksConnector): string => {
  const formatter = connector?.network?.formatAddress;
  const isConnected = connector?.network?.subNetworkConnection?.nodeIsConnected;

  if (isConnected && typeof formatter === 'function') {
    return formatter(address);
  }

  return address;
};

const updateExternalBlockNumber = async (
  store: BridgeRealtimeStoreLike,
  knownSubBlockNumber?: number
): Promise<void> => {
  const isSubBridge = useWeb3Store().networkType === BridgeNetworkType.Sub;

  try {
    if (isSubBridge) {
      if (Number.isFinite(knownSubBlockNumber)) {
        syncExternalBlockNumberCompat(store, knownSubBlockNumber as number);
        return;
      }

      const subNetwork = store.connector?.network;
      if (!subNetwork?.getBlockNumber) {
        syncExternalBlockNumberCompat(store, 0);
        return;
      }

      syncExternalBlockNumberCompat(store, await subNetwork.getBlockNumber());
      return;
    }

    const now = Date.now();
    if (now - lastEvmBlockPollTs < 3000) {
      return;
    }

    lastEvmBlockPollTs = now;
    syncExternalBlockNumberCompat(store, await ethersUtil.getBlockNumber());
  } catch (error) {
    console.error(error);
    syncExternalBlockNumberCompat(store, 0);
  }
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

const syncInternalHistoryCompat = (
  store: BridgeStateStoreLike,
  history: Record<string, IBridgeTransaction> = {}
): Record<string, IBridgeTransaction> => {
  const nextHistory = Object.freeze({ ...history }) as Record<string, IBridgeTransaction>;

  store.history.internal = nextHistory;

  return nextHistory;
};

const syncHistoryPageCompat = (store: BridgeStateStoreLike, page?: number): number => {
  const nextPage = normalizeHistoryPage(page);

  store.history.page = nextPage;

  return nextPage;
};

const syncHistoryIdCompat = (store: BridgeStateStoreLike, id?: string): string => {
  const nextId = id ?? '';

  store.history.id = nextId;

  return nextId;
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

const syncHistoryLoadingCompat = (
  store: BridgeStateStoreLike,
  networkId: BridgeNetworkId,
  loading: boolean
): Record<string, boolean> => {
  const nextLoading = { ...store.history.loading } as Record<string, boolean>;

  if (loading) {
    nextLoading[networkId] = true;
  } else {
    delete nextLoading[networkId];
  }

  store.history.loading = nextLoading;

  return nextLoading;
};

const syncBalancesFetchingCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.balancesFetching = flag;

  return flag;
};

const syncBalancesBatchCompat = (
  store: BridgeStateStoreLike,
  data: { sender?: Nullable<CodecString>; recipient?: Nullable<CodecString>; native?: CodecString }
): void => {
  if (data.sender !== undefined) {
    store.balances.assetSenderBalance = data.sender ?? null;
  }
  if (data.recipient !== undefined) {
    store.balances.assetRecipientBalance = data.recipient ?? null;
  }
  if (data.native !== undefined) {
    store.fees.externalNativeBalance = data.native ?? ZeroStringValue;
  }
};

const syncExternalBlockNumberCompat = (store: BridgeStateStoreLike, value?: number): number => {
  const blockNumber = Number.isFinite(Number(value)) ? Number(value) : 0;

  store.fees.externalBlockNumber = blockNumber;

  return store.fees.externalBlockNumber;
};

const syncAssetLockedBalanceCompat = (store: BridgeStateStoreLike, value: Nullable<FPNumber>): Nullable<FPNumber> => {
  store.balances.assetLockedBalance = value ?? null;

  return store.balances.assetLockedBalance;
};

const syncSoraNetworkFeeCompat = (store: BridgeStateStoreLike, fee?: Nullable<CodecString>): CodecString => {
  store.fees.soraNetworkFee = fee ?? ZeroStringValue;

  return store.fees.soraNetworkFee;
};

const syncExternalTransferFeeCompat = (store: BridgeStateStoreLike, fee?: Nullable<CodecString>): CodecString => {
  store.fees.externalTransferFee = fee ?? ZeroStringValue;

  return store.fees.externalTransferFee;
};

const syncExternalNetworkFeeCompat = (store: BridgeStateStoreLike, fee?: Nullable<CodecString>): CodecString => {
  store.fees.externalNetworkFee = fee ?? ZeroStringValue;

  return store.fees.externalNetworkFee;
};

const syncFeesAndLockedFundsFetchingCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.feesAndLockedFundsFetching = flag;

  return store.flags.feesAndLockedFundsFetching;
};

const syncExternalMinBalanceCompat = (store: BridgeStateStoreLike, balance?: Nullable<CodecString>): CodecString => {
  store.balances.assetExternalMinBalance = balance ?? ZeroStringValue;

  return store.balances.assetExternalMinBalance;
};

const syncIncomingMinLimitCompat = (store: BridgeStateStoreLike, amount: FPNumber): FPNumber => {
  store.balances.incomingMinLimit = amount ?? FPNumber.ZERO;

  return store.balances.incomingMinLimit;
};

const syncOutgoingMinLimitCompat = (store: BridgeStateStoreLike, amount: Nullable<FPNumber>): Nullable<FPNumber> => {
  store.balances.outgoingMinLimit = amount ?? null;

  return store.balances.outgoingMinLimit;
};

const syncOutgoingMaxLimitCompat = (store: BridgeStateStoreLike, amount: Nullable<FPNumber>): Nullable<FPNumber> => {
  store.balances.outgoingMaxLimit = amount ?? null;

  return store.balances.outgoingMaxLimit;
};

const syncOutgoingMaxLimitSubscriptionCompat = (
  store: BridgeStateStoreLike,
  subscription: Nullable<Subscription>
): Nullable<Subscription> => {
  store.subscriptions.outgoingMaxLimit?.unsubscribe?.();
  store.subscriptions.outgoingMaxLimit = subscription ?? null;

  if (!subscription) {
    store.balances.outgoingMaxLimit = null;
  }

  return store.subscriptions.outgoingMaxLimit;
};

const syncBlockUpdatesSubscriptionCompat = (
  store: BridgeStateStoreLike,
  subscription: Nullable<Subscription>
): Nullable<Subscription> => {
  store.subscriptions.blockUpdates?.unsubscribe?.();
  store.subscriptions.blockUpdates = subscription ?? null;

  return store.subscriptions.blockUpdates;
};

const syncDirectionCompat = (store: BridgeStateStoreLike, isSoraToEvm: boolean): boolean => {
  store.form.isSoraToEvm = isSoraToEvm;

  return store.form.isSoraToEvm;
};

const syncAssetAddressValueCompat = (store: BridgeStateStoreLike, address?: Nullable<string>): string => {
  store.form.assetAddress = address ?? '';

  return store.form.assetAddress;
};

const syncFocusedFieldCompat = (
  store: BridgeStateStoreLike,
  field: Nullable<BridgeFocusedField>
): Nullable<BridgeFocusedField> => {
  store.form.focusedField = field ?? null;

  return store.form.focusedField;
};

const syncAmountSendCompat = (store: BridgeStateStoreLike, value?: Nullable<string>): string => {
  store.form.amountSend = value ?? '';

  return store.form.amountSend;
};

const syncAmountReceivedCompat = (store: BridgeStateStoreLike, value?: Nullable<string>): string => {
  store.form.amountReceived = value ?? '';

  return store.form.amountReceived;
};

const syncWaitingForApproveCompat = (
  store: BridgeStateStoreLike,
  id: string,
  pending: boolean
): Record<string, boolean> => {
  const nextWaitingForApprove = { ...store.history.waitingForApprove } as Record<string, boolean>;

  if (pending) {
    nextWaitingForApprove[id] = true;
  } else {
    delete nextWaitingForApprove[id];
  }

  store.history.waitingForApprove = nextWaitingForApprove;

  return nextWaitingForApprove;
};

const syncInProgressCompat = (store: BridgeStateStoreLike, id: string, pending: boolean): Record<string, boolean> => {
  const nextInProgress = { ...store.history.inProgressIds } as Record<string, boolean>;

  if (pending) {
    nextInProgress[id] = true;
  } else {
    delete nextInProgress[id];
  }

  store.history.inProgressIds = nextInProgress;

  return nextInProgress;
};

const syncNotificationCompat = (
  store: BridgeStateStoreLike,
  data: Nullable<IBridgeTransaction>
): Nullable<IBridgeTransaction> => {
  store.history.notificationData = data ?? null;

  return store.history.notificationData;
};

const syncSignDialogVisibilityCompat = (store: BridgeStateStoreLike, flag: boolean): boolean => {
  store.flags.isSignTxDialogVisible = flag;

  return store.flags.isSignTxDialogVisible;
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
  state: (): BridgeState => buildInitialState(),
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
      const web3Store = useWeb3Store();

      switch (web3Store.networkType) {
        case BridgeNetworkType.Eth:
          return this.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming;
        case BridgeNetworkType.Evm:
          return this.isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming;
        default:
          return this.isSoraToEvm ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
      }
    },
    /**
     * Determines whether the user can press submit based on the amount and loading flags.
     */
    canSubmit(state): boolean {
      return (
        isPositiveFiniteAmount(state.form.amountSend) &&
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
    nativeToken(): Nullable<RegisteredAccountAsset> {
      const walletStore = useWalletStore();
      const assetsStore = useAssetsStore();
      const registeredAssets = assetsStore.registeredAssets ?? {};
      const symbol = useWeb3Store().selectedNetworkData?.nativeCurrency?.symbol;
      const walletAssets = Array.isArray(walletStore.assets)
        ? walletStore.assets
        : Object.values(walletStore.assetsDataTable ?? {});

      if (!symbol) return null;

      const registered = walletAssets.find((asset) => asset.symbol === symbol && asset.address in registeredAssets);
      if (registered) return assetsStore.assetDataByAddress(registered.address);

      for (const address of Object.keys(registeredAssets)) {
        const asset = assetsStore.assetDataByAddress(address);
        if (asset?.symbol === symbol) return asset;
      }

      return null;
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
      return Object.values(state.history.internal).reduce<Record<string, IBridgeTransaction>>((buffer, item) => {
        if (!item?.id) return buffer;

        return { ...buffer, [item.id]: item };
      }, {});
    },
    activeTransaction(state): Nullable<IBridgeTransaction> {
      if (!state.history.id) return null;

      return this.historyRecord[state.history.id] ?? null;
    },
    subBridgeConnector(state): SubNetworksConnector {
      return state.connector;
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

      syncInternalHistoryCompat(this, history);
    },
    /**
     * Fetches external network history through the direct bridge runtime helpers.
     * @param clearHistory Whether to clear previously cached entries before fetching.
     */
    async updateExternalHistory(clearHistory = false): Promise<void> {
      const web3Store = useWeb3Store();
      const networkHistoryId = this.networkHistoryId;

      if (!networkHistoryId || this.history.loading[networkHistoryId]) {
        return;
      }

      syncHistoryLoadingCompat(this, networkHistoryId, true);

      try {
        const context = createExternalHistoryContext(this);

        if (web3Store.networkType === BridgeNetworkType.Eth) {
          const updateHistory = updateEthBridgeHistory(context as never);
          await updateHistory(clearHistory, () => this.updateInternalHistory());
        } else if (web3Store.networkType === BridgeNetworkType.Sub) {
          const updateHistory = updateSubBridgeHistory(context as never);
          await updateHistory(clearHistory, () => this.updateInternalHistory());
        } else if (web3Store.networkType === BridgeNetworkType.Evm) {
          const updateHistory = updateEvmBridgeHistory(context as never);
          await updateHistory(clearHistory, () => this.updateInternalHistory());
        }
      } finally {
        syncHistoryLoadingCompat(this, networkHistoryId, false);
      }
    },
    async updateExternalBalance(): Promise<void> {
      const sender = this.sender;
      const recipient = this.recipient;
      const asset = this.asset;
      const nativeToken = this.nativeToken;
      const isSubBridge = this.isSubBridge;
      const isRegisteredAsset = this.isRegisteredAsset;
      const isSoraToEvm = this.form.isSoraToEvm;
      const subConnector = this.connector;
      const spender = isSubBridge ? sender : isSoraToEvm ? recipient : sender;

      syncBalancesFetchingCompat(this, true);

      try {
        if (isSubBridge) {
          try {
            const balances = await subConnector.network.getTokenBalancesBatch([
              { accountAddress: sender, asset },
              { accountAddress: recipient, asset },
              { accountAddress: spender, asset: nativeToken },
            ]);

            syncBalancesBatchCompat(this, {
              sender: balances[0],
              recipient: balances[1],
              native: balances[2],
            });
          } catch {
            const [senderBalance, recipientBalance, nativeBalance] = await Promise.all([
              getAccountBridgeBalance(sender, asset, isSoraToEvm, true, subConnector),
              getAccountBridgeBalance(recipient, asset, !isSoraToEvm, true, subConnector),
              getAccountBridgeBalance(spender, nativeToken, false, true, subConnector),
            ]);

            syncBalancesBatchCompat(this, {
              sender: senderBalance,
              recipient: recipientBalance,
              native: nativeBalance,
            });
          }

          return;
        }

        const soraAccount = isSoraToEvm ? sender : recipient;
        const externalAccount = isSoraToEvm ? recipient : sender;
        const [soraBalance, externalBalance, nativeBalance] = await Promise.all([
          getAccountBridgeBalance(soraAccount, asset, true, false, subConnector),
          getEvmBridgeAssetBalance(externalAccount, asset, isRegisteredAsset, subConnector),
          getAccountBridgeBalance(spender, nativeToken, false, false, subConnector),
        ]);
        const senderBalance = isSoraToEvm ? soraBalance : externalBalance;
        const recipientBalance = isSoraToEvm ? externalBalance : soraBalance;

        syncBalancesBatchCompat(this, {
          sender: senderBalance,
          recipient: recipientBalance,
          native: nativeBalance,
        });
      } finally {
        syncBalancesFetchingCompat(this, false);
      }
    },
    async updateExternalMinBalance(): Promise<void> {
      let minBalance = ZeroStringValue;

      try {
        if (this.isSubBridge && this.asset && !this.form.isSoraToEvm) {
          minBalance = await this.connector.network.getAssetMinDeposit(this.asset);
        }
      } catch {
        minBalance = ZeroStringValue;
      }

      syncExternalMinBalanceCompat(this, minBalance);
    },
    async updateExternalLockedBalance(): Promise<void> {
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

            syncAssetLockedBalanceCompat(this, balance);
            return;
          }

          syncAssetLockedBalanceCompat(this, null);
          return;
        }

        if (asset?.address && web3Store.networkSelected) {
          const bridgeApi = resolveBridgeApi();
          const value = await bridgeApi.getLockedAssets?.(web3Store.networkSelected as never, asset.address);

          if (value !== undefined) {
            syncAssetLockedBalanceCompat(this, FPNumber.fromCodecValue(value, asset.decimals));
            return;
          }
        }
      } catch {
        // Clear stale financial state when provider data cannot be trusted.
      }

      syncAssetLockedBalanceCompat(this, null);
    },
    async updateExternalNetworkFee(): Promise<void> {
      const asset = this.asset;
      let fee = ZeroStringValue;

      try {
        if (this.isSubBridge) {
          if (asset && this.isRegisteredAsset && this.sender && this.recipient) {
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
            isPositiveFiniteAmount(this.form.amountSend)
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
              web3Store.contractAddress(KnownEthBridgeAsset.Other),
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

      syncExternalNetworkFeeCompat(this, fee);
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

      syncSoraNetworkFeeCompat(this, fee);
    },
    async updateFeesAndLockedFunds(): Promise<void> {
      syncFeesAndLockedFundsFetchingCompat(this, true);

      try {
        await Promise.allSettled([
          this.updateExternalLockedBalance(),
          this.updateExternalNetworkFee(),
          this.updateExternalTransferFee(),
          this.updateSoraNetworkFee(),
        ]);
      } finally {
        syncFeesAndLockedFundsFetchingCompat(this, false);
      }
    },
    async updateIncomingMinLimit(): Promise<void> {
      let minLimit = FPNumber.ZERO;

      if (this.isSubBridge && this.asset && this.isRegisteredAsset && this.connector.soraParachain) {
        try {
          const value = await this.connector.soraParachain.getAssetMinimumAmount(this.asset.address);
          minLimit = FPNumber.fromCodecValue(value, this.asset.externalDecimals);
        } catch (error) {
          console.error(error);
        }
      }

      syncIncomingMinLimitCompat(this, minLimit);
    },
    async updateOutgoingMinLimit(): Promise<void> {
      let minLimit = FPNumber.ZERO;

      if (this.isSubBridge && this.asset && this.isRegisteredAsset) {
        try {
          const value = await this.connector.network.getAssetMinDeposit(this.asset);
          minLimit = FPNumber.fromCodecValue(value, this.asset.externalDecimals);
        } catch (error) {
          console.error(error);
        }
      }

      syncOutgoingMinLimitCompat(this, minLimit);
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
    async signEthBridgeOutgoingEvm(id: string): Promise<unknown> {
      const web3Store = useWeb3Store();
      const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

      if (!tx) throw new Error('TX cannot be empty!');
      if (!tx.id) throw new Error('TX id cannot be empty!');
      if (!tx.amount) throw new Error('TX amount cannot be empty!');
      if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
      if (!tx.to) throw new Error('TX to cannot be empty!');
      assertPositiveTransactionAmount(tx.amount);

      const asset = getRegisteredTransactionAsset(tx.assetAddress);

      if (!web3Store.isValidNetwork) {
        throw new Error('Change evm network in wallet');
      }

      const amount = isDenominatedAsset(asset.address) ? tx.amount2 || tx.amount : tx.amount;
      assertPositiveTransactionAmount(amount);

      const request = await waitForApprovedRequest(tx);

      if (!ethersUtil.addressesAreEqual(web3Store.evmAddress, request.to)) {
        throw new Error(`Change account in ethereum wallet to ${request.to}`);
      }

      const { contract, method, args } = await getOutgoingEvmTransactionData({
        asset,
        value: amount,
        recipient: tx.to,
        getContractAddress: web3Store.contractAddress,
        request,
      });

      return await contract[method](...args);
    },
    async signEthBridgeIncomingEvm(id: string): Promise<unknown> {
      const walletStore = useWalletStore();
      const web3Store = useWeb3Store();
      const tx = ethBridgeApi.getHistory(id) as Nullable<EthHistory>;

      if (!tx) throw new Error('TX cannot be empty!');
      if (!tx.id) throw new Error('TX id cannot be empty!');
      if (!tx.amount) throw new Error('TX amount cannot be empty!');
      if (!tx.assetAddress) throw new Error('TX assetAddress cannot be empty!');
      if (!tx.to) throw new Error('TX to cannot be empty!');
      assertPositiveTransactionAmount(tx.amount);

      const asset = getRegisteredTransactionAsset(tx.assetAddress);

      const evmAccount = web3Store.evmAddress;
      const isEvmAccountConnected = await ethersUtil.checkAccountIsConnected(evmAccount);

      if (!isEvmAccountConnected) throw new Error('Connect account in ethereum wallet');
      if (!web3Store.isValidNetwork) throw new Error('Change evm network in wallet');

      const contractAddress = web3Store.contractAddress(KnownEthBridgeAsset.Other) as string;
      const allowance = await ethersUtil.getAllowance(evmAccount, contractAddress, asset.externalAddress);

      if (!!allowance && FPNumber.isLessThan(new FPNumber(allowance), new FPNumber(tx.amount))) {
        syncWaitingForApproveCompat(this, tx.id, true);

        let approvalTx: unknown;
        try {
          if (!web3Store.isValidNetwork) {
            throw new Error('Change evm network in wallet');
          }

          const tokenInstance = await ethersUtil.getTokenContract(asset.externalAddress);
          const methodArgs = [contractAddress, MaxUint256];
          approvalTx = await tokenInstance.approve(...methodArgs);
        } finally {
          syncWaitingForApproveCompat(this, tx.id, false);
        }

        await waitForEvmTransactionMined(approvalTx as never);
      }

      const { contract, method, args } = await getIncomingEvmTransactionData({
        asset,
        value: tx.amount,
        recipient: walletStore.address,
        getContractAddress: web3Store.contractAddress,
      });

      return await contract[method](...args);
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
              maxConnections: resolveConnectionCap(settingsStore.featureFlags.wsConnectionCaps),
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
      const limitAsset = this.form.assetAddress;

      syncOutgoingMaxLimitSubscriptionCompat(this, null);

      if (!limitAsset) return;

      const hasOutgoingLimit = await api.bridgeProxy.isAssetTransferLimited(limitAsset);
      if (!hasOutgoingLimit) return;

      const referenceAsset = DAI.address;
      const sources = [LiquiditySourceTypes.XYKPool, LiquiditySourceTypes.XSTPool, LiquiditySourceTypes.OrderBook];
      const limitObservable = api.bridgeProxy.getCurrentTransferLimitObservable();
      const quoteObservable = api.swap.getSwapQuoteObservable(referenceAsset, limitAsset, sources, DexId.XOR);

      if (!quoteObservable) return;

      let subscription!: Subscription;

      await new Promise<void>((resolve) => {
        subscription = combineLatest([limitObservable, quoteObservable]).subscribe(([usdLimit, { quote }]) => {
          syncOutgoingMaxLimitCompat(this, calculateMaxLimit(limitAsset, referenceAsset, usdLimit, quote));
          resolve();
        });
      });

      syncOutgoingMaxLimitSubscriptionCompat(this, subscription);
    },
    async resetBridgeForm(): Promise<void> {
      await this.setAssetAddress();
      await this.setSendedAmount();
    },
    async setSendedAmount(value?: string): Promise<void> {
      const web3Store = useWeb3Store();

      this.setFocusedField(BridgeFocusedField.Sended);
      this.setAmountSend(value ?? '');

      if (value) {
        const sended = new FPNumber(value);
        const fee = FPNumber.fromCodecValue(this.fees.externalTransferFee, this.asset?.externalDecimals);
        const expected = sended.sub(fee);
        let received = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

        if (web3Store.networkType === BridgeNetworkType.Eth && isDenominatedAsset(this.form.assetAddress)) {
          const denominator = web3Store.denominator;
          received = this.form.isSoraToEvm ? received.mul(denominator) : received.div(denominator);
        }

        this.setAmountReceived(received.toString());
      } else {
        this.setAmountReceived('');
      }
    },
    async setReceivedAmount(value?: string): Promise<void> {
      const web3Store = useWeb3Store();

      this.setFocusedField(BridgeFocusedField.Received);
      this.setAmountReceived(value ?? '');

      if (value) {
        const received = new FPNumber(value);
        const fee = FPNumber.fromCodecValue(this.fees.externalTransferFee, this.asset?.externalDecimals);
        const expected = received.add(fee);
        let sended = FPNumber.isGreaterThan(expected, FPNumber.ZERO) ? expected : FPNumber.ZERO;

        if (web3Store.networkType === BridgeNetworkType.Eth && isDenominatedAsset(this.form.assetAddress)) {
          const denominator = web3Store.denominator;
          sended = this.form.isSoraToEvm ? sended.div(denominator) : sended.mul(denominator);
        }

        this.setAmountSend(sended.toString());
      } else {
        this.setAmountSend('');
      }
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
      const isEvmBridge = web3Store.networkType === BridgeNetworkType.Evm;
      const isEthBridge = web3Store.networkType === BridgeNetworkType.Eth;
      const input = isRecord(history) ? history : {};
      const date = typeof input.date === 'number' ? input.date : Date.now();
      const payload = isRecord(input.payload) ? input.payload : {};
      const transactionState = isEthBridge ? ETH_BRIDGE_STATES.INITIAL : BridgeTxStatus.Pending;
      const externalNetworkType = isSubBridge
        ? BridgeNetworkType.Sub
        : isEvmBridge
          ? BridgeNetworkType.Evm
          : BridgeNetworkType.Eth;
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
        externalNetwork: web3Store.networkSelected as BridgeNetworkId as any,
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

      return historyItem;
    },
    /**
     * Hands off transaction handling to the legacy bridge action handler.
     */
    async handleBridgeTransaction(id: string): Promise<void> {
      const web3Store = useWeb3Store();

      if (web3Store.networkType === BridgeNetworkType.Eth) {
        await ethBridge.handleTransaction(id);
        return;
      }

      if (web3Store.networkType === BridgeNetworkType.Evm) {
        await evmBridge.handleTransaction(id);
        return;
      }

      if (web3Store.networkType === BridgeNetworkType.Sub) {
        await subBridge.handleTransaction(id);
      }
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
      const initialState = buildInitialState();

      this.$patch(initialState);
    },
  },
});

export const useBridgeStore = useBridgeStoreBase;
