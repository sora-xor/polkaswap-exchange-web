import { describe, expect, it, vi } from 'vitest';
import { createBotAiClient } from '@/features/bot-trading/ai';
import type { BotAiResearchConstraints } from '@/features/bot-trading/ai-research';
import {
  createJevRequest,
  createJevStrategyRequest,
  JEV_ENDPOINT,
  JEV_MODEL,
  JEV_STRATEGY_CRITERIA,
  parseJevProposal,
  parseJevStrategy,
} from '@/features/bot-trading/jev';
import type { TradeProposal } from '@/features/bot-trading/types';
import { botFixture, researchConstraintsFixture } from './fixtures';

const candles = [{ timestamp: 1000, close: '3' }];
/** Build a realistic typed API response without making external generation requests. */
function response(choice: TradeProposal['action'] = 'buy', confidence = 0.9) {
  return {
    answers: {
      action: {
        type: 'choice',
        choice,
        confidence,
        probabilities: { buy: 0.05, sell: 0.05, hold: 0.05, [choice]: 0.9 },
      },
    },
    usage: { input_tokens: 17, output_tokens: 2 },
  };
}

describe('Jev bounded decision integration', () => {
  it('sends the documented typed API protocol and usage, without wallet identity or credentials in state', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify(response())));
    const connection = { apiKey: 'jev-test-secret', model: '', endpoint: '' };
    const client = createBotAiClient('jev', connection, request, () => 1000);
    connection.apiKey = 'mutated-secret';
    const bot = botFixture();
    bot.account = 'private-wallet-id';
    bot.portfolio.holdings.unrelated = '999';
    bot.goal = { title: 'Grow my allocation', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86400000 };
    const result = await client.propose(bot, candles);
    expect(result).toEqual({
      proposal: { action: 'buy', amount: '1', reason: 'bots.events.jevBuy' },
      usage: { requests: 1, inputTokens: 17, outputTokens: 2 },
    });
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(JEV_ENDPOINT);
    expect(options).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: { Authorization: 'Bearer jev-test-secret' },
    });
    const body = JSON.parse(String(options.body));
    expect(body.model).toBe(JEV_MODEL);
    expect(body.questions.action).toMatchObject({
      type: 'choice',
      criteria: { buy: expect.any(String), sell: expect.any(String), hold: expect.any(String) },
    });
    const state = JSON.parse(body.state);
    expect(state.goal).toEqual(bot.goal);
    expect(state.constraints.maxPriceImpactPercent).toBe(bot.policy.maxPriceImpactPercent);
    expect(state.costs).toContain('not executable quotes');
    for (const text of ['private-wallet-id', 'jev-test-secret', 'mutated-secret', 'unrelated'])
      expect(String(options.body)).not.toContain(text);
    expect(body).not.toHaveProperty('tools');
    expect(body.questions.action).not.toHaveProperty('amount');
  });

  it('supports an explicit HTTPS TypeSafe-compatible relay with the same native protocol', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify(response('hold'))));
    const client = createBotAiClient(
      'jev',
      { apiKey: 'relay-token', model: JEV_MODEL, endpoint: 'https://relay.example/jev' },
      request,
      () => 1000
    );
    await expect(client.propose(botFixture(), candles)).resolves.toMatchObject({
      proposal: { action: 'hold', reason: 'bots.events.jevHold' },
    });
    expect(request.mock.calls[0][0]).toBe('https://relay.example/jev');
    expect(() =>
      createBotAiClient('jev', { apiKey: 'key', model: JEV_MODEL, endpoint: 'http://relay.example' })
    ).toThrow('bots.errors.endpoint');
  });

  it('uses only the documented fixed model and does not invent a catalog endpoint', async () => {
    const request = vi.fn();
    expect(() => createBotAiClient('jev', { apiKey: 'key', model: 'made-up-model', endpoint: '' }, request)).toThrow(
      'bots.errors.model'
    );
    const client = createBotAiClient('jev', { apiKey: 'key', model: '', endpoint: '' }, request);
    client.selectModel(JEV_MODEL);
    expect(() => client.selectModel('other-model')).toThrow('bots.errors.model');
    await expect(client.listModels()).rejects.toThrow('bots.labAi.modelsUnavailable');
    expect(request).not.toHaveBeenCalled();
  });

  it('sizes buys deterministically and caps both directions by the correct token holding and ceiling', () => {
    const bot = botFixture();
    bot.strategy.amount = '8';
    bot.portfolio.holdings.in = '375';
    bot.policy.maxTradeCodec.in = '300';
    expect(parseJevProposal(response(), bot, candles).amount).toBe('3');
    bot.portfolio.holdings.out = '250';
    bot.policy.maxTradeCodec.out = '200';
    expect(parseJevProposal(response('sell'), bot, candles)).toEqual({
      action: 'sell',
      amount: '2',
      reason: 'bots.events.jevSell',
    });
    bot.policy.maxTradeCodec.out = '1000';
    expect(parseJevProposal(response('sell'), bot, candles).amount).toBe('2.5');
    bot.portfolio.holdings.out = '1000';
    expect(parseJevProposal(response('sell'), bot, candles).amount).toBe('2.66');
  });

  it('caps a huge converted sell before encoding or truncating it', () => {
    const bot = botFixture();
    bot.strategy.amount = '9'.repeat(95);
    bot.portfolio.holdings.out = '123';
    expect(
      parseJevProposal(response('sell'), bot, [{ timestamp: 1000, close: '0.' + '0'.repeat(35) + '1' }]).amount
    ).toBe('1.23');
  });

  it('retains 36-decimal sell base units without global division precision loss', () => {
    const bot = botFixture();
    bot.assetIn.decimals = 36;
    bot.assetOut.decimals = 36;
    bot.strategy.amount = '0.' + '0'.repeat(35) + '3';
    bot.portfolio.holdings.out = '100';
    bot.policy.maxTradeCodec.out = '100';
    expect(parseJevProposal(response('sell'), bot, [{ timestamp: 1000, close: '2' }]).amount).toBe(
      '0.' + '0'.repeat(35) + '1'
    );
  });

  it('holds when uncertain, rounded to zero, or lacking allocation', () => {
    const bot = botFixture();
    expect(parseJevProposal(response('buy', 0.799), bot, candles)).toMatchObject({
      action: 'hold',
      reason: 'bots.events.jevUncertain',
    });
    const uncertain = response();
    uncertain.answers.action.probabilities = { buy: 0.7, sell: 0.2, hold: 0.1 };
    expect(parseJevProposal(uncertain, bot, candles).reason).toBe('bots.events.jevUncertain');
    expect(parseJevProposal(response('sell'), bot, candles).reason).toBe('bots.events.noAllocation');
    bot.portfolio.holdings.out = '100';
    expect(parseJevProposal(response('sell'), bot, [{ timestamp: 1000, close: '1000' }]).reason).toBe(
      'bots.events.noAllocation'
    );
  });

  it.each([
    null,
    { answers: {} },
    { answers: { action: { ...response().answers.action, choice: 'transfer' } } },
    { answers: { action: { ...response().answers.action, amount: '999999' } } },
    { answers: { action: { ...response().answers.action, confidence: NaN } } },
    { answers: { action: { ...response().answers.action, confidence: 1.01 } } },
    { answers: { action: { ...response().answers.action, confidence: -0.1 } } },
    { answers: { action: { ...response().answers.action, confidence: '0.9' } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: 1, sell: 0 } } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: 1, sell: 0, hold: 0, transfer: 0 } } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: 1, sell: 1, hold: 1 } } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: 1.1, sell: -0.1, hold: 0 } } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: 0.1, sell: 0.9, hold: 0 } } } },
    { answers: { action: { ...response().answers.action, probabilities: { buy: Infinity, sell: 0, hold: 0 } } } },
  ])('rejects malformed or inconsistent choice distributions %#', (value) => {
    expect(() => parseJevProposal(value, botFixture(), candles)).toThrow('bots.errors.proposal');
  });

  it('bounds sanitized state and rejects invalid chronological observations before any request', () => {
    const bot = botFixture();
    bot.strategy.prompt = 'x'.repeat(4000);
    const state = JSON.parse(
      createJevRequest(
        bot,
        Array.from({ length: 200 }, (_, i) => ({ timestamp: i, close: '3' }))
      ).state
    );
    expect(state.candles).toHaveLength(120);
    expect(state.instruction).toHaveLength(2000);
    for (const bad of [
      [{ timestamp: 1, close: '0' }],
      [{ timestamp: 1.5, close: '3' }],
      [
        { timestamp: 2, close: '3' },
        { timestamp: 1, close: '3' },
      ],
    ])
      expect(() => createJevRequest(bot, bad)).toThrow();
  });

  it('redacts malformed/error responses, sanitizes usage and prevents stale or overlapping requests', async () => {
    const bad = createBotAiClient(
      'jev',
      { apiKey: 'key', model: '', endpoint: '' },
      async () => new Response('secret failure', { status: 401 }),
      () => 1000
    );
    await expect(bad.propose(botFixture(), candles)).rejects.toThrow('bots.errors.provider');
    const malformed = createBotAiClient(
      'jev',
      { apiKey: 'key', model: '', endpoint: '' },
      async () => new Response(JSON.stringify({ answers: { action: { amount: '10000' } } })),
      () => 1000
    );
    await expect(malformed.propose(botFixture(), candles)).rejects.toThrow('bots.errors.provider');
    const request = vi.fn(
      async () => new Response(JSON.stringify({ ...response(), usage: { input_tokens: -1, output_tokens: 2.5 } }))
    );
    const client = createBotAiClient('jev', { apiKey: 'key', model: '', endpoint: '' }, request, () => 1000);
    await expect(client.propose(botFixture(), [{ timestamp: 1001, close: '3' }])).rejects.toThrow('bots.errors.stale');
    const pending = client.propose(botFixture(), candles);
    await expect(client.propose(botFixture(), candles)).rejects.toThrow('bots.errors.provider');
    expect((await pending).usage).toEqual({ requests: 1, inputTokens: 0, outputTokens: 0 });
  });

  it('aborts timed-out requests and revokes the key on disconnect', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined | null;
      const request = vi.fn(async (_url, options) => {
        signal = options?.signal;
        return new Promise<Response>((_resolve, reject) =>
          signal?.addEventListener('abort', () => reject(new Error('secret provider text')))
        );
      });
      const client = createBotAiClient('jev', { apiKey: 'key', model: '', endpoint: '' }, request, () => 1000);
      const pending = client.propose(botFixture(), candles);
      const failure = expect(pending).rejects.toThrow('bots.errors.provider');
      await vi.advanceTimersByTimeAsync(30000);
      await failure;
      expect(signal?.aborted).toBe(true);
      client.disconnect();
      await expect(client.propose(botFixture(), candles)).rejects.toThrow('bots.errors.provider');
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Native choice response selects an application-owned recipe, never an arbitrary strategy object. */
function strategyResponse(choice = 'sma_5_20', confidence = 0.9) {
  return {
    answers: {
      strategy: {
        type: 'choice',
        choice,
        confidence,
        probabilities: { dca_daily: 0.05, sma_5_20: 0.05, sma_12_48: 0.05, [choice]: 0.9 },
      },
    },
    usage: { input_tokens: 29, output_tokens: 3 },
  };
}
const training = Array.from({ length: 240 }, (_, i) => ({ timestamp: i * 3_600_000, close: '3' }));

/** The simple flow supplies a total budget separately from its exact fee-sample order size. */
function researchConstraints(): BotAiResearchConstraints {
  return {
    ...researchConstraintsFixture(),
    minimumIntervalMs: 3_600_000,
    maximumIntervalMs: 12 * 3_600_000,
    minimumTrades: 5,
    trainingCandles: 117,
    validationCandles: 50,
    sizing: { capitalCodec: '1000', spendableInputCodec: '1000', feeSampleAmountCodec: '201' },
  };
}

/** A constrained request offers exactly the two hourly SMA recipes. */
function hourlyStrategyResponse(choice: 'sma_5_20' | 'sma_12_48' = 'sma_5_20') {
  return {
    ...strategyResponse(choice),
    answers: {
      strategy: {
        ...strategyResponse(choice).answers.strategy,
        probabilities: { sma_5_20: 0.1, sma_12_48: 0.1, [choice]: 0.9 },
      },
    },
  };
}

describe('Jev bounded deterministic recipe selection', () => {
  it('serializes exactly the v3 funded window and rejects shifted warmup before creating a request', () => {
    const hour = 3_600_000;
    const funding = Date.UTC(2026, 8, 14);
    const funded = Array.from({ length: 117 }, (_, index) => ({ timestamp: funding + index * hour, close: '3' }));
    const research: BotAiResearchConstraints = {
      ...researchConstraints(),
      minimumTrades: 1,
      goalEpisodes: {
        protocol: 'goal-episodes-v3',
        durationMs: 24 * hour,
        trainingEpisodes: 4,
        validationEpisodes: 2,
        trainingTailCandles: 20,
        validationTailCandles: 1,
        aggregation: 'mean-net-return',
        minimumTradesPerPartition: 1,
        signalWarmup: {
          candles: 201,
          firstCompletedAt: funding - 201 * hour,
          lastCompletedAt: funding - hour,
          use: 'signals-only',
          prices: 'not-supplied',
        },
      },
    };
    const bot = botFixture();
    const shifted = structuredClone(research);
    if (shifted.goalEpisodes?.protocol !== 'goal-episodes-v3') throw new Error('fixture');
    shifted.goalEpisodes.signalWarmup.firstCompletedAt += hour;
    shifted.goalEpisodes.signalWarmup.lastCompletedAt += hour;
    expect(() => createJevStrategyRequest(bot, funded, shifted)).toThrow('bots.errors.provider');
    for (const observations of [
      funded.slice(1),
      [...funded, { timestamp: funding + 117 * hour, close: '999999.123' }],
      funded.map((candle) => ({ ...candle, timestamp: candle.timestamp + hour })),
    ])
      expect(() => createJevStrategyRequest(bot, observations, research)).toThrow('bots.errors.provider');
    const leakedPrefix = structuredClone(research);
    Object.assign(leakedPrefix.goalEpisodes!, { warmupCandles: [{ timestamp: funding - hour, close: '777777.321' }] });
    expect(() => createJevStrategyRequest(bot, funded, leakedPrefix)).toThrow('bots.errors.provider');

    const request = createJevStrategyRequest(bot, funded, research);
    const state = JSON.parse(request.state);
    expect(state.candles).toEqual(funded);
    expect(state.candles).toHaveLength(117);
    expect(state.research).toEqual(research);
    expect(request.state).not.toMatch(/777777\.321|999999\.123|warmupCandles|heldOutCandles/);
    expect(request.state.length).toBeLessThanOrEqual(24_000);
    expect(new TextEncoder().encode(JSON.stringify(request)).byteLength).toBeLessThanOrEqual(32_768);
  });

  it('delivers distinct budget and fee-sample constraints while preserving the exact partial amount through the client', async () => {
    const bot = botFixture();
    bot.strategy.amount = '2.01';
    bot.policy.maxPriceImpactPercent = '1.000000000000000001';
    const research = researchConstraints();
    const expectedResearch = structuredClone(research);
    const request = vi.fn(async () => new Response(JSON.stringify(hourlyStrategyResponse())));
    const client = createBotAiClient('jev', { apiKey: 'key', model: '', endpoint: '' }, request, () => 1_000_000_000);
    const pending = client.suggest(bot, training.slice(0, 117), undefined, research);
    research.maximumIntervalMs = 24 * 3_600_000;
    research.sizing!.capitalCodec = '999999';
    expect((await pending).strategy).toMatchObject({ kind: 'sma', amount: '2.01', intervalMs: 3_600_000 });
    const options = (request.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(String(options.body));
    const state = JSON.parse(body.state);
    expect(state.research).toEqual(expectedResearch);
    expect(state.constraints).toEqual({
      maxTradeCodec: bot.policy.maxTradeCodec,
      slippagePercent: bot.policy.slippagePercent,
      maxPriceImpactPercent: '1.000000000000000001',
    });
    expect(state.recipes).not.toHaveProperty('dca_daily');
    expect(Object.keys(body.questions.strategy.criteria)).toEqual(['sma_5_20', 'sma_12_48']);
    expect(Object.values(state.recipes)).toEqual([
      expect.objectContaining({ amount: '2.01', intervalMs: 3_600_000 }),
      expect.objectContaining({ amount: '2.01', intervalMs: 3_600_000 }),
    ]);
  });

  it.each([createJevRequest, createJevStrategyRequest])(
    'rejects an accessor impact limit in a direct request',
    (create) => {
      const bot = botFixture();
      const getter = vi.fn(() => '1');
      Object.defineProperty(bot.policy, 'maxPriceImpactPercent', { get: getter });
      expect(() => create(bot, candles)).toThrow();
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('cannot parse a daily recipe or an obsolete choice set when the supplied maximum is twelve hours', () => {
    const bot = botFixture();
    const research = researchConstraints();
    for (const answer of [strategyResponse('dca_daily'), strategyResponse('sma_5_20')])
      expect(() => parseJevStrategy(answer, bot, training, research)).toThrow('bots.errors.proposal');
    expect(parseJevStrategy(hourlyStrategyResponse('sma_12_48'), bot, training, research)).toMatchObject({
      kind: 'sma',
      amount: '1',
      intervalMs: 3_600_000,
      fastWindow: 12,
      slowWindow: 48,
    });
  });

  it('enforces the minimum cadence too and rejects a request with no locally supported recipe', () => {
    const research = { ...researchConstraints(), minimumIntervalMs: 24 * 3_600_000, maximumIntervalMs: 24 * 3_600_000 };
    const request = createJevStrategyRequest(botFixture(), training, research);
    expect(Object.keys(request.questions.strategy.criteria)).toEqual(['dca_daily']);
    expect(Object.keys(JSON.parse(request.state).recipes)).toEqual(['dca_daily']);
    const answer = strategyResponse('dca_daily');
    const onlyDaily = {
      answers: { strategy: { ...answer.answers.strategy, probabilities: { dca_daily: 1 } } },
    };
    expect(parseJevStrategy(onlyDaily, botFixture(), training, research).intervalMs).toBe(24 * 3_600_000);
    const unsupported = { ...researchConstraints(), minimumIntervalMs: 2 * 3_600_000 };
    expect(() => createJevStrategyRequest(botFixture(), training, unsupported)).toThrow('bots.errors.provider');
    expect(() => parseJevStrategy(hourlyStrategyResponse(), botFixture(), training, unsupported)).toThrow(
      'bots.errors.provider'
    );
  });

  it('rejects unvalidated research extensions instead of serializing them into the provider state', () => {
    const research = { ...researchConstraints(), wallet: 'PRIVATE_ACCOUNT' };
    expect(() => createJevStrategyRequest(botFixture(), training, research)).toThrow('bots.errors.provider');
    expect(() => parseJevStrategy(hourlyStrategyResponse(), botFixture(), training, research)).toThrow(
      'bots.errors.provider'
    );
  });

  it('uses native choices and only supplied training observations, without later portfolio state or secrets', async () => {
    const bot = botFixture();
    bot.account = 'PRIVATE_ACCOUNT';
    bot.portfolio.holdings.unrelated = 'SECRET_HOLDINGS';
    bot.strategy.prompt = 'Prefer a measured trend strategy';
    bot.goalState = { startedAt: 5, baselineValue: '10', lastValue: '15', returnPercent: '50', outcome: 'active' };
    const request = vi.fn(async () => new Response(JSON.stringify(strategyResponse())));
    const client = createBotAiClient(
      'jev',
      { apiKey: 'SECRET_KEY', model: '', endpoint: 'https://relay.example/jev' },
      request,
      () => 1_000_000_000
    );
    const result = await client.suggest(bot, training);
    expect(result).toEqual({
      strategy: {
        kind: 'sma',
        amount: '1',
        intervalMs: 3_600_000,
        threshold: '0',
        direction: 'below',
        fastWindow: 5,
        slowWindow: 20,
        prompt: '',
        signalTiming: 'closed-hour',
      },
      usage: { requests: 1, inputTokens: 29, outputTokens: 3 },
    });
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://relay.example/jev');
    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      model: JEV_MODEL,
      questions: { strategy: { type: 'choice', criteria: JEV_STRATEGY_CRITERIA } },
    });
    expect(Object.keys(body.questions)).toEqual(['strategy']);
    const state = JSON.parse(body.state);
    expect(state.candles).toEqual(training.slice(-202));
    expect(state.instruction).toBe(bot.strategy.prompt);
    expect(state).not.toHaveProperty('holdingsCodec');
    expect(state).not.toHaveProperty('goalProgress');
    expect(String(options.body)).not.toMatch(/PRIVATE_ACCOUNT|SECRET_HOLDINGS|SECRET_KEY/);
    await expect(client.propose(bot, training)).rejects.toThrow('bots.errors.stale');
  });

  it.each([
    ['dca_daily', 'dca', 86_400_000, 5, 20],
    ['sma_5_20', 'sma', 3_600_000, 5, 20],
    ['sma_12_48', 'sma', 3_600_000, 12, 48],
  ] as const)(
    'constructs %s locally and preserves precise user sizing',
    (choice, kind, intervalMs, fastWindow, slowWindow) => {
      const bot = botFixture();
      bot.assetIn.decimals = 36;
      bot.strategy.amount = '0.' + '0'.repeat(35) + '3';
      bot.policy.maxTradeCodec.in = '3';
      const result = parseJevStrategy(strategyResponse(choice), bot, training);
      expect(result).toMatchObject({
        kind,
        intervalMs,
        fastWindow,
        slowWindow,
        amount: bot.strategy.amount,
        prompt: '',
      });
      expect(result.signalTiming).toBe(kind === 'sma' ? 'closed-hour' : undefined);
      expect(result).not.toHaveProperty('rules');
    }
  );

  it('rejects insufficient SMA evidence and never increases a user ceiling or rounds tiny amounts to zero', () => {
    expect(() => parseJevStrategy(strategyResponse('sma_5_20'), botFixture(), training.slice(0, 20))).toThrow();
    expect(() => parseJevStrategy(strategyResponse('sma_12_48'), botFixture(), training.slice(0, 48))).toThrow();
    expect(parseJevStrategy(strategyResponse('dca_daily'), botFixture(), candles).kind).toBe('dca');
    for (const amount of ['0', '11', '0.001']) {
      const bot = botFixture();
      bot.strategy.amount = amount;
      expect(() => createJevStrategyRequest(bot, training)).toThrow();
      expect(() => parseJevStrategy(strategyResponse(), bot, training)).toThrow();
    }
  });

  it.each([
    { ...strategyResponse().answers.strategy, choice: 'arbitrary_code' },
    { ...strategyResponse().answers.strategy, choice: ['sma_5_20'] },
    { ...strategyResponse().answers.strategy, confidence: 0.799 },
    { ...strategyResponse().answers.strategy, confidence: NaN },
    { ...strategyResponse().answers.strategy, amount: '999999' },
    { ...strategyResponse().answers.strategy, probabilities: { dca_daily: 0.1, sma_5_20: 0.7, sma_12_48: 0.2 } },
    { ...strategyResponse().answers.strategy, probabilities: { dca_daily: 0.05, sma_5_20: 0.9 } },
    { ...strategyResponse().answers.strategy, probabilities: { dca_daily: 1, sma_5_20: 1, sma_12_48: 1 } },
  ])('rejects low confidence and malformed recipe answers %#', (strategy) => {
    expect(() => parseJevStrategy({ answers: { strategy } }, botFixture(), training)).toThrow('bots.errors.proposal');
  });

  it('validates chronology, bounds input, and rejects unsafe strategy responses through the client', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify(strategyResponse('sma_5_20', 0.5))));
    const client = createBotAiClient('jev', { apiKey: 'key', model: '', endpoint: '' }, request, () => 1_000_000_000);
    for (const bad of [
      [{ timestamp: 1_000_000_001, close: '3' }],
      [...candles, ...candles],
      [{ timestamp: -1, close: '3' }],
      [{ timestamp: 1, close: '0' }],
    ])
      await expect(client.suggest(botFixture(), bad)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(client.suggest(botFixture(), training)).rejects.toThrow('bots.errors.provider');
    expect(request).toHaveBeenCalledTimes(1);
    const bot = botFixture();
    bot.strategy.prompt = 'x'.repeat(4000);
    const state = JSON.parse(createJevStrategyRequest(bot, training).state);
    expect(state.instruction).toHaveLength(2000);
    expect(state.candles).toHaveLength(202);
    bot.strategy.prompt = '漢'.repeat(2000);
    expect(() =>
      createJevStrategyRequest(
        bot,
        training.map((candle) => ({ ...candle, close: '9'.repeat(100) }))
      )
    ).toThrow('bots.errors.provider');
  });
});
