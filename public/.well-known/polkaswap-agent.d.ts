export type PolkaswapAgentSwapSide = 'input' | 'output';
export type PolkaswapAgentDexId = 'best' | number;
export type PolkaswapAgentHistoryItem = Record<string, unknown>;
export type PolkaswapAgentTransactionLookup = 'local' | 'indexer' | 'chain' | 'any';
export type PolkaswapAgentTransactionSubscriptionSource = 'local' | 'indexer' | 'all';

export interface PolkaswapAgentAssetRef {
  address?: string;
  symbol?: string;
}

export interface PolkaswapAgentIntentRequest {
  intentId?: string;
  clientOrderId?: string;
}

export interface PolkaswapAgentReadyOptions {
  requireNode?: boolean;
  requireWallet?: boolean;
  timeoutMs?: number;
}

export interface PolkaswapAgentWalletAccountsRequest {
  source: string;
}

export interface PolkaswapAgentWalletConnectRequest {
  source: string;
  address?: string;
}

export interface PolkaswapAgentAssetsRequest {
  query?: string;
  includeBalances?: boolean;
}

export interface PolkaswapAgentResolveAssetRequest {
  asset: PolkaswapAgentAssetRef;
  includeBalance?: boolean;
}

export interface PolkaswapAgentSwapRequest extends PolkaswapAgentIntentRequest {
  assetIn: PolkaswapAgentAssetRef;
  assetOut: PolkaswapAgentAssetRef;
  amount: string | number;
  side?: PolkaswapAgentSwapSide;
  slippageTolerance?: string | number;
  liquiditySource?: string;
  dexId?: PolkaswapAgentDexId | string;
  quoteTimeoutMs?: number;
}

export interface PolkaswapAgentTransferRequest extends PolkaswapAgentIntentRequest {
  asset: PolkaswapAgentAssetRef;
  to: string;
  amount: string | number;
}

export interface PolkaswapAgentPoolInfoRequest {
  assetA: PolkaswapAgentAssetRef;
  assetB: PolkaswapAgentAssetRef;
}

export interface PolkaswapAgentLiquidityPositionsRequest {
  assetA?: PolkaswapAgentAssetRef;
  assetB?: PolkaswapAgentAssetRef;
  timeoutMs?: number;
}

export interface PolkaswapAgentAddLiquidityRequest extends PolkaswapAgentIntentRequest {
  assetA: PolkaswapAgentAssetRef;
  assetB: PolkaswapAgentAssetRef;
  amountA?: string | number;
  amountB?: string | number;
  slippageTolerance?: string | number;
  allowPoolCreation?: boolean;
}

export interface PolkaswapAgentRemoveLiquidityRequest extends PolkaswapAgentIntentRequest {
  assetA: PolkaswapAgentAssetRef;
  assetB: PolkaswapAgentAssetRef;
  liquidityAmount?: string | number;
  percent?: string | number;
  slippageTolerance?: string | number;
  timeoutMs?: number;
}

export interface PolkaswapAgentMaxAmountRequest {
  asset: PolkaswapAgentAssetRef;
}

export interface PolkaswapAgentMaxSwapInputRequest {
  assetIn: PolkaswapAgentAssetRef;
  assetOut?: PolkaswapAgentAssetRef;
}

export interface PolkaswapAgentMaxAddLiquidityRequest {
  assetA: PolkaswapAgentAssetRef;
  assetB: PolkaswapAgentAssetRef;
}

export interface PolkaswapAgentMaxRemoveLiquidityRequest {
  assetA: PolkaswapAgentAssetRef;
  assetB: PolkaswapAgentAssetRef;
  timeoutMs?: number;
}

export interface PolkaswapAgentTransactionStatusRequest {
  id?: string;
  txId?: string;
  lookup?: PolkaswapAgentTransactionLookup;
  blockHash?: string;
  blockHeight?: string | number;
}

export interface PolkaswapAgentWaitForTransactionRequest extends PolkaswapAgentTransactionStatusRequest {
  timeoutMs?: number;
  status?: string;
}

export interface PolkaswapAgentRecoverTransactionRequest extends PolkaswapAgentTransactionStatusRequest {
  clientOrderId?: string;
  intentId?: string;
  limit?: number;
}

export interface PolkaswapAgentRecentTransactionsRequest {
  type?: string;
  asset?: PolkaswapAgentAssetRef;
  limit?: number;
}

export interface PolkaswapAgentTransactionSubscriptionRequest extends PolkaswapAgentRecentTransactionsRequest {
  source?: PolkaswapAgentTransactionSubscriptionSource;
  address?: string;
  pollMs?: number;
  includeExisting?: boolean;
}

export interface PolkaswapAgentStatusSubscriptionRequest {
  pollMs?: number;
  emitImmediately?: boolean;
}

export type PolkaswapAgentTransactionListener = (transaction: PolkaswapAgentHistoryItem) => void;
export type PolkaswapAgentStatusListener = (status: PolkaswapAgentStatus) => void;
export type PolkaswapAgentUnsubscribe = () => void;

export interface PolkaswapAgentWalletAccount {
  address: string;
  name: string;
  source: string;
}

export interface PolkaswapAgentWalletProviderStatus {
  source: string;
  title: string;
  installed: boolean;
  available: boolean;
  supportsSigning: boolean;
  requiresUserApproval: boolean;
  accountsCount?: number;
}

export interface PolkaswapAgentWalletStatus {
  loaded: boolean;
  connected: boolean;
  address: string;
  source: string;
  accountsCount?: number;
  availableWallets: PolkaswapAgentWalletProviderStatus[];
}

export interface PolkaswapAgentStatus {
  version: string;
  node: {
    connected: boolean;
    endpoint: string;
    blockNumber: number;
  };
  wallet: PolkaswapAgentWalletStatus;
  settings: {
    slippageTolerance: string;
  };
}

export interface PolkaswapAgentAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  type?: string;
  isMintable?: boolean;
  balance?: unknown;
}

export interface PolkaswapAgentResolvedAsset extends PolkaswapAgentAsset {
  canonical: boolean;
}

export interface PolkaswapAgentAssetAmount {
  asset: PolkaswapAgentAsset;
  value: string;
  codec: string;
  decimals: number;
  display: string;
}

export interface PolkaswapAgentRequiredBalance {
  asset: PolkaswapAgentAsset;
  required: string;
  requiredCodec: string;
  available: string;
  availableCodec: string;
  sufficient: boolean;
  reason: string;
}

export interface PolkaswapAgentFeeEstimate {
  operation: string;
  asset: PolkaswapAgentAsset;
  amount: string;
  amountCodec: string;
  source: 'static' | 'unavailable';
}

export type PolkaswapAgentWarningSeverity = 'info' | 'warning' | 'critical';

export interface PolkaswapAgentWarning {
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
  severity: PolkaswapAgentWarningSeverity;
  message: string;
  details?: unknown;
}

export interface PolkaswapAgentCapabilities {
  version: string;
  runtime: 'browser';
  hosting: 'static-ipfs';
  global: 'window.PolkaswapAgent';
  readyEvent: 'polkaswap-agent-ready';
  methods: string[];
  capabilities: string[];
  defaults: {
    side: PolkaswapAgentSwapSide;
    slippageTolerance: string;
    dexId: PolkaswapAgentDexId;
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
  status: PolkaswapAgentStatus;
}

export interface PolkaswapAgentSwapQuote {
  intentId: string;
  request: {
    amount: string;
    side: PolkaswapAgentSwapSide;
    slippageTolerance: string;
    liquiditySource?: string;
    dexId: PolkaswapAgentDexId;
  };
  assetIn: PolkaswapAgentAsset;
  assetOut: PolkaswapAgentAsset;
  dexId: number;
  amountIn: string;
  amountOut: string;
  amountWithoutImpact: string;
  amountInMeta: PolkaswapAgentAssetAmount;
  amountOutMeta: PolkaswapAgentAssetAmount;
  amountWithoutImpactMeta: PolkaswapAgentAssetAmount;
  minAmountOut?: string;
  maxAmountIn?: string;
  minAmountOutMeta?: PolkaswapAgentAssetAmount;
  maxAmountInMeta?: PolkaswapAgentAssetAmount;
  minMaxCodec: string;
  priceImpact: string;
  liquidityProviderFee: unknown;
  rewards: unknown;
  route: string[];
  distribution: unknown;
  liquiditySources: string[];
  raw: {
    amount: string;
    amountWithoutImpact: string;
    fee: unknown;
  };
}

export interface PolkaswapAgentTransactionRef {
  id: string;
  txId?: string;
  status?: string;
  history: PolkaswapAgentHistoryItem | null;
}

export interface PolkaswapAgentSwapExecution {
  quote: PolkaswapAgentSwapQuote;
  transaction: PolkaswapAgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface PolkaswapAgentTransferExecution {
  intentId: string;
  asset: PolkaswapAgentAsset;
  to: string;
  amount: string;
  amountMeta: PolkaswapAgentAssetAmount;
  transaction: PolkaswapAgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface PolkaswapAgentPoolInfo {
  assetA: PolkaswapAgentAsset;
  assetB: PolkaswapAgentAsset;
  poolToken: PolkaswapAgentAsset | null;
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

export interface PolkaswapAgentLiquidityPosition {
  assetA: PolkaswapAgentAsset;
  assetB: PolkaswapAgentAsset;
  poolToken: PolkaswapAgentAsset;
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

export interface PolkaswapAgentAddLiquidityQuote {
  intentId: string;
  pool: PolkaswapAgentPoolInfo;
  createsPool: boolean;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  amountAMeta: PolkaswapAgentAssetAmount;
  amountBMeta: PolkaswapAgentAssetAmount;
  minAmountA: string;
  minAmountB: string;
  minAmountACodec: string;
  minAmountBCodec: string;
  minAmountAMeta: PolkaswapAgentAssetAmount;
  minAmountBMeta: PolkaswapAgentAssetAmount;
  mintedLiquidity: string;
  mintedLiquidityCodec: string;
  mintedLiquidityMeta: PolkaswapAgentAssetAmount | null;
  shareOfPool: string;
  slippageTolerance: string;
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentAddLiquidityExecution {
  quote: PolkaswapAgentAddLiquidityQuote;
  transaction: PolkaswapAgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface PolkaswapAgentRemoveLiquidityQuote {
  intentId: string;
  pool: PolkaswapAgentPoolInfo;
  liquidityAmount: string;
  liquidityAmountCodec: string;
  liquidityAmountMeta: PolkaswapAgentAssetAmount | null;
  percentOfPosition?: string;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  amountAMeta: PolkaswapAgentAssetAmount;
  amountBMeta: PolkaswapAgentAssetAmount;
  minAmountA: string;
  minAmountB: string;
  minAmountACodec: string;
  minAmountBCodec: string;
  minAmountAMeta: PolkaswapAgentAssetAmount;
  minAmountBMeta: PolkaswapAgentAssetAmount;
  shareOfPool: string;
  slippageTolerance: string;
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentRemoveLiquidityExecution {
  quote: PolkaswapAgentRemoveLiquidityQuote;
  transaction: PolkaswapAgentTransactionRef | null;
  clientOrderId?: string;
  reusedClientOrder?: boolean;
}

export interface PolkaswapAgentCallPreview {
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

export interface PolkaswapAgentIdempotencyRecord {
  clientOrderId: string;
  intentId: string;
  action: 'swap' | 'transfer' | 'add-liquidity' | 'remove-liquidity';
  status: 'pending' | 'submitted';
  createdAt: number;
  updatedAt: number;
  preview?: PolkaswapAgentCallPreview;
  transaction?: PolkaswapAgentTransactionRef | null;
}

export interface PolkaswapAgentExportedIdempotencyRecord extends PolkaswapAgentIdempotencyRecord {
  result?: unknown;
}

export interface PolkaswapAgentStateExport {
  version: string;
  exportedAt: number;
  idempotency: PolkaswapAgentExportedIdempotencyRecord[];
}

export interface PolkaswapAgentExportStateRequest {
  redacted?: boolean;
}

export interface PolkaswapAgentImportStateRequest {
  state: PolkaswapAgentStateExport;
  merge?: boolean;
}

export interface PolkaswapAgentClearStateRequest {
  clientOrderId?: string;
}

export interface PolkaswapAgentStateImportResult {
  imported: number;
  skipped: number;
  records: PolkaswapAgentExportedIdempotencyRecord[];
}

export interface PolkaswapAgentPreparedSwap {
  intentId: string;
  canExecute: boolean;
  quote: PolkaswapAgentSwapQuote;
  preview: PolkaswapAgentCallPreview;
  fees: PolkaswapAgentFeeEstimate[];
  requiredBalances: PolkaswapAgentRequiredBalance[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentPreparedTransfer {
  intentId: string;
  canExecute: boolean;
  asset: PolkaswapAgentAsset;
  to: string;
  amount: string;
  amountMeta: PolkaswapAgentAssetAmount;
  preview: PolkaswapAgentCallPreview;
  fees: PolkaswapAgentFeeEstimate[];
  requiredBalances: PolkaswapAgentRequiredBalance[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentPreparedAddLiquidity {
  intentId: string;
  canExecute: boolean;
  quote: PolkaswapAgentAddLiquidityQuote;
  preview: PolkaswapAgentCallPreview;
  fees: PolkaswapAgentFeeEstimate[];
  requiredBalances: PolkaswapAgentRequiredBalance[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentPreparedRemoveLiquidity {
  intentId: string;
  canExecute: boolean;
  quote: PolkaswapAgentRemoveLiquidityQuote;
  preview: PolkaswapAgentCallPreview;
  fees: PolkaswapAgentFeeEstimate[];
  requiredBalances: PolkaswapAgentRequiredBalance[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentMaxAmount {
  asset: PolkaswapAgentAsset;
  amount: string;
  amountCodec: string;
  quote?: PolkaswapAgentSwapQuote;
  fees: PolkaswapAgentFeeEstimate[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentMaxAddLiquidity {
  assetA: PolkaswapAgentAsset;
  assetB: PolkaswapAgentAsset;
  amountA: string;
  amountB: string;
  amountACodec: string;
  amountBCodec: string;
  fees: PolkaswapAgentFeeEstimate[];
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentMaxRemoveLiquidity {
  position: PolkaswapAgentLiquidityPosition | null;
  liquidityAmount: string;
  liquidityAmountCodec: string;
  percent: string;
  warnings: PolkaswapAgentWarning[];
}

export interface PolkaswapAgentRiskPolicy {
  maxPriceImpact?: string | number;
  requireCanExecute?: boolean;
  allowWarnings?: PolkaswapAgentWarning['code'][];
}

export interface PolkaswapAgentSwapAssessmentRequest extends PolkaswapAgentSwapRequest {
  policy?: PolkaswapAgentRiskPolicy;
  maxPriceImpact?: string | number;
  requireCanExecute?: boolean;
  allowWarnings?: PolkaswapAgentWarning['code'][];
}

export interface PolkaswapAgentPolicyAssessment {
  approved: boolean;
  reasons: PolkaswapAgentWarning[];
  prepared: PolkaswapAgentPreparedSwap;
  policy: {
    maxPriceImpact?: string;
    requireCanExecute: boolean;
    allowWarnings: PolkaswapAgentWarning['code'][];
  };
}

export interface PolkaswapAgentTransactionStatus {
  id: string;
  lookup: PolkaswapAgentTransactionLookup;
  source: 'local' | 'indexer' | 'chain' | 'idempotency' | 'none';
  transaction: PolkaswapAgentHistoryItem | null;
  idempotency?: PolkaswapAgentIdempotencyRecord;
}

export interface PolkaswapAgentErrorShape {
  code:
    | 'AGENT_API_UNAVAILABLE'
    | 'ASSET_AMBIGUOUS'
    | 'ASSET_NOT_FOUND'
    | 'INVALID_AMOUNT'
    | 'INVALID_AGENT_STATE'
    | 'INVALID_ASSET_REF'
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
  message: string;
  details?: unknown;
}

export interface PolkaswapAgentApi {
  readonly version: string;
  capabilities(): PolkaswapAgentCapabilities;
  ready(options?: PolkaswapAgentReadyOptions): Promise<PolkaswapAgentStatus>;
  status(): PolkaswapAgentStatus;
  refreshWallets(): Promise<PolkaswapAgentWalletProviderStatus[]>;
  walletAccounts(request: PolkaswapAgentWalletAccountsRequest): Promise<PolkaswapAgentWalletAccount[]>;
  connectWallet(request: PolkaswapAgentWalletConnectRequest): Promise<PolkaswapAgentWalletStatus>;
  assets(request?: PolkaswapAgentAssetsRequest): Promise<PolkaswapAgentAsset[]>;
  resolveAsset(request: PolkaswapAgentResolveAssetRequest): Promise<PolkaswapAgentResolvedAsset>;
  commonAssets(request?: PolkaswapAgentAssetsRequest): Promise<PolkaswapAgentResolvedAsset[]>;
  quoteSwap(request: PolkaswapAgentSwapRequest): Promise<PolkaswapAgentSwapQuote>;
  prepareSwap(request: PolkaswapAgentSwapRequest): Promise<PolkaswapAgentPreparedSwap>;
  assessSwap(request: PolkaswapAgentSwapAssessmentRequest): Promise<PolkaswapAgentPolicyAssessment>;
  executeSwap(request: PolkaswapAgentSwapRequest): Promise<PolkaswapAgentSwapExecution>;
  prepareTransfer(request: PolkaswapAgentTransferRequest): Promise<PolkaswapAgentPreparedTransfer>;
  executeTransfer(request: PolkaswapAgentTransferRequest): Promise<PolkaswapAgentTransferExecution>;
  poolInfo(request: PolkaswapAgentPoolInfoRequest): Promise<PolkaswapAgentPoolInfo>;
  liquidityPositions(request?: PolkaswapAgentLiquidityPositionsRequest): Promise<PolkaswapAgentLiquidityPosition[]>;
  quoteAddLiquidity(request: PolkaswapAgentAddLiquidityRequest): Promise<PolkaswapAgentAddLiquidityQuote>;
  prepareAddLiquidity(request: PolkaswapAgentAddLiquidityRequest): Promise<PolkaswapAgentPreparedAddLiquidity>;
  executeAddLiquidity(request: PolkaswapAgentAddLiquidityRequest): Promise<PolkaswapAgentAddLiquidityExecution>;
  quoteRemoveLiquidity(request: PolkaswapAgentRemoveLiquidityRequest): Promise<PolkaswapAgentRemoveLiquidityQuote>;
  prepareRemoveLiquidity(request: PolkaswapAgentRemoveLiquidityRequest): Promise<PolkaswapAgentPreparedRemoveLiquidity>;
  executeRemoveLiquidity(request: PolkaswapAgentRemoveLiquidityRequest): Promise<PolkaswapAgentRemoveLiquidityExecution>;
  maxTransferAmount(request: PolkaswapAgentMaxAmountRequest): Promise<PolkaswapAgentMaxAmount>;
  maxSwapInput(request: PolkaswapAgentMaxSwapInputRequest): Promise<PolkaswapAgentMaxAmount>;
  maxAddLiquidity(request: PolkaswapAgentMaxAddLiquidityRequest): Promise<PolkaswapAgentMaxAddLiquidity>;
  maxRemoveLiquidity(request: PolkaswapAgentMaxRemoveLiquidityRequest): Promise<PolkaswapAgentMaxRemoveLiquidity>;
  transactionStatus(request: PolkaswapAgentTransactionStatusRequest): PolkaswapAgentTransactionStatus;
  lookupTransaction(request: PolkaswapAgentTransactionStatusRequest): Promise<PolkaswapAgentTransactionStatus>;
  recoverTransaction(request: PolkaswapAgentRecoverTransactionRequest): Promise<PolkaswapAgentTransactionStatus>;
  waitForTransaction(request: PolkaswapAgentWaitForTransactionRequest): Promise<PolkaswapAgentTransactionStatus>;
  recentTransactions(request?: PolkaswapAgentRecentTransactionsRequest): Promise<PolkaswapAgentHistoryItem[]>;
  subscribeTransactions(
    request: PolkaswapAgentTransactionSubscriptionRequest,
    listener: PolkaswapAgentTransactionListener
  ): Promise<PolkaswapAgentUnsubscribe>;
  subscribeStatus(
    request: PolkaswapAgentStatusSubscriptionRequest,
    listener: PolkaswapAgentStatusListener
  ): PolkaswapAgentUnsubscribe;
  exportState(request?: PolkaswapAgentExportStateRequest): PolkaswapAgentStateExport;
  importState(request: PolkaswapAgentImportStateRequest): PolkaswapAgentStateImportResult;
  clearState(request?: PolkaswapAgentClearStateRequest): PolkaswapAgentStateExport;
}

export interface PolkaswapAgentClientApi {
  readonly api: PolkaswapAgentApi;
  readonly version: string;
  ready(options?: PolkaswapAgentReadyOptions): Promise<PolkaswapAgentStatus>;
  prepareAndExecuteSwap(
    request: PolkaswapAgentSwapRequest,
    options?: { clientOrderId?: string }
  ): Promise<PolkaswapAgentSwapExecution>;
  prepareAndExecuteTransfer(
    request: PolkaswapAgentTransferRequest,
    options?: { clientOrderId?: string }
  ): Promise<PolkaswapAgentTransferExecution>;
  prepareAndExecuteAddLiquidity(
    request: PolkaswapAgentAddLiquidityRequest,
    options?: { clientOrderId?: string }
  ): Promise<PolkaswapAgentAddLiquidityExecution>;
  prepareAndExecuteRemoveLiquidity(
    request: PolkaswapAgentRemoveLiquidityRequest,
    options?: { clientOrderId?: string }
  ): Promise<PolkaswapAgentRemoveLiquidityExecution>;
  waitForTransaction(request: PolkaswapAgentWaitForTransactionRequest): Promise<PolkaswapAgentTransactionStatus>;
}

export interface PolkaswapAgentClientGlobal {
  attach(options?: { timeoutMs?: number }): Promise<PolkaswapAgentClientApi>;
  createClient(api: PolkaswapAgentApi): PolkaswapAgentClientApi;
}

declare global {
  interface Window {
    PolkaswapAgent?: PolkaswapAgentApi;
    PolkaswapAgentClient?: PolkaswapAgentClientGlobal;
  }

  interface WindowEventMap {
    'polkaswap-agent-ready': CustomEvent<{ api: PolkaswapAgentApi; version: string }>;
  }
}
