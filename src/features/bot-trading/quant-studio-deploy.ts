/**
 * Turns a Strategy Studio choice into the workspace's paper-bot contracts. Nothing here signs,
 * saves or starts a bot: the page passes the payload to the established paper flow, and real
 * money still goes through My Bots' own live review and consent.
 *
 * Studio strategies are tuned by hand, so they are offered for paper trading only. Their
 * research record is honest about that: the reported period is the second half, marked as a
 * chronological holdout with `optimized: true`.
 */
import { FPNumber } from '@/lib/substrate/math';
import { toCodec } from './amounts';
import { decimalRatio, parseBotPrice } from './engine';
import { QUANT_CAPITAL_XOR, QUANT_FOLDS, QUANT_TRAIN_PERCENT } from './quant-loop';
import { quantImpactCeilingFrom, quantResearchSettings, quantStrategy, type QuantDeployPayload } from './quant-deploy';
import { createResearchBot } from './research';
import type { StudioReplay } from './quant-studio';
import type { ResearchFeeSnapshot } from './research-fees';
import type { BotAsset, BotDefinition, BotHistory, BotResearchSnapshot } from './types';

/** Paper sessions for studio strategies use the standard one-day session. */
const STUDIO_SESSION_MS = 86_400_000;

/** Live price-impact ceiling covering every researched fill in both halves. */
export function studioImpactCeiling(replay: StudioReplay): string {
  return quantImpactCeilingFrom([
    replay.first.maxImpactPercent,
    replay.second.maxImpactPercent,
    ...replay.first.fills.map((fill) => fill.impactPercent),
    ...replay.second.fills.map((fill) => fill.impactPercent),
  ]);
}

/** Build an idle, credential-free paper template with the studio's exact rules and order size. */
export function createStudioBot(
  asset: BotAsset,
  replay: StudioReplay,
  assets: BotAsset[],
  name: string,
  now: number,
  fees?: ResearchFeeSnapshot
): BotDefinition {
  if (!assets.some((item) => item.address === asset.address)) throw new Error('bots.errors.config');
  const bot = createResearchBot(quantResearchSettings({ asset }, fees), assets, now, quantStrategy(replay.candidate));
  bot.name = name.slice(0, 80);
  bot.policy.maxPriceImpactPercent = studioImpactCeiling(replay);
  // Cap output sells at the research capital valued at the latest archived close; the paper
  // flow replaces this with the same cap at the current quote.
  bot.policy.maxTradeCodec[bot.assetOut.address] = toCodec(
    decimalRatio(new FPNumber(QUANT_CAPITAL_XOR, 36), parseBotPrice(replay.latestClose)).value.toFixed(
      bot.assetOut.decimals,
      0
    ),
    bot.assetOut.decimals
  );
  return bot;
}

/** Provenance for the saved paper bot: the second half's exact chained result. */
export function studioResearchSnapshot(
  replay: StudioReplay,
  fees: ResearchFeeSnapshot,
  testedAt: number
): BotResearchSnapshot {
  const half = replay.second;
  return {
    version: 1,
    source: 'historical',
    testedAt,
    startAt: half.startAt,
    endAt: half.endAt,
    coverage: 1,
    validation: 'holdout',
    trainPercent: QUANT_TRAIN_PERCENT,
    folds: QUANT_FOLDS,
    optimized: true,
    returnPercent: half.returnPercent,
    drawdownPercent: half.drawdownPercent,
    trades: half.trades,
    valuationAsset: 'input',
    networkFeeXor: fees.networkFeeXor,
    swapFeePercent: fees.swapFeePercent,
    sellNetworkFeeXor: fees.sellNetworkFeeXor,
    sellSwapFeePercent: fees.sellSwapFeePercent,
    priceImpactPercent: fees.priceImpactPercent,
    sellPriceImpactPercent: fees.sellPriceImpactPercent,
    feeObservation: {
      blockNumber: fees.blockNumber,
      blockHash: fees.blockHash,
      genesisHash: fees.genesisHash,
      endpoint: fees.endpoint,
      queriedAt: fees.queriedAt,
      ...(fees.finalizedAt !== undefined ? { finalizedAt: fees.finalizedAt } : {}),
      amountIn: fees.amountIn,
      sellAmountIn: fees.sellAmountIn,
    },
  };
}

/** Everything the page's paper flow needs; the same shape as a ready-made bot's payload. */
export function studioPaperPayload(
  asset: BotAsset,
  replay: StudioReplay,
  assets: BotAsset[],
  name: string,
  fees: ResearchFeeSnapshot,
  denomination: NonNullable<BotHistory['identity']>,
  now: number
): QuantDeployPayload {
  return {
    bot: createStudioBot(asset, replay, assets, name, now, fees),
    settings: quantResearchSettings({ asset }, fees),
    research: studioResearchSnapshot(replay, fees, now),
    denomination: { ...denomination },
    sessionDurationMs: STUDIO_SESSION_MS,
    cadence: replay.cadence,
  };
}
