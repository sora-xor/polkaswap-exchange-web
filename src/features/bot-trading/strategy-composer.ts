import { parseDeterministicStrategy } from './ai';
import { parseBotPrice } from './engine';
import { createPlaygroundBot } from './playground';
import type { ResearchSettings } from './research';
import type { BotAsset, BotCandle, BotDefinition, BotHistory, StrategyConfig } from './types';

/** A reviewed, exact rule configuration ready to be added to the experiment queue. */
export interface ComposedStrategy {
  name: string;
  strategy: StrategyConfig;
  settings: ResearchSettings;
}

/** Build an isolated virtual market context and recent-history request without any wallet dependencies. */
export function prepareComposerRequest(
  settings: ResearchSettings,
  assets: BotAsset[],
  instruction: string,
  now = Date.now()
): { bot: BotDefinition; historySettings: ResearchSettings } {
  if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 2000)
    throw new Error('bots.labAi.promptError');
  const bot = createPlaygroundBot(settings, assets, now);
  bot.strategy = { ...bot.strategy, threshold: '0', prompt: instruction.trim() };
  const historyEndAt = Math.floor(now / 3_600_000) * 3_600_000;
  return {
    bot,
    historySettings: {
      ...settings,
      // Explicit dates provide the indicator prefix without inventing a new lab duration preset.
      historyStartAt: historyEndAt - 9 * 86_400_000,
      historyEndAt,
      optimize: false,
    },
  };
}

/** Validate real, chronological observations before sharing a bounded recent tail with the selected provider. */
export function composerMarketTail(history: BotHistory, now = Date.now()): BotCandle[] {
  if (!history.denominationVerified) throw new Error('bots.labAi.historyError');
  if (!history.candles.length || history.candles.length > 10_000) throw new Error('bots.labAi.historyError');
  let previous = -1;
  for (const candle of history.candles) {
    if (!Number.isSafeInteger(candle.timestamp) || candle.timestamp <= previous || candle.timestamp > now)
      throw new Error('bots.labAi.historyError');
    parseBotPrice(candle.close);
    if (candle.feeClose !== undefined) parseBotPrice(candle.feeClose);
    previous = candle.timestamp;
  }
  if (now - previous > 7_200_000) throw new Error('bots.labAi.historyError');
  return history.candles.slice(-202).map(({ timestamp, close, feeClose }) => ({
    timestamp,
    close,
    ...(feeClose === undefined ? {} : { feeClose }),
  }));
}

/** Copy only explicitly reviewed, validated rules; optimizer changes are disabled for an exact generated strategy. */
export function composeReviewedStrategy(
  name: string,
  strategy: StrategyConfig,
  bot: BotDefinition,
  settings: ResearchSettings
): ComposedStrategy {
  if (!name.trim() || name.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(name))
    throw new Error('bots.labAi.reviewError');
  const validated = parseDeterministicStrategy(strategy, bot);
  return {
    name: name.trim(),
    // A deterministic bot does not need provider-generated prose after review.
    strategy: { ...validated, prompt: '' },
    settings: {
      ...settings,
      preset: validated.kind === 'rules' ? settings.preset : (validated.kind as ResearchSettings['preset']),
      ...(validated.intervalMs % 6000 === 0 ? { intervalBlocks: validated.intervalMs / 6000 } : {}),
      optimize: false,
      ...(validated.kind === 'sma'
        ? {
            fastWindow: validated.fastWindow,
            slowWindow: validated.slowWindow,
            signalTiming: validated.signalTiming ?? 'closed-hour',
          }
        : {}),
    },
  };
}
