import { describe, expect, it, vi } from 'vitest';
import payload from '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json?raw';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { parseArchivedBotHistory } from '@/features/bot-trading/archive-history';
import { createAutopilotResearch } from '@/features/bot-trading/autopilot';
import { toCodec } from '@/features/bot-trading/amounts';
import type { BotAiClient } from '@/features/bot-trading/ai';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotDefinition } from '@/features/bot-trading/types';
import type { AutopilotHistory } from '@/features/bot-trading/goal-history';
import { parseBotPrice } from '@/features/bot-trading/engine';
import { botFixture } from './fixtures';

// The global wallet stubs use short ids such as "xor"; validate the shipped chain ids here.
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
  VAL: { address: '0x0200040000000000000000000000000000000000000000000000000000000000', symbol: 'VAL', decimals: 18 },
  PSWAP: {
    address: '0x0200050000000000000000000000000000000000000000000000000000000000',
    symbol: 'PSWAP',
    decimals: 18,
  },
}));

describe('bundled real SORA archive observations', () => {
  it('retains complete archive observations without relabeling them as indexed GO warmup evidence', async () => {
    const data = JSON.parse(payload);
    const startAt = data.endAt - 90 * 24 * 3_600_000;
    const options = {
      startAt,
      endAt: data.endAt,
      genesisHash: data.genesisHash,
      currentDenominator: data.rows.at(-1).denominator,
    };
    const bot = { ...botFixture(), assetIn: XOR, assetOut: VAL, policy: { ...botFixture().policy, feeAsset: XOR } };
    const history = {
      ...parseArchivedBotHistory(data, bot, options),
      identity: { genesisHash: options.genesisHash, denominator: options.currentDenominator },
    };
    expect(history.candles).toHaveLength(2160);
    expect(history.missing).toBe(0);
    for (const candle of history.candles) {
      expect(() => parseBotPrice(candle.close), `close at ${candle.timestamp}: ${candle.close}`).not.toThrow();
      expect(() => parseBotPrice(candle.feeClose!), `fee close at ${candle.timestamp}`).not.toThrow();
    }
    for (const hour of [17, 19, 21, 22])
      expect(history.candles.some((candle) => candle.timestamp === Date.UTC(2026, 8, 15, hour))).toBe(true);
    const suggest = vi.fn().mockRejectedValue(new Error('verified history reached the assistant'));
    const client = { suggest } as unknown as BotAiClient;
    // Fees are synthetic provider fixtures; this test's real evidence is the bundled history only.
    const loadFees = vi.fn(
      async (draft: BotDefinition): Promise<ResearchFeeSnapshot> => ({
        networkFeeXor: '0.0001',
        priceImpactPercent: '0',
        sellPriceImpactPercent: '0',
        networkFeeCodec: toCodec('0.0001', XOR.decimals),
        swapFeePercent: '0.1',
        sellNetworkFeeXor: '0.0001',
        sellNetworkFeeCodec: toCodec('0.0001', XOR.decimals),
        sellSwapFeePercent: '0.1',
        queriedAt: data.endAt,
        finalizedAt: data.endAt,
        expiresAt: data.endAt + 300_000,
        blockNumber: 123,
        blockHash: `0x${'2'.repeat(64)}`,
        genesisHash: options.genesisHash,
        endpoint: 'wss://test.example',
        denominator: options.currentDenominator,
        amountIn: draft.strategy.amount,
        amountOut: '1',
        sellAmountIn: '1',
        sellAmountOut: draft.strategy.amount,
        assetInAddress: draft.assetIn.address,
        assetOutAddress: draft.assetOut.address,
        dexId: 0,
        route: [],
        routeFees: [],
        sellDexId: 0,
        sellRoute: [],
        sellRouteFees: [],
      })
    );
    const research = createAutopilotResearch({
      loadHistory: async (_bot, settings) => {
        expect(settings.historyEndAt).toBe(data.endAt);
        const selected = parseArchivedBotHistory(data, bot, {
          ...options,
          startAt: settings.historyStartAt!,
          endAt: settings.historyEndAt!,
        });
        expect(selected.missing).toBe(0);
        // Deliberately exercise a legacy loader: it has no indexed boundary receipts.
        return { ...selected, identity: history.identity } as AutopilotHistory;
      },
      loadFees,
      now: () => data.endAt,
    });
    await expect(
      research.run(
        {
          assets: [XOR, VAL],
          assetInAddress: XOR.address,
          assetOutAddress: VAL.address,
          capital: '100',
          feeBudgetXor: '1',
          maxLossPercent: '5',
          targetReturnPercent: '5',
          title: 'Test verified history',
        },
        client
      )
    ).rejects.toThrow();
    expect(suggest).not.toHaveBeenCalled();
    expect(loadFees).not.toHaveBeenCalled();
  });
  it('validates every recorded boundary and exact reserve for XOR/VAL, reverse and cross-token studies', () => {
    const data = JSON.parse(payload);
    expect(data.baseAsset).toBe(XOR.address);
    const options = {
      startAt: data.startAt,
      endAt: data.endAt,
      genesisHash: data.genesisHash,
      currentDenominator: data.rows[0].denominator,
    };
    for (const [assetIn, assetOut] of [
      [XOR, VAL],
      [VAL, XOR],
      [VAL, PSWAP],
    ]) {
      const bot = { ...botFixture(), assetIn, assetOut, policy: { ...botFixture().policy, feeAsset: XOR } };
      const history = parseArchivedBotHistory(data, bot, options);
      expect(history.candles[0].timestamp).toBe(Date.UTC(2026, 2, 1, 1));
      expect(history.candles.length).toBeGreaterThan(24);
      expect(history.candles.length + history.missing).toBe((data.endAt - data.startAt) / 3_600_000);
      expect(history.denominationVerified).toBe(true);
      expect(history.provenance?.kind).toBe('archive-pool-spot');
    }
  });
});
