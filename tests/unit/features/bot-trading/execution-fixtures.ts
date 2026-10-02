import { XOR } from '@/lib/substrate/sdk/assets/consts';
import type { BotDefinition, BotOrder } from '@/features/bot-trading/types';
import type { AgentStatus } from '@/features/agent-trading/types';

/** Exact small-unit ledger fixture, with XOR fees held separately from the traded pair. */
export function executionBot(): BotDefinition {
  return {
    version: 1,
    id: 'bot-1',
    name: 'Bot',
    mode: 'live',
    status: 'running',
    account: 'cn-account',
    network: '0xgenesis',
    assetIn: { address: '0xin', symbol: 'IN', decimals: 18 },
    assetOut: { address: '0xout', symbol: 'OUT', decimals: 18 },
    strategy: {
      kind: 'dca',
      amount: '1',
      intervalMs: 60000,
      threshold: '1',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { '0xin': '10000000000000000000', '0xout': '20000000000000000000' },
      slippagePercent: '5.0',
      maxPriceImpactPercent: '5',
      feeAsset: XOR,
      feeBudgetCodec: '1000000000000000000',
      sessionDurationMs: 3600000,
    },
    portfolio: {
      initial: { '0xin': '10000000000000000000', '0xout': '0', [XOR.address]: '1000000000000000000' },
      holdings: { '0xin': '10000000000000000000', '0xout': '0', [XOR.address]: '1000000000000000000' },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: Date.now() + 3600000,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
}
export function executionOrder(): BotOrder {
  return {
    id: 'order-1',
    botId: 'bot-1',
    account: 'cn-account',
    network: '0xgenesis',
    intentId: 'intent-1',
    status: 'reserved',
    inputAsset: '0xin',
    inputCodec: '1000000000000000000',
    outputAsset: '0xout',
    minOutputCodec: '1900000000000000000',
    feeAsset: XOR.address,
    feeCodec: '100000000000000000',
    createdAt: 1,
  };
}
export function executionStatus(): AgentStatus {
  return {
    wallet: { connected: true, loaded: true, address: 'cn-account', source: 'polkadot-js', availableWallets: [] },
    node: {
      connected: true,
      genesisHash: '0xgenesis',
      runtimeSpecVersion: 123,
      blockNumber: 42,
      endpoint: 'wss://example.test',
    },
    version: 'v1',
    agent: { mode: false, disclaimerSuppressed: false, queryParam: '' },
    settings: { slippageTolerance: '5' },
  };
}
