import type { BotAiResearchConstraints } from './ai-research';
import type { BotAsset, BotCandle, BotPolicy, StrategyConfig, TradeProposal } from './types';

/** Versioned HTTPS proposal protocol. No account identity or signing capability is sent. */
export interface BotProviderRequest {
  version: 1;
  task: 'trade' | 'strategy';
  context: {
    task: 'trade' | 'strategy';
    instruction: string;
    assets: BotAsset[];
    holdingsCodec: Record<string, string>;
    constraints: Pick<BotPolicy, 'maxTradeCodec' | 'slippagePercent'>;
    strategy: StrategyConfig;
    research?: BotAiResearchConstraints;
    candles: BotCandle[];
    priceConvention: string;
  };
  responseSchema: Record<string, unknown>;
}

/** Return one proposal or one deterministic configuration; usage counts are optional reported API units. */
export type BotProviderResponse = (
  | { proposal: TradeProposal; strategy?: never }
  | { strategy: StrategyConfig; proposal?: never }
) & { usage?: { input_tokens: number; output_tokens: number } };
