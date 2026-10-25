// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import { parseQuantArchive, type QuantCosts } from '@/features/bot-trading/quant-loop';
import {
  defaultStudioState,
  normalizeStudioState,
  studioReplay,
  type StudioReplay,
} from '@/features/bot-trading/quant-studio';
import {
  createStudioBot,
  studioImpactCeiling,
  studioPaperPayload,
  studioResearchSnapshot,
} from '@/features/bot-trading/quant-studio-deploy';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotAsset } from '@/features/bot-trading/types';
import observedFees from '../../../fixtures/bot-trading/mainnetFees20260914.json';

const COSTS: QuantCosts = { networkFeeXor: observedFees.networkFeeXor, swapFeePercent: '0.6', slippagePercent: '0.5' };
const FEES = {
  networkFeeXor: observedFees.networkFeeXor,
  swapFeePercent: '0.6',
  sellNetworkFeeXor: observedFees.networkFeeXor,
  sellSwapFeePercent: '0.6',
  priceImpactPercent: '5',
  sellPriceImpactPercent: '5',
  queriedAt: Date.UTC(2026, 9, 3, 1),
  blockNumber: 1,
  blockHash: `0x${'ab'.repeat(32)}`,
  genesisHash: `0x${'7e'.repeat(32)}`,
  endpoint: 'wss://ws.mof.sora.org',
  amountIn: '3',
  sellAmountIn: '100',
} as ResearchFeeSnapshot;
const NOW = Date.UTC(2026, 9, 3, 2);

let replay: StudioReplay;
let token: BotAsset;
let assets: BotAsset[];

beforeAll(async () => {
  const raw = JSON.parse(
    await readFile(
      path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
      'utf8'
    )
  );
  const market = parseQuantArchive(raw).markets.find((item) => item.asset.symbol === 'PSWAP')!;
  token = market.asset;
  assets = [{ address: XOR.address, symbol: 'XOR', decimals: 18 }, token];
  replay = studioReplay(market, defaultStudioState('dip'), COSTS);
});

describe('studio paper bots', () => {
  it('build an idle paper template with the exact rules, order size and a researched impact ceiling', () => {
    const bot = createStudioBot(token, replay, assets, 'Buy the dip · PSWAP', NOW, FEES);
    expect(bot.mode).toBe('paper');
    expect(bot.status).toBe('idle');
    expect(bot.strategy.kind).toBe('rules');
    expect(bot.strategy.rules).toEqual(replay.candidate.rules);
    expect(bot.strategy.amount).toBe('3');
    expect(bot.assetOut.address).toBe(token.address);
    const impacts = [...replay.first.fills, ...replay.second.fills].map((fill) =>
      Math.ceil(Number(fill.impactPercent))
    );
    expect(Number(bot.policy.maxPriceImpactPercent)).toBe(Math.min(20, Math.max(2, Math.max(...impacts) + 1)));
    expect(studioImpactCeiling(replay)).toBe(bot.policy.maxPriceImpactPercent);
    // Output sells are capped at the 10 XOR research capital valued at the latest archived close.
    const expected = toCodec((10 / Number(replay.latestClose)).toFixed(0), 18);
    expect(Number(bot.policy.maxTradeCodec[token.address]) / Number(expected)).toBeCloseTo(1, 4);
    expect(() => createStudioBot({ ...token, address: '0xmissing' }, replay, assets, 'x', NOW)).toThrow(
      'bots.errors.config'
    );
  });

  it('record the second half as a tuned chronological holdout', () => {
    const snapshot = studioResearchSnapshot(replay, FEES, NOW);
    expect(snapshot).toMatchObject({
      version: 1,
      source: 'historical',
      validation: 'holdout',
      optimized: true,
      trainPercent: 50,
      folds: 4,
      coverage: 1,
      startAt: replay.second.startAt,
      endAt: replay.second.endAt,
      returnPercent: replay.second.returnPercent,
      drawdownPercent: replay.second.drawdownPercent,
      trades: replay.second.trades,
      valuationAsset: 'input',
    });
    expect(snapshot.endAt).toBeLessThanOrEqual(snapshot.testedAt);
    expect(snapshot.feeObservation?.blockHash).toBe(FEES.blockHash);
  });

  it('assemble the same payload shape as a ready-made bot, for the one-day paper flow', () => {
    const state = normalizeStudioState({ recipe: 'dip', values: { amount: 3 } });
    const payload = studioPaperPayload(
      token,
      replay,
      assets,
      'Buy the dip · PSWAP',
      FEES,
      { genesisHash: FEES.genesisHash, denominator: '100' },
      NOW
    );
    expect(payload.bot.strategy.rules).toEqual(replay.candidate.rules);
    expect(payload.settings.assetOutAddress).toBe(token.address);
    expect(payload.research.validation).toBe('holdout');
    expect(payload.denomination).toEqual({ genesisHash: FEES.genesisHash, denominator: '100' });
    expect(payload.sessionDurationMs).toBe(86_400_000);
    expect(payload.cadence).toEqual(replay.cadence);
    expect(state.values.amount).toBe(3);
  });
});
