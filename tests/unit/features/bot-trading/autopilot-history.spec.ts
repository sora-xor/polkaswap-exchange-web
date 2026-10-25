import { describe, expect, it, vi } from 'vitest';
import {
  createAutopilotHistoryLoader,
  createAutopilotHistoryReadinessReader,
} from '@/features/bot-trading/autopilot-history';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { getCurrentIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { createExplorerClient } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/client';
import type { BotHistory } from '@/features/bot-trading/types';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import type { AutopilotHistory } from '@/features/bot-trading/goal-history';
import type { ResearchSettings } from '@/features/bot-trading/research';
import { botFixture } from './fixtures';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/features/bot-trading/history', () => ({ fetchIndexedBotHistoryWithEvidence: vi.fn() }));
vi.mock('@/features/bot-trading/playground-history', () => ({ readHistoryIdentity: vi.fn() }));
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
const indexer = vi.hoisted(() => ({ value: null as { type: string; services: { explorer: unknown } } | null }));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  // Production getIndexer returns fresh descriptors around the same explorer singleton.
  getCurrentIndexer: () => indexer.value && { ...indexer.value, services: { ...indexer.value.services } },
}));
const archive = vi.hoisted(() => vi.fn());
vi.mock('@/features/bot-trading/archive-rpc-history', () => ({ fetchRecentArchivedBotHistory: archive }));

const HOUR = 3_600_000;
const END = Date.UTC(2026, 8, 19);
const START = END - 168 * HOUR;
const WARMUP_START = START - 201 * HOUR;
const GENESIS = `0x${'1'.repeat(64)}`;

/** Valid public asset identities for receipt checks; balances remain synthetic. */
function historyBot() {
  const bot = botFixture();
  bot.assetIn.address = `0x${'2'.repeat(64)}`;
  bot.assetOut.address = `0x${'3'.repeat(64)}`;
  bot.policy.feeAsset = { ...bot.assetIn };
  return bot;
}

/** Public observations are synthetic fixtures; no external source or wallet is contacted. */
function harness() {
  let identityKey = 'main:1';
  let now = END;
  let finalityOverride: { at: number | undefined } | undefined;
  const check = vi.fn();
  const identity = vi.fn(async () => ({
    key: identityKey,
    genesisHash: GENESIS,
    currentDenominator: '100',
    finalizedAt: finalityOverride ? finalityOverride.at : now,
    assertCurrent: check,
  }));
  const full: BotHistory = {
    candles: Array.from({ length: 369 }, (_, i) => ({
      timestamp: WARMUP_START + (i + 1) * HOUR,
      close: '7.123456789012345678',
      feeClose: '1.000000000000000001',
    })),
    missing: 0,
    denominationVerified: true,
    identity: { genesisHash: GENESIS, denominator: '100' },
  };
  const boundaries: IndexedPoolHistoryWithEvidence['boundaries'] = full.candles.map((candle, index) => ({
    kind: 'indexed-finalized-hour-boundary',
    completedAtMs: candle.timestamp,
    genesisHash: GENESIS,
    denominator: '100',
    closing: {
      height: 1000 + index * 600,
      hash: `0x${(1000 + index * 600).toString(16).padStart(64, '0')}`,
      timestampSeconds: candle.timestamp / 1000 - 3,
    },
    successor: {
      height: 1001 + index * 600,
      hash: `0x${(1001 + index * 600).toString(16).padStart(64, '0')}`,
      timestampSeconds: candle.timestamp / 1000 + 3,
    },
    arrivalTimeKnown: false,
  }));
  const receipt = (history = full): IndexedPoolHistoryWithEvidence => structuredClone({ history, boundaries });
  const indexed = vi.fn(async () => receipt());
  archive.mockReset().mockImplementation(async () => structuredClone(full));
  const loader = createAutopilotHistoryLoader({ identity, indexed, now: () => now });
  const settings = { historyStartAt: START, historyEndAt: END, days: 7 } as ResearchSettings;
  return {
    loader,
    indexed,
    archive,
    identity,
    full,
    boundaries,
    receipt,
    settings,
    check,
    changeIdentity: () => {
      identityKey = 'other:1';
    },
    tick: (milliseconds = 60_000) => {
      now += milliseconds;
    },
    setFinalizedAt: (at: number | undefined) => {
      finalityOverride = { at };
    },
  };
}

describe('simple-flow exact indexed pool history', () => {
  it.each([undefined, 0, NaN, END - 1, END + 30_001])(
    'reports stale finality %s before requesting history or substituting another window',
    async (at) => {
      const t = harness();
      t.setFinalizedAt(at);
      await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
      expect(t.indexed).not.toHaveBeenCalled();
      expect(t.archive).not.toHaveBeenCalled();
      expect(t.settings.historyEndAt).toBe(END);
    }
  );

  it('retains the existing five-minute finality horizon with its exact boundary', async () => {
    const t = harness();
    t.setFinalizedAt(END);
    t.tick(300_000);
    await expect(t.loader.load(historyBot(), t.settings)).resolves.toMatchObject({ missing: 0 });
    t.tick(1);
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
    expect(t.indexed).toHaveBeenCalledTimes(1);
  });

  it('rechecks finality before returning a cached result', async () => {
    const t = harness();
    await t.loader.load(historyBot(), t.settings);
    t.setFinalizedAt(END - 1);
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
    expect(t.indexed).toHaveBeenCalledTimes(1);
  });

  it('rejects data that ages past the live horizon during a slow indexed request', async () => {
    const t = harness();
    t.setFinalizedAt(END);
    t.indexed.mockImplementationOnce(async () => {
      t.tick(300_001);
      return t.receipt();
    });
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
    expect(t.archive).not.toHaveBeenCalled();
    t.setFinalizedAt(END + 300_001);
    await t.loader.load(historyBot(), t.settings);
    expect(t.indexed).toHaveBeenCalledTimes(2);
  });

  it('requests the exact XOR-pool basis without archive requests and returns independent cache copies', async () => {
    const t = harness();
    const first = await t.loader.load(historyBot(), t.settings);
    expect(t.archive).not.toHaveBeenCalled();
    expect(t.indexed).toHaveBeenCalledWith(expect.anything(), {
      startAt: WARMUP_START,
      endAt: END,
      signal: undefined,
    });
    expect(first.identity?.denominator).toBe('100');
    first.candles[0].close = '99';
    expect((await t.loader.load(historyBot(), t.settings)).candles[0].close).toBe(t.full.candles[201].close);
    expect(t.indexed).toHaveBeenCalledTimes(1);
    t.tick();
    await t.loader.load(historyBot(), t.settings);
    expect(t.indexed).toHaveBeenCalledTimes(2);
  });

  it('retains 201 preceding observations separately without moving the funded study', async () => {
    const t = harness();
    const signal = new AbortController().signal;
    const first = (await t.loader.load(historyBot(), t.settings, signal)) as AutopilotHistory;
    expect(t.indexed).toHaveBeenCalledWith(expect.anything(), {
      startAt: WARMUP_START,
      endAt: END,
      signal,
    });
    expect(first.candles).toEqual(t.full.candles.slice(201));
    expect(first.candles).toHaveLength(168);
    expect(first.candles[0].timestamp).toBe(START + HOUR);
    expect(first.candles.at(-1)?.timestamp).toBe(END);
    expect(first.goalHistory.warmupCandles).toEqual(t.full.candles.slice(0, 201));
    expect(first.goalHistory.warmupCandles.at(-1)?.timestamp).toBe(START);
    expect(first.goalHistory.studyStartAt).toBe(START);
    expect(first.goalHistory.studyEndAt).toBe(END);
    first.goalHistory.warmupCandles[0].close = '999';
    (first.goalHistory.warmupBoundaries[0].closing as { hash: string }).hash = `0x${'e'.repeat(64)}`;
    const again = (await t.loader.load(historyBot(), t.settings)) as AutopilotHistory;
    expect(again.goalHistory.warmupCandles[0].close).toBe(t.full.candles[0].close);
    expect(again.goalHistory.warmupBoundaries[0].closing.hash).toBe(t.boundaries[0].closing.hash);
    expect(t.indexed).toHaveBeenCalledTimes(1);
  });

  it.each(['missingPrefix', 'missingBoundary', 'wrongBoundary', 'missingIdentity', 'genesis', 'denominator'])(
    'rejects %s rather than relabeling incomplete or foreign indexed data',
    async (fault) => {
      const t = harness();
      t.indexed.mockImplementationOnce(async () => {
        const receipt = t.receipt();
        if (fault === 'missingPrefix') receipt.history.candles.shift();
        if (fault === 'missingBoundary') return { ...receipt, boundaries: receipt.boundaries.slice(1) };
        if (fault === 'wrongBoundary')
          return {
            ...receipt,
            boundaries: receipt.boundaries.map((boundary, index) =>
              index === 0 ? { ...boundary, denominator: '10' } : boundary
            ),
          };
        if (fault === 'missingIdentity') delete receipt.history.identity;
        if (fault === 'genesis') receipt.history.identity!.genesisHash = `0x${'f'.repeat(64)}`;
        if (fault === 'denominator') receipt.history.identity!.denominator = '10';
        return receipt;
      });
      await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
      await expect(t.loader.load(historyBot(), t.settings)).resolves.toMatchObject({ missing: 0 });
      expect(t.indexed).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['genesisHash', 'currentDenominator'])(
    'checks the final %s value even when a provider keeps the same identity key',
    async (field) => {
      const t = harness();
      const original = t.identity.getMockImplementation()!;
      t.identity.mockImplementation(async () => {
        const identity = await original();
        if (t.identity.mock.calls.length === 2)
          identity[field] = field === 'genesisHash' ? `0x${'f'.repeat(64)}` : '10';
        return identity;
      });
      await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
    }
  );

  it('never serves a cached receipt for changed identity values sharing an old key', async () => {
    const t = harness();
    await t.loader.load(historyBot(), t.settings);
    const original = t.identity.getMockImplementation()!;
    t.identity.mockImplementation(async () => ({ ...(await original()), currentDenominator: '10' }));
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
    expect(t.indexed).toHaveBeenCalledTimes(2);
  });

  it('re-observes the same window before review and never substitutes cached data for a failed fresh read', async () => {
    const t = harness();
    const first = (await t.loader.load(historyBot(), t.settings)) as AutopilotHistory;
    t.full.candles[0].close = '8';
    const refreshed = (await t.loader.load(historyBot(), t.settings, undefined, { fresh: true })) as AutopilotHistory;
    expect(t.indexed).toHaveBeenCalledTimes(2);
    expect(refreshed.goalHistory.warmupCandles[0].close).toBe('8');
    expect(refreshed.goalHistory.commitmentSha256).not.toBe(first.goalHistory.commitmentSha256);
    t.full.candles.shift();
    await expect(t.loader.load(historyBot(), t.settings, undefined, { fresh: true })).rejects.toThrow(
      'historyIncomplete'
    );
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
    expect(t.indexed).toHaveBeenCalledTimes(4);
  });

  it.each(['input', 'output', 'fee'])('rejects changed %s asset metadata during a history read', async (asset) => {
    const t = harness();
    const bot = historyBot();
    t.indexed.mockImplementationOnce(async () => {
      if (asset === 'input') bot.assetIn.decimals++;
      if (asset === 'output') bot.assetOut.symbol = 'CHANGED';
      if (asset === 'fee') bot.policy.feeAsset.address = `0x${'f'.repeat(64)}`;
      return t.receipt();
    });
    await expect(t.loader.load(bot, t.settings)).rejects.toThrow('bots.errors.stale');
  });

  it.each(['type', 'explorer', 'client'])(
    'rejects in-flight %s replacement and does not reuse a cached source across replacements',
    async (fault) => {
      const t = harness();
      const explorer = { initClient: () => true, client: {} };
      indexer.value = { type: 'polkaswap', services: { explorer } };
      const replace = () => {
        if (fault === 'type') indexer.value!.type += '-changed';
        if (fault === 'explorer') indexer.value!.services.explorer = { ...explorer };
        if (fault === 'client') explorer.client = {};
      };
      try {
        await t.loader.load(historyBot(), t.settings);
        await t.loader.load(historyBot(), t.settings);
        expect(t.indexed).toHaveBeenCalledTimes(1);
        replace();
        await t.loader.load(historyBot(), t.settings);
        expect(t.indexed).toHaveBeenCalledTimes(2);
        t.tick();
        t.indexed.mockImplementationOnce(async () => {
          replace();
          return t.receipt();
        });
        await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.errors.stale');
      } finally {
        indexer.value = null;
      }
    }
  );

  it.each(['missing', 'denomination', 'exception', 'timestamp', 'price'])(
    'rejects %s indexed evidence without substituting archive or USD-derived prices',
    async (fault) => {
      const t = harness();
      t.indexed.mockImplementationOnce(async () => {
        if (fault === 'exception') throw new Error('upstream down');
        const partial = structuredClone(t.full);
        partial.candles[0].close = '999';
        if (fault === 'missing') {
          partial.candles.splice(7, 1);
          partial.missing = 1;
        }
        if (fault === 'denomination') partial.denominationVerified = false;
        if (fault === 'timestamp') partial.candles[7].timestamp++;
        if (fault === 'price') partial.candles[7].close = '0';
        return t.receipt(partial);
      });
      await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow(
        fault === 'exception' ? 'historyUnavailable' : 'historyIncomplete'
      );
      expect(t.archive).not.toHaveBeenCalled();
    }
  );

  it('reports remaining real gaps and never caches them', async () => {
    const t = harness();
    t.full.candles.splice(5, 1);
    t.full.missing = 1;
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
    expect(t.indexed).toHaveBeenCalledTimes(2);
    expect(t.archive).not.toHaveBeenCalled();
  });

  it('reports unavailable sources without forwarding raw network responses', async () => {
    const t = harness();
    t.indexed.mockRejectedValue(new Error('upstream error'));
    await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('bots.autopilot.errors.historyUnavailable');
  });

  it.each(['signal', 'clear', 'identity'])('rejects an in-flight result after %s invalidation', async (fault) => {
    const t = harness();
    const abort = new AbortController();
    t.indexed.mockImplementationOnce(async () => {
      if (fault === 'signal') abort.abort();
      if (fault === 'clear') t.loader.clear();
      if (fault === 'identity') t.changeIdentity();
      return t.receipt();
    });
    await expect(t.loader.load(historyBot(), t.settings, abort.signal)).rejects.toThrow('bots.errors.stale');
    expect(t.archive).not.toHaveBeenCalled();
  });

  it('rechecks chain identity on cache hits and keeps reversed pairs separate', async () => {
    const t = harness();
    const bot = historyBot();
    await t.loader.load(bot, t.settings);
    await t.loader.load(bot, t.settings);
    expect(t.indexed).toHaveBeenCalledTimes(1);
    t.changeIdentity();
    await t.loader.load(bot, t.settings);
    expect(t.indexed).toHaveBeenCalledTimes(2);
    await t.loader.load({ ...bot, assetIn: bot.assetOut, assetOut: bot.assetIn }, t.settings);
    expect(t.indexed).toHaveBeenCalledTimes(3);
    expect(t.identity.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it.each(['missing', 'zero', 'invalid'])(
    'rejects an indexed %s fee price without falling back to a different price source',
    async (fault) => {
      const t = harness();
      t.indexed.mockImplementationOnce(async () => {
        const partial = structuredClone(t.full);
        if (fault === 'missing') delete partial.candles[7].feeClose;
        else partial.candles[7].feeClose = fault === 'zero' ? '0' : '1e6';
        return t.receipt(partial);
      });
      await expect(t.loader.load(historyBot(), t.settings)).rejects.toThrow('historyIncomplete');
      expect(t.archive).not.toHaveBeenCalled();
    }
  );

  it.each(['signal', 'clear'])('does not mask %s cancellation with an unavailable-history error', async (fault) => {
    const t = harness();
    const controller = new AbortController();
    t.indexed.mockImplementationOnce(async () => {
      if (fault === 'signal') controller.abort();
      else t.loader.clear();
      throw new Error('indexer interrupted');
    });
    await expect(t.loader.load(historyBot(), t.settings, controller.signal)).rejects.toThrow('bots.errors.stale');
    const result = await t.loader.load(historyBot(), t.settings);
    expect(result.candles).toEqual(t.full.candles.slice(201));
    expect(t.indexed).toHaveBeenCalledTimes(2);
    expect(t.archive).not.toHaveBeenCalled();
  });

  it('rejects accidental 90-day or stale windows before requesting data', async () => {
    const t = harness();
    for (const settings of [
      { ...t.settings, historyStartAt: END - 90 * 24 * HOUR },
      { ...t.settings, historyStartAt: START - 3 * HOUR, historyEndAt: END - 3 * HOUR },
    ])
      await expect(t.loader.load(historyBot(), settings)).rejects.toThrow('historyUnavailable');
    expect(t.indexed).not.toHaveBeenCalled();
    expect(t.archive).not.toHaveBeenCalled();
  });
});

/** Metadata fixtures intentionally contain no prices, reserves or performance observations. */
function readinessHarness() {
  let now = END;
  let key = 'main:100';
  let finalizedAt = END;
  const check = vi.fn();
  const input = {
    assets: [
      { address: `0x${'2'.repeat(64)}`, symbol: 'KUSD', decimals: 18 },
      { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals },
      { address: `0x${'3'.repeat(64)}`, symbol: 'VAL', decimals: 18 },
    ],
    assetInAddress: `0x${'2'.repeat(64)}`,
    assetOutAddress: XOR.address,
  };
  const responses = new Map(
    input.assets.map((asset) => [
      asset.address,
      {
        assetId: asset.address,
        symbol: asset.symbol,
        start: WARMUP_START / 1000,
        end: END / 1000,
        asOf: END / 1000,
        expectedHours: 369,
        observedHours: 369,
        verifiedHours: 369,
        poolUsableHours: 369,
        missingHours: 0,
        legacyHours: 0,
        invalidHours: 0,
        absentPoolHours: 0,
        zeroReserveHours: 0,
        unknownPoolHours: 0,
        latestCompletedAt: END / 1000,
        latestUsableCompletedAt: END / 1000,
        hours: Array.from({ length: 369 }, (_, i) => ({
          hour: WARMUP_START / 1000 + i * 3600,
          completedAt: WARMUP_START / 1000 + (i + 1) * 3600,
          proofStatus: 'VERIFIED',
          poolStatus: asset.address === XOR.address ? 'XOR_SELF' : 'USABLE',
          timestamp: WARMUP_START / 1000 + (i + 1) * 3600 - 3,
          blockHeight: 1000 + i * 600,
          blockHash: `0x${'a'.repeat(64)}`,
          nextTimestamp: WARMUP_START / 1000 + (i + 1) * 3600 + 3,
          nextBlockHeight: 1001 + i * 600,
          nextBlockHash: `0x${'b'.repeat(64)}`,
          denominator: '100',
          decimals: asset.decimals,
        })),
      },
    ])
  );
  const identity = vi.fn(async () => ({
    key,
    genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
    currentDenominator: '100',
    finalizedAt,
    assertCurrent: check,
  }));
  const coverage = vi.fn(
    async (assetId: string, _start: number, _end: number, _signal?: AbortSignal): Promise<unknown> =>
      structuredClone(responses.get(assetId))
  );
  const deps = { identity, coverage, now: () => now };
  return {
    input,
    responses,
    identity,
    coverage,
    deps,
    check,
    read: createAutopilotHistoryReadinessReader(deps),
    tick: (ms: number) => {
      now += ms;
    },
    changeIdentity: () => {
      key = 'other:100';
    },
    setFinality: (at: number) => {
      finalizedAt = at;
    },
  };
}

describe('metadata-only GO window readiness', () => {
  it('matches the exact research close and validation split, without fetching any candles', async () => {
    const t = readinessHarness();
    await expect(t.read(t.input)).resolves.toEqual({ completedThrough: END, validationFrom: END - 49 * HOUR });
    expect(t.coverage.mock.calls.map(([asset]) => asset)).toEqual([t.input.assetInAddress, XOR.address]);
    expect(t.coverage).toHaveBeenCalledWith(
      t.input.assetInAddress,
      WARMUP_START / 1000,
      END / 1000,
      expect.any(AbortSignal)
    );
    expect(t.identity).toHaveBeenCalledTimes(2);
  });

  it('requires separate XOR fee coverage when neither selected token is XOR', async () => {
    const t = readinessHarness();
    t.input.assetOutAddress = t.input.assets[2].address;
    t.responses.get(XOR.address)!.poolUsableHours = 368;
    await expect(t.read(t.input)).resolves.toBeNull();
    expect(t.coverage.mock.calls.map(([asset]) => asset)).toEqual([
      t.input.assetInAddress,
      t.input.assetOutAddress,
      XOR.address,
    ]);
  });

  it.each(['missingHours', 'legacyHours', 'invalidHours', 'absentPoolHours', 'zeroReserveHours', 'unknownPoolHours'])(
    'rejects coverage containing %s even if aggregate usable counts claim completeness',
    async (field) => {
      const t = readinessHarness();
      Object.assign(t.responses.get(t.input.assetInAddress)!, { [field]: 1 });
      await expect(t.read(t.input)).resolves.toBeNull();
    }
  );

  it.each(['missing', 'order', 'legacy', 'pool', 'denominator', 'decimals', 'boundary', 'height', 'hash', 'future'])(
    'checks every hour and rejects %s metadata',
    async (fault) => {
      const t = readinessHarness();
      const hours = t.responses.get(XOR.address)!.hours;
      if (fault === 'missing') hours.splice(7, 1);
      if (fault === 'order') [hours[7], hours[8]] = [hours[8], hours[7]];
      if (fault === 'legacy') hours[7].proofStatus = 'LEGACY';
      if (fault === 'pool') hours[7].poolStatus = 'USABLE';
      if (fault === 'denominator') hours[7].denominator = '10';
      if (fault === 'decimals') hours[7].decimals = 17;
      if (fault === 'boundary') hours[7].blockHash = `0x${'c'.repeat(64)}`;
      if (fault === 'height') hours[7].nextBlockHeight += 1;
      if (fault === 'hash') hours[7].nextBlockHash = hours[7].blockHash;
      if (fault === 'future') hours[7].nextTimestamp = hours[7].completedAt + 3600;
      await expect(t.read(t.input)).resolves.toBeNull();
    }
  );

  it.each(['assetId', 'symbol', 'start', 'end', 'latestCompletedAt', 'latestUsableCompletedAt', 'asOf'])(
    'rejects mismatched or stale coverage %s',
    async (field) => {
      const t = readinessHarness();
      const response = t.responses.get(t.input.assetInAddress)!;
      Object.assign(response, { [field]: typeof response[field as keyof typeof response] === 'string' ? 'wrong' : 0 });
      await expect(t.read(t.input)).resolves.toBeNull();
    }
  );

  it('checks coverage freshness after all requests and final identity resolution', async () => {
    const t = readinessHarness();
    t.identity.mockImplementationOnce(async () => ({
      key: 'main:100',
      genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
      currentDenominator: '100',
      finalizedAt: END,
      assertCurrent: t.check,
    }));
    t.identity.mockImplementationOnce(async () => {
      t.tick(60_001);
      return {
        key: 'main:100',
        genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
        currentDenominator: '100',
        finalizedAt: END,
        assertCurrent: t.check,
      };
    });
    await expect(t.read(t.input)).resolves.toBeNull();
  });

  it.each(['chain', 'finality', 'rollover'])('rejects %s changing during coverage reads', async (fault) => {
    const t = readinessHarness();
    t.coverage.mockImplementationOnce(async (asset) => {
      if (fault === 'chain') t.changeIdentity();
      if (fault === 'finality') t.setFinality(END - 1);
      if (fault === 'rollover') t.tick(HOUR);
      return structuredClone(t.responses.get(asset));
    });
    await expect(t.read(t.input)).resolves.toBeNull();
  });

  it('returns promptly on abort and issues no subsequent requests when a shared reply arrives late', async () => {
    const t = readinessHarness();
    const controller = new AbortController();
    let finish!: (value: unknown) => void;
    t.coverage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const pending = t.read(t.input, controller.signal);
    await vi.waitFor(() => expect(t.coverage).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).resolves.toBeNull();
    finish(t.responses.get(t.input.assetInAddress));
    await Promise.resolve();
    expect(t.coverage).toHaveBeenCalledTimes(1);
  });

  it('does not request metadata when already aborted or on a foreign chain', async () => {
    const t = readinessHarness();
    await expect(t.read(t.input, AbortSignal.abort())).resolves.toBeNull();
    expect(t.identity).not.toHaveBeenCalled();
    t.identity.mockResolvedValueOnce({
      key: 'foreign',
      genesisHash: `0x${'1'.repeat(64)}`,
      currentDenominator: '100',
      finalizedAt: END,
      assertCurrent: t.check,
    });
    await expect(t.read(t.input)).resolves.toBeNull();
    expect(t.coverage).not.toHaveBeenCalled();
  });

  it('bounds a stalled shared metadata request and prevents continuation after timeout', async () => {
    vi.useFakeTimers();
    try {
      const t = readinessHarness();
      let finish!: (value: unknown) => void;
      t.coverage.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      const pending = t.read(t.input);
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(pending).resolves.toBeNull();
      expect(t.coverage.mock.calls[0][3]?.aborted).toBe(true);
      finish(t.responses.get(t.input.assetInAddress));
      await Promise.resolve();
      expect(t.coverage).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats source failures and executable metadata as unavailable', async () => {
    const t = readinessHarness();
    t.coverage.mockRejectedValueOnce(new Error('upstream'));
    await expect(t.read(t.input)).resolves.toBeNull();
    const getter = vi.fn();
    t.coverage.mockResolvedValueOnce(Object.defineProperty({}, 'assetId', { get: getter }));
    await expect(t.read(t.input)).resolves.toBeNull();
    expect(getter).not.toHaveBeenCalled();
  });

  it('accepts fresh indexer descriptors for the same explorer and ignores a replaced indexer', async () => {
    const t = readinessHarness();
    const request = vi.fn((_query: unknown, variables: { assetId: string }, _context: unknown) => ({
      toPromise: async () => ({ data: { data: t.responses.get(variables.assetId) } }),
    }));
    indexer.value = {
      type: 'polkaswap',
      services: {
        explorer: { initClient: () => true, client: { query: request } },
      },
    };
    expect(getCurrentIndexer()).not.toBe(getCurrentIndexer());
    expect(getCurrentIndexer()?.services.explorer).toBe(getCurrentIndexer()?.services.explorer);
    const read = createAutopilotHistoryReadinessReader({ identity: t.identity, now: t.deps.now });
    await expect(read(t.input)).resolves.toEqual({ completedThrough: END, validationFrom: END - 49 * HOUR });
    const query = JSON.stringify(request.mock.calls[0][0]);
    expect(request.mock.calls[0][2]).toEqual({
      requestPolicy: 'network-only',
      fetchOptions: { signal: expect.any(AbortSignal), cache: 'no-store' },
    });
    expect(query).toContain('assetHourlyCoverage');
    for (const forbidden of ['assetSnapshots', 'priceUSD', 'closeEvidence', 'Reserves', 'feeClose'])
      expect(query).not.toContain(forbidden);
    request.mockImplementationOnce((_query, variables) => {
      indexer.value = null;
      return { toPromise: async () => ({ data: { data: t.responses.get(variables.assetId) } }) };
    });
    await expect(read(t.input)).resolves.toBeNull();
    indexer.value = null;
  });

  it.each(['type', 'client', 'finalIdentityWait'])(
    'rejects %s transport changes during the same readiness poll',
    async (fault) => {
      const t = readinessHarness();
      const request = vi.fn((_query: unknown, variables: { assetId: string }) => ({
        toPromise: async () => ({ data: { data: t.responses.get(variables.assetId) } }),
      }));
      const explorer = { initClient: () => true, client: { query: request } };
      indexer.value = { type: 'polkaswap', services: { explorer } };
      const change = () => {
        if (fault === 'type') indexer.value!.type = 'different';
        if (fault === 'client' || fault === 'finalIdentityWait') explorer.client = { ...explorer.client };
      };
      if (fault === 'finalIdentityWait') {
        const originalIdentity = t.identity.getMockImplementation()!;
        t.identity.mockImplementation(async () => {
          if (t.identity.mock.calls.length === 2) change();
          return originalIdentity();
        });
      } else {
        request.mockImplementationOnce((_query, variables) => ({
          toPromise: async () => {
            change();
            return { data: { data: t.responses.get(variables.assetId) } };
          },
        }));
      }
      const read = createAutopilotHistoryReadinessReader({ identity: t.identity, now: t.deps.now });
      await expect(read(t.input)).resolves.toBeNull();
      expect(request).toHaveBeenCalledTimes(fault === 'finalIdentityWait' ? 2 : 1);
      indexer.value = null;
    }
  );

  it('uses the actual explorer client API with fresh descriptors and mocked HTTP only', async () => {
    const t = readinessHarness();
    const response = (assetId: string) =>
      new Response(JSON.stringify({ data: { data: t.responses.get(assetId) } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(t.input.assetInAddress))
      .mockResolvedValueOnce(response(XOR.address));
    vi.stubGlobal('fetch', fetch);
    try {
      const client = createExplorerClient('https://pi.soramitsu.io/graphql');
      expect('url' in client).toBe(false);
      indexer.value = { type: 'polkaswap', services: { explorer: { initClient: () => true, client } } };
      const read = createAutopilotHistoryReadinessReader({ identity: t.identity, now: t.deps.now });
      await expect(read(t.input)).resolves.toEqual({ completedThrough: END, validationFrom: END - 49 * HOUR });
      expect(fetch).toHaveBeenCalledTimes(2);
      for (const [, options] of fetch.mock.calls)
        expect(options).toMatchObject({ cache: 'no-store', signal: expect.any(AbortSignal) });
    } finally {
      vi.unstubAllGlobals();
      indexer.value = null;
    }
  });
});
