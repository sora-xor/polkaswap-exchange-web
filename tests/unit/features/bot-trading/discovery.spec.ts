import { describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  completeDiscoveryHistory,
  createDiscoveryEngine,
  createDiscoveryUniverse,
  createDiscoveryWindow,
  discoveryNextRequestAt,
  discoveryHistoryCoverage,
  fingerprintDiscoveryHistory,
  passesDiscoveryGate,
  rankDiscoveryCandidates,
  type DiscoveryCandidate,
  type DiscoverySession,
} from '@/features/bot-trading/discovery';
import {
  copyDiscoveryCheckpoint,
  findDiscoveryHoldoutOverlaps,
  type DiscoveryHoldoutReservation,
  type DiscoveryStore,
} from '@/features/bot-trading/discovery-storage';
import {
  createResearchBot,
  RESEARCH_DEFAULT_SETTINGS,
  runResearch,
  type ResearchResult,
} from '@/features/bot-trading/research';
import type { BotAsset, BotHistory, StrategyConfig } from '@/features/bot-trading/types';

const HOUR = 3_600_000;
const assets: BotAsset[] = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const now = Date.UTC(2026, 8, 23, 12);
const identity = { genesisHash: `0x${'a'.repeat(64)}`, denominator: '1' };

function history(at = now): BotHistory {
  const window = createDiscoveryWindow(at);
  return {
    identity,
    denominationVerified: true,
    missing: 0,
    candles: Array.from({ length: 90 * 24 }, (_, index) => ({
      timestamp: window.startAt + (index + 1) * HOUR,
      close: '1',
      feeClose: '1',
    })),
  };
}

function store(): DiscoveryStore & {
  current(): DiscoverySession | null;
  reservations(): DiscoveryHoldoutReservation[];
} {
  let value: DiscoverySession | null = null;
  const reservations: DiscoveryHoldoutReservation[] = [];
  return {
    load: async () => (value ? structuredClone(value) : null),
    save: async (session) => {
      const next = copyDiscoveryCheckpoint(session);
      const sameSession = value?.id === next.id;
      const advance = sameSession && next.revision === value!.revision + 1;
      const fresh =
        !sameSession &&
        next.revision === 1 &&
        next.status === 'created' &&
        (!value || ['paused', 'error', 'complete'].includes(value.status));
      if (!advance && !fresh) throw new Error('bots.errors.storage');
      value = next;
    },
    reserveHoldout: async (request) => {
      if (value?.id !== request.sessionId || value.revision !== request.checkpointRevision)
        throw new Error('bots.errors.storage');
      if (reservations.some((item) => item.sessionId === request.sessionId && item.candidateId === request.candidateId))
        return 'alreadyReserved';
      if (
        reservations.some(
          (item) =>
            item.sessionId !== request.sessionId && item.startAt <= request.endAt && item.endAt >= request.startAt
        )
      )
        return 'overlap';
      reservations.push(structuredClone(request));
      return 'reserved';
    },
    findHoldoutOverlaps: async (startAt, endAt) => findDiscoveryHoldoutOverlaps(reservations, startAt, endAt),
    clear: async () => {
      value = null;
    },
    current: () => (value ? structuredClone(value) : null),
    reservations: () => structuredClone(reservations),
  };
}

function strategy(): Record<string, unknown> {
  return {
    kind: 'dca',
    amount: '10',
    intervalMs: 24 * HOUR,
    threshold: '0',
    direction: 'below',
    fastWindow: 5,
    slowWindow: 20,
    prompt: '',
    rules: null,
    signalTiming: null,
  };
}

function qualifyingEngine(saved: DiscoveryStore, at: number, loadHistory = async () => history(at), cooldownMs = 0) {
  const provider = {
    suggest: vi.fn(async ({ requestId }: { requestId: string }) => ({ requestId, strategy: strategy() })),
    disconnect: vi.fn(),
  };
  const evaluator: NonNullable<Parameters<typeof createDiscoveryEngine>[0]['evaluate']> = async (
    settings,
    availableAssets,
    source,
    current,
    options
  ) => {
    const bot = createResearchBot(settings, availableAssets, current, options?.strategy);
    const holdout = source?.history.candles.length === 14 * 24;
    return {
      bot,
      source,
      settings,
      result: {
        portfolio: bot.portfolio,
        equity: [],
        trades: holdout ? 6 : 10,
        drawdownPercent: '1',
        returnPercent: '10',
        coverage: 1,
      },
      assumptions: {
        feeCodec: toCodec(settings.networkFeeXor, XOR.decimals),
        swapFeePercent: settings.swapFeePercent,
        priceImpactPercent: settings.priceImpactPercent ?? '0',
        sellNetworkFeeXor: settings.sellNetworkFeeXor ?? settings.networkFeeXor,
        sellSwapFeePercent: settings.sellSwapFeePercent ?? settings.swapFeePercent,
        sellPriceImpactPercent: settings.sellPriceImpactPercent ?? '0',
      },
    } as unknown as ResearchResult;
  };
  const evaluate = vi.fn(evaluator);
  const engine = createDiscoveryEngine({
    assets,
    now: () => at,
    store: saved,
    provider,
    evaluate,
    cooldownMs,
    loadHistory,
    loadFees: async (bot) => ({
      networkFeeXor: '0.001',
      networkFeeCodec: toCodec('0.001', XOR.decimals),
      sellNetworkFeeXor: '0.001',
      sellNetworkFeeCodec: toCodec('0.001', XOR.decimals),
      swapFeePercent: '0',
      sellSwapFeePercent: '0',
      priceImpactPercent: '0',
      sellPriceImpactPercent: '0',
      queriedAt: at,
      finalizedAt: at,
      expiresAt: at + 300_000,
      blockNumber: 1,
      blockHash: `0x${'b'.repeat(64)}`,
      genesisHash: identity.genesisHash,
      endpoint: 'wss://ws.mof.sora.org',
      denominator: identity.denominator,
      amountIn: bot.strategy.amount,
      amountOut: '10',
      sellAmountIn: '10',
      sellAmountOut: '10',
      assetInAddress: bot.assetIn.address,
      assetOutAddress: bot.assetOut.address,
      dexId: 0,
      route: [bot.assetIn.address, bot.assetOut.address],
      routeFees: [],
      sellDexId: 0,
      sellRoute: [bot.assetOut.address, bot.assetIn.address],
      sellRouteFees: [],
    }),
  });
  return { engine, provider, evaluate };
}

describe('AI discovery evidence boundaries', () => {
  it('freezes every directed pair and reserves the last 14 days of a common 90-day window', () => {
    const markets = createDiscoveryUniverse(assets);
    expect(markets).toHaveLength(2);
    expect(markets.map((pair) => pair.key)).toEqual([`${XOR.address}>${VAL.address}`, `${VAL.address}>${XOR.address}`]);
    const window = createDiscoveryWindow(now + 12_345);
    expect(window.endAt).toBe(now);
    expect((window.trainingEndAt - window.startAt) / HOUR).toBe(76 * 24);
    expect((window.endAt - window.trainingEndAt) / HOUR).toBe(14 * 24);
    expect(completeDiscoveryHistory(history(), window.startAt, window.endAt)).toBe(true);
    const missing = history();
    missing.candles.splice(300, 1);
    expect(completeDiscoveryHistory(missing, window.startAt, window.endAt)).toBe(false);
    expect(discoveryHistoryCoverage(missing, window.startAt, window.endAt)).toBe((90 * 24 - 1) / (90 * 24));
    missing.candles.push({ ...missing.candles[0] });
    expect(discoveryHistoryCoverage(missing, window.startAt, window.endAt)).toBe((90 * 24 - 1) / (90 * 24));
    missing.candles.push({ timestamp: window.endAt + HOUR, close: '1', feeClose: '1' });
    expect(discoveryHistoryCoverage(missing, window.startAt, window.endAt)).toBe((90 * 24 - 1) / (90 * 24));
  });

  it('uses exact decimal rankings and refuses inactive or loss-limit-breaking candidates', () => {
    const metrics = {
      returnPercent: '0.000000000000000002',
      excessReturnPercent: '0.000000000000000001',
      benchmarkReturnPercent: '0.000000000000000001',
      drawdownPercent: '4.999999999999999999',
      trades: 10,
      coverage: 1,
      startAt: 1,
      endAt: 2,
    };
    expect(passesDiscoveryGate(metrics, '5', 10)).toBe(true);
    expect(passesDiscoveryGate({ ...metrics, trades: 9 }, '5', 10)).toBe(false);
    expect(passesDiscoveryGate({ ...metrics, drawdownPercent: '5.000000000000000001' }, '5', 10)).toBe(false);
    const candidate = (id: string, excess: string) =>
      ({ id, training: { ...metrics, excessReturnPercent: excess } }) as DiscoveryCandidate;
    expect(
      rankDiscoveryCandidates([candidate('a', '0.000000000000000001'), candidate('b', '0.000000000000000002')]).map(
        (item) => item.id
      )
    ).toEqual(['b', 'a']);
    const tied = [candidate('high', metrics.excessReturnPercent), candidate('low', metrics.excessReturnPercent)];
    tied[0].training.drawdownPercent = '4';
    tied[1].training.drawdownPercent = '2';
    expect(rankDiscoveryCandidates(tied).map((item) => item.id)).toEqual(['low', 'high']);
  });

  it('uses pre-holdout candles only as indicator warmup, never as funded fills', () => {
    const first = now - 24 * HOUR;
    const source: BotHistory = {
      missing: 0,
      denominationVerified: true,
      identity,
      candles: Array.from({ length: 25 }, (_, index) => ({
        timestamp: first + index * HOUR,
        close: index % 2 ? '2' : '3',
        feeClose: '1',
      })),
    };
    const warmup = Array.from({ length: 3 }, (_, index) => ({
      timestamp: first - (3 - index) * HOUR,
      close: index % 2 ? '2' : '3',
      feeClose: '1',
    }));
    const result = runResearch(
      {
        ...RESEARCH_DEFAULT_SETTINGS,
        preset: 'sma',
        capital: '100',
        tradePercent: 50,
        assetInAddress: XOR.address,
        assetOutAddress: VAL.address,
        historyStartAt: first,
        historyEndAt: now,
        validation: 'none',
        optimize: false,
        networkFeeXor: '0.001',
        sellNetworkFeeXor: '0.001',
        swapFeePercent: '0',
        sellSwapFeePercent: '0',
      },
      assets,
      { kind: 'historical', history: source },
      now,
      {
        strategy: {
          kind: 'sma',
          amount: '10',
          intervalMs: HOUR,
          threshold: '0',
          direction: 'below',
          fastWindow: 2,
          slowWindow: 3,
          prompt: '',
          signalTiming: 'closed-hour',
        },
        warmupCandles: warmup,
      }
    );
    expect(result.source.history.candles).toHaveLength(25);
    expect(result.result.equity.every((point) => point.timestamp >= first - 1)).toBe(true);
    expect(result.tradeMarkers.every((trade) => trade.timestamp >= first)).toBe(true);
  });

  it('persists paid call accounting, exposes only training candles, and evaluates each frozen holdout once', async () => {
    const saved = store();
    const seen: number[] = [];
    const feedbackSeen: unknown[] = [];
    const provider = {
      suggest: vi.fn(
        async (context: {
          training: { candles: Array<{ timestamp: number }> };
          requestId: string;
          liveFeedback?: unknown;
        }) => {
          seen.push(context.training.candles.at(-1)!.timestamp);
          feedbackSeen.push(context.liveFeedback);
          expect(context.training.candles).toHaveLength(202);
          return { requestId: context.requestId, strategy: strategy() };
        }
      ),
      disconnect: vi.fn(),
    };
    const evaluate = vi.fn(
      async (
        settings: Parameters<NonNullable<Parameters<typeof createDiscoveryEngine>[0]['evaluate']>>[0],
        _assets: BotAsset[],
        source: { kind: 'historical'; history: BotHistory },
        at: number,
        options: { strategy?: StrategyConfig }
      ) => {
        const bot = createResearchBot(settings, assets, at, options.strategy);
        const holdout = source.history.candles.length === 14 * 24;
        return {
          bot,
          source,
          settings,
          result: {
            portfolio: bot.portfolio,
            equity: [],
            trades: holdout ? 6 : 10,
            drawdownPercent: '1',
            returnPercent: '10',
            coverage: 1,
          },
          assumptions: {
            feeCodec: toCodec(settings.networkFeeXor, XOR.decimals),
            swapFeePercent: settings.swapFeePercent,
            priceImpactPercent: settings.priceImpactPercent ?? '0',
            sellNetworkFeeXor: settings.sellNetworkFeeXor ?? settings.networkFeeXor,
            sellSwapFeePercent: settings.sellSwapFeePercent ?? settings.swapFeePercent,
            sellPriceImpactPercent: settings.sellPriceImpactPercent ?? '0',
          },
        } as unknown as ResearchResult;
      }
    );
    const engine = createDiscoveryEngine({
      assets,
      now: () => now,
      store: saved,
      provider,
      cooldownMs: 0,
      loadHistory: async () => history(),
      loadFees: async (bot) => ({
        networkFeeXor: '0.001',
        networkFeeCodec: toCodec('0.001', XOR.decimals),
        sellNetworkFeeXor: '0.001',
        sellNetworkFeeCodec: toCodec('0.001', XOR.decimals),
        swapFeePercent: '0',
        sellSwapFeePercent: '0',
        priceImpactPercent: '0',
        sellPriceImpactPercent: '0',
        queriedAt: now,
        finalizedAt: now,
        expiresAt: now + 300_000,
        blockNumber: 1,
        blockHash: `0x${'b'.repeat(64)}`,
        genesisHash: identity.genesisHash,
        endpoint: 'wss://ws.mof.sora.org',
        denominator: identity.denominator,
        amountIn: bot.strategy.amount,
        amountOut: '10',
        sellAmountIn: '10',
        sellAmountOut: '10',
        assetInAddress: bot.assetIn.address,
        assetOutAddress: bot.assetOut.address,
        dexId: 0,
        route: [bot.assetIn.address, bot.assetOut.address],
        routeFees: [],
        sellDexId: 0,
        sellRoute: [bot.assetOut.address, bot.assetIn.address],
        sellRouteFees: [],
      }),
      evaluate: evaluate as unknown as NonNullable<Parameters<typeof createDiscoveryEngine>[0]['evaluate']>,
    });
    await engine.start({ callCap: 1 });
    const completed = await engine.run();
    expect(completed.callsUsed).toBe(1);
    expect(saved.current()?.callsUsed).toBe(1);
    expect(seen).toEqual([completed.window.trainingEndAt]);
    expect(completed.candidates).toHaveLength(1);
    expect(completed.finalists).toHaveLength(1);
    expect(completed.finalists[0].research.qualification?.trades).toBe(6);
    expect(completed.finalists[0].template.account).toBe('paper');
    expect(evaluate).toHaveBeenCalledTimes(3);
    await engine.run();
    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(feedbackSeen).toEqual([undefined]);
    const feedback = {
      pairKey: completed.pairs[0].key,
      activeHours: 10,
      successfulSwaps: 12,
      netReturnPercent: '3',
      excessReturnPercent: '2',
      drawdownPercent: '1',
      feesPaidXor: '0.2',
    };
    await expect(engine.start({ callCap: 1, liveFeedback: feedback })).rejects.toThrow('bots.errors.config');
    await engine.start({ callCap: 1, shareLiveFeedback: true, liveFeedback: feedback });
    const exploratory = await engine.run();
    expect(exploratory.feedbackExploratory).toBe(true);
    expect(exploratory.finalists).toHaveLength(0);
    expect(exploratory.candidates[0].status).toBe('exploratory');
    expect(feedbackSeen[1]).toMatchObject({ windowState: 'exploratory', successfulSwaps: 12 });
    expect(evaluate).toHaveBeenCalledTimes(4);
    await engine.dispose();
  });

  it('keeps holdout exposure after checkpoint reset and rejects a one-hour-shift overlap', async () => {
    const saved = store();
    const first = qualifyingEngine(saved, now);
    await first.engine.start({ callCap: 1 });
    const original = await first.engine.run();
    expect(original.finalists).toHaveLength(1);
    expect(saved.reservations()).toHaveLength(1);
    expect(await saved.findHoldoutOverlaps(original.window.holdoutStartAt, original.window.endAt)).toEqual([
      { startAt: original.window.holdoutStartAt, endAt: original.window.endAt },
    ]);
    await saved.clear();
    expect(saved.current()).toBeNull();
    expect(saved.reservations()).toHaveLength(1);
    expect(
      await saved.findHoldoutOverlaps(original.window.holdoutStartAt + HOUR, original.window.endAt + HOUR)
    ).toEqual([{ startAt: original.window.holdoutStartAt, endAt: original.window.endAt }]);
    expect(await saved.findHoldoutOverlaps(original.window.endAt + HOUR, original.window.endAt + 2 * HOUR)).toEqual([]);

    const later = qualifyingEngine(saved, now + HOUR);
    await later.engine.start({ callCap: 1 });
    const reused = await later.engine.run();
    expect(reused.window.holdoutStartAt).toBe(original.window.holdoutStartAt + HOUR);
    expect(reused.holdoutReuse).toBe(true);
    expect(reused.finalists).toHaveLength(0);
    expect(reused.candidates[0]).toMatchObject({ status: 'exploratory', reason: 'holdoutReused' });
    expect(later.evaluate).toHaveBeenCalledTimes(1);
    expect(saved.reservations()).toHaveLength(1);
    await first.engine.dispose();
    await later.engine.dispose();
  });

  it('deduplicates exposed date windows without revealing candidate or session IDs', () => {
    const first = {
      candidateId: 'candidate-1',
      sessionId: 'session-1',
      startAt: now - 14 * 24 * HOUR,
      endAt: now,
      reservedAt: now,
      checkpointRevision: 1,
    };
    const second = { ...first, candidateId: 'candidate-2' };
    const older = { ...first, sessionId: 'session-0', startAt: first.startAt - HOUR, endAt: now - HOUR };
    expect(findDiscoveryHoldoutOverlaps([first, second, older], first.startAt, now)).toEqual([
      { startAt: older.startAt, endAt: older.endAt },
      { startAt: first.startAt, endAt: first.endAt },
    ]);
    expect(() => findDiscoveryHoldoutOverlaps([first], now + HOUR, now)).toThrow('bots.errors.storage');
    expect(() =>
      findDiscoveryHoldoutOverlaps([{ ...first, key: 'another-session:candidate-1' }], first.startAt, now)
    ).toThrow('bots.errors.storage');
  });

  it('retains only display-only provider provenance and accepts older version-one checkpoints', async () => {
    const saved = store();
    const first = qualifyingEngine(saved, now);
    const session = await first.engine.start({ provider: { kind: 'claude', model: 'claude-sonnet-4-5' } });
    expect(saved.current()?.provider).toEqual({ kind: 'claude', model: 'claude-sonnet-4-5' });
    const resumed = qualifyingEngine(saved, now);
    expect((await resumed.engine.resume(saved.current()!)).provider).toEqual(session.provider);
    const switched = await resumed.engine.resume(saved.current()!, { kind: 'openai', model: 'gpt-5' });
    expect(switched.provider).toEqual({ kind: 'openai', model: 'gpt-5' });
    expect(saved.current()?.provider).toEqual(switched.provider);
    const legacy = structuredClone(session);
    delete legacy.provider;
    expect(copyDiscoveryCheckpoint(legacy).provider).toBeUndefined();
    expect(() =>
      copyDiscoveryCheckpoint({
        ...session,
        provider: { kind: 'claude', model: 'claude-sonnet-4-5', apiKey: 'secret' },
      } as DiscoverySession)
    ).toThrow('bots.errors.storage');
    expect(() => copyDiscoveryCheckpoint({ ...session, provider: { kind: 'claude', model: 'bad\nmodel' } })).toThrow(
      'bots.errors.storage'
    );
    expect(
      copyDiscoveryCheckpoint({ ...session, provider: { kind: 'custom', endpointHost: 'relay.test:8443' } }).provider
    ).toEqual({ kind: 'custom', endpointHost: 'relay.test:8443' });
    for (const endpointHost of ['relay.test/path', 'user@relay.test', 'relay.test?key=secret', 'UPPER.test']) {
      expect(() => copyDiscoveryCheckpoint({ ...session, provider: { kind: 'custom', endpointHost } })).toThrow(
        'bots.errors.storage'
      );
    }
    expect(() =>
      copyDiscoveryCheckpoint({ ...session, provider: { kind: 'claude', endpointHost: 'relay.test' } })
    ).toThrow('bots.errors.storage');
    expect(() =>
      copyDiscoveryCheckpoint({ ...session, researchProgress: { pairKey: session.pairs[0].key, stage: 'holdout' } })
    ).toThrow('bots.errors.storage');
    await first.engine.dispose();
    await resumed.engine.dispose();
  });

  it('checkpoints the active market and cooldown without consuming a second call on pause', async () => {
    const saved = store();
    const first = qualifyingEngine(saved, now, undefined, 60_000);
    await first.engine.start({ callCap: 2, provider: { kind: 'codex' } });
    const running = first.engine.run();
    await vi.waitFor(() => expect(saved.current()?.researchProgress?.stage).toBe('cooldown'));
    const waiting = saved.current()!;
    expect(waiting.callsUsed).toBe(1);
    expect(waiting.researchProgress?.pairKey).toBe(waiting.pairs[1].key);
    expect(discoveryNextRequestAt(waiting, now, 60_000)).toBe(now + 60_000);
    expect(discoveryNextRequestAt(waiting, now + 60_000, 60_000)).toBeNull();
    await first.engine.pause();
    await expect(running).resolves.toMatchObject({ status: 'paused', callsUsed: 1 });
    expect(saved.current()?.researchProgress).toBeUndefined();
    const restored = qualifyingEngine(saved, now, undefined, 60_000);
    const checkpoint = await restored.engine.resume(saved.current()!);
    expect(checkpoint.provider).toEqual({ kind: 'codex' });
    expect(checkpoint.researchProgress).toBeUndefined();
    expect(discoveryNextRequestAt(checkpoint, now, 60_000)).toBe(now + 60_000);
    await first.engine.dispose();
    await restored.engine.dispose();
  });

  it('atomically reserves a finalist exposure for only one tab', async () => {
    const saved = store();
    const owner = qualifyingEngine(saved, now);
    const checkpoint = await owner.engine.start({ callCap: 1 });
    const window = createDiscoveryWindow(now);
    const reservation = {
      candidateId: 'candidate-1',
      startAt: window.holdoutStartAt,
      endAt: window.endAt,
      reservedAt: now,
      sessionId: checkpoint.id,
      checkpointRevision: checkpoint.revision,
    };
    const results = await Promise.all([saved.reserveHoldout(reservation), saved.reserveHoldout(reservation)]);
    expect(results.sort()).toEqual(['alreadyReserved', 'reserved']);
    expect(saved.reservations()).toHaveLength(1);
    await owner.engine.dispose();
  });

  it('fences a stale resumed tab before either tab can exceed the paid call cap', async () => {
    const saved = store();
    const left = qualifyingEngine(saved, now);
    const right = qualifyingEngine(saved, now);
    const checkpoint = await left.engine.start({ callCap: 1 });
    await right.engine.resume(checkpoint);
    const third = qualifyingEngine(saved, now);
    await expect(third.engine.resume(checkpoint)).rejects.toThrow('bots.errors.storage');
    const results = await Promise.all([left.engine.run(), right.engine.run()]);
    expect(results.filter((result) => result.finalists.length === 1)).toHaveLength(1);
    expect(results.filter((result) => result.error === 'bots.errors.storage')).toHaveLength(1);
    expect(left.provider.suggest.mock.calls.length + right.provider.suggest.mock.calls.length).toBe(1);
    expect(saved.current()?.callsUsed).toBe(1);
    await left.engine.dispose();
    await right.engine.dispose();
    await third.engine.dispose();
  });

  it('keeps transient history errors retryable during scan and during a research round', async () => {
    const saved = store();
    let failures = 1;
    const loadHistory = vi.fn(async () => {
      if (failures-- > 0) throw new Error('network timeout');
      return history();
    });
    const first = qualifyingEngine(saved, now, loadHistory);
    await first.engine.start({ callCap: 1 });
    const scanError = await first.engine.run();
    expect(scanError.status).toBe('error');
    expect(scanError.pairs[0].status).toBe('pending');
    expect(scanError.pairs[0].reason).toBeUndefined();
    const recovered = await first.engine.run();
    expect(recovered.finalists).toHaveLength(1);
    await first.engine.dispose();

    const secondStore = store();
    const second = qualifyingEngine(secondStore, now + HOUR, async () => {
      throw new Error('network timeout');
    });
    const checkpoint = await second.engine.start({ callCap: 1 });
    checkpoint.phase = 'researching';
    checkpoint.status = 'paused';
    checkpoint.pairs[0].status = 'ready';
    checkpoint.pairs[0].coverage = 1;
    checkpoint.pairs[0].historyIdentity = identity;
    checkpoint.pairs[0].historyFingerprint = await fingerprintDiscoveryHistory(history(now + HOUR));
    checkpoint.pairs[1].status = 'skipped';
    checkpoint.pairs[1].reason = 'routeUnavailable';
    await second.engine.resume(checkpoint);
    const roundError = await second.engine.run();
    expect(roundError.status).toBe('error');
    expect(roundError.pairs[0].status).toBe('ready');
    expect(roundError.pairs[0].reason).toBeUndefined();
    expect(roundError.callsUsed).toBe(0);
    await second.engine.dispose();
  });

  it('stops on a provider failure with its specific key and never stores provider text', async () => {
    const quota = qualifyingEngine(store(), now);
    quota.provider.suggest.mockRejectedValueOnce(new Error('bots.errors.aiQuota'));
    await quota.engine.start({ callCap: 2 });
    const stopped = await quota.engine.run();
    expect(stopped.status).toBe('error');
    expect(stopped.error).toBe('bots.errors.aiQuota');
    expect(stopped.callsUsed).toBe(1);
    expect(stopped.failedCalls).toBe(1);
    await quota.engine.dispose();

    const leaked = qualifyingEngine(store(), now);
    leaked.provider.suggest.mockRejectedValueOnce(new Error('sk-ant-secret upstream text'));
    await leaked.engine.start({ callCap: 2 });
    const generic = await leaked.engine.run();
    expect(generic.error).toBe('bots.errors.provider');
    expect(JSON.stringify(generic)).not.toContain('sk-ant-secret');
    await leaked.engine.dispose();
  });

  it('rejects secret-bearing or live-signer state in checkpoints', async () => {
    const saved = store();
    const engine = createDiscoveryEngine({
      assets,
      now: () => now,
      store: saved,
      cooldownMs: 0,
      provider: { suggest: vi.fn(), disconnect: vi.fn() },
      loadHistory: async () => history(),
      loadFees: vi.fn(),
    });
    const session = await engine.start();
    expect(() => copyDiscoveryCheckpoint({ ...session, apiKey: 'secret' } as DiscoverySession)).toThrow(
      'bots.errors.storage'
    );
    await engine.dispose();
  });

  it('pauses promptly while public history requests are still pending', async () => {
    const saved = store();
    const loadHistory = vi.fn(() => new Promise<BotHistory>(() => undefined));
    const engine = createDiscoveryEngine({
      assets,
      now: () => now,
      store: saved,
      cooldownMs: 0,
      provider: { suggest: vi.fn(), disconnect: vi.fn() },
      loadHistory,
      loadFees: async () => new Promise<never>(() => undefined),
    });
    await engine.start({ callCap: 1 });
    const running = engine.run();
    await vi.waitFor(() => expect(loadHistory).toHaveBeenCalledTimes(2));
    const paused = await engine.pause();
    expect(paused.status).toBe('paused');
    await expect(
      Promise.race([
        running,
        new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('pause did not settle')), 250)),
      ])
    ).resolves.toMatchObject({ status: 'paused' });
    expect(saved.current()?.pairs.every((pair) => pair.status === 'pending')).toBe(true);
    await engine.dispose();
  });
});
