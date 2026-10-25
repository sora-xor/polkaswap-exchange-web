import { describe, expect, it } from 'vitest';
import {
  composerMarketTail,
  composeReviewedStrategy,
  prepareComposerRequest,
} from '@/features/bot-trading/strategy-composer';
import { RESEARCH_DEFAULT_SETTINGS } from '@/features/bot-trading/research';
import { createPlaygroundBot } from '@/features/bot-trading/playground';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import type { BotHistory, StrategyConfig } from '@/features/bot-trading/types';
import { ruleRecipe, RULE_RECIPE_IDS } from '@/features/bot-trading/rule-recipes';

const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const NOW = Date.UTC(2026, 8, 14, 8, 30);
const settings = { ...RESEARCH_DEFAULT_SETTINGS, assetInAddress: PSWAP.address, assetOutAddress: VAL.address };
const strategy: StrategyConfig = {
  kind: 'threshold',
  amount: '1.000000000000000001',
  intervalMs: 90_000,
  threshold: '0.' + '0'.repeat(35) + '1',
  direction: 'above',
  fastWindow: 2,
  slowWindow: 3,
  prompt: '',
};

/** Realistic shape, fabricated prices: this fixture is only for isolated validation tests. */
function history(): BotHistory {
  return {
    denominationVerified: true,
    missing: 0,
    candles: Array.from({ length: 216 }, (_, index) => ({ timestamp: NOW - (215 - index) * 3_600_000, close: '2' })),
  };
}

describe('strategy composer boundaries', () => {
  it('requests a recent isolated market context while preserving the selected pair and original research period', () => {
    const original = { ...settings };
    const { bot, historySettings } = prepareComposerRequest(settings, assets, '  buy on dips  ', NOW);
    expect(bot.assetIn.address).toBe(PSWAP.address);
    expect(bot.assetOut.address).toBe(VAL.address);
    expect(bot.account).toBe('paper');
    expect(bot.network).toBe('paper');
    expect(bot.strategy.prompt).toBe('buy on dips');
    expect(historySettings.historyEndAt).toBe(Date.UTC(2026, 8, 14, 8));
    expect(historySettings.historyEndAt! - historySettings.historyStartAt!).toBe(9 * 86_400_000);
    expect(historySettings.days).toBe(settings.days);
    expect(() => createPlaygroundBot(historySettings, assets, NOW)).not.toThrow();
    expect(settings).toEqual(original);
    expect(() => prepareComposerRequest(settings, assets, '', NOW)).toThrow();
    expect(() => prepareComposerRequest(settings, assets, 'x'.repeat(2001), NOW)).toThrow();
  });

  it('shares at most 202 copied, denomination-verified observations and rejects stale or unordered prices', () => {
    const source = history();
    const tail = composerMarketTail(source, NOW);
    expect(tail).toHaveLength(202);
    expect(tail.at(-1)?.timestamp).toBe(NOW);
    tail[0].close = '9';
    expect(source.candles.at(-202)?.close).toBe('2');
    expect(() => composerMarketTail({ ...source, denominationVerified: false }, NOW)).toThrow();
    expect(() => composerMarketTail(source, NOW + 7_200_001)).toThrow();
    expect(() => composerMarketTail({ ...source, candles: [...source.candles].reverse() }, NOW)).toThrow();
    expect(() => composerMarketTail({ ...source, candles: [{ timestamp: NOW + 1, close: '2' }] }, NOW)).toThrow();
    expect(() => composerMarketTail({ ...source, candles: [{ timestamp: NOW, close: '0' }] }, NOW)).toThrow();
  });

  it.each(RULE_RECIPE_IDS)('preserves the exact %s recipe without corrupting the research preset', (id) => {
    const { bot } = prepareComposerRequest(settings, assets, 'compose rules', NOW);
    const rules = ruleRecipe(id);
    const input = { ...strategy, kind: 'rules' as const, threshold: '0', intervalMs: 3_600_000, rules };
    const result = composeReviewedStrategy(id, input, bot, settings);
    expect(result.settings.preset).toBe(settings.preset);
    expect(result.settings.intervalBlocks).toBe(600);
    expect(result.settings.optimize).toBe(false);
    expect(result.strategy.rules).toEqual(rules);
    expect(result.strategy.rules).not.toBe(rules);
    result.strategy.rules!.entry.conditions[0].window = 199;
    expect(rules).toEqual(ruleRecipe(id));
  });

  it('preserves exact reviewed amounts, triggers and pair without optimizer rewrites or retained provider prose', () => {
    const { bot } = prepareComposerRequest(settings, assets, 'buy on dips', NOW);
    const result = composeReviewedStrategy('  precise trigger  ', { ...strategy, prompt: 'provider prose' }, bot, {
      ...settings,
      optimize: true,
    });
    expect(result.name).toBe('precise trigger');
    expect(result.strategy).toEqual(strategy);
    expect(result.settings).toMatchObject({
      assetInAddress: PSWAP.address,
      assetOutAddress: VAL.address,
      optimize: false,
      preset: 'threshold',
    });
    result.strategy.amount = '2';
    expect(strategy.amount).toBe('1.000000000000000001');
  });

  it('refuses code, oversized amounts, invalid rule windows and invalid names before emitting a proposal', () => {
    const { bot } = prepareComposerRequest(settings, assets, 'buy on dips', NOW);
    for (const override of [
      { kind: 'ai' },
      { amount: '10.000000000000000001' },
      { amount: '1e-2' },
      { slowWindow: 2 },
      { intervalMs: 5_999 },
      { threshold: '0' },
      { execute: 'alert(1)' },
    ])
      expect(() =>
        composeReviewedStrategy('test', { ...strategy, ...override } as StrategyConfig, bot, settings)
      ).toThrow();
    for (const name of ['', ' ', 'x'.repeat(81), 'hidden\u0000name']) {
      expect(() => composeReviewedStrategy(name, strategy, bot, settings)).toThrow();
    }
  });
});
