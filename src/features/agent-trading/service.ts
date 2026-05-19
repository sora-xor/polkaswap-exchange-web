import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/sdk';
import { filter, firstValueFrom, map, timeout } from 'rxjs';

import { DefaultSlippageTolerance } from '@/consts';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { getCurrentIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { getWallet } from '@/lib/soraneo-wallet/src/services/wallet';
import { KnownAssets, XOR } from '@/lib/substrate/sdk/assets/consts';
import { DexId } from '@/lib/substrate/sdk/dex/consts';
import { Operation } from '@/lib/substrate/sdk/types';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';

import { collectAssets, resolveAssetRef, toAgentAsset, type AgentAssetContext } from './assets';
import { agentError, normalizeAgentError } from './errors';
import {
  normalizeDexId,
  normalizeLiquiditySource,
  normalizeNaturalAmount,
  normalizeOptionalNaturalAmount,
  normalizePercent,
  normalizeReadyTimeoutMs,
  normalizeSlippageTolerance,
  normalizeSwapSide,
  normalizeTimeoutMs,
  agentTradingValidationLimits,
} from './validation';
import {
  AGENT_CAPABILITIES,
  AGENT_METHODS,
  POLKASWAP_AGENT_API_VERSION,
  type AgentAddLiquidityExecution,
  type AgentAddLiquidityQuote,
  type AgentAddLiquidityRequest,
  type AgentAsset,
  type AgentAssetAmount,
  type AgentAssetsRequest,
  type AgentCallPreview,
  type AgentCapabilities,
  type AgentClearStateRequest,
  type AgentDexId,
  type AgentExportedIdempotencyRecord,
  type AgentExportStateRequest,
  type AgentFeeEstimate,
  type AgentIdempotencyRecord,
  type AgentImportStateRequest,
  type AgentLiquidityPosition,
  type AgentLiquidityPositionsRequest,
  type AgentMaxAddLiquidity,
  type AgentMaxAddLiquidityRequest,
  type AgentMaxAmount,
  type AgentMaxAmountRequest,
  type AgentMaxRemoveLiquidity,
  type AgentMaxRemoveLiquidityRequest,
  type AgentMaxSwapInputRequest,
  type AgentPoolInfo,
  type AgentPoolInfoRequest,
  type AgentPolicyAssessment,
  type AgentPreparedAddLiquidity,
  type AgentPreparedRemoveLiquidity,
  type AgentPreparedSwap,
  type AgentPreparedTransfer,
  type AgentRecoverTransactionRequest,
  type AgentReadyOptions,
  type AgentRecentTransactionsRequest,
  type AgentRemoveLiquidityExecution,
  type AgentRemoveLiquidityQuote,
  type AgentRemoveLiquidityRequest,
  type AgentRequiredBalance,
  type AgentResolveAssetRequest,
  type AgentResolvedAsset,
  type AgentRiskPolicy,
  type AgentResolvedSwapRequest,
  type AgentStatus,
  type AgentStatusListener,
  type AgentStatusSubscriptionRequest,
  type AgentStateExport,
  type AgentStateImportResult,
  type AgentSwapAssessmentRequest,
  type AgentSwapExecution,
  type AgentSwapQuote,
  type AgentSwapRequest,
  type AgentTransactionListener,
  type AgentTransactionRef,
  type AgentTransactionLookup,
  type AgentTransactionSubscriptionSource,
  type AgentTransactionSubscriptionRequest,
  type AgentTransactionStatus,
  type AgentTransactionStatusRequest,
  type AgentTransferExecution,
  type AgentTransferRequest,
  type AgentUnsubscribe,
  type AgentWaitForTransactionRequest,
  type AgentWalletAccount,
  type AgentWalletAccountsRequest,
  type AgentWalletConnectRequest,
  type AgentWalletProviderStatus,
  type AgentWalletStatus,
  type AgentWarning,
  type PolkaswapAgentApi,
} from './types';

import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { SwapQuoteData } from '@/lib/substrate/sdk/swap/types';
import type { HistoryItem } from '@/lib/substrate/sdk/types';
import type { getCurrentIndexer as getCurrentIndexerType } from '@/lib/soraneo-wallet/src/services/indexer';
import type { Wallet } from '@/lib/soraneo-wallet/src/services/wallet/types';
import type { Pinia } from 'pinia';

type WalletStore = ReturnType<typeof useWalletStore>;
type SettingsStore = ReturnType<typeof useSettingsStore>;
type AssetsStore = ReturnType<typeof useAssetsStore>;
type WalletApi = typeof walletApi;

export type AgentTradingDependencies = {
  api: WalletApi;
  getSettingsStore: () => SettingsStore;
  getWalletStore: () => WalletStore;
  getAssetsStore: () => AssetsStore;
  getWalletProvider: (source: string) => Promise<Wallet>;
  getIndexer?: () => ReturnType<typeof getCurrentIndexerType>;
  delay: (ms: number) => Promise<void>;
  now: () => number;
};

type InternalQuoteResult = {
  quote: AgentSwapQuote;
  resolved: AgentResolvedSwapRequest;
};

type AvailableSwapQuoteData = {
  quoteData: SwapQuoteData;
  dexId: number;
  result: NonNullable<ReturnType<SwapQuoteData['quote']>['result']>;
};

type PoolPair = {
  assetA: Asset;
  assetB: Asset;
  storageAssetA: Asset;
  storageAssetB: Asset;
  isStorageReversed: boolean;
};

type PoolState = {
  pair: PoolPair;
  poolToken: Asset | null;
  exists: boolean;
  reserveACodec: string;
  reserveBCodec: string;
  storageReserveACodec: string;
  storageReserveBCodec: string;
  totalSupplyCodec: string;
};

type InternalAddLiquidityQuote = {
  quote: AgentAddLiquidityQuote;
  state: PoolState;
};

type InternalRemoveLiquidityQuote = {
  quote: AgentRemoveLiquidityQuote;
  state: PoolState;
};

type AgentExecutionAction = AgentIdempotencyRecord['action'];

type StoredIdempotencyRecord<TResult = unknown> = AgentExportedIdempotencyRecord & {
  result?: TResult;
};

type ChainExtrinsic = {
  hash?: { toString: () => string } | string;
  method?: {
    section?: string;
    method?: string;
    toString?: () => string;
  };
  toHuman?: () => unknown;
  toString?: () => string;
};

type ChainApi = {
  rpc?: {
    chain?: {
      getBlockHash?: (blockHeight: number) => Promise<{ toString: () => string } | string>;
      getBlock?: (blockHash?: string) => Promise<{
        block?: {
          extrinsics?: ChainExtrinsic[];
        };
      }>;
      getHeader?: (blockHash?: string) => Promise<{ number?: { toNumber?: () => number; toString?: () => string } }>;
    };
  };
};

const SWAP_PATH_DEX_IDS = [DexId.XOR, DexId.XSTUSD, DexId.KUSD, DexId.VXOR] as const;
const HISTORY_ELEMENTS_ORDER_BY_NEWEST = ['TIMESTAMP_DESC', 'ID_DESC'] as const;
const READY_POLL_MS = 100;
const TRANSACTION_LOOKUP_ATTEMPTS = 25;
const TRANSACTION_LOOKUP_POLL_MS = 100;
const ZERO_CODEC = '0';
const CLIENT_ORDER_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;
const IDEMPOTENCY_STORAGE_KEY = 'polkaswap.agent.idempotency.v1';
const COMMON_ASSET_SYMBOLS = ['XOR', 'VAL', 'PSWAP', 'XSTUSD', 'XST', 'KUSD'] as const;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function createAgentTradingDependencies(pinia?: Pinia): AgentTradingDependencies {
  return {
    api: walletApi,
    getSettingsStore: () => useSettingsStore(pinia),
    getWalletStore: () => useWalletStore(pinia),
    getAssetsStore: () => useAssetsStore(pinia),
    getWalletProvider: getWallet,
    getIndexer: getCurrentIndexer,
    delay,
    now: () => Date.now(),
  };
}

const normalizeTransactionIdentifier = (request: AgentTransactionStatusRequest): string => {
  const id = request?.id?.trim() || request?.txId?.trim();
  if (!id) {
    throw agentError('INVALID_TRANSACTION_ID', 'Transaction id or txId is required.');
  }
  return id;
};

const normalizeClientOrderId = (clientOrderId?: string): string | undefined => {
  const normalized = clientOrderId?.trim();
  if (!normalized) return undefined;

  if (!CLIENT_ORDER_ID_PATTERN.test(normalized)) {
    throw agentError('INVALID_CLIENT_ORDER_ID', 'clientOrderId must be 1-128 URL-safe characters.', {
      clientOrderId,
    });
  }

  return normalized;
};

const normalizeTransactionLookup = (lookup?: AgentTransactionLookup): AgentTransactionLookup =>
  lookup === 'local' || lookup === 'indexer' || lookup === 'chain' || lookup === 'any' ? lookup : 'any';

const normalizeTransactionSubscriptionSource = (
  source?: AgentTransactionSubscriptionSource
): AgentTransactionSubscriptionSource => {
  if (source === undefined || source === 'local') return 'local';
  if (source === 'indexer' || source === 'all') return source;

  throw agentError('INVALID_SUBSCRIPTION_SOURCE', 'Transaction subscription source must be local, indexer, or all.', {
    source,
  });
};

const normalizePollMs = (pollMs: unknown, defaultValue = 1_000): number => {
  const value = Number(pollMs ?? defaultValue);
  if (!Number.isFinite(value)) return defaultValue;
  return Math.max(250, Math.min(value, 60_000));
};

const getDexIdsForBestQuote = (api: WalletApi): number[] => {
  const publicDexIds = api.dex?.publicDexes?.map(({ dexId }) => dexId as number) ?? [];
  return [...new Set([...publicDexIds, ...SWAP_PATH_DEX_IDS])];
};

const getSelectedSources = (liquiditySource?: LiquiditySourceTypes): LiquiditySourceTypes[] => {
  if (!liquiditySource || liquiditySource === LiquiditySourceTypes.Default) return [];
  return [liquiditySource];
};

const getNaturalFromCodec = (value: unknown, decimals: number): string =>
  FPNumber.fromCodecValue(`${value ?? '0'}`, decimals).toString();

const getCodecFromNatural = (value: string, decimals: number): string => new FPNumber(value, decimals).toCodecString();

const getSlippageMultiplier = (slippageTolerance: string): FPNumber =>
  new FPNumber('1').sub(new FPNumber(slippageTolerance).div(new FPNumber('100')));

const applySlippageToNatural = (value: string, slippageTolerance: string): string =>
  new FPNumber(value).mul(getSlippageMultiplier(slippageTolerance)).toString();

const safeRatio = (numerator: string, denominator: string): string => {
  const denominatorFp = new FPNumber(denominator);
  if (denominatorFp.isZero()) return '0';
  return new FPNumber(numerator).div(denominatorFp).toString();
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const stableHash = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const createIntentId = (action: string, payload: unknown): string =>
  `polkaswap:${action}:${stableHash(stableStringify(payload))}`;

const isQuoteDataAvailable = (data: SwapQuoteData | undefined): data is SwapQuoteData =>
  Boolean(data?.quote && data.isAvailable);

/**
 * Creates the static browser API used by same-page automation agents.
 */
export function createPolkaswapAgentApi(
  dependencies: AgentTradingDependencies = createAgentTradingDependencies()
): PolkaswapAgentApi {
  const deps = dependencies;
  const walletProviderAccountCounts = new Map<string, number>();
  const idempotencyRecords = new Map<string, StoredIdempotencyRecord>();

  const cloneSerializable = <T>(value: T): T => {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  };

  const normalizeStoredIdempotencyRecord = (
    record: Partial<StoredIdempotencyRecord> | undefined
  ): StoredIdempotencyRecord | null => {
    if (!record?.clientOrderId || !CLIENT_ORDER_ID_PATTERN.test(record.clientOrderId)) return null;
    if (!record.intentId || typeof record.intentId !== 'string') return null;
    if (!['swap', 'transfer', 'add-liquidity', 'remove-liquidity'].includes(`${record.action ?? ''}`)) return null;
    if (!['pending', 'submitted'].includes(`${record.status ?? ''}`)) return null;

    const now = deps.now();
    const createdAt = Number(record.createdAt ?? record.updatedAt ?? now);
    const updatedAt = Number(record.updatedAt ?? createdAt);

    return {
      ...record,
      clientOrderId: record.clientOrderId,
      intentId: record.intentId,
      action: record.action as AgentExecutionAction,
      status: record.status as AgentIdempotencyRecord['status'],
      createdAt: Number.isFinite(createdAt) ? createdAt : now,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
    };
  };

  const readStoredIdempotencyMap = (): Record<string, StoredIdempotencyRecord> => {
    if (typeof window === 'undefined') return {};

    try {
      return JSON.parse(window.localStorage.getItem(IDEMPOTENCY_STORAGE_KEY) || '{}') as Record<
        string,
        StoredIdempotencyRecord
      >;
    } catch {
      return {};
    }
  };

  const writeStoredIdempotencyMap = (records: Record<string, StoredIdempotencyRecord>): void => {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(records);
      if (keys.length === 0) {
        window.localStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // In-memory idempotency is still enough to prevent duplicate same-page submissions.
    }
  };

  const loadIdempotencyRecord = <TResult>(clientOrderId: string): StoredIdempotencyRecord<TResult> | null => {
    const memoryRecord = normalizeStoredIdempotencyRecord(
      idempotencyRecords.get(clientOrderId)
    ) as StoredIdempotencyRecord<TResult> | null;
    if (memoryRecord) {
      idempotencyRecords.set(clientOrderId, memoryRecord);
      return memoryRecord;
    }

    const stored = normalizeStoredIdempotencyRecord(
      readStoredIdempotencyMap()[clientOrderId]
    ) as StoredIdempotencyRecord<TResult> | null;
    if (stored) {
      idempotencyRecords.set(clientOrderId, stored);
      return stored;
    }

    return null;
  };

  const getAllIdempotencyRecords = (): StoredIdempotencyRecord[] => {
    Object.values(readStoredIdempotencyMap()).forEach((record) => {
      const normalized = normalizeStoredIdempotencyRecord(record);
      if (normalized) idempotencyRecords.set(normalized.clientOrderId, normalized);
    });

    return [...idempotencyRecords.values()]
      .map(normalizeStoredIdempotencyRecord)
      .filter((record): record is StoredIdempotencyRecord => Boolean(record));
  };

  const persistIdempotencyRecord = (record: StoredIdempotencyRecord): void => {
    const normalized = normalizeStoredIdempotencyRecord(record);
    if (!normalized) return;

    idempotencyRecords.set(normalized.clientOrderId, normalized);
    writeStoredIdempotencyMap({
      ...readStoredIdempotencyMap(),
      [normalized.clientOrderId]: normalized,
    });
  };

  const clearIdempotencyRecord = (clientOrderId: string): void => {
    idempotencyRecords.delete(clientOrderId);

    const records = readStoredIdempotencyMap();
    delete records[clientOrderId];
    writeStoredIdempotencyMap(records);
  };

  const clearAllIdempotencyRecords = (): void => {
    idempotencyRecords.clear();
    writeStoredIdempotencyMap({});
  };

  const toPublicIdempotencyRecord = (record: StoredIdempotencyRecord): AgentIdempotencyRecord => {
    const { result: _result, ...publicRecord } = record;
    return publicRecord;
  };

  const redactIdempotencyRecord = (record: StoredIdempotencyRecord): AgentExportedIdempotencyRecord => ({
    clientOrderId: record.clientOrderId,
    intentId: record.intentId,
    action: record.action,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    preview: record.preview
      ? {
          operation: record.preview.operation,
          sdkCall: record.preview.sdkCall,
          stateChanging: record.preview.stateChanging,
          signer: {
            address: '',
            source: '',
            connected: record.preview.signer.connected,
          },
          args: {},
          summary: 'redacted',
        }
      : undefined,
  });

  const exportState = (request: AgentExportStateRequest = {}): AgentStateExport => ({
    version: POLKASWAP_AGENT_API_VERSION,
    exportedAt: deps.now(),
    idempotency: getAllIdempotencyRecords().map((record) =>
      cloneSerializable(request.redacted ? redactIdempotencyRecord(record) : record)
    ),
  });

  const importState = (request: AgentImportStateRequest): AgentStateImportResult => {
    const state = request?.state;
    if (state?.version !== POLKASWAP_AGENT_API_VERSION || !Array.isArray(state.idempotency)) {
      throw agentError('INVALID_AGENT_STATE', 'Only Polkaswap agent API v1 state can be imported.', {
        version: state?.version,
      });
    }

    if (request.merge === false) {
      clearAllIdempotencyRecords();
    }

    let imported = 0;
    let skipped = 0;
    for (const record of state.idempotency) {
      const normalized = normalizeStoredIdempotencyRecord(record);
      if (!normalized) {
        skipped += 1;
        continue;
      }
      persistIdempotencyRecord(normalized);
      imported += 1;
    }

    return {
      imported,
      skipped,
      records: exportState().idempotency,
    };
  };

  const clearState = (request: AgentClearStateRequest = {}): AgentStateExport => {
    const clientOrderId = normalizeClientOrderId(request.clientOrderId);
    if (clientOrderId) {
      clearIdempotencyRecord(clientOrderId);
    } else {
      clearAllIdempotencyRecords();
    }

    return exportState();
  };

  const getIdempotencyResult = <TResult>(
    action: AgentExecutionAction,
    clientOrderId: string | undefined,
    intentId: string
  ): TResult | null => {
    if (!clientOrderId) return null;

    const record = loadIdempotencyRecord<TResult>(clientOrderId);
    if (!record) return null;

    if (record.action !== action || record.intentId !== intentId) {
      throw agentError('IDEMPOTENCY_CONFLICT', 'clientOrderId was already used for a different intent.', {
        clientOrderId,
        existing: {
          action: record.action,
          intentId: record.intentId,
        },
        requested: {
          action,
          intentId,
        },
      });
    }

    if (!record.result) {
      throw agentError(
        'IDEMPOTENCY_CONFLICT',
        record.status === 'submitted'
          ? 'clientOrderId was already submitted; use transactionStatus or recoverTransaction for the transaction.'
          : 'clientOrderId is already pending submission.',
        {
          clientOrderId,
          action,
          intentId,
          idempotency: toPublicIdempotencyRecord(record),
        }
      );
    }

    return {
      ...(record.result as object),
      clientOrderId,
      reusedClientOrder: true,
    } as TResult;
  };

  const markIdempotencyPending = (
    action: AgentExecutionAction,
    clientOrderId: string | undefined,
    intentId: string,
    preview?: AgentCallPreview
  ): void => {
    if (!clientOrderId) return;

    const now = deps.now();
    persistIdempotencyRecord({
      clientOrderId,
      intentId,
      action,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      preview,
    });
  };

  const completeIdempotency = <TResult extends { transaction: AgentTransactionRef | null }>(
    action: AgentExecutionAction,
    clientOrderId: string | undefined,
    intentId: string,
    result: TResult
  ): TResult => {
    if (!clientOrderId) return result;

    const previous = loadIdempotencyRecord(clientOrderId);
    persistIdempotencyRecord({
      clientOrderId,
      intentId,
      action,
      status: 'submitted',
      createdAt: previous?.createdAt ?? deps.now(),
      updatedAt: deps.now(),
      preview: previous?.preview,
      transaction: result.transaction,
      result: {
        ...result,
        clientOrderId,
        reusedClientOrder: false,
      },
    });

    return {
      ...result,
      clientOrderId,
      reusedClientOrder: false,
    };
  };

  const simplifyWalletProvider = (wallet: {
    extensionName?: string;
    title?: string;
    installed?: boolean;
  }): AgentWalletProviderStatus => {
    const source = wallet.extensionName ?? '';
    const installed = Boolean(wallet.installed);
    const accountsCount = walletProviderAccountCounts.get(source);

    return {
      source,
      title: wallet.title ?? wallet.extensionName ?? '',
      installed,
      available: installed,
      supportsSigning: installed,
      requiresUserApproval: installed,
      accountsCount,
    };
  };

  const createAssetContext = (): AgentAssetContext => {
    const settingsStore = deps.getSettingsStore();

    return {
      walletStore: deps.getWalletStore(),
      assetsStore: deps.getAssetsStore(),
      api: deps.api,
      nodeReady: Boolean(settingsStore.nodeIsConnected),
    };
  };

  const getStatus = (): AgentStatus => {
    const settingsStore = deps.getSettingsStore();
    const walletStore = deps.getWalletStore();
    const appConnection = settingsStore.appConnection;
    const availableWallets = (walletStore.availableWallets ?? []).map(simplifyWalletProvider);

    return {
      version: POLKASWAP_AGENT_API_VERSION,
      node: {
        connected: Boolean(settingsStore.nodeIsConnected),
        endpoint: appConnection?.connection?.endpoint ?? appConnection?.node?.address ?? '',
        blockNumber: Number(settingsStore.blockNumber ?? 0),
      },
      wallet: {
        loaded: Boolean(settingsStore.isWalletLoaded ?? walletStore.isWalletLoaded),
        connected: Boolean(walletStore.isLoggedIn),
        address: walletStore.address ?? '',
        source: walletStore.source ?? '',
        accountsCount: walletProviderAccountCounts.get(walletStore.source ?? ''),
        availableWallets,
      },
      settings: {
        slippageTolerance: `${settingsStore.slippageTolerance || DefaultSlippageTolerance}`,
      },
    };
  };

  const createCallPreview = (
    operation: Operation,
    sdkCall: string,
    args: Record<string, unknown>,
    summary: string
  ): AgentCallPreview => {
    const status = getStatus();

    return {
      operation,
      sdkCall,
      stateChanging: true,
      signer: {
        address: status.wallet.address,
        source: status.wallet.source,
        connected: status.wallet.connected,
      },
      args,
      summary,
    };
  };

  const ensureNodeReady = () => {
    if (!getStatus().node.connected) {
      throw agentError('NODE_NOT_READY', 'Polkaswap is not connected to a SORA node.');
    }
  };

  const ensureWalletReady = () => {
    const status = getStatus();

    if (!status.wallet.connected || !deps.api.accountPair) {
      throw agentError('WALLET_NOT_CONNECTED', 'No SORA wallet is connected.');
    }
  };

  const refreshWallets = async (): Promise<AgentWalletProviderStatus[]> => {
    try {
      const walletStore = deps.getWalletStore();
      await walletStore.updateAvailableWallets();
      return getStatus().wallet.availableWallets;
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const ready = async (options: AgentReadyOptions = { requireNode: true }): Promise<AgentStatus> => {
    try {
      const requireNode = options.requireNode ?? true;
      const requireWallet = options.requireWallet ?? false;
      const timeoutAt = deps.now() + normalizeReadyTimeoutMs(options.timeoutMs);

      while (true) {
        const status = getStatus();
        const nodeReady = !requireNode || status.node.connected;
        const walletReady = !requireWallet || (status.wallet.connected && Boolean(deps.api.accountPair));

        if (nodeReady && walletReady) return status;

        if (deps.now() >= timeoutAt) {
          if (!nodeReady) {
            throw agentError('NODE_NOT_READY', 'Timed out waiting for a SORA node connection.', status.node);
          }
          throw agentError('WALLET_NOT_CONNECTED', 'Timed out waiting for a connected wallet.', status.wallet);
        }

        await deps.delay(READY_POLL_MS);
      }
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const connectWallet = async (request: AgentWalletConnectRequest): Promise<AgentWalletStatus> => {
    try {
      const source = request?.source?.trim();
      if (!source) {
        throw agentError('INVALID_WALLET_SOURCE', 'Wallet source is required.');
      }

      let wallet: Wallet;
      try {
        wallet = await deps.getWalletProvider(source);
      } catch (error) {
        throw agentError('WALLET_NOT_FOUND', `Wallet source "${source}" is not available.`, { source, cause: error });
      }

      const accounts = (await wallet.getAccounts()) ?? [];
      walletProviderAccountCounts.set(source, accounts.length);
      if (accounts.length === 0) {
        throw agentError('WALLET_ACCOUNT_NOT_FOUND', 'Wallet did not return any accounts.', { source });
      }

      const requestedAddress = request.address?.trim();
      let selectedAccount = accounts[0];

      if (requestedAddress) {
        const requested = deps.api.formatAddress(requestedAddress, false);
        const match = accounts.find((account) => deps.api.formatAddress(account.address, false) === requested);
        if (!match) {
          throw agentError('WALLET_ACCOUNT_NOT_FOUND', 'Requested wallet account was not found.', {
            source,
            address: request.address,
          });
        }
        selectedAccount = match;
      } else if (accounts.length > 1) {
        throw agentError('WALLET_ACCOUNT_REQUIRED', 'Wallet has multiple accounts. Provide an address.', {
          source,
          accounts: accounts.map(({ address, name }) => ({ address, name })),
        });
      }

      const walletStore = deps.getWalletStore();
      await walletStore.loginAccount({
        address: selectedAccount.address,
        name: selectedAccount.name ?? '',
        source: selectedAccount.source || source,
      } as never);
      await walletStore.checkWalletAvailability();

      return getStatus().wallet;
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const assets = async (request: AgentAssetsRequest = {}): Promise<AgentAsset[]> => {
    try {
      return collectAssets(createAssetContext(), request);
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const isCommonAsset = (asset: Asset): boolean => KnownAssets.get(asset.symbol)?.address === asset.address;

  const toAssetAmount = (
    asset: Asset,
    value: string,
    codec = getCodecFromNatural(value, asset.decimals)
  ): AgentAssetAmount => ({
    asset: toAgentAsset(asset),
    value,
    codec,
    decimals: asset.decimals,
    display: `${value} ${asset.symbol}`,
  });

  const toAssetAmountFromCodec = (asset: Asset, codec: string): AgentAssetAmount =>
    toAssetAmount(asset, getNaturalFromCodec(codec, asset.decimals), codec);

  const getXorAsset = (): Asset => {
    const fromStore = createAssetContext().assetsStore.assetDataByAddress(XOR.address);
    return (fromStore ?? XOR) as Asset;
  };

  const getAvailableBalanceCodec = (asset: Asset): string => {
    const context = createAssetContext();
    const normalizedAddress = asset.address.toLowerCase();
    const fromAssetsStore = context.assetsStore.assetDataByAddress(normalizedAddress);
    const fromWalletStore =
      context.walletStore.accountAssetsAddressTable?.[normalizedAddress] ??
      context.walletStore.accountAssetsAddressTable?.[asset.address];
    const balance = fromAssetsStore?.balance ?? fromWalletStore?.balance;

    return `${balance?.transferable ?? '0'}`;
  };

  const getAvailableAssetAmount = (asset: Asset): AgentAssetAmount =>
    toAssetAmountFromCodec(asset, getAvailableBalanceCodec(asset));

  const getFeeEstimate = (operation: Operation): AgentFeeEstimate => {
    const feeCodec = `${deps.getWalletStore().networkFees?.[operation] ?? '0'}`;
    const feeAsset = getXorAsset();

    return {
      operation,
      asset: toAgentAsset(feeAsset),
      amount: getNaturalFromCodec(feeCodec, feeAsset.decimals),
      amountCodec: feeCodec,
      source: feeCodec === '0' ? 'unavailable' : 'static',
    };
  };

  const mergeRequiredBalances = (
    entries: Array<{ asset: Asset; amountCodec: string; reason: string }>
  ): AgentRequiredBalance[] => {
    const grouped = new Map<
      string,
      {
        asset: Asset;
        amount: FPNumber;
        reasons: Set<string>;
      }
    >();

    entries.forEach(({ asset, amountCodec, reason }) => {
      const key = asset.address.toLowerCase();
      const amount = FPNumber.fromCodecValue(amountCodec, asset.decimals);
      const current = grouped.get(key);

      if (current) {
        current.amount = current.amount.add(amount);
        current.reasons.add(reason);
      } else {
        grouped.set(key, {
          asset,
          amount,
          reasons: new Set([reason]),
        });
      }
    });

    return [...grouped.values()].map(({ asset, amount, reasons }) => {
      const required = amount.toString();
      const requiredCodec = amount.toCodecString();
      const availableCodec = getAvailableBalanceCodec(asset);
      const available = getNaturalFromCodec(availableCodec, asset.decimals);
      const sufficient = FPNumber.gte(FPNumber.fromCodecValue(availableCodec, asset.decimals), amount);

      return {
        asset: toAgentAsset(asset),
        required,
        requiredCodec,
        available,
        availableCodec,
        sufficient,
        reason: [...reasons].join('+'),
      };
    });
  };

  const getInsufficientBalanceWarnings = (requiredBalances: AgentRequiredBalance[]): AgentWarning[] =>
    requiredBalances
      .filter((balance) => !balance.sufficient)
      .map((balance) => ({
        code: 'INSUFFICIENT_BALANCE',
        severity: 'critical',
        message: `Insufficient ${balance.asset.symbol} balance.`,
        details: balance,
      }));

  const getWalletWarnings = (): AgentWarning[] =>
    getStatus().wallet.connected
      ? []
      : [
          {
            code: 'WALLET_NOT_CONNECTED',
            severity: 'critical',
            message: 'No wallet is connected.',
          },
        ];

  const getHighPriceImpactWarnings = (quote: AgentSwapQuote): AgentWarning[] => {
    const impact = new FPNumber(`${quote.priceImpact ?? '0'}`.replace('-', ''));
    if (FPNumber.lt(impact, new FPNumber('5'))) return [];

    return [
      {
        code: 'HIGH_PRICE_IMPACT',
        severity: FPNumber.gte(impact, new FPNumber('15')) ? 'critical' : 'warning',
        message: 'Swap price impact is high.',
        details: { priceImpact: quote.priceImpact },
      },
    ];
  };

  const assertIntent = (provided: string | undefined, expected: string): void => {
    if (provided && provided !== expected) {
      throw agentError('INTENT_MISMATCH', 'Provided intentId does not match the current normalized intent.', {
        provided,
        expected,
      });
    }
  };

  const canExecuteWith = (warnings: AgentWarning[], requiredBalances: AgentRequiredBalance[]): boolean =>
    !warnings.some((warning) => warning.severity === 'critical') &&
    requiredBalances.every((balance) => balance.sufficient);

  const walletAccounts = async (request: AgentWalletAccountsRequest): Promise<AgentWalletAccount[]> => {
    try {
      const source = request?.source?.trim();
      if (!source) {
        throw agentError('INVALID_WALLET_SOURCE', 'Wallet source is required.');
      }

      const wallet = await deps.getWalletProvider(source);
      const accounts = (await wallet.getAccounts()) ?? [];
      walletProviderAccountCounts.set(source, accounts.length);

      return accounts.map((account) => ({
        address: account.address,
        name: account.name ?? '',
        source: account.source || source,
      }));
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const resolveAsset = async (request: AgentResolveAssetRequest): Promise<AgentResolvedAsset> => {
    try {
      const asset = await resolveAssetRef(createAssetContext(), request.asset, 'asset');
      const enriched = request.includeBalance
        ? (createAssetContext().assetsStore.assetDataByAddress(asset.address.toLowerCase()) ?? asset)
        : asset;

      return {
        ...toAgentAsset(enriched, request.includeBalance),
        canonical: isCommonAsset(asset as Asset),
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const commonAssets = async (request: AgentAssetsRequest = {}): Promise<AgentResolvedAsset[]> => {
    try {
      const includeBalances = Boolean(request.includeBalances);
      const query = request.query?.trim().toLowerCase() ?? '';

      return COMMON_ASSET_SYMBOLS.map((symbol) => KnownAssets.get(symbol) as Asset | undefined)
        .filter((asset): asset is Asset => Boolean(asset))
        .filter((asset) => {
          if (!query) return true;
          return [asset.address, asset.symbol, asset.name].some((value) => value?.toLowerCase().includes(query));
        })
        .map((asset) =>
          includeBalances ? (createAssetContext().assetsStore.assetDataByAddress(asset.address) ?? asset) : asset
        )
        .map((asset) => ({ ...toAgentAsset(asset, includeBalances), canonical: true }));
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const capabilities = (): AgentCapabilities => ({
    version: POLKASWAP_AGENT_API_VERSION,
    runtime: 'browser',
    hosting: 'static-ipfs',
    global: 'window.PolkaswapAgent',
    readyEvent: 'polkaswap-agent-ready',
    methods: [...AGENT_METHODS],
    capabilities: [...AGENT_CAPABILITIES],
    defaults: {
      side: 'input',
      slippageTolerance: getStatus().settings.slippageTolerance,
      dexId: 'best',
      allowPoolCreation: false,
    },
    limits: {
      slippageTolerance: {
        min: agentTradingValidationLimits.slippageMin,
        max: agentTradingValidationLimits.slippageMax,
      },
      percent: {
        min: '0.01',
        max: agentTradingValidationLimits.percentMax,
      },
      defaultReadyTimeoutMs: agentTradingValidationLimits.defaultReadyTimeoutMs,
      defaultQuoteTimeoutMs: agentTradingValidationLimits.defaultQuoteTimeoutMs,
    },
    security: {
      middleware: false,
      samePageOnly: true,
      postMessage: false,
      custody: 'caller-provided-wallet',
    },
    status: getStatus(),
  });

  const toTransactionRef = (history: HistoryItem | null): AgentTransactionRef | null => {
    if (!history) return null;

    return {
      id: history.id as string,
      txId: history.txId as string | undefined,
      status: history.status as string | undefined,
      history,
    };
  };

  const findLocalTransaction = (id: string): HistoryItem | null => {
    const direct = deps.api.getHistory(id);
    if (direct) return direct;

    return (
      deps.api.historyList.find((item) =>
        [item.id, item.txId, (item as Record<string, unknown>).hash, (item as Record<string, unknown>).externalHash]
          .filter(Boolean)
          .some((value) => `${value}` === id)
      ) ?? null
    );
  };

  const findIdempotencyRecord = (id: string): AgentIdempotencyRecord | undefined => {
    const record = loadIdempotencyRecord(id);
    if (record) {
      return toPublicIdempotencyRecord(record);
    }

    return getAllIdempotencyRecords()
      .map(toPublicIdempotencyRecord)
      .find((entry) =>
        [entry.clientOrderId, entry.intentId, entry.transaction?.id, entry.transaction?.txId].some(
          (value) => value === id
        )
      );
  };

  const lookupIndexerTransactions = async (variables: Record<string, unknown>): Promise<HistoryItem[]> => {
    try {
      const indexer = deps.getIndexer?.();
      const response = await indexer?.services.explorer.account.getHistory(variables);
      const transactions = response?.nodes ?? [];
      const historyItems: HistoryItem[] = [];

      for (const transaction of transactions) {
        const history = await indexer?.services.dataParser.parseTransactionAsHistoryItem(transaction as never);
        if (history) historyItems.push(history);
      }

      return historyItems;
    } catch {
      return [];
    }
  };

  const lookupIndexerTransaction = async (id: string): Promise<HistoryItem | null> =>
    (
      await lookupIndexerTransactions({
        filter: {
          id: {
            equalTo: id,
          },
        },
        first: 1,
      })
    )[0] ?? null;

  const normalizeBlockHeight = (blockHeight: AgentTransactionStatusRequest['blockHeight']): number | undefined => {
    if (blockHeight === undefined || blockHeight === null || `${blockHeight}`.trim() === '') return undefined;

    const height = Number(blockHeight);
    if (!Number.isSafeInteger(height) || height < 0) {
      throw agentError('INVALID_TRANSACTION_ID', 'blockHeight must be a non-negative integer.', { blockHeight });
    }

    return height;
  };

  const lookupChainTransaction = async (
    id: string,
    request: AgentTransactionStatusRequest
  ): Promise<HistoryItem | null> => {
    const requestedBlockHash = request.blockHash?.trim();
    const requestedBlockHeight = normalizeBlockHeight(request.blockHeight);
    if (!requestedBlockHash && requestedBlockHeight === undefined) {
      throw agentError('INVALID_TRANSACTION_ID', 'Chain lookup requires blockHash or blockHeight.', {
        id,
      });
    }

    const chain = (deps.api.api as unknown as ChainApi).rpc?.chain;
    if (!chain?.getBlock) return null;

    const blockHash =
      requestedBlockHash ??
      (chain.getBlockHash ? (await chain.getBlockHash(requestedBlockHeight as number)).toString() : undefined);
    if (!blockHash) return null;

    const [block, header] = await Promise.all([
      chain.getBlock(blockHash),
      chain.getHeader ? chain.getHeader(blockHash).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    const extrinsics = block.block?.extrinsics ?? [];
    const extrinsicIndex = extrinsics.findIndex((extrinsic) => extrinsic.hash?.toString() === id);
    if (extrinsicIndex < 0) return null;

    const headerNumber = header?.number;
    const blockHeight =
      requestedBlockHeight ??
      headerNumber?.toNumber?.() ??
      (headerNumber?.toString ? Number(headerNumber.toString()) : undefined);

    return {
      id,
      txId: id,
      blockId: blockHash,
      blockHeight: Number.isFinite(blockHeight) ? Number(blockHeight) : undefined,
      status: 'inblock',
      payload: {
        source: 'chain',
        extrinsicIndex,
        method: extrinsics[extrinsicIndex]?.method?.toString?.(),
        human: extrinsics[extrinsicIndex]?.toHuman?.(),
      },
    } as HistoryItem;
  };

  const lookupTransaction = async (request: AgentTransactionStatusRequest): Promise<AgentTransactionStatus> => {
    try {
      const id = normalizeTransactionIdentifier(request);
      const lookup = normalizeTransactionLookup(request.lookup);
      const idempotency = findIdempotencyRecord(id);

      if (idempotency?.transaction?.history) {
        return {
          id,
          lookup,
          source: 'idempotency',
          transaction: idempotency.transaction.history,
          idempotency,
        };
      }

      if (lookup !== 'indexer') {
        const local = findLocalTransaction(id);
        if (local) {
          return {
            id,
            lookup,
            source: 'local',
            transaction: local,
            idempotency,
          };
        }
      }

      if (lookup === 'indexer' || lookup === 'any') {
        const indexed = await lookupIndexerTransaction(id);
        if (indexed) {
          return {
            id,
            lookup,
            source: 'indexer',
            transaction: indexed,
            idempotency,
          };
        }
      }

      if (lookup === 'chain' || (lookup === 'any' && (request.blockHash || request.blockHeight !== undefined))) {
        const chain = await lookupChainTransaction(id, request);
        if (chain) {
          return {
            id,
            lookup,
            source: 'chain',
            transaction: chain,
            idempotency,
          };
        }
      }

      return {
        id,
        lookup,
        source: idempotency ? 'idempotency' : 'none',
        transaction: null,
        idempotency,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const previewArg = (record: AgentIdempotencyRecord, key: string): string | undefined => {
    const value = record.preview?.args[key];
    if (value === undefined || value === null || `${value}`.trim() === '') return undefined;
    return `${value}`;
  };

  const matchesRequiredValue = (actual: unknown, expected: string | undefined): boolean =>
    expected !== undefined && `${actual ?? ''}` === expected;

  const matchesOptionalValue = (actual: unknown, expected: string | undefined): boolean =>
    expected === undefined || `${actual ?? ''}` === expected;

  const transactionMatchesIdempotencyRecord = (transaction: HistoryItem, record: AgentIdempotencyRecord): boolean => {
    if (record.action === 'swap') {
      return (
        transaction.type === Operation.Swap &&
        matchesRequiredValue(transaction.assetAddress, previewArg(record, 'assetIn')) &&
        matchesRequiredValue(transaction.asset2Address, previewArg(record, 'assetOut')) &&
        matchesRequiredValue(transaction.amount, previewArg(record, 'amountIn')) &&
        matchesRequiredValue(transaction.amount2, previewArg(record, 'amountOut')) &&
        matchesOptionalValue(transaction.liquiditySource, previewArg(record, 'liquiditySource'))
      );
    }

    if (record.action === 'transfer') {
      return (
        transaction.type === Operation.Transfer &&
        matchesRequiredValue(transaction.assetAddress, previewArg(record, 'asset')) &&
        matchesRequiredValue(transaction.to, previewArg(record, 'to')) &&
        matchesRequiredValue(transaction.amount, previewArg(record, 'amount'))
      );
    }

    if (record.action === 'add-liquidity') {
      return (
        [Operation.AddLiquidity, Operation.CreatePair].includes(transaction.type as Operation) &&
        matchesRequiredValue(transaction.assetAddress, previewArg(record, 'assetA')) &&
        matchesRequiredValue(transaction.asset2Address, previewArg(record, 'assetB')) &&
        matchesRequiredValue(transaction.amount, previewArg(record, 'amountA')) &&
        matchesRequiredValue(transaction.amount2, previewArg(record, 'amountB'))
      );
    }

    return (
      transaction.type === Operation.RemoveLiquidity &&
      matchesRequiredValue(transaction.assetAddress, previewArg(record, 'assetA')) &&
      matchesRequiredValue(transaction.asset2Address, previewArg(record, 'assetB'))
    );
  };

  const findRecoveredTransaction = (transactions: HistoryItem[], record: AgentIdempotencyRecord): HistoryItem | null =>
    transactions
      .filter((transaction) => transactionMatchesIdempotencyRecord(transaction, record))
      .sort((left, right) => Number(right.startTime ?? 0) - Number(left.startTime ?? 0))[0] ?? null;

  const getRecoveryOperations = (action: AgentExecutionAction): Operation[] => {
    if (action === 'swap') return [Operation.Swap];
    if (action === 'transfer') return [Operation.Transfer];
    if (action === 'add-liquidity') return [Operation.AddLiquidity, Operation.CreatePair];
    return [Operation.RemoveLiquidity];
  };

  const getRecoveryPrimaryAsset = (record: AgentIdempotencyRecord): string => {
    if (record.action === 'swap') return previewArg(record, 'assetIn') ?? '';
    if (record.action === 'transfer') return previewArg(record, 'asset') ?? '';
    return previewArg(record, 'assetA') ?? '';
  };

  const lookupIndexerRecoveryTransactions = async (
    record: AgentIdempotencyRecord,
    limit: number
  ): Promise<HistoryItem[]> => {
    const indexer = deps.getIndexer?.();
    if (!indexer) return [];

    const address = record.preview?.signer.address || getStatus().wallet.address;
    const assetAddress = getRecoveryPrimaryAsset(record);
    const filter = indexer.historyElementsFilter({
      address,
      assetAddress,
      operations: getRecoveryOperations(record.action),
    });

    return lookupIndexerTransactions({
      filter,
      first: limit,
      orderBy: HISTORY_ELEMENTS_ORDER_BY_NEWEST,
    });
  };

  const normalizeRecoveryLimit = (limit: unknown): number => {
    const value = Number(limit ?? 25);
    return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 100)) : 25;
  };

  const completeRecoveredIdempotency = (
    record: StoredIdempotencyRecord,
    transaction: HistoryItem
  ): AgentIdempotencyRecord => {
    const transactionRef = toTransactionRef(transaction);
    const result =
      record.result && typeof record.result === 'object'
        ? {
            ...(record.result as Record<string, unknown>),
            transaction: transactionRef,
          }
        : record.result;

    const recoveredRecord: StoredIdempotencyRecord = {
      ...record,
      status: 'submitted',
      updatedAt: deps.now(),
      transaction: transactionRef,
      result,
    };

    persistIdempotencyRecord(recoveredRecord);
    return toPublicIdempotencyRecord(recoveredRecord);
  };

  const findRecoveryRecord = (request: AgentRecoverTransactionRequest): StoredIdempotencyRecord | null => {
    const clientOrderId = normalizeClientOrderId(request.clientOrderId);
    if (clientOrderId) return loadIdempotencyRecord(clientOrderId);

    const intentId = request.intentId?.trim();
    if (!intentId) return null;

    return getAllIdempotencyRecords().find((record) => record.intentId === intentId) ?? null;
  };

  const recoverTransaction = async (request: AgentRecoverTransactionRequest): Promise<AgentTransactionStatus> => {
    try {
      if (request.id || request.txId) {
        return await lookupTransaction(request);
      }

      const record = findRecoveryRecord(request);
      const requestedId = normalizeClientOrderId(request.clientOrderId) ?? request.intentId?.trim() ?? '';
      if (!requestedId) {
        throw agentError('INVALID_TRANSACTION_ID', 'clientOrderId, intentId, id, or txId is required.');
      }

      const lookup = normalizeTransactionLookup(request.lookup);
      if (!record) {
        return {
          id: requestedId,
          lookup,
          source: 'none',
          transaction: null,
        };
      }

      if (record.transaction?.history) {
        return {
          id: requestedId,
          lookup,
          source: 'idempotency',
          transaction: record.transaction.history,
          idempotency: toPublicIdempotencyRecord(record),
        };
      }

      if (lookup === 'local' || lookup === 'any') {
        const local = findRecoveredTransaction(deps.api.historyList, record);
        if (local) {
          return {
            id: requestedId,
            lookup,
            source: 'local',
            transaction: local,
            idempotency: completeRecoveredIdempotency(record, local),
          };
        }
      }

      if (lookup === 'indexer' || lookup === 'any') {
        const indexed = findRecoveredTransaction(
          await lookupIndexerRecoveryTransactions(record, normalizeRecoveryLimit(request.limit)),
          record
        );
        if (indexed) {
          return {
            id: requestedId,
            lookup,
            source: 'indexer',
            transaction: indexed,
            idempotency: completeRecoveredIdempotency(record, indexed),
          };
        }
      }

      return {
        id: requestedId,
        lookup,
        source: 'idempotency',
        transaction: null,
        idempotency: toPublicIdempotencyRecord(record),
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const findLatestTransaction = async (
    startTime: number,
    predicate: (item: HistoryItem) => boolean
  ): Promise<HistoryItem | null> => {
    for (let attempt = 0; attempt < TRANSACTION_LOOKUP_ATTEMPTS; attempt += 1) {
      const match = [...deps.api.historyList]
        .filter((item) => Number(item.startTime ?? 0) >= startTime && predicate(item))
        .sort((a, b) => Number(b.startTime ?? 0) - Number(a.startTime ?? 0))[0];

      if (match) return match;

      await deps.delay(TRANSACTION_LOOKUP_POLL_MS);
    }

    return null;
  };

  const normalizeRecipientAddress = (address: unknown): string => {
    const recipient = `${address ?? ''}`.trim();
    if (!recipient) {
      throw agentError('INVALID_RECIPIENT', 'Recipient address is required.');
    }

    try {
      deps.api.formatAddress(recipient);
      return recipient;
    } catch (error) {
      throw agentError('INVALID_RECIPIENT', 'Recipient address is invalid.', { address: recipient, cause: error });
    }
  };

  const resolvePoolPair = async (request: AgentPoolInfoRequest): Promise<PoolPair> => {
    ensureNodeReady();

    const context = createAssetContext();
    const [assetA, assetB] = await Promise.all([
      resolveAssetRef(context, request.assetA, 'assetA'),
      resolveAssetRef(context, request.assetB, 'assetB'),
    ]);

    if (assetA.address === assetB.address) {
      throw agentError('INVALID_POOL_PAIR', 'Pool assets must be different.', { address: assetA.address });
    }

    const poolBaseAssetIds = deps.api.dex?.poolBaseAssetsIds ?? deps.api.dex?.baseAssetsIds ?? [];
    const assetAIsBase = poolBaseAssetIds.includes(assetA.address);
    const assetBIsBase = poolBaseAssetIds.includes(assetB.address);
    const isStorageReversed = !assetAIsBase && assetBIsBase;

    return {
      assetA,
      assetB,
      storageAssetA: isStorageReversed ? assetB : assetA,
      storageAssetB: isStorageReversed ? assetA : assetB,
      isStorageReversed,
    };
  };

  const getPoolState = async (request: AgentPoolInfoRequest): Promise<PoolState> => {
    const pair = await resolvePoolPair(request);
    const exists = await deps.api.poolXyk
      .check(pair.storageAssetA.address, pair.storageAssetB.address)
      .catch(() => false);
    const [storageReserves, totalSupplyCodec] = exists
      ? await Promise.all([
          deps.api.poolXyk.getReserves(pair.storageAssetA.address, pair.storageAssetB.address),
          deps.api.poolXyk.getTotalSupply(pair.storageAssetA.address, pair.storageAssetB.address),
        ])
      : [[ZERO_CODEC, ZERO_CODEC], ZERO_CODEC];
    const storageReserveACodec = storageReserves[0] ?? ZERO_CODEC;
    const storageReserveBCodec = storageReserves[1] ?? ZERO_CODEC;

    return {
      pair,
      poolToken: deps.api.poolXyk.getInfo(pair.storageAssetA.address, pair.storageAssetB.address),
      exists,
      reserveACodec: pair.isStorageReversed ? storageReserveBCodec : storageReserveACodec,
      reserveBCodec: pair.isStorageReversed ? storageReserveACodec : storageReserveBCodec,
      storageReserveACodec,
      storageReserveBCodec,
      totalSupplyCodec: totalSupplyCodec ?? ZERO_CODEC,
    };
  };

  const toAgentPoolInfo = (state: PoolState): AgentPoolInfo => {
    const reserveA = getNaturalFromCodec(state.reserveACodec, state.pair.assetA.decimals);
    const reserveB = getNaturalFromCodec(state.reserveBCodec, state.pair.assetB.decimals);
    const poolTokenDecimals = state.poolToken?.decimals ?? 18;
    const totalSupply = getNaturalFromCodec(state.totalSupplyCodec, poolTokenDecimals);

    return {
      assetA: toAgentAsset(state.pair.assetA),
      assetB: toAgentAsset(state.pair.assetB),
      poolToken: state.poolToken ? toAgentAsset(state.poolToken) : null,
      exists: state.exists,
      reserveA,
      reserveB,
      reserveACodec: state.reserveACodec,
      reserveBCodec: state.reserveBCodec,
      totalSupply,
      totalSupplyCodec: state.totalSupplyCodec,
      priceAInB: safeRatio(reserveB, reserveA),
      priceBInA: safeRatio(reserveA, reserveB),
    };
  };

  const poolInfo = async (request: AgentPoolInfoRequest): Promise<AgentPoolInfo> => {
    try {
      return toAgentPoolInfo(await getPoolState(request));
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const loadAccountLiquidity = async (timeoutMs?: number): Promise<AccountLiquidity[]> => {
    ensureWalletReady();

    const subscription = deps.api.poolXyk.getUserPoolsSubscription();
    try {
      const loaded = deps.api.poolXyk.accountLiquidityLoaded;
      if (loaded) {
        await firstValueFrom(loaded.pipe(timeout({ first: normalizeTimeoutMs(timeoutMs) })));
      }
      return [...(deps.api.poolXyk.accountLiquidity ?? [])];
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError') {
        throw agentError('QUOTE_TIMEOUT', 'Timed out waiting for account liquidity positions.', { timeoutMs });
      }
      throw error;
    } finally {
      subscription?.unsubscribe();
    }
  };

  const getPoolPosition = async (state: PoolState, timeoutMs?: number): Promise<AccountLiquidity | null> => {
    const positions = await loadAccountLiquidity(timeoutMs);
    return (
      positions.find(
        (position) =>
          position.firstAddress === state.pair.storageAssetA.address &&
          position.secondAddress === state.pair.storageAssetB.address
      ) ?? null
    );
  };

  const toAgentLiquidityPosition = async (position: AccountLiquidity): Promise<AgentLiquidityPosition> => {
    const context = createAssetContext();
    const [assetA, assetB] = await Promise.all([
      resolveAssetRef(context, { address: position.firstAddress }, 'assetA'),
      resolveAssetRef(context, { address: position.secondAddress }, 'assetB'),
    ]);
    const poolToken: Asset = {
      address: position.address,
      symbol: position.symbol,
      name: position.name,
      decimals: position.decimals,
      isMintable: true,
    };

    return {
      assetA: toAgentAsset(assetA),
      assetB: toAgentAsset(assetB),
      poolToken: toAgentAsset(poolToken),
      liquidityAmount: getNaturalFromCodec(position.balance, poolToken.decimals),
      liquidityAmountCodec: position.balance,
      amountA: getNaturalFromCodec(position.firstBalance, assetA.decimals),
      amountB: getNaturalFromCodec(position.secondBalance, assetB.decimals),
      amountACodec: position.firstBalance,
      amountBCodec: position.secondBalance,
      poolShare: position.poolShare,
      totalSupply: getNaturalFromCodec(position.totalSupply, poolToken.decimals),
      totalSupplyCodec: position.totalSupply,
    };
  };

  const liquidityPositions = async (
    request: AgentLiquidityPositionsRequest = {}
  ): Promise<AgentLiquidityPosition[]> => {
    try {
      ensureNodeReady();
      let positions = await loadAccountLiquidity(request.timeoutMs);

      if (request.assetA || request.assetB) {
        if (!(request.assetA && request.assetB)) {
          throw agentError('INVALID_POOL_PAIR', 'Both assetA and assetB are required when filtering positions.');
        }
        const state = await getPoolState({ assetA: request.assetA, assetB: request.assetB });
        positions = positions.filter(
          (position) =>
            position.firstAddress === state.pair.storageAssetA.address &&
            position.secondAddress === state.pair.storageAssetB.address
        );
      }

      return await Promise.all(positions.map(toAgentLiquidityPosition));
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const buildAddLiquidityQuote = async (request: AgentAddLiquidityRequest): Promise<InternalAddLiquidityQuote> => {
    const settingsStore = deps.getSettingsStore();
    const state = await getPoolState({ assetA: request.assetA, assetB: request.assetB });
    const slippageTolerance = normalizeSlippageTolerance(
      request.slippageTolerance,
      `${settingsStore.slippageTolerance || DefaultSlippageTolerance}`
    );
    const allowPoolCreation = Boolean(request.allowPoolCreation);
    let amountA = normalizeOptionalNaturalAmount(request.amountA);
    let amountB = normalizeOptionalNaturalAmount(request.amountB);

    if (!(amountA || amountB)) {
      throw agentError('INVALID_AMOUNT', 'Provide amountA, amountB, or both.');
    }

    if (!state.exists) {
      const poolBaseAssetIds = deps.api.dex?.poolBaseAssetsIds ?? deps.api.dex?.baseAssetsIds ?? [];
      const hasSupportedBase =
        poolBaseAssetIds.includes(state.pair.assetA.address) || poolBaseAssetIds.includes(state.pair.assetB.address);

      if (!allowPoolCreation) {
        throw agentError('POOL_UNAVAILABLE', 'Pool does not exist. Set allowPoolCreation to create it.', {
          assetA: state.pair.assetA.address,
          assetB: state.pair.assetB.address,
        });
      }
      if (!hasSupportedBase) {
        throw agentError('INVALID_POOL_PAIR', 'Pool creation requires one supported base asset.', {
          assetA: state.pair.assetA.address,
          assetB: state.pair.assetB.address,
          supportedBaseAssets: poolBaseAssetIds,
        });
      }
      if (!(amountA && amountB)) {
        throw agentError('INVALID_AMOUNT', 'New pool creation requires both amountA and amountB.');
      }
    } else {
      const reserveA = getNaturalFromCodec(state.reserveACodec, state.pair.assetA.decimals);
      const reserveB = getNaturalFromCodec(state.reserveBCodec, state.pair.assetB.decimals);

      if ((!amountA && new FPNumber(reserveB).isZero()) || (!amountB && new FPNumber(reserveA).isZero())) {
        throw agentError('POOL_UNAVAILABLE', 'Pool reserves are empty; provide both amounts or create the pool.', {
          reserveA,
          reserveB,
        });
      }

      if (!amountA && amountB) {
        amountA = new FPNumber(amountB).mul(new FPNumber(reserveA)).div(new FPNumber(reserveB)).toString();
      }
      if (amountA && !amountB) {
        amountB = new FPNumber(amountA).mul(new FPNumber(reserveB)).div(new FPNumber(reserveA)).toString();
      }
    }

    if (!(amountA && amountB)) {
      throw agentError('INVALID_AMOUNT', 'Unable to derive both liquidity amounts.');
    }

    const amountACodec = getCodecFromNatural(amountA, state.pair.assetA.decimals);
    const amountBCodec = getCodecFromNatural(amountB, state.pair.assetB.decimals);
    const minAmountA = applySlippageToNatural(amountA, slippageTolerance);
    const minAmountB = applySlippageToNatural(amountB, slippageTolerance);
    const poolTokenDecimals = state.poolToken?.decimals ?? 18;
    const [mintedLiquidityCodec = ZERO_CODEC] = deps.api.poolXyk.estimatePoolTokensMinted(
      state.pair.assetA,
      state.pair.assetB,
      amountA,
      amountB,
      state.reserveACodec,
      state.reserveBCodec,
      state.totalSupplyCodec
    );
    const mintedLiquidity = getNaturalFromCodec(mintedLiquidityCodec, poolTokenDecimals);
    const totalSupply = getNaturalFromCodec(state.totalSupplyCodec, poolTokenDecimals);
    const resultingSupply = new FPNumber(totalSupply).add(new FPNumber(mintedLiquidity));
    const shareOfPool = resultingSupply.isZero()
      ? '0'
      : new FPNumber(mintedLiquidity).div(resultingSupply).mul(new FPNumber('100')).toString();
    const intentId = createIntentId('add-liquidity', {
      assetA: state.pair.assetA.address,
      assetB: state.pair.assetB.address,
      amountA,
      amountB,
      createsPool: !state.exists,
      slippageTolerance,
      mintedLiquidityCodec,
    });
    const poolCreationWarnings: AgentWarning[] = !state.exists
      ? [
          {
            code: 'POOL_CREATION',
            severity: 'warning',
            message: 'This operation will create a new liquidity pool.',
            details: { assetA: state.pair.assetA.address, assetB: state.pair.assetB.address },
          },
        ]
      : [];

    return {
      state,
      quote: {
        intentId,
        pool: toAgentPoolInfo(state),
        createsPool: !state.exists,
        amountA,
        amountB,
        amountACodec,
        amountBCodec,
        amountAMeta: toAssetAmount(state.pair.assetA, amountA, amountACodec),
        amountBMeta: toAssetAmount(state.pair.assetB, amountB, amountBCodec),
        minAmountA,
        minAmountB,
        minAmountACodec: getCodecFromNatural(minAmountA, state.pair.assetA.decimals),
        minAmountBCodec: getCodecFromNatural(minAmountB, state.pair.assetB.decimals),
        minAmountAMeta: toAssetAmount(state.pair.assetA, minAmountA),
        minAmountBMeta: toAssetAmount(state.pair.assetB, minAmountB),
        mintedLiquidity,
        mintedLiquidityCodec,
        mintedLiquidityMeta: state.poolToken ? toAssetAmountFromCodec(state.poolToken, mintedLiquidityCodec) : null,
        shareOfPool,
        slippageTolerance,
        warnings: poolCreationWarnings,
      },
    };
  };

  const quoteAddLiquidity = async (request: AgentAddLiquidityRequest): Promise<AgentAddLiquidityQuote> => {
    try {
      return (await buildAddLiquidityQuote(request)).quote;
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const buildRemoveLiquidityQuote = async (
    request: AgentRemoveLiquidityRequest
  ): Promise<InternalRemoveLiquidityQuote> => {
    const settingsStore = deps.getSettingsStore();
    const state = await getPoolState({ assetA: request.assetA, assetB: request.assetB });

    if (!state.exists) {
      throw agentError('POOL_UNAVAILABLE', 'Pool does not exist.', {
        assetA: state.pair.assetA.address,
        assetB: state.pair.assetB.address,
      });
    }

    const slippageTolerance = normalizeSlippageTolerance(
      request.slippageTolerance,
      `${settingsStore.slippageTolerance || DefaultSlippageTolerance}`
    );
    const requestedLiquidityAmount = normalizeOptionalNaturalAmount(request.liquidityAmount);
    const requestedPercent = request.percent === undefined ? undefined : normalizePercent(request.percent);

    if (requestedLiquidityAmount && requestedPercent) {
      throw agentError('INVALID_AMOUNT', 'Provide either liquidityAmount or percent, not both.');
    }
    if (!(requestedLiquidityAmount || requestedPercent)) {
      throw agentError('INVALID_AMOUNT', 'Provide liquidityAmount or percent.');
    }

    const poolTokenDecimals = state.poolToken?.decimals ?? 18;
    let liquidityAmount = requestedLiquidityAmount;

    if (requestedPercent) {
      const position = await getPoolPosition(state, request.timeoutMs);
      if (!position) {
        throw agentError('POOL_UNAVAILABLE', 'Connected wallet has no liquidity position for this pool.', {
          assetA: state.pair.assetA.address,
          assetB: state.pair.assetB.address,
        });
      }

      liquidityAmount = FPNumber.fromCodecValue(position.balance, poolTokenDecimals)
        .mul(new FPNumber(requestedPercent))
        .div(new FPNumber('100'))
        .toString();
    }

    if (!liquidityAmount) {
      throw agentError('INVALID_AMOUNT', 'Unable to derive liquidity amount.');
    }

    const liquidityAmountCodec = getCodecFromNatural(liquidityAmount, poolTokenDecimals);
    const [storageAmountACodec = ZERO_CODEC, storageAmountBCodec = ZERO_CODEC] =
      deps.api.poolXyk.estimateTokensRetrieved(
        liquidityAmountCodec,
        state.storageReserveACodec,
        state.storageReserveBCodec,
        state.totalSupplyCodec,
        state.pair.storageAssetA.decimals,
        state.pair.storageAssetB.decimals
      );
    const amountACodec = state.pair.isStorageReversed ? storageAmountBCodec : storageAmountACodec;
    const amountBCodec = state.pair.isStorageReversed ? storageAmountACodec : storageAmountBCodec;
    const amountA = getNaturalFromCodec(amountACodec, state.pair.assetA.decimals);
    const amountB = getNaturalFromCodec(amountBCodec, state.pair.assetB.decimals);
    const minAmountA = applySlippageToNatural(amountA, slippageTolerance);
    const minAmountB = applySlippageToNatural(amountB, slippageTolerance);
    const totalSupply = getNaturalFromCodec(state.totalSupplyCodec, poolTokenDecimals);
    const totalSupplyFp = new FPNumber(totalSupply);
    if (totalSupplyFp.isZero()) {
      throw agentError('POOL_UNAVAILABLE', 'Pool total supply is zero.');
    }
    const shareOfPool = new FPNumber(liquidityAmount).div(totalSupplyFp).mul(new FPNumber('100')).toString();
    const intentId = createIntentId('remove-liquidity', {
      assetA: state.pair.assetA.address,
      assetB: state.pair.assetB.address,
      liquidityAmount,
      liquidityAmountCodec,
      slippageTolerance,
      amountACodec,
      amountBCodec,
    });

    return {
      state,
      quote: {
        intentId,
        pool: toAgentPoolInfo(state),
        liquidityAmount,
        liquidityAmountCodec,
        liquidityAmountMeta: state.poolToken ? toAssetAmountFromCodec(state.poolToken, liquidityAmountCodec) : null,
        percentOfPosition: requestedPercent,
        amountA,
        amountB,
        amountACodec,
        amountBCodec,
        amountAMeta: toAssetAmountFromCodec(state.pair.assetA, amountACodec),
        amountBMeta: toAssetAmountFromCodec(state.pair.assetB, amountBCodec),
        minAmountA,
        minAmountB,
        minAmountACodec: getCodecFromNatural(minAmountA, state.pair.assetA.decimals),
        minAmountBCodec: getCodecFromNatural(minAmountB, state.pair.assetB.decimals),
        minAmountAMeta: toAssetAmount(state.pair.assetA, minAmountA),
        minAmountBMeta: toAssetAmount(state.pair.assetB, minAmountB),
        shareOfPool,
        slippageTolerance,
        warnings: [],
      },
    };
  };

  const quoteRemoveLiquidity = async (request: AgentRemoveLiquidityRequest): Promise<AgentRemoveLiquidityQuote> => {
    try {
      return (await buildRemoveLiquidityQuote(request)).quote;
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const prepareAddLiquidity = async (request: AgentAddLiquidityRequest): Promise<AgentPreparedAddLiquidity> => {
    try {
      const { quote, state } = await buildAddLiquidityQuote(request);
      const fee = getFeeEstimate(quote.createsPool ? Operation.CreatePair : Operation.AddLiquidity);
      const requiredBalances = mergeRequiredBalances([
        { asset: state.pair.assetA, amountCodec: quote.amountACodec, reason: 'liquidity-asset-a' },
        { asset: state.pair.assetB, amountCodec: quote.amountBCodec, reason: 'liquidity-asset-b' },
        { asset: getXorAsset(), amountCodec: fee.amountCodec, reason: 'network-fee' },
      ]);
      const warnings = [...getWalletWarnings(), ...quote.warnings, ...getInsufficientBalanceWarnings(requiredBalances)];

      return {
        intentId: quote.intentId,
        canExecute: canExecuteWith(warnings, requiredBalances),
        quote,
        preview: createCallPreview(
          quote.createsPool ? Operation.CreatePair : Operation.AddLiquidity,
          quote.createsPool ? 'api.poolXyk.create' : 'api.poolXyk.add',
          {
            assetA: state.pair.assetA.address,
            assetB: state.pair.assetB.address,
            amountA: quote.amountA,
            amountB: quote.amountB,
            slippageTolerance: quote.slippageTolerance,
          },
          `${quote.createsPool ? 'Create pool and add' : 'Add'} ${quote.amountA} ${state.pair.assetA.symbol} and ${quote.amountB} ${state.pair.assetB.symbol}`
        ),
        fees: [fee],
        requiredBalances,
        warnings,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const prepareRemoveLiquidity = async (
    request: AgentRemoveLiquidityRequest
  ): Promise<AgentPreparedRemoveLiquidity> => {
    try {
      const { quote, state } = await buildRemoveLiquidityQuote(request);
      const fee = getFeeEstimate(Operation.RemoveLiquidity);
      const poolToken = state.poolToken;
      const feeBalances = mergeRequiredBalances([
        { asset: getXorAsset(), amountCodec: fee.amountCodec, reason: 'network-fee' },
      ]);
      const position =
        poolToken && getStatus().wallet.connected ? await getPoolPosition(state, request.timeoutMs) : null;
      const poolTokenBalance =
        poolToken && position
          ? {
              asset: toAgentAsset(poolToken),
              required: quote.liquidityAmount,
              requiredCodec: quote.liquidityAmountCodec,
              available: getNaturalFromCodec(position.balance, poolToken.decimals),
              availableCodec: position.balance,
              sufficient: FPNumber.gte(
                FPNumber.fromCodecValue(position.balance, poolToken.decimals),
                FPNumber.fromCodecValue(quote.liquidityAmountCodec, poolToken.decimals)
              ),
              reason: 'pool-token',
            }
          : null;
      const requiredBalances = poolTokenBalance ? [poolTokenBalance, ...feeBalances] : feeBalances;
      const positionWarnings: AgentWarning[] =
        poolToken && getStatus().wallet.connected && !position
          ? [
              {
                code: 'LOW_LIQUIDITY',
                severity: 'critical',
                message: 'Connected wallet has no removable liquidity position for this pool.',
              },
            ]
          : [];
      const warnings = [
        ...getWalletWarnings(),
        ...quote.warnings,
        ...positionWarnings,
        ...getInsufficientBalanceWarnings(requiredBalances),
      ];

      return {
        intentId: quote.intentId,
        canExecute: canExecuteWith(warnings, requiredBalances),
        quote,
        preview: createCallPreview(
          Operation.RemoveLiquidity,
          'api.poolXyk.remove',
          {
            assetA: state.pair.storageAssetA.address,
            assetB: state.pair.storageAssetB.address,
            liquidityAmount: quote.liquidityAmount,
            reserveA: state.storageReserveACodec,
            reserveB: state.storageReserveBCodec,
            totalSupply: state.totalSupplyCodec,
            slippageTolerance: quote.slippageTolerance,
          },
          `Remove ${quote.liquidityAmount} ${state.poolToken?.symbol ?? 'LP'} from ${state.pair.assetA.symbol}/${state.pair.assetB.symbol}`
        ),
        fees: [fee],
        requiredBalances,
        warnings,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const resolveSwapRequest = async (request: AgentSwapRequest): Promise<AgentResolvedSwapRequest> => {
    ensureNodeReady();

    const settingsStore = deps.getSettingsStore();
    const context = createAssetContext();
    const [assetIn, assetOut] = await Promise.all([
      resolveAssetRef(context, request.assetIn, 'assetIn'),
      resolveAssetRef(context, request.assetOut, 'assetOut'),
    ]);
    const side = normalizeSwapSide(request.side);
    const amount = normalizeNaturalAmount(request.amount);
    const slippageTolerance = normalizeSlippageTolerance(
      request.slippageTolerance,
      `${settingsStore.slippageTolerance || DefaultSlippageTolerance}`
    );
    const liquiditySource = normalizeLiquiditySource(request.liquiditySource);
    const dexId = normalizeDexId(request.dexId);

    return {
      assetIn,
      assetOut,
      amount,
      side,
      isExchangeB: side === 'output',
      slippageTolerance,
      liquiditySource,
      dexId,
      quoteTimeoutMs: normalizeTimeoutMs(request.quoteTimeoutMs),
    };
  };

  const hasSwapPath = async (request: AgentResolvedSwapRequest): Promise<boolean> => {
    const dexIds = request.dexId === 'best' ? getDexIdsForBestQuote(deps.api) : [request.dexId];
    const checks = await Promise.all(
      dexIds.map((dexId) =>
        deps.api.swap.checkSwap(request.assetIn.address, request.assetOut.address, dexId).catch(() => false)
      )
    );

    return checks.some(Boolean);
  };

  const getSwapPathDiagnostics = (request: AgentResolvedSwapRequest) => ({
    assetIn: request.assetIn.address,
    assetOut: request.assetOut.address,
    dexIds: request.dexId === 'best' ? getDexIdsForBestQuote(deps.api) : [request.dexId],
    requestedDexId: request.dexId,
    liquiditySource: request.liquiditySource,
  });

  const getSwapQuoteData = async (request: AgentResolvedSwapRequest): Promise<AvailableSwapQuoteData> => {
    const selectedSources = getSelectedSources(request.liquiditySource);
    const observable =
      request.dexId === 'best'
        ? deps.api.swap.getDexesSwapQuoteObservable(request.assetIn.address, request.assetOut.address, selectedSources)
        : deps.api.swap.getSwapQuoteObservable(
            request.assetIn.address,
            request.assetOut.address,
            selectedSources,
            request.dexId
          );

    if (!observable) {
      throw agentError('PATH_UNAVAILABLE', 'No quote stream is available for this swap path.');
    }

    const calculatedAsset = request.isExchangeB ? request.assetIn : request.assetOut;
    const getAvailableQuoteData = (quoteData: SwapQuoteData): AvailableSwapQuoteData | null => {
      if (!isQuoteDataAvailable(quoteData)) return null;

      const quoteResult = quoteData.quote(
        request.assetIn.address,
        request.assetOut.address,
        request.amount,
        request.isExchangeB,
        selectedSources
      );
      const amountCodec = `${quoteResult?.result?.amount ?? '0'}`;

      if (!quoteResult?.result || FPNumber.fromCodecValue(amountCodec, calculatedAsset.decimals).isZero()) {
        return null;
      }

      return {
        quoteData,
        dexId: quoteResult.dexId,
        result: quoteResult.result,
      };
    };

    try {
      return await firstValueFrom(
        observable.pipe(
          map(getAvailableQuoteData),
          filter((entry): entry is AvailableSwapQuoteData => Boolean(entry)),
          timeout({ first: request.quoteTimeoutMs })
        )
      );
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError') {
        throw agentError('QUOTE_TIMEOUT', 'Timed out waiting for an available swap quote.', {
          timeoutMs: request.quoteTimeoutMs,
          ...getSwapPathDiagnostics(request),
        });
      }
      if (name === 'EmptyError') {
        throw agentError('PATH_UNAVAILABLE', 'Swap quote is unavailable for the selected pair.', {
          ...getSwapPathDiagnostics(request),
        });
      }
      throw error;
    }
  };

  const buildQuote = async (request: AgentSwapRequest): Promise<InternalQuoteResult> => {
    const resolved = await resolveSwapRequest(request);

    try {
      await deps.api.swap.update();
    } catch {
      // Quotes can still be produced from RPC/storage on runtimes where this warm-up is unavailable.
    }

    if (!(await hasSwapPath(resolved))) {
      throw agentError('PATH_UNAVAILABLE', 'Swap path is not available for the selected pair.', {
        ...getSwapPathDiagnostics(resolved),
      });
    }

    const { quoteData, dexId, result } = await getSwapQuoteData(resolved);
    const calculatedAsset = resolved.isExchangeB ? resolved.assetIn : resolved.assetOut;
    const { amount, amountWithoutImpact, fee, rewards, route, distribution } = result;
    const amountCodec = `${amount ?? '0'}`;
    const amountWithoutImpactCodec = `${amountWithoutImpact ?? '0'}`;
    const calculatedAmount = getNaturalFromCodec(amountCodec, calculatedAsset.decimals);
    const amountIn = resolved.isExchangeB ? calculatedAmount : resolved.amount;
    const amountOut = resolved.isExchangeB ? resolved.amount : calculatedAmount;
    const minMaxCodec = deps.api.swap.getMinMaxValue(
      resolved.assetIn,
      resolved.assetOut,
      amountIn,
      amountOut,
      resolved.isExchangeB,
      resolved.slippageTolerance
    );
    const minMaxDecimals = resolved.isExchangeB ? resolved.assetIn.decimals : resolved.assetOut.decimals;
    const minMaxNatural = getNaturalFromCodec(minMaxCodec, minMaxDecimals);
    const priceImpact = deps.api.swap.getPriceImpact(
      resolved.assetIn,
      resolved.assetOut,
      amountIn,
      amountOut,
      amountWithoutImpactCodec,
      resolved.isExchangeB
    );
    const intentId = createIntentId('swap', {
      assetIn: resolved.assetIn.address,
      assetOut: resolved.assetOut.address,
      amount: resolved.amount,
      amountIn,
      amountOut,
      dexId,
      side: resolved.side,
      slippageTolerance: resolved.slippageTolerance,
      liquiditySource: resolved.liquiditySource ?? LiquiditySourceTypes.Default,
      minMaxCodec,
    });
    const minMaxAsset = resolved.isExchangeB ? resolved.assetIn : resolved.assetOut;
    const minMaxMeta = toAssetAmountFromCodec(minMaxAsset, minMaxCodec);

    return {
      resolved,
      quote: {
        intentId,
        request: {
          amount: resolved.amount,
          side: resolved.side,
          slippageTolerance: resolved.slippageTolerance,
          liquiditySource: resolved.liquiditySource,
          dexId: resolved.dexId,
        },
        assetIn: toAgentAsset(resolved.assetIn),
        assetOut: toAgentAsset(resolved.assetOut),
        dexId,
        amountIn,
        amountOut,
        amountWithoutImpact: getNaturalFromCodec(amountWithoutImpactCodec, calculatedAsset.decimals),
        amountInMeta: toAssetAmount(resolved.assetIn, amountIn),
        amountOutMeta: toAssetAmount(resolved.assetOut, amountOut),
        amountWithoutImpactMeta: toAssetAmountFromCodec(calculatedAsset, amountWithoutImpactCodec),
        minAmountOut: resolved.isExchangeB ? undefined : minMaxNatural,
        maxAmountIn: resolved.isExchangeB ? minMaxNatural : undefined,
        minAmountOutMeta: resolved.isExchangeB ? undefined : minMaxMeta,
        maxAmountInMeta: resolved.isExchangeB ? minMaxMeta : undefined,
        minMaxCodec,
        priceImpact,
        liquidityProviderFee: fee,
        rewards,
        route: Array.isArray(route) ? route.map(String) : [],
        distribution,
        liquiditySources: quoteData.liquiditySources,
        raw: {
          amount: amountCodec,
          amountWithoutImpact: amountWithoutImpactCodec,
          fee,
        },
      },
    };
  };

  const createSwapPreview = (resolved: AgentResolvedSwapRequest, quote: AgentSwapQuote): AgentCallPreview =>
    createCallPreview(
      Operation.Swap,
      'api.swap.execute',
      {
        assetIn: resolved.assetIn.address,
        assetOut: resolved.assetOut.address,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        slippageTolerance: resolved.slippageTolerance,
        isExchangeB: resolved.isExchangeB,
        liquiditySource: resolved.liquiditySource ?? LiquiditySourceTypes.Default,
        dexId: quote.dexId,
      },
      `Swap ${quote.amountIn} ${resolved.assetIn.symbol} for ${quote.amountOut} ${resolved.assetOut.symbol}`
    );

  const quoteSwap = async (request: AgentSwapRequest): Promise<AgentSwapQuote> => {
    try {
      return (await buildQuote(request)).quote;
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const prepareSwap = async (request: AgentSwapRequest): Promise<AgentPreparedSwap> => {
    try {
      const { quote, resolved } = await buildQuote(request);
      const fee = getFeeEstimate(Operation.Swap);
      const requiredBalances = mergeRequiredBalances([
        {
          asset: resolved.assetIn,
          amountCodec: getCodecFromNatural(quote.amountIn, resolved.assetIn.decimals),
          reason: 'swap-input',
        },
        { asset: getXorAsset(), amountCodec: fee.amountCodec, reason: 'network-fee' },
      ]);
      const warnings = [
        ...getWalletWarnings(),
        ...getInsufficientBalanceWarnings(requiredBalances),
        ...getHighPriceImpactWarnings(quote),
      ];

      return {
        intentId: quote.intentId,
        canExecute: canExecuteWith(warnings, requiredBalances),
        quote,
        preview: createSwapPreview(resolved, quote),
        fees: [fee],
        requiredBalances,
        warnings,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const normalizePolicyPercent = (value: unknown): string | undefined => {
    if (value === undefined || value === null || `${value}`.trim() === '') return undefined;
    return normalizePercent(value);
  };

  const assessSwap = async (request: AgentSwapAssessmentRequest): Promise<AgentPolicyAssessment> => {
    try {
      const policy: AgentRiskPolicy = request.policy ?? {};
      const maxPriceImpact = normalizePolicyPercent(policy.maxPriceImpact ?? request.maxPriceImpact);
      const requireCanExecute = policy.requireCanExecute ?? request.requireCanExecute ?? true;
      const allowWarnings = policy.allowWarnings ?? request.allowWarnings ?? [];
      const allowedWarningCodes = new Set(allowWarnings);
      const prepared = await prepareSwap(request);
      const reasons: AgentWarning[] = [];

      if (requireCanExecute) {
        reasons.push(
          ...prepared.warnings.filter(
            (warning) => warning.severity === 'critical' && !allowedWarningCodes.has(warning.code)
          )
        );
      }

      if (maxPriceImpact !== undefined && !allowedWarningCodes.has('HIGH_PRICE_IMPACT')) {
        const impact = new FPNumber(`${prepared.quote.priceImpact ?? '0'}`.replace('-', ''));
        if (FPNumber.gt(impact, new FPNumber(maxPriceImpact))) {
          reasons.push({
            code: 'HIGH_PRICE_IMPACT',
            severity: 'critical',
            message: 'Swap price impact exceeds the caller policy.',
            details: {
              priceImpact: prepared.quote.priceImpact,
              maxPriceImpact,
            },
          });
        }
      }

      return {
        approved: reasons.length === 0 && (!requireCanExecute || prepared.canExecute),
        reasons,
        prepared,
        policy: {
          maxPriceImpact,
          requireCanExecute,
          allowWarnings,
        },
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const findLatestSwapTransaction = async (
    startTime: number,
    resolved: AgentResolvedSwapRequest,
    quote: AgentSwapQuote
  ): Promise<HistoryItem | null> => {
    return findLatestTransaction(startTime, (item) => {
      if (item.type !== Operation.Swap) return false;

      return (
        item.assetAddress === resolved.assetIn.address &&
        item.asset2Address === resolved.assetOut.address &&
        `${item.amount ?? ''}` === quote.amountIn &&
        `${item.amount2 ?? ''}` === quote.amountOut &&
        `${item.liquiditySource ?? LiquiditySourceTypes.Default}` ===
          `${resolved.liquiditySource ?? LiquiditySourceTypes.Default}`
      );
    });
  };

  const executeSwap = async (request: AgentSwapRequest): Promise<AgentSwapExecution> => {
    let clientOrderId: string | undefined;
    let idempotencyPending = false;
    let signerAccepted = false;

    try {
      ensureWalletReady();

      const { quote, resolved } = await buildQuote(request);
      const preview = createSwapPreview(resolved, quote);
      clientOrderId = normalizeClientOrderId(request.clientOrderId);
      const existingResult = getIdempotencyResult<AgentSwapExecution>(
        'swap',
        clientOrderId,
        request.intentId ?? quote.intentId
      );
      if (existingResult) return existingResult;

      assertIntent(request.intentId, quote.intentId);
      markIdempotencyPending('swap', clientOrderId, quote.intentId, preview);
      idempotencyPending = Boolean(clientOrderId);

      try {
        await deps.getWalletStore().beforeTransactionSign(deps.api as never);
        signerAccepted = true;
      } catch (error) {
        if (clientOrderId) clearIdempotencyRecord(clientOrderId);
        idempotencyPending = false;
        throw normalizeAgentError(error);
      }

      const startTime = deps.now();
      await deps.api.swap.execute(
        resolved.assetIn,
        resolved.assetOut,
        quote.amountIn,
        quote.amountOut,
        resolved.slippageTolerance,
        resolved.isExchangeB,
        resolved.liquiditySource ?? LiquiditySourceTypes.Default,
        quote.dexId
      );

      const history = await findLatestSwapTransaction(startTime, resolved, quote);

      return completeIdempotency('swap', clientOrderId, quote.intentId, {
        quote,
        transaction: toTransactionRef(history),
      });
    } catch (error) {
      if (clientOrderId && idempotencyPending && !signerAccepted) clearIdempotencyRecord(clientOrderId);
      throw normalizeAgentError(error);
    }
  };

  const prepareTransfer = async (request: AgentTransferRequest): Promise<AgentPreparedTransfer> => {
    try {
      ensureNodeReady();

      const context = createAssetContext();
      const asset = await resolveAssetRef(context, request.asset, 'asset');
      const amount = normalizeNaturalAmount(request.amount);
      const to = normalizeRecipientAddress(request.to);
      const fee = getFeeEstimate(Operation.Transfer);
      const amountCodec = getCodecFromNatural(amount, asset.decimals);
      const intentId = createIntentId('transfer', { asset: asset.address, to, amount, amountCodec });
      const requiredBalances = mergeRequiredBalances([
        { asset: asset as Asset, amountCodec, reason: 'transfer-amount' },
        { asset: getXorAsset(), amountCodec: fee.amountCodec, reason: 'network-fee' },
      ]);
      const warnings = [...getWalletWarnings(), ...getInsufficientBalanceWarnings(requiredBalances)];

      return {
        intentId,
        canExecute: canExecuteWith(warnings, requiredBalances),
        asset: toAgentAsset(asset),
        to,
        amount,
        amountMeta: toAssetAmount(asset as Asset, amount, amountCodec),
        preview: createCallPreview(
          Operation.Transfer,
          'api.assets.simpleTransfer',
          {
            asset: asset.address,
            to,
            amount,
          },
          `Transfer ${amount} ${asset.symbol} to ${to}`
        ),
        fees: [fee],
        requiredBalances,
        warnings,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const executeTransfer = async (request: AgentTransferRequest): Promise<AgentTransferExecution> => {
    let clientOrderId: string | undefined;
    let idempotencyPending = false;
    let signerAccepted = false;

    try {
      ensureNodeReady();
      ensureWalletReady();

      const context = createAssetContext();
      const asset = await resolveAssetRef(context, request.asset, 'asset');
      const amount = normalizeNaturalAmount(request.amount);
      const to = normalizeRecipientAddress(request.to);
      const amountCodec = getCodecFromNatural(amount, asset.decimals);
      const intentId = createIntentId('transfer', { asset: asset.address, to, amount, amountCodec });
      const preview = createCallPreview(
        Operation.Transfer,
        'api.assets.simpleTransfer',
        {
          asset: asset.address,
          to,
          amount,
        },
        `Transfer ${amount} ${asset.symbol} to ${to}`
      );
      clientOrderId = normalizeClientOrderId(request.clientOrderId);
      const existingResult = getIdempotencyResult<AgentTransferExecution>(
        'transfer',
        clientOrderId,
        request.intentId ?? intentId
      );
      if (existingResult) return existingResult;

      assertIntent(request.intentId, intentId);
      markIdempotencyPending('transfer', clientOrderId, intentId, preview);
      idempotencyPending = Boolean(clientOrderId);

      try {
        await deps.getWalletStore().beforeTransactionSign(deps.api as never);
        signerAccepted = true;
      } catch (error) {
        if (clientOrderId) clearIdempotencyRecord(clientOrderId);
        idempotencyPending = false;
        throw normalizeAgentError(error);
      }

      const startTime = deps.now();
      await deps.api.assets.simpleTransfer(asset, to, amount);
      const history = await findLatestTransaction(
        startTime,
        (item) =>
          item.type === Operation.Transfer && item.assetAddress === asset.address && `${item.amount ?? ''}` === amount
      );

      return completeIdempotency('transfer', clientOrderId, intentId, {
        intentId,
        asset: toAgentAsset(asset),
        to,
        amount,
        amountMeta: toAssetAmount(asset as Asset, amount, amountCodec),
        transaction: toTransactionRef(history),
      });
    } catch (error) {
      if (clientOrderId && idempotencyPending && !signerAccepted) clearIdempotencyRecord(clientOrderId);
      throw normalizeAgentError(error);
    }
  };

  const executeAddLiquidity = async (request: AgentAddLiquidityRequest): Promise<AgentAddLiquidityExecution> => {
    let clientOrderId: string | undefined;
    let idempotencyPending = false;
    let signerAccepted = false;

    try {
      ensureWalletReady();

      const { quote, state } = await buildAddLiquidityQuote(request);
      const preview = createCallPreview(
        quote.createsPool ? Operation.CreatePair : Operation.AddLiquidity,
        quote.createsPool ? 'api.poolXyk.create' : 'api.poolXyk.add',
        {
          assetA: state.pair.assetA.address,
          assetB: state.pair.assetB.address,
          amountA: quote.amountA,
          amountB: quote.amountB,
          slippageTolerance: quote.slippageTolerance,
        },
        `${quote.createsPool ? 'Create pool and add' : 'Add'} ${quote.amountA} ${state.pair.assetA.symbol} and ${quote.amountB} ${state.pair.assetB.symbol}`
      );
      clientOrderId = normalizeClientOrderId(request.clientOrderId);
      const existingResult = getIdempotencyResult<AgentAddLiquidityExecution>(
        'add-liquidity',
        clientOrderId,
        request.intentId ?? quote.intentId
      );
      if (existingResult) return existingResult;

      assertIntent(request.intentId, quote.intentId);
      markIdempotencyPending('add-liquidity', clientOrderId, quote.intentId, preview);
      idempotencyPending = Boolean(clientOrderId);

      try {
        await deps.getWalletStore().beforeTransactionSign(deps.api as never);
        signerAccepted = true;
      } catch (error) {
        if (clientOrderId) clearIdempotencyRecord(clientOrderId);
        idempotencyPending = false;
        throw normalizeAgentError(error);
      }

      const startTime = deps.now();
      if (quote.createsPool) {
        await deps.api.poolXyk.create(
          state.pair.assetA,
          state.pair.assetB,
          quote.amountA,
          quote.amountB,
          quote.slippageTolerance
        );
      } else {
        await deps.api.poolXyk.add(
          state.pair.assetA,
          state.pair.assetB,
          quote.amountA,
          quote.amountB,
          quote.slippageTolerance
        );
      }

      const expectedOperation = quote.createsPool ? Operation.CreatePair : Operation.AddLiquidity;
      const history = await findLatestTransaction(
        startTime,
        (item) =>
          item.type === expectedOperation &&
          item.assetAddress === state.pair.assetA.address &&
          item.asset2Address === state.pair.assetB.address &&
          `${item.amount ?? ''}` === quote.amountA &&
          `${item.amount2 ?? ''}` === quote.amountB
      );

      return completeIdempotency('add-liquidity', clientOrderId, quote.intentId, {
        quote,
        transaction: toTransactionRef(history),
      });
    } catch (error) {
      if (clientOrderId && idempotencyPending && !signerAccepted) clearIdempotencyRecord(clientOrderId);
      throw normalizeAgentError(error);
    }
  };

  const executeRemoveLiquidity = async (
    request: AgentRemoveLiquidityRequest
  ): Promise<AgentRemoveLiquidityExecution> => {
    let clientOrderId: string | undefined;
    let idempotencyPending = false;
    let signerAccepted = false;

    try {
      ensureWalletReady();

      const { quote, state } = await buildRemoveLiquidityQuote(request);
      const preview = createCallPreview(
        Operation.RemoveLiquidity,
        'api.poolXyk.remove',
        {
          assetA: state.pair.storageAssetA.address,
          assetB: state.pair.storageAssetB.address,
          liquidityAmount: quote.liquidityAmount,
          reserveA: state.storageReserveACodec,
          reserveB: state.storageReserveBCodec,
          totalSupply: state.totalSupplyCodec,
          slippageTolerance: quote.slippageTolerance,
        },
        `Remove ${quote.liquidityAmount} ${state.poolToken?.symbol ?? 'LP'} from ${state.pair.assetA.symbol}/${state.pair.assetB.symbol}`
      );
      clientOrderId = normalizeClientOrderId(request.clientOrderId);
      const existingResult = getIdempotencyResult<AgentRemoveLiquidityExecution>(
        'remove-liquidity',
        clientOrderId,
        request.intentId ?? quote.intentId
      );
      if (existingResult) return existingResult;

      assertIntent(request.intentId, quote.intentId);
      markIdempotencyPending('remove-liquidity', clientOrderId, quote.intentId, preview);
      idempotencyPending = Boolean(clientOrderId);

      try {
        await deps.getWalletStore().beforeTransactionSign(deps.api as never);
        signerAccepted = true;
      } catch (error) {
        if (clientOrderId) clearIdempotencyRecord(clientOrderId);
        idempotencyPending = false;
        throw normalizeAgentError(error);
      }

      const startTime = deps.now();
      await deps.api.poolXyk.remove(
        state.pair.storageAssetA,
        state.pair.storageAssetB,
        quote.liquidityAmount,
        state.storageReserveACodec,
        state.storageReserveBCodec,
        state.totalSupplyCodec,
        quote.slippageTolerance
      );

      const storageAmountA = state.pair.isStorageReversed ? quote.amountB : quote.amountA;
      const storageAmountB = state.pair.isStorageReversed ? quote.amountA : quote.amountB;
      const history = await findLatestTransaction(
        startTime,
        (item) =>
          item.type === Operation.RemoveLiquidity &&
          item.assetAddress === state.pair.storageAssetA.address &&
          item.asset2Address === state.pair.storageAssetB.address &&
          `${item.amount ?? ''}` === storageAmountA &&
          `${item.amount2 ?? ''}` === storageAmountB
      );

      return completeIdempotency('remove-liquidity', clientOrderId, quote.intentId, {
        quote,
        transaction: toTransactionRef(history),
      });
    } catch (error) {
      if (clientOrderId && idempotencyPending && !signerAccepted) clearIdempotencyRecord(clientOrderId);
      throw normalizeAgentError(error);
    }
  };

  const getMaxAmountAfterFee = (asset: Asset, operation: Operation): AgentMaxAmount => {
    ensureWalletReady();

    const fee = getFeeEstimate(operation);
    const available = getAvailableAssetAmount(asset);
    let maxAmount = FPNumber.fromCodecValue(available.codec, asset.decimals);
    const warnings: AgentWarning[] = [];

    if (asset.address === getXorAsset().address) {
      const feeAmount = FPNumber.fromCodecValue(fee.amountCodec, asset.decimals);
      maxAmount = FPNumber.gt(maxAmount, feeAmount) ? maxAmount.sub(feeAmount) : FPNumber.ZERO;
    }

    if (maxAmount.isZero()) {
      warnings.push({
        code: 'INSUFFICIENT_BALANCE',
        severity: 'warning',
        message: `No spendable ${asset.symbol} balance is available after fees.`,
      });
    }

    return {
      asset: toAgentAsset(asset),
      amount: maxAmount.toString(),
      amountCodec: maxAmount.toCodecString(),
      fees: [fee],
      warnings,
    };
  };

  const maxTransferAmount = async (request: AgentMaxAmountRequest): Promise<AgentMaxAmount> => {
    try {
      const asset = await resolveAssetRef(createAssetContext(), request.asset, 'asset');
      return getMaxAmountAfterFee(asset as Asset, Operation.Transfer);
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const maxSwapInput = async (request: AgentMaxSwapInputRequest): Promise<AgentMaxAmount> => {
    try {
      const asset = await resolveAssetRef(createAssetContext(), request.assetIn, 'assetIn');
      const maxAmount = getMaxAmountAfterFee(asset as Asset, Operation.Swap);

      if (!request.assetOut || new FPNumber(maxAmount.amount).isZero()) {
        return maxAmount;
      }

      try {
        const quote = await quoteSwap({
          assetIn: { address: asset.address },
          assetOut: request.assetOut,
          amount: maxAmount.amount,
          side: 'input',
        });

        return {
          ...maxAmount,
          quote,
        };
      } catch (error) {
        return {
          ...maxAmount,
          amount: '0',
          amountCodec: ZERO_CODEC,
          warnings: [
            ...maxAmount.warnings,
            {
              code: 'PATH_UNAVAILABLE',
              severity: 'critical',
              message: 'No executable swap path was found for the max input pair.',
              details: normalizeAgentError(error).toJSON(),
            },
          ],
        };
      }
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const maxAddLiquidity = async (request: AgentMaxAddLiquidityRequest): Promise<AgentMaxAddLiquidity> => {
    try {
      ensureWalletReady();

      const state = await getPoolState({ assetA: request.assetA, assetB: request.assetB });
      const fee = getFeeEstimate(Operation.AddLiquidity);
      const maxA = getMaxAmountAfterFee(state.pair.assetA, Operation.AddLiquidity);
      const maxB = getMaxAmountAfterFee(state.pair.assetB, Operation.AddLiquidity);
      let amountA = maxA.amount;
      let amountB = maxB.amount;
      const warnings: AgentWarning[] = [...maxA.warnings, ...maxB.warnings];

      if (state.exists) {
        const reserveA = getNaturalFromCodec(state.reserveACodec, state.pair.assetA.decimals);
        const reserveB = getNaturalFromCodec(state.reserveBCodec, state.pair.assetB.decimals);
        if (new FPNumber(reserveA).isZero() || new FPNumber(reserveB).isZero()) {
          amountA = '0';
          amountB = '0';
          warnings.push({
            code: 'LOW_LIQUIDITY',
            severity: 'warning',
            message: 'Pool reserves are empty.',
          });
        } else {
          const maxBFromA = new FPNumber(amountA).mul(new FPNumber(reserveB)).div(new FPNumber(reserveA));
          if (FPNumber.lte(maxBFromA, new FPNumber(amountB))) {
            amountB = maxBFromA.toString();
          } else {
            amountA = new FPNumber(amountB).mul(new FPNumber(reserveA)).div(new FPNumber(reserveB)).toString();
          }
        }
      } else {
        warnings.push({
          code: 'POOL_CREATION',
          severity: 'warning',
          message: 'No existing pool was found; max amounts assume a new pool.',
        });
      }

      return {
        assetA: toAgentAsset(state.pair.assetA),
        assetB: toAgentAsset(state.pair.assetB),
        amountA,
        amountB,
        amountACodec: getCodecFromNatural(amountA, state.pair.assetA.decimals),
        amountBCodec: getCodecFromNatural(amountB, state.pair.assetB.decimals),
        fees: [fee],
        warnings,
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const maxRemoveLiquidity = async (request: AgentMaxRemoveLiquidityRequest): Promise<AgentMaxRemoveLiquidity> => {
    try {
      ensureWalletReady();

      const positions = await liquidityPositions({
        assetA: request.assetA,
        assetB: request.assetB,
        timeoutMs: request.timeoutMs,
      });
      const position = positions[0] ?? null;

      return {
        position,
        liquidityAmount: position?.liquidityAmount ?? '0',
        liquidityAmountCodec: position?.liquidityAmountCodec ?? '0',
        percent: position ? '100' : '0',
        warnings: position
          ? []
          : [
              {
                code: 'LOW_LIQUIDITY',
                severity: 'warning',
                message: 'No removable liquidity position was found.',
              },
            ],
      };
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const transactionStatus = (request: AgentTransactionStatusRequest): AgentTransactionStatus => {
    const id = normalizeTransactionIdentifier(request);
    const idempotency = findIdempotencyRecord(id);
    const transaction = idempotency?.transaction?.history ?? findLocalTransaction(id);

    return {
      id,
      lookup: 'local',
      source: idempotency?.transaction?.history
        ? 'idempotency'
        : transaction
          ? 'local'
          : idempotency
            ? 'idempotency'
            : 'none',
      transaction,
      idempotency,
    };
  };

  const waitForTransaction = async (request: AgentWaitForTransactionRequest): Promise<AgentTransactionStatus> => {
    try {
      const id = normalizeTransactionIdentifier(request);
      const timeoutAt = deps.now() + normalizeTimeoutMs(request.timeoutMs);

      while (true) {
        const status = await lookupTransaction(request);
        if (status.transaction && (!request.status || status.transaction.status === request.status)) {
          return status;
        }

        if (deps.now() >= timeoutAt) {
          throw agentError('QUOTE_TIMEOUT', 'Timed out waiting for transaction status.', {
            id,
            status: request.status,
            timeoutMs: request.timeoutMs,
          });
        }

        await deps.delay(TRANSACTION_LOOKUP_POLL_MS);
      }
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const normalizeRecentLimit = (limit: unknown): number => {
    const value = Number(limit ?? 20);
    return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 100)) : 20;
  };

  const getRecentTransactionAssetAddress = async (request: AgentRecentTransactionsRequest): Promise<string> => {
    if (!request.asset) return '';
    const asset = await resolveAssetRef(createAssetContext(), request.asset, 'asset');
    return asset.address;
  };

  const transactionMatchesRecentFilter = (
    transaction: HistoryItem,
    request: Pick<AgentRecentTransactionsRequest, 'type'>,
    assetAddress: string
  ): boolean => {
    if (request.type && transaction.type !== request.type) return false;
    if (assetAddress && transaction.assetAddress !== assetAddress && transaction.asset2Address !== assetAddress) {
      return false;
    }
    return true;
  };

  const recentTransactions = async (request: AgentRecentTransactionsRequest = {}): Promise<HistoryItem[]> => {
    try {
      const assetAddress = await getRecentTransactionAssetAddress(request);
      const limit = normalizeRecentLimit(request.limit);

      return [...deps.api.historyList]
        .filter((item) => transactionMatchesRecentFilter(item, request, assetAddress))
        .sort((a, b) => Number(b.startTime ?? 0) - Number(a.startTime ?? 0))
        .slice(0, limit);
    } catch (error) {
      throw normalizeAgentError(error);
    }
  };

  const getTransactionIdentity = (transaction: HistoryItem): string =>
    `${transaction.id ?? transaction.txId ?? stableHash(stableStringify(transaction))}`;

  const subscribeTransactions = async (
    request: AgentTransactionSubscriptionRequest,
    listener: AgentTransactionListener
  ): Promise<AgentUnsubscribe> => {
    const subscriptionRequest = request ?? {};
    const source = normalizeTransactionSubscriptionSource(subscriptionRequest.source);
    const useLocal = source === 'local' || source === 'all';
    const useIndexer = source === 'indexer' || source === 'all';
    const pollMs = normalizePollMs(subscriptionRequest.pollMs);
    const limit = normalizeRecentLimit(subscriptionRequest.limit);
    const assetAddress = await getRecentTransactionAssetAddress(subscriptionRequest);
    const seen = new Set<string>();
    const unsubscribers: AgentUnsubscribe[] = [];
    let closed = false;

    const pollRequest: AgentRecentTransactionsRequest = {
      type: subscriptionRequest.type,
      asset: subscriptionRequest.asset,
      limit,
    };

    const emitTransaction = (transaction: HistoryItem, emit: boolean): void => {
      if (closed || !transactionMatchesRecentFilter(transaction, subscriptionRequest, assetAddress)) return;

      const identity = getTransactionIdentity(transaction);
      if (seen.has(identity)) return;

      seen.add(identity);
      if (emit) listener(transaction);
    };

    const poll = async (emit: boolean): Promise<void> => {
      if (closed) return;

      const transactions = await recentTransactions(pollRequest);
      for (const transaction of transactions.reverse()) {
        emitTransaction(transaction, emit);
      }
    };

    try {
      if (useLocal) {
        await poll(Boolean(subscriptionRequest.includeExisting));
        const interval = globalThis.setInterval(() => {
          void poll(true).catch(() => undefined);
        }, pollMs);
        unsubscribers.push(() => globalThis.clearInterval(interval));
      }

      if (useIndexer) {
        const address = subscriptionRequest.address?.trim() || getStatus().wallet.address;
        if (!address) {
          throw agentError(
            'WALLET_NOT_CONNECTED',
            'An address or connected wallet is required for indexer subscriptions.'
          );
        }

        try {
          deps.api.formatAddress(address);
        } catch (error) {
          throw agentError('WALLET_ACCOUNT_REQUIRED', 'Indexer subscription address is invalid.', {
            address,
            cause: error,
          });
        }

        const indexer = deps.getIndexer?.();
        const accountModule = indexer?.services.explorer.account;
        if (!indexer?.historyElementsFilter || !accountModule?.createHistorySubscription) {
          throw agentError('AGENT_API_UNAVAILABLE', 'Indexer transaction subscriptions are unavailable.');
        }

        const operationValues = Object.values(Operation) as string[];
        const operations = subscriptionRequest.type
          ? operationValues.includes(subscriptionRequest.type)
            ? [subscriptionRequest.type as Operation]
            : []
          : indexer.services.dataParser.supportedOperations;
        const filter = indexer.historyElementsFilter({
          address,
          assetAddress,
          operations,
        });

        if (subscriptionRequest.includeExisting) {
          const transactions = await lookupIndexerTransactions({
            filter,
            first: limit,
            orderBy: HISTORY_ELEMENTS_ORDER_BY_NEWEST,
          });

          for (const transaction of transactions.reverse()) {
            emitTransaction(transaction, true);
          }
        }

        const unsubscribeIndexer = accountModule.createHistorySubscription(address, (transaction) => {
          void indexer.services.dataParser
            .parseTransactionAsHistoryItem(transaction as never)
            .then((history) => {
              if (history) emitTransaction(history, true);
            })
            .catch(() => undefined);
        });

        unsubscribers.push(unsubscribeIndexer);
      }
    } catch (error) {
      closed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      throw normalizeAgentError(error);
    }

    return () => {
      closed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  };

  const subscribeStatus = (
    request: AgentStatusSubscriptionRequest,
    listener: AgentStatusListener
  ): AgentUnsubscribe => {
    const subscriptionRequest = request ?? {};
    const pollMs = normalizePollMs(subscriptionRequest.pollMs);
    let previousStatus = stableStringify(getStatus());

    if (subscriptionRequest.emitImmediately) {
      listener(getStatus());
    }

    const interval = globalThis.setInterval(() => {
      const status = getStatus();
      const serialized = stableStringify(status);
      if (serialized === previousStatus) return;
      previousStatus = serialized;
      listener(status);
    }, pollMs);

    return () => {
      globalThis.clearInterval(interval);
    };
  };

  return {
    version: POLKASWAP_AGENT_API_VERSION,
    capabilities,
    ready,
    status: getStatus,
    refreshWallets,
    walletAccounts,
    connectWallet,
    assets,
    resolveAsset,
    commonAssets,
    quoteSwap,
    prepareSwap,
    assessSwap,
    executeSwap,
    prepareTransfer,
    executeTransfer,
    poolInfo,
    liquidityPositions,
    quoteAddLiquidity,
    prepareAddLiquidity,
    executeAddLiquidity,
    quoteRemoveLiquidity,
    prepareRemoveLiquidity,
    executeRemoveLiquidity,
    maxTransferAmount,
    maxSwapInput,
    maxAddLiquidity,
    maxRemoveLiquidity,
    transactionStatus,
    lookupTransaction,
    recoverTransaction,
    waitForTransaction,
    recentTransactions,
    subscribeTransactions,
    subscribeStatus,
    exportState,
    importState,
    clearState,
  };
}
