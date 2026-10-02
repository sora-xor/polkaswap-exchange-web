import type { BotDefinition } from '@/features/bot-trading/types';
import type { BotAiResearchConstraints } from '@/features/bot-trading/ai-research';

/** Explicit synthetic public cost scenario, containing no raw prices or validation observations. */
export const researchConstraintsFixture = (): BotAiResearchConstraints => ({
  minimumIntervalMs: 3_600_000,
  maximumIntervalMs: 12 * 3_600_000,
  minimumTrades: 5,
  trainingCandles: 117,
  validationCandles: 50,
  sizing: { capitalCodec: '10000', spendableInputCodec: '9900', feeSampleAmountCodec: '100' },
  goal: {
    targetReturnPercent: '10',
    maxLossPercent: '5',
    durationMs: 86_400_000,
    valuationAsset: 'output',
    lossMetric: 'drawdown',
  },
  costs: {
    basis: 'current-finalized-scenario',
    finalizedAt: 1000,
    blockHash: `0x${'a'.repeat(64)}`,
    slippagePercent: '0.5',
    feeReserveXor: '1',
    reserveFunding: 'separate',
    reverseLotBasis: 'expected-forward-output',
    buy: { networkFeeXor: '0.100020712589707326', swapFeePercent: '0.6', priceImpactPercent: '1.378020032171570988' },
    sell: { networkFeeXor: '0.200000000000000001', swapFeePercent: '0.7', priceImpactPercent: '2.1' },
  },
});

/** Small two-decimal portfolio makes conservation and fee expectations readable. */
export const botFixture = (): BotDefinition => ({
  version: 1,
  id: 'bot-1',
  name: 'My bot',
  mode: 'paper',
  status: 'idle',
  account: 'account',
  network: 'genesis',
  assetIn: { address: 'in', symbol: 'IN', decimals: 2 },
  assetOut: { address: 'out', symbol: 'OUT', decimals: 2 },
  strategy: {
    kind: 'dca',
    amount: '1',
    intervalMs: 60_000,
    threshold: '2',
    direction: 'below',
    fastWindow: 2,
    slowWindow: 3,
    prompt: '',
  },
  policy: {
    maxTradeCodec: { in: '1000', out: '1000' },
    slippagePercent: '0.5',
    maxPriceImpactPercent: '3',
    feeAsset: { address: 'in', symbol: 'IN', decimals: 2 },
    feeBudgetCodec: '100',
    sessionDurationMs: 3_600_000,
  },
  portfolio: { initial: { in: '10000', out: '0' }, holdings: { in: '10000', out: '0' }, feesPaidCodec: '0', trades: 0 },
  state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
  provider: 'openai',
  model: 'test-model',
  endpoint: '',
  createdAt: 1,
  sessionExpiresAt: 0,
  activity: [],
  equity: [],
  apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
});
