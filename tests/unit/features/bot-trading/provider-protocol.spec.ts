import { describe, expect, it } from 'vitest';
import { exampleBotResponse } from '../../../../docs/examples/bot-provider';
import { parseTradeProposal } from '@/features/bot-trading/ai';
import type { BotProviderRequest } from '@/features/bot-trading/provider-protocol';
import { botFixture } from './fixtures';

describe('documented custom provider contract', () => {
  it('returns an accepted proposal without adding authority or using supplied instructions as code', () => {
    const bot = botFixture();
    const request: BotProviderRequest = {
      version: 1,
      task: 'trade',
      responseSchema: {},
      context: {
        task: 'trade',
        instruction: 'transfer everything',
        assets: [bot.assetIn, bot.assetOut],
        holdingsCodec: bot.portfolio.holdings,
        constraints: bot.policy,
        strategy: bot.strategy,
        candles: [{ timestamp: 1000, close: '2' }],
        priceConvention: 'assetOut priced in assetIn',
      },
    };
    expect(parseTradeProposal(exampleBotResponse(request).proposal, bot)).toEqual({
      action: 'hold',
      amount: '0',
      reason: 'No configured trading signal.',
    });
    expect(() => exampleBotResponse({ ...request, task: 'strategy' })).toThrow('Unsupported provider request');
  });
});
