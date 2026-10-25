import type { StrategyRules } from './strategy-rules';

/** Browser bot contracts. Token holdings and fees are integer codec strings; prices are decimal strings. */
export interface BotAsset {
  address: string;
  symbol: string;
  decimals: number;
}
export type BotMode = 'paper' | 'live';
export type BotStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'attention';
export type BotProvider = 'openai' | 'claude' | 'custom' | 'jev';
/** User-approved goal; thresholds pause without selling holdings or converting the opening allocation. */
export interface BotGoal {
  title: string;
  targetReturnPercent: string;
  maxLossPercent: string;
  durationMs: number;
  /** Omitted for legacy input-token goals; output measures the allocation in units of assetOut. */
  valuationAsset?: 'input' | 'output';
  /** Omitted/"baseline" keeps opening-value loss; new opt-in drawdown goals pause below the observed peak. */
  lossMetric?: 'baseline' | 'drawdown';
  /** New GO goals reach their target only after a fill and after beating their unchanged opening holdings. */
  targetRequiresIdleOutperformance?: true;
}
/** Durable goal progress independent of the bounded chart history and signing-session lifetime. */
export interface BotGoalState {
  startedAt: number;
  baselineValue: string;
  lastValue: string;
  /** Required for drawdown goals; retained across sessions independently of the bounded equity chart. */
  peakValue?: string;
  /** Frozen opening allocation for an opt-in idle comparison, including the separate fee reserve. */
  idleHoldings?: Record<string, string>;
  /** Current value of idleHoldings in the goal's chosen valuation asset. */
  idleLastValue?: string;
  returnPercent: string;
  outcome: 'active' | 'target' | 'loss' | 'expired';
  completedAt?: number;
}
export interface StrategyConfig {
  kind: 'dca' | 'threshold' | 'sma' | 'ai' | 'rules';
  /** Natural units, denominated in the input asset of a buy. */
  amount: string;
  intervalMs: number;
  threshold: string;
  direction: 'above' | 'below';
  fastWindow: number;
  slowWindow: number;
  prompt: string;
  /** SMA only. Omitted settings keep completed-hour signals; live prices add one forming-hour observation. */
  signalTiming?: 'live-price' | 'closed-hour';
  /** Canonical public signal conditions; present only for the rules strategy kind. */
  rules?: StrategyRules;
}
export interface TradeProposal {
  action: 'buy' | 'sell' | 'hold';
  /** Natural input-token units; sells are denominated in the bot's quote asset. */
  amount: string;
  reason: string;
}
export interface BotPolicy {
  /** Per-input-asset trade ceilings, encoded with each asset's decimals. */
  maxTradeCodec: Record<string, string>;
  slippagePercent: string;
  maxPriceImpactPercent: string;
  feeAsset: BotAsset;
  feeBudgetCodec: string;
  sessionDurationMs: number;
}
export interface BotPortfolio {
  /** Includes a separate allocation for network fees when XOR is not a traded asset. */
  initial: Record<string, string>;
  holdings: Record<string, string>;
  /** Finalized XOR fees beyond this bot's allocation; never treated as spendable holdings. */
  xorDeficitCodec?: string;
  feesPaidCodec: string;
  trades: number;
}
export interface StrategyState {
  lastEvaluatedAt: number;
  lastTradeAt: number;
  previousSignal?: number;
  /** Last ready completed observation consumed by a rule set, whether or not a fill was admitted. */
  lastRuleObservationAt?: number;
  /** Last fresh live-price SMA observation consumed, including a held or rejected proposal. */
  lastLiveObservationAt?: number;
}
export interface BotActivity {
  id: string;
  timestamp: number;
  kind: 'trade' | 'hold' | 'error' | 'status';
  /** Translation key for app-generated events; untrusted provider reasons remain plain text. */
  message: string;
  txHash?: string;
}
export interface BotEquityPoint {
  timestamp: number;
  value: string;
  benchmark: string;
}
/** Compact research provenance; these full-period hypothetical metrics never enter the trading ledger. */
export interface BotResearchSnapshot {
  version: 1;
  source: 'demo' | 'historical' | 'imported';
  testedAt: number;
  startAt: number;
  endAt: number;
  coverage: number;
  validation: 'none' | 'holdout' | 'walk-forward';
  trainPercent: number;
  folds: number;
  optimized: boolean;
  returnPercent: string;
  drawdownPercent: string;
  trades: number;
  /** Denomination shared by full-period and qualification returns; omitted means assetIn. */
  valuationAsset?: BotGoal['valuationAsset'];
  /** Untouched holdout gate for automatic selection; distinct from the full-period metrics above. */
  qualification?: {
    candidates: number;
    startAt: number;
    endAt: number;
    returnPercent: string;
    drawdownPercent: string;
    trades: number;
    coverage: number;
  };
  /** Research-only cost assumptions; live quotes already include their routing fees. */
  networkFeeXor?: string;
  swapFeePercent?: string;
  sellNetworkFeeXor?: string;
  sellSwapFeePercent?: string;
  /** Dated impact scenarios; absent in older saved studies. */
  priceImpactPercent?: string;
  sellPriceImpactPercent?: string;
  /** Finalized-block calibration of current fees applied during the historical study. */
  feeObservation?: {
    blockNumber: number;
    blockHash: string;
    genesisHash: string;
    endpoint: string;
    queriedAt: number;
    /** Timestamp of the finalized state used for historical fee calibration. */
    finalizedAt?: number;
    amountIn: string;
    sellAmountIn: string;
  };
}
export interface BotDefinition {
  version: 1;
  id: string;
  /** Fixed reviewed membership; individual Start/Edit cannot grant this bot trading authority. */
  discoveryCampaignId?: string;
  /**
   * Set only by a reviewed Quant Loop live start: its researched positions take days to unwind,
   * so the user may grant a signing session of up to 14 days. The tab must stay open throughout.
   */
  extendedSession?: true;
  name: string;
  mode: BotMode;
  status: BotStatus;
  account: string;
  network: string;
  assetIn: BotAsset;
  assetOut: BotAsset;
  strategy: StrategyConfig;
  policy: BotPolicy;
  portfolio: BotPortfolio;
  state: StrategyState;
  provider: BotProvider;
  model: string;
  endpoint: string;
  createdAt: number;
  sessionExpiresAt: number;
  activity: BotActivity[];
  equity: BotEquityPoint[];
  apiUsage: { inputTokens: number; outputTokens: number; requests: number };
  goal?: BotGoal;
  goalState?: BotGoalState;
  /** Historical study settings and summary, separate from actual paper/live performance. */
  research?: BotResearchSnapshot;
}
export interface BotCandle {
  timestamp: number;
  close: string;
  /** Fee asset valued in assetIn. */ feeClose?: string;
}
export interface BotHistory {
  candles: BotCandle[];
  missing: number;
  /** Finalized chain identity used to verify these observations; match current fee assumptions before replay. */
  identity?: { genesisHash: string; denominator: string };
  /** False when denomination normalization cannot be established. */
  denominationVerified: boolean;
  /** Distinguishes reconstructed on-chain spot observations from recorded executions. */
  provenance?: {
    kind: 'archive-pool-spot' | 'mixed-pool-spot-and-indexed';
    requestedStartAt: number;
    requestedEndAt: number;
    availableStartAt: number | null;
    availableEndAt: number | null;
    generatedAt: number;
    archiveEndpoint: string;
  };
}
export interface BacktestResult {
  /** Demo metrics must stay explicitly separate from verified historical results. */
  dataSource?: 'historical' | 'demo' | 'imported';
  portfolio: BotPortfolio;
  equity: BotEquityPoint[];
  trades: number;
  drawdownPercent: string;
  returnPercent: string;
  coverage: number;
}
/** An accepted virtual fill; emitted only after exact holdings and fee debits succeed. */
export interface BacktestTrade {
  timestamp: number;
  action: 'buy' | 'sell';
  price: string;
  amount: string;
  reason: string;
  inputAsset: string;
  outputAsset: string;
  inputCodec: string;
  outputCodec: string;
  feeAsset: string;
  feeCodec: string;
}
export interface BotOrder {
  id: string;
  botId: string;
  account: string;
  network: string;
  intentId: string;
  status: 'reserved' | 'signed' | 'submitted' | 'confirmed' | 'failed';
  inputAsset: string;
  inputCodec: string;
  outputAsset: string;
  minOutputCodec: string;
  feeAsset: string;
  feeCodec: string;
  outputCodec?: string;
  actualFeeCodec?: string;
  txHash?: string;
  /** SHA-256 of the exact signed extrinsic bytes, retained before any broadcast attempt. */
  signedEnvelopeDigest?: string;
  /** Encoded prepared swap call, retained to bind later finalized inclusion to consent. */
  signedCallHex?: string;
  signedAtBlock?: number;
  /** Local pre-broadcast cancellation; no chain failure or paid fee is implied. */
  unbroadcast?: true;
  /** Canonical finalized inclusion, populated only after independent chain reconciliation. */
  finalized?: {
    blockHash: string;
    blockNumber: number;
    extrinsicIndex: number;
  };
  createdAt: number;
}
export interface BotSession {
  botId: string;
  account: string;
  network: string;
  expiresAt: number;
}
