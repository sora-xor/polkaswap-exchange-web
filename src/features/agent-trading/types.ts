import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { AccountBalance, Asset } from '@sora-substrate/sdk/build/assets/types';
import type { HistoryItem } from '@/lib/substrate/sdk/types';

export const POLKASWAP_AGENT_API_VERSION = 'v1';
export const POLKASWAP_AGENT_READY_EVENT = 'polkaswap-agent-ready';
export const AGENT_METHODS = [
  'capabilities',
  'ready',
  'status',
  'refreshWallets',
  'walletAccounts',
  'connectWallet',
  'assets',
  'resolveAsset',
  'commonAssets',
  'quoteSwap',
  'prepareSwap',
  'assessSwap',
  'executeSwap',
  'prepareTransfer',
  'executeTransfer',
  'poolInfo',
  'liquidityPositions',
  'quoteAddLiquidity',
  'prepareAddLiquidity',
  'executeAddLiquidity',
  'quoteRemoveLiquidity',
  'prepareRemoveLiquidity',
  'executeRemoveLiquidity',
  'maxTransferAmount',
  'maxSwapInput',
  'maxAddLiquidity',
  'maxRemoveLiquidity',
  'transactionStatus',
  'lookupTransaction',
  'recoverTransaction',
  'waitForTransaction',
  'recentTransactions',
  'subscribeTransactions',
  'subscribeStatus',
  'exportState',
  'importState',
  'clearState',
] as const;
export const AGENT_CAPABILITIES = [
  'status',
  'wallet-connect',
  'wallet-accounts',
  'asset-discovery',
  'asset-resolution',
  'swap-quote',
  'swap-prepare',
  'swap-risk-assessment',
  'swap-execute',
  'transfer-prepare',
  'transfer-execute',
  'pool-info',
  'liquidity-positions',
  'liquidity-add-quote',
  'liquidity-add-prepare',
  'liquidity-add-execute',
  'liquidity-remove-quote',
  'liquidity-remove-prepare',
  'liquidity-remove-execute',
  'max-amounts',
  'transaction-status',
  'transaction-lookup',
  'transaction-recovery',
  'transaction-wait',
  'transaction-history',
  'transaction-subscriptions',
  'transaction-indexer-subscriptions',
  'status-subscriptions',
  'portable-agent-state',
] as const;

export type AgentSwapSide = 'input' | 'output';
export type AgentDexId = 'best' | number;

export type AgentErrorCode =
  | 'AGENT_API_UNAVAILABLE'
  | 'ASSET_AMBIGUOUS'
  | 'ASSET_NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'INVALID_ASSET_REF'
  | 'INVALID_AGENT_STATE'
  | 'INVALID_CLIENT_ORDER_ID'
  | 'INVALID_DEX_ID'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTENT_MISMATCH'
  | 'INVALID_LIQUIDITY_SOURCE'
  | 'INVALID_PERCENT'
  | 'INVALID_POOL_PAIR'
  | 'INVALID_RECIPIENT'
  | 'INVALID_SLIPPAGE'
  | 'INVALID_SUBSCRIPTION_SOURCE'
  | 'INVALID_SWAP_SIDE'
  | 'INVALID_TRANSACTION_ID'
  | 'INVALID_WALLET_SOURCE'
  | 'NODE_NOT_READY'
  | 'PATH_UNAVAILABLE'
  | 'POOL_UNAVAILABLE'
  | 'QUOTE_TIMEOUT'
  | 'SIGNING_CANCELLED'
  | 'WALLET_ACCOUNT_NOT_FOUND'
  | 'WALLET_ACCOUNT_REQUIRED'
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_NOT_FOUND';

export interface AgentErrorShape {
  code: AgentErrorCode;
  message: string;
  details?: unknown;
}

export interface AgentReadyOptions {
  requireNode?: boolean;
  requireWallet?: boolean;
  timeoutMs?: number;
}

export interface AgentWalletConnectRequest {
  source: string;
  address?: string;
}

export interface AgentAssetsRequest {
  query?: string;
  includeBalances?: boolean;
}

export type AgentAssetRef = {
  address?: string;
  symbol?: string;
};

export interface AgentIntentRequest {
  intentId?: string;
  clientOrderId?: string;
}

export interface AgentSwapRequest extends AgentIntentRequest {
  assetIn: AgentAssetRef;
  assetOut: AgentAssetRef;
  amount: string | number;
  side?: AgentSwapSide;
  slippageTolerance?: string | number;
  liquiditySource?: LiquiditySourceTypes | string;
  dexId?: AgentDexId | string;
  quoteTimeoutMs?: number;
}

export interface AgentTransferRequest extends AgentIntentRequest {
  asset: AgentAssetRef;
  to: string;
  amount: string | number;
}

export interface AgentResolveAssetRequest {
  asset: AgentAssetRef;
  includeBalance?: boolean;
}

export interface AgentPoolInfoRequest {
  assetA: AgentAssetRef;
  assetB: AgentAssetRef;
}

export interface AgentLiquidityPositionsRequest {
  assetA?: AgentAssetRef;
  assetB?: AgentAssetRef;
  timeoutMs?: number;
}

export interface AgentAddLiquidityRequest extends AgentIntentRequest {
  assetA: AgentAssetRef;
  assetB: AgentAssetRef;
  amountA?: string | number;
  amountB?: string | number;
  slippageTolerance?: string | number;
  allowPoolCreation?: boolean;
}

export interface AgentRemoveLiquidityRequest extends AgentIntentRequest {
  assetA: AgentAssetRef;
  assetB: AgentAssetRef;
  liquidityAmount?: string | number;
  percent?: string | number;
  slippageTolerance?: string | number;
  timeoutMs?: number;
}

export interface AgentMaxAmountRequest {
  asset: AgentAssetRef;
}

export interface AgentMaxSwapInputRequest {
  assetIn: AgentAssetRef;
  assetOut?: AgentAssetRef;
}

export interface AgentMaxAddLiquidityRequest {
  assetA: AgentAssetRef;
  assetB: AgentAssetRef;
}

export interface AgentMaxRemoveLiquidityRequest {
  assetA: AgentAssetRef;
  assetB: AgentAssetRef;
  timeoutMs?: number;
}

export type AgentTransactionLookup = 'local' | 'indexer' | 'chain' | 'any';
export type AgentTransactionSubscriptionSource = 'local' | 'indexer' | 'all';

export interface AgentTransactionStatusRequest {
  id?: string;
  txId?: string;
  lookup?: AgentTransactionLookup;
  blockHash?: string;
  blockHeight?: string | number;
}

export interface AgentWaitForTransactionRequest extends AgentTransactionStatusRequest {
  timeoutMs?: number;
  status?: string;
}

export interface AgentRecoverTransactionRequest extends AgentTransactionStatusRequest {
  clientOrderId?: string;
  intentId?: string;
  limit?: number;
}

export interface AgentRecentTransactionsRequest {
  type?: string;
  asset?: AgentAssetRef;
  limit?: number;
}

export interface AgentTransactionSubscriptionRequest extends AgentRecentTransactionsRequest {
  source?: AgentTransactionSubscriptionSource;
  address?: string;
  pollMs?: number;
  includeExisting?: boolean;
}

export interface AgentStatusSubscriptionRequest {
  pollMs?: number;
  emitImmediately?: boolean;
}

export type AgentTransactionListener = (transaction: HistoryItem) => void;
export type AgentStatusListener = (status: AgentStatus) => void;
export type AgentUnsubscribe = () => void;

export interface AgentWalletAccountsRequest {
  source: string;
}

export interface AgentWalletAccount {
  address: string;
  name: string;
  source: string;
}

export interface AgentNodeStatus {
  connected: boolean;
  endpoint: string;
  blockNumber: number;
}

export interface AgentWalletProviderStatus {
  source: string;
  title: string;
  installed: boolean;
  available: boolean;
  supportsSigning: boolean;
  requiresUserApproval: boolean;
  accountsCount?: number;
}

export interface AgentWalletStatus {
  loaded: boolean;
  connected: boolean;
  address: string;
  source: string;
  accountsCount?: number;
  availableWallets: AgentWalletProviderStatus[];
}

export interface AgentStatus {
  version: string;
  agent: {
    mode: boolean;
    disclaimerSuppressed: boolean;
    queryParam: string;
  };
  node: AgentNodeStatus;
  wallet: AgentWalletStatus;
  settings: {
    slippageTolerance: string;
  };
}

export interface AgentAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  type?: string;
  isMintable?: boolean;
  balance?: AccountBalance;
}

export interface AgentResolvedAsset extends AgentAsset {
  canonical: boolean;
}

export interface AgentAssetAmount {
  asset: AgentAsset;
  value: string;
  codec: string;
  decimals: number;
  display: string;
}

export interface AgentRequiredBalance {
  asset: AgentAsset;
  required: string;
  requiredCodec: string;
  available: string;
  availableCodec: string;
  sufficient: boolean;
  reason: string;
}

export interface AgentFeeEstimate {
  operation: string;
  asset: AgentAsset;
  amount: string;
  amountCodec: string;
  source: 'static' | 'unavailable';
}

export type AgentWarningSeverity = 'info' | 'warning' | 'critical';

export interface AgentWarning {
  code:
    | 'HIGH_PRICE_IMPACT'
    | 'INSUFFICIENT_BALANCE'
    | 'LOW_LIQUIDITY'
    | 'NON_CANONICAL_ASSET'
    | 'PATH_UNAVAILABLE'
    | 'POOL_CREATION'
    | 'SIGNER_NOT_READY'
    | 'STALE_INTENT'
    | 'WALLET_NOT_CONNECTED';
  severity: AgentWarningSeverity;
  message: string;
  details?: unknown;
}

export interface AgentCapabilities {
  version: string;
  runtime: 'browser';
  hosting: 'static-ipfs';
  global: 'window.PolkaswapAgent';
  readyEvent: 'polkaswap-agent-ready';
  methods: string[];
  capabilities: string[];
  defaults: {
    side: AgentSwapSide;
    slippageTolerance: string;
    dexId: AgentDexId;
    allowPoolCreation: boolean;
  };
  limits: {
    slippageTolerance: { min: string; max: string };
    percent: { min: string; max: string };
    defaultReadyTimeoutMs: number;
    defaultQuoteTimeoutMs: number;
  };
  security: {
    middleware: false;
    samePageOnly: true;
    postMessage: false;
    custody: 'caller-provided-wallet';
  };
  status: AgentStatus;
}

export interface AgentResolvedSwapRequest {
  assetIn: Asset;
  assetOut: Asset;
  amount: string;
  side: AgentSwapSide;
  isExchangeB: boolean;
  slippageTolerance: string;
  liquiditySource?: LiquiditySourceTypes;
  dexId: AgentDexId;
  quoteTimeoutMs: number;
}

export interface AgentSwapQuote {
  intentId: string;
  request: {
    amount: string;
    side: AgentSwapSide;
    slippageTolerance: string;
    liquiditySource?: LiquiditySourceTypes;
    dexId: AgentDexId;
  };
  assetIn: AgentAsset;
  assetOut: AgentAsset;
  dexId: number;
  amountIn: string;
  amountOut: string;
  amountWithoutImpact: string;
  amountInMeta: AgentAssetAmount;
  amountOutMeta: AgentAssetAmount;
  amountWithoutImpactMeta: AgentAssetAmount;
  minAmountOut?: string;
  maxAmountIn?: string;
  minAmountOutMeta?: AgentAssetAmount;
  maxAmountInMeta?: AgentAssetAmount;
  minMaxCodec: string;
  priceImpact: string;
  liquidityProviderFee: unknown;
  rewards: unknown;
  route: string[];
  distribution: unknown;
  liquiditySources: LiquiditySourceTypes[];
  raw: {
    amount: string;
    amountWithoutImpact: string;
    fee: unknown;
  };
}

export interface AgentSwapExecution {
  quote: AgentSwapQuote;
  transaction: AgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface AgentTransactionRef {
  id: string;
  txId?: string;
  status?: string;
  history: HistoryItem | null;
}

export interface AgentTransferExecution {
  intentId: string;
  asset: AgentAsset;
  to: string;
  amount: string;
  amountMeta: AgentAssetAmount;
  transaction: AgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface AgentPoolInfo {
  assetA: AgentAsset;
  assetB: AgentAsset;
  poolToken: AgentAsset | null;
  exists: boolean;
  reserveA: string;
  reserveB: string;
  reserveACodec: string;
  reserveBCodec: string;
  totalSupply: string;
  totalSupplyCodec: string;
  priceAInB: string;
  priceBInA: string;
}

export interface AgentLiquidityPosition {
  assetA: AgentAsset;
  assetB: AgentAsset;
  poolToken: AgentAsset;
  liquidityAmount: string;
  liquidityAmountCodec: string;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  poolShare: string;
  totalSupply: string;
  totalSupplyCodec: string;
}

export interface AgentAddLiquidityQuote {
  intentId: string;
  pool: AgentPoolInfo;
  createsPool: boolean;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  amountAMeta: AgentAssetAmount;
  amountBMeta: AgentAssetAmount;
  minAmountA: string;
  minAmountB: string;
  minAmountACodec: string;
  minAmountBCodec: string;
  minAmountAMeta: AgentAssetAmount;
  minAmountBMeta: AgentAssetAmount;
  mintedLiquidity: string;
  mintedLiquidityCodec: string;
  mintedLiquidityMeta: AgentAssetAmount | null;
  shareOfPool: string;
  slippageTolerance: string;
  warnings: AgentWarning[];
}

export interface AgentAddLiquidityExecution {
  quote: AgentAddLiquidityQuote;
  transaction: AgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface AgentRemoveLiquidityQuote {
  intentId: string;
  pool: AgentPoolInfo;
  liquidityAmount: string;
  liquidityAmountCodec: string;
  liquidityAmountMeta: AgentAssetAmount | null;
  percentOfPosition?: string;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  amountAMeta: AgentAssetAmount;
  amountBMeta: AgentAssetAmount;
  minAmountA: string;
  minAmountB: string;
  minAmountACodec: string;
  minAmountBCodec: string;
  minAmountAMeta: AgentAssetAmount;
  minAmountBMeta: AgentAssetAmount;
  shareOfPool: string;
  slippageTolerance: string;
  warnings: AgentWarning[];
}

export interface AgentRemoveLiquidityExecution {
  quote: AgentRemoveLiquidityQuote;
  transaction: AgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface AgentTransactionStatus {
  id: string;
  lookup: AgentTransactionLookup;
  source: 'local' | 'indexer' | 'chain' | 'idempotency' | 'none';
  transaction: HistoryItem | null;
  idempotency?: AgentIdempotencyRecord;
}

export interface AgentCallPreview {
  operation: string;
  sdkCall: string;
  stateChanging: true;
  signer: {
    address: string;
    source: string;
    connected: boolean;
  };
  args: Record<string, unknown>;
  summary: string;
}

export interface AgentIdempotencyRecord {
  clientOrderId: string;
  intentId: string;
  action: 'swap' | 'transfer' | 'add-liquidity' | 'remove-liquidity';
  status: 'pending' | 'submitted';
  createdAt: number;
  updatedAt: number;
  preview?: AgentCallPreview;
  transaction?: AgentTransactionRef | null;
}

export interface AgentExportedIdempotencyRecord extends AgentIdempotencyRecord {
  result?: unknown;
}

export interface AgentStateExport {
  version: string;
  exportedAt: number;
  idempotency: AgentExportedIdempotencyRecord[];
}

export interface AgentExportStateRequest {
  redacted?: boolean;
}

export interface AgentImportStateRequest {
  state: AgentStateExport;
  merge?: boolean;
}

export interface AgentClearStateRequest {
  clientOrderId?: string;
}

export interface AgentStateImportResult {
  imported: number;
  skipped: number;
  records: AgentExportedIdempotencyRecord[];
}

export interface AgentPreparedSwap {
  intentId: string;
  canExecute: boolean;
  quote: AgentSwapQuote;
  preview: AgentCallPreview;
  fees: AgentFeeEstimate[];
  requiredBalances: AgentRequiredBalance[];
  warnings: AgentWarning[];
}

export interface AgentPreparedTransfer {
  intentId: string;
  canExecute: boolean;
  asset: AgentAsset;
  to: string;
  amount: string;
  amountMeta: AgentAssetAmount;
  preview: AgentCallPreview;
  fees: AgentFeeEstimate[];
  requiredBalances: AgentRequiredBalance[];
  warnings: AgentWarning[];
}

export interface AgentPreparedAddLiquidity {
  intentId: string;
  canExecute: boolean;
  quote: AgentAddLiquidityQuote;
  preview: AgentCallPreview;
  fees: AgentFeeEstimate[];
  requiredBalances: AgentRequiredBalance[];
  warnings: AgentWarning[];
}

export interface AgentPreparedRemoveLiquidity {
  intentId: string;
  canExecute: boolean;
  quote: AgentRemoveLiquidityQuote;
  preview: AgentCallPreview;
  fees: AgentFeeEstimate[];
  requiredBalances: AgentRequiredBalance[];
  warnings: AgentWarning[];
}

export interface AgentMaxAmount {
  asset: AgentAsset;
  amount: string;
  amountCodec: string;
  quote?: AgentSwapQuote;
  fees: AgentFeeEstimate[];
  warnings: AgentWarning[];
}

export interface AgentMaxAddLiquidity {
  assetA: AgentAsset;
  assetB: AgentAsset;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  fees: AgentFeeEstimate[];
  warnings: AgentWarning[];
}

export interface AgentMaxRemoveLiquidity {
  position: AgentLiquidityPosition | null;
  liquidityAmount: string;
  liquidityAmountCodec: string;
  percent: string;
  warnings: AgentWarning[];
}

export interface AgentRiskPolicy {
  maxPriceImpact?: string | number;
  requireCanExecute?: boolean;
  allowWarnings?: AgentWarning['code'][];
}

export interface AgentSwapAssessmentRequest extends AgentSwapRequest {
  policy?: AgentRiskPolicy;
  maxPriceImpact?: string | number;
  requireCanExecute?: boolean;
  allowWarnings?: AgentWarning['code'][];
}

export interface AgentPolicyAssessment {
  approved: boolean;
  reasons: AgentWarning[];
  prepared: AgentPreparedSwap;
  policy: {
    maxPriceImpact?: string;
    requireCanExecute: boolean;
    allowWarnings: AgentWarning['code'][];
  };
}

export interface PolkaswapAgentApi {
  readonly version: string;
  capabilities(): AgentCapabilities;
  ready(options?: AgentReadyOptions): Promise<AgentStatus>;
  status(): AgentStatus;
  refreshWallets(): Promise<AgentWalletProviderStatus[]>;
  walletAccounts(request: AgentWalletAccountsRequest): Promise<AgentWalletAccount[]>;
  connectWallet(request: AgentWalletConnectRequest): Promise<AgentWalletStatus>;
  assets(request?: AgentAssetsRequest): Promise<AgentAsset[]>;
  resolveAsset(request: AgentResolveAssetRequest): Promise<AgentResolvedAsset>;
  commonAssets(request?: AgentAssetsRequest): Promise<AgentResolvedAsset[]>;
  quoteSwap(request: AgentSwapRequest): Promise<AgentSwapQuote>;
  prepareSwap(request: AgentSwapRequest): Promise<AgentPreparedSwap>;
  assessSwap(request: AgentSwapAssessmentRequest): Promise<AgentPolicyAssessment>;
  executeSwap(request: AgentSwapRequest): Promise<AgentSwapExecution>;
  prepareTransfer(request: AgentTransferRequest): Promise<AgentPreparedTransfer>;
  executeTransfer(request: AgentTransferRequest): Promise<AgentTransferExecution>;
  poolInfo(request: AgentPoolInfoRequest): Promise<AgentPoolInfo>;
  liquidityPositions(request?: AgentLiquidityPositionsRequest): Promise<AgentLiquidityPosition[]>;
  quoteAddLiquidity(request: AgentAddLiquidityRequest): Promise<AgentAddLiquidityQuote>;
  prepareAddLiquidity(request: AgentAddLiquidityRequest): Promise<AgentPreparedAddLiquidity>;
  executeAddLiquidity(request: AgentAddLiquidityRequest): Promise<AgentAddLiquidityExecution>;
  quoteRemoveLiquidity(request: AgentRemoveLiquidityRequest): Promise<AgentRemoveLiquidityQuote>;
  prepareRemoveLiquidity(request: AgentRemoveLiquidityRequest): Promise<AgentPreparedRemoveLiquidity>;
  executeRemoveLiquidity(request: AgentRemoveLiquidityRequest): Promise<AgentRemoveLiquidityExecution>;
  maxTransferAmount(request: AgentMaxAmountRequest): Promise<AgentMaxAmount>;
  maxSwapInput(request: AgentMaxSwapInputRequest): Promise<AgentMaxAmount>;
  maxAddLiquidity(request: AgentMaxAddLiquidityRequest): Promise<AgentMaxAddLiquidity>;
  maxRemoveLiquidity(request: AgentMaxRemoveLiquidityRequest): Promise<AgentMaxRemoveLiquidity>;
  transactionStatus(request: AgentTransactionStatusRequest): AgentTransactionStatus;
  lookupTransaction(request: AgentTransactionStatusRequest): Promise<AgentTransactionStatus>;
  recoverTransaction(request: AgentRecoverTransactionRequest): Promise<AgentTransactionStatus>;
  waitForTransaction(request: AgentWaitForTransactionRequest): Promise<AgentTransactionStatus>;
  recentTransactions(request?: AgentRecentTransactionsRequest): Promise<HistoryItem[]>;
  subscribeTransactions(
    request: AgentTransactionSubscriptionRequest,
    listener: AgentTransactionListener
  ): Promise<AgentUnsubscribe>;
  subscribeStatus(request: AgentStatusSubscriptionRequest, listener: AgentStatusListener): AgentUnsubscribe;
  exportState(request?: AgentExportStateRequest): AgentStateExport;
  importState(request: AgentImportStateRequest): AgentStateImportResult;
  clearState(request?: AgentClearStateRequest): AgentStateExport;
}
