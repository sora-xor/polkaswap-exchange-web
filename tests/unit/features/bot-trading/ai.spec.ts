import { describe, expect, it, vi } from 'vitest';
import {
  createBotAiClient,
  parseTradeProposal,
  parseDeterministicStrategy,
  parseDistinctStrategies,
  validateBotEndpoint,
  DETERMINISTIC_STRATEGY_SCHEMA,
  type BotAiResearchConstraints,
} from '@/features/bot-trading/ai';
import { openAiStrictSchema } from '@/features/bot-trading/ai-provider-http';
import { botFixture, researchConstraintsFixture } from './fixtures';
import { ruleRecipe, RULE_RECIPE_IDS } from '@/features/bot-trading/rule-recipes';

function researchWithCostSamples(): BotAiResearchConstraints {
  const research = researchConstraintsFixture();
  const { finalizedAt, blockHash, buy, sell } = research.costs!;
  research.costSamples = [
    {
      amountInCodec: '100',
      status: 'available',
      finalizedAt,
      blockHash,
      buy: { ...buy },
      sell: { ...sell },
      openingFeeScenario: {
        protocol: 'opening-fee-scenario-v1',
        valuationAsset: 'output',
        lossMetric: 'drawdown',
        maxLossPercent: '5',
        opening: { timestamp: 500, feeOnlyLossPercent: '6', feeOnlyReachesLossLimit: true },
        firstPossibleTrade: { timestamp: 600, feeOnlyLossPercent: '4.5', feeOnlyReachesLossLimit: false },
        laterOpportunity: 'not-assessed',
      },
    },
    {
      amountInCodec: '2475',
      status: 'available',
      finalizedAt: 1001,
      blockHash: `0x${'b'.repeat(64)}`,
      buy: { ...buy, priceImpactPercent: '2.5' },
      sell: { ...sell },
    },
    { amountInCodec: '4950', status: 'unavailable', reason: 'quoteUnavailable' },
  ];
  return research;
}

describe('bot AI boundary', () => {
  it('accepts three independent bounded strategies and rejects cosmetic or unsafe batch variants', () => {
    const bot = botFixture();
    const base = {
      ...bot.strategy,
      amount: '2',
      intervalMs: 3_600_000,
      threshold: '0',
      rules: null,
      signalTiming: null,
    };
    const batch = [
      { ...base, kind: 'dca' },
      { ...base, kind: 'threshold', threshold: '2' },
      { ...base, kind: 'sma', fastWindow: 2, slowWindow: 3, signalTiming: 'closed-hour' },
    ];
    expect(parseDistinctStrategies(batch, bot).map((strategy) => strategy.kind)).toEqual(['dca', 'threshold', 'sma']);
    const cosmetic = { ...base, threshold: '99', fastWindow: 5, slowWindow: 20, direction: 'above' };
    for (const invalid of [
      [batch[0], cosmetic],
      [batch[0], { ...base, amount: '2.00' }],
      [batch[0], { ...base, amount: '3' }],
      [...batch, base],
      [{ ...base, amount: '10' }],
      [{ ...base, intervalMs: 3_600_001 }],
      [{ ...base, prompt: 'trade now' }],
      [{ ...batch[2], signalTiming: 'live-price' }],
    ])
      expect(() => parseDistinctStrategies(invalid, bot)).toThrow('bots.errors.proposal');
    const getter = vi.fn(() => batch[0]);
    const accessor = [batch[0]];
    Object.defineProperty(accessor, '0', { get: getter });
    expect(() => parseDistinctStrategies(accessor, bot)).toThrow('bots.errors.proposal');
    expect(getter).not.toHaveBeenCalled();
    const twoConditions = {
      version: 1,
      entry: {
        operator: 'all',
        conditions: [
          { kind: 'trend', window: 2, direction: 'above' },
          { kind: 'breakout', window: 3, direction: 'above' },
        ],
      },
      exit: null,
    };
    const rules = { ...base, kind: 'rules', rules: twoConditions };
    const reordered = {
      ...rules,
      rules: {
        ...twoConditions,
        entry: { ...twoConditions.entry, conditions: [...twoConditions.entry.conditions].reverse() },
      },
    };
    expect(() => parseDistinctStrategies([rules, reordered], bot)).toThrow('bots.errors.proposal');
    const numericSpelling = {
      ...rules,
      rules: {
        ...twoConditions,
        entry: {
          operator: 'all',
          conditions: [{ kind: 'momentum', window: 3, direction: 'above', threshold: '5' }],
        },
      },
    };
    const spelledDifferently = {
      ...numericSpelling,
      rules: {
        ...numericSpelling.rules,
        entry: {
          ...numericSpelling.rules.entry,
          conditions: [{ kind: 'momentum', window: 3, direction: 'above', threshold: '5.0' }],
        },
      },
    };
    expect(() => parseDistinctStrategies([numericSpelling, spelledDifferently], bot)).toThrow('bots.errors.proposal');
    const oneCondition = {
      ...rules,
      rules: { ...twoConditions, entry: { operator: 'all', conditions: [twoConditions.entry.conditions[0]] } },
    };
    const alternateOperator = {
      ...oneCondition,
      rules: { ...oneCondition.rules, entry: { ...oneCondition.rules.entry, operator: 'any' } },
    };
    const repeatedLeaf = {
      ...oneCondition,
      rules: {
        ...oneCondition.rules,
        entry: { ...oneCondition.rules.entry, conditions: Array(2).fill(twoConditions.entry.conditions[0]) },
      },
    };
    expect(() => parseDistinctStrategies([oneCondition, alternateOperator], bot)).toThrow('bots.errors.proposal');
    expect(() => parseDistinctStrategies([oneCondition, repeatedLeaf], bot)).toThrow('bots.errors.proposal');
  });

  it.each(RULE_RECIPE_IDS)('parses exact %s rules while keeping its source tree detached', (id) => {
    const bot = botFixture();
    const input = { ...bot.strategy, kind: 'rules', threshold: '0', intervalMs: 3_600_000, rules: ruleRecipe(id) };
    const parsed = parseDeterministicStrategy(input, bot);
    expect(parsed).toEqual(input);
    parsed.rules!.entry.conditions[0].window = 199;
    expect(input.rules).toEqual(ruleRecipe(id));
  });

  it('rejects unbounded rule trees, subhour cadence, executable fields and amount overflow', () => {
    const bot = botFixture();
    const input = { ...bot.strategy, kind: 'rules', threshold: '0', intervalMs: 3_600_000, rules: ruleRecipe('trend') };
    for (const overrides of [
      { intervalMs: 3_599_999 },
      { amount: '10.01' },
      { rules: null },
      {
        rules: {
          ...input.rules,
          entry: { operator: 'all', conditions: Array(5).fill(input.rules.entry.conditions[0]) },
        },
      },
      {
        rules: {
          ...input.rules,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'restoring', window: 201, direction: 'above', threshold: '1' }],
          },
        },
      },
      { rules: { ...input.rules, execute: 'transfer' } },
      { execute: 'code' },
    ])
      expect(() => parseDeterministicStrategy({ ...input, ...overrides }, bot)).toThrow();
    const getter = vi.fn(() => 'rules');
    expect(() =>
      parseDeterministicStrategy(
        {
          ...input,
          get kind() {
            return getter();
          },
        },
        bot
      )
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });

  it('keeps basic strategy output backward compatible and preserves only explicit SMA timing', () => {
    const bot = botFixture();
    expect(parseDeterministicStrategy({ ...bot.strategy, rules: null, signalTiming: null }, bot)).toEqual(bot.strategy);
    expect(() => parseDeterministicStrategy({ ...bot.strategy, rules: ruleRecipe('trend') }, bot)).toThrow();
    expect(() => parseDeterministicStrategy({ ...bot.strategy, signalTiming: 'live-price' }, bot)).toThrow();
    const sma = { ...bot.strategy, kind: 'sma', signalTiming: 'live-price' };
    expect(parseDeterministicStrategy(sma, bot)).toEqual(sma);
    expect(() => parseDeterministicStrategy({ ...sma, signalTiming: 'unknown' }, bot)).toThrow();
  });

  it('accepts only structured proposals and rejects policy edits and precision loss', () => {
    const bot = botFixture();
    expect(parseTradeProposal({ action: 'buy', amount: '1.25', reason: 'signal' }, bot).amount).toBe('1.25');
    for (const value of [
      { action: 'transfer', amount: '1', reason: '' },
      { action: 'buy', amount: '1', reason: '', policy: {} },
      { action: 'buy', amount: 1, reason: '' },
      { action: 'sell', amount: '0.001', reason: '' },
      { action: 'buy', amount: '0', reason: '' },
    ]) {
      expect(() => parseTradeProposal(value, bot)).toThrow();
    }
  });
  it.each(['http://bot.test', 'https://key@bot.test', 'https://bot.test?key=secret', 'javascript:alert(1)'])(
    'rejects unsafe endpoint %s',
    (endpoint) => {
      expect(() => validateBotEndpoint(endpoint)).toThrow('bots.errors.endpoint');
    }
  );
  it('uses OpenAI structured outputs, omits wallet identity and keeps keys in headers only', async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  { type: 'output_text', text: JSON.stringify({ action: 'hold', amount: '0', reason: 'wait' }) },
                ],
              },
            ],
            usage: { input_tokens: 12, output_tokens: 3 },
          })
        )
    );
    const client = createBotAiClient(
      'openai',
      { apiKey: 'secret-test-key', model: 'test-model', endpoint: '' },
      request,
      () => 1000
    );
    const bot = botFixture();
    bot.account = 'private-wallet-address';
    const result = await client.propose(bot, [{ timestamp: 1000, close: '2' }]);
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 3, requests: 1 });
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(options.redirect).toBe('error');
    expect(options.body).not.toContain('private-wallet-address');
    expect(options.body).not.toContain('secret-test-key');
    expect(JSON.parse(String(options.body)).store).toBe(false);
    expect(JSON.parse(JSON.parse(String(options.body)).input).constraints.maxPriceImpactPercent).toBe(
      bot.policy.maxPriceImpactPercent
    );
    await expect(client.propose(bot, [{ timestamp: 1000, close: '2' }])).resolves.toMatchObject({
      proposal: { action: 'hold' },
    });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('extracts exactly one Claude tool proposal', async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [
              { type: 'tool_use', name: 'bot_decision', input: { action: 'buy', amount: '1', reason: 'signal' } },
            ],
            usage: { input_tokens: 2, output_tokens: 4 },
          })
        )
    );
    const client = createBotAiClient(
      'claude',
      { apiKey: 'test-key', model: 'test-model', endpoint: '' },
      request,
      () => 1000
    );
    expect((await client.propose(botFixture(), [{ timestamp: 1000, close: '2' }])).proposal.action).toBe('buy');
  });
  it('bounds provider output and does not leak provider error text', async () => {
    const request = vi.fn(async () => new Response('sensitive-secret-error', { status: 401 }));
    const client = createBotAiClient('openai', { apiKey: 'key', model: 'model', endpoint: '' }, request, () => 1000);
    await expect(client.propose(botFixture(), [{ timestamp: 1000, close: '2' }])).rejects.toThrow(
      /^bots\.errors\.aiKey$/
    );
    const large = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      async () => new Response('x'.repeat(33000)),
      () => 1000
    );
    await expect(large.propose(botFixture(), [{ timestamp: 1000, close: '2' }])).rejects.toThrow(
      'bots.errors.provider'
    );
  });
  it('asks Claude for one tool call without forced tool choice and names missing keys', async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [
              { type: 'text', text: 'Checking the limits.' },
              { type: 'tool_use', name: 'bot_decision', input: { action: 'hold', amount: '0', reason: 'flat' } },
            ],
          })
        )
    );
    const client = createBotAiClient(
      'claude',
      { apiKey: 'sk-ant-test', model: 'claude-opus-5-5', endpoint: '' },
      request,
      () => 1000
    );
    expect((await client.propose(botFixture(), [{ timestamp: 1000, close: '2' }])).proposal.action).toBe('hold');
    const body = JSON.parse(String((request.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(body.max_tokens).toBe(16_000);
    expect(body.system).toContain('Respond only by calling the bot_decision tool exactly once.');
    expect(() => createBotAiClient('claude', { apiKey: ' ', model: '', endpoint: '' })).toThrow(
      /^bots\.errors\.aiKeyMissing$/
    );
    expect(() => createBotAiClient('openai', { apiKey: '', model: '', endpoint: '' })).toThrow(
      /^bots\.errors\.aiKeyMissing$/
    );
  });
  it('allows a slow reasoning model two minutes before reporting a timeout', async () => {
    vi.useFakeTimers({ now: 1000 });
    try {
      let signal: AbortSignal | undefined;
      const client = createBotAiClient(
        'openai',
        { apiKey: 'sk-test', model: 'gpt-6', endpoint: '' },
        (_url, options) => {
          signal = options?.signal ?? undefined;
          return new Promise<Response>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          });
        },
        () => 1000
      );
      const proposal = client.propose(botFixture(), [{ timestamp: 1000, close: '2' }]);
      const rejection = expect(proposal).rejects.toThrow(/^bots\.errors\.aiTimeout$/);
      await vi.advanceTimersByTimeAsync(119_999);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
  it('disconnect revokes credentials and prevents future requests', async () => {
    const request = vi.fn();
    const client = createBotAiClient('custom', { apiKey: '', model: '', endpoint: 'https://bot.test' }, request);
    client.disconnect();
    await expect(client.propose(botFixture(), [{ timestamp: Date.now(), close: '2' }])).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('snapshots the explicit connection and rejects oversized custom credentials', async () => {
    const connection = { apiKey: 'original-key', model: 'original-model', endpoint: '' };
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  { type: 'output_text', text: JSON.stringify({ action: 'hold', amount: '0', reason: 'wait' }) },
                ],
              },
            ],
          })
        )
    );
    const client = createBotAiClient('openai', connection, request, () => 1000);
    connection.apiKey = 'replacement-key';
    connection.model = 'replacement-model';
    await client.propose(botFixture(), [{ timestamp: 1000, close: '2' }]);
    const options = (request.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body)).model).toBe('original-model');
    expect(options.headers).toMatchObject({ Authorization: 'Bearer original-key' });
    expect(() =>
      createBotAiClient('custom', { apiKey: 'k'.repeat(1025), model: '', endpoint: 'https://bot.test' })
    ).toThrow();
  });
  it.each(['custom', 'openai', 'claude'] as const)(
    'sends distinct budget and fee sample with bounded research cadence through %s',
    async (provider) => {
      const bot = botFixture();
      bot.policy.maxPriceImpactPercent = '1.000000000000000001';
      const strategy = { ...bot.strategy, amount: '2', intervalMs: 3_600_000 };
      const research = {
        ...researchWithCostSamples(),
        minimumIntervalMs: 3_600_000,
        maximumIntervalMs: 12 * 3_600_000,
        minimumTrades: 5,
        trainingCandles: 117,
        validationCandles: 50,
        sizing: { capitalCodec: '10000', spendableInputCodec: '9900', feeSampleAmountCodec: '100' },
      };
      const response =
        provider === 'openai'
          ? { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(strategy) }] }] }
          : provider === 'claude'
            ? { content: [{ type: 'tool_use', name: 'bot_decision', input: strategy }] }
            : { strategy };
      const request = vi.fn(
        async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(JSON.stringify(response))
      );
      const client = createBotAiClient(
        provider,
        { apiKey: 'test-key', model: 'test', endpoint: 'https://bot.test' },
        request,
        () => 1000
      );
      const expectedResearch = structuredClone(research);
      const pending = client.suggest(bot, [{ timestamp: 1000, close: '2' }], undefined, research);
      const sample = research.costSamples![0];
      if (sample.status === 'available') {
        sample.openingFeeScenario!.opening.feeOnlyLossPercent = '99';
        sample.openingFeeScenario!.firstPossibleTrade.feeOnlyReachesLossLimit = true;
      }
      await expect(pending).resolves.toMatchObject({ strategy });
      const body = JSON.parse(String(request.mock.calls[0][1]!.body));
      const payload =
        provider === 'openai'
          ? JSON.parse(body.input)
          : provider === 'claude'
            ? JSON.parse(body.messages[0].content)
            : body.context;
      const schema =
        provider === 'openai'
          ? body.text.format.schema
          : provider === 'claude'
            ? body.tools[0].input_schema
            : body.responseSchema;
      expect(payload.research).toEqual(expectedResearch);
      expect(payload.research.costSamples).toHaveLength(3);
      expect(payload.research.costSamples[0].openingFeeScenario.opening.feeOnlyReachesLossLimit).toBe(true);
      expect(payload.research.costSamples[0].openingFeeScenario.laterOpportunity).toBe('not-assessed');
      expect(JSON.stringify(payload.research.costSamples)).not.toMatch(
        /amountOut|currentPrice|heldOut|qualified|authorize/
      );
      expect(payload.constraints.maxPriceImpactPercent).toBe('1.000000000000000001');
      expect(payload.strategy.amount).toBe('1');
      expect(payload.research.sizing.capitalCodec).toBe('10000');
      expect(schema.properties.intervalMs).toEqual({ type: 'integer', minimum: 3_600_000, maximum: 12 * 3_600_000 });
    }
  );

  it('passes the same exact-size cost evidence through the Jev client without adding quote prices', async () => {
    const bot = botFixture();
    const research = researchWithCostSamples();
    const expected = structuredClone(research);
    const response = {
      answers: {
        strategy: {
          type: 'choice',
          choice: 'sma_5_20',
          confidence: 0.9,
          probabilities: { sma_5_20: 0.9, sma_12_48: 0.1 },
        },
      },
    };
    const request = vi.fn(
      async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(JSON.stringify(response))
    );
    const client = createBotAiClient(
      'jev',
      { apiKey: 'key', model: '', endpoint: 'https://bot.test' },
      request,
      () => 1_000_000_000
    );
    const candles = Array.from({ length: 117 }, (_, index) => ({ timestamp: index * 3_600_000, close: '2' }));
    const pending = client.suggest(bot, candles, undefined, research);
    research.costSamples![0].amountInCodec = '2';
    const sample = research.costSamples![0];
    if (sample.status === 'available') {
      sample.openingFeeScenario!.opening.feeOnlyLossPercent = '99';
      sample.openingFeeScenario!.firstPossibleTrade.feeOnlyReachesLossLimit = true;
    }
    await expect(pending).resolves.toMatchObject({ strategy: { kind: 'sma', amount: '1', intervalMs: 3_600_000 } });
    const state = JSON.parse(JSON.parse(String(request.mock.calls[0][1]!.body)).state);
    expect(state.research).toEqual(expected);
    expect(state.research.costSamples[0].openingFeeScenario.opening.feeOnlyReachesLossLimit).toBe(true);
    expect(state.research.costSamples[0].openingFeeScenario.laterOpportunity).toBe('not-assessed');
    expect(JSON.stringify(state.research.costSamples)).not.toMatch(
      /amountOut|currentPrice|heldOut|qualified|authorize/
    );
  });

  it.each(['custom', 'openai', 'claude', 'jev'] as const)(
    'binds v3 to exactly 117 funded closes before publishing any %s request',
    async (provider) => {
      const hour = 3_600_000;
      const funding = Date.UTC(2026, 8, 14);
      const bot = botFixture();
      const strategy = { ...bot.strategy, intervalMs: hour };
      const training = Array.from({ length: 117 }, (_, index) => ({
        timestamp: funding + index * hour,
        close: '2',
      }));
      const research: BotAiResearchConstraints = {
        ...researchConstraintsFixture(),
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
      const response =
        provider === 'openai'
          ? { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(strategy) }] }] }
          : provider === 'claude'
            ? { content: [{ type: 'tool_use', name: 'bot_decision', input: strategy }] }
            : provider === 'jev'
              ? {
                  answers: {
                    strategy: {
                      type: 'choice',
                      choice: 'sma_5_20',
                      confidence: 0.9,
                      probabilities: { sma_5_20: 0.9, sma_12_48: 0.1 },
                    },
                  },
                }
              : { strategy };
      const request = vi.fn(
        async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(JSON.stringify(response))
      );
      const client = createBotAiClient(
        provider,
        { apiKey: 'test-key', model: provider === 'jev' ? '' : 'test', endpoint: 'https://bot.test' },
        request,
        () => funding + 200 * hour
      );
      const shifted = structuredClone(research);
      if (shifted.goalEpisodes?.protocol !== 'goal-episodes-v3') throw new Error('fixture');
      shifted.goalEpisodes.signalWarmup.firstCompletedAt += hour;
      shifted.goalEpisodes.signalWarmup.lastCompletedAt += hour;
      await expect(client.suggest(bot, training, undefined, shifted)).rejects.toThrow('bots.errors.provider');
      for (const candles of [
        training.slice(1),
        [...training, { timestamp: funding + 117 * hour, close: '999999.123' }],
        training.map((candle) => ({ ...candle, timestamp: candle.timestamp + hour })),
      ])
        await expect(client.suggest(bot, candles, undefined, research)).rejects.toThrow('bots.errors.provider');
      const leakedPrefix = structuredClone(research);
      Object.assign(leakedPrefix.goalEpisodes!, {
        warmupCandles: [{ timestamp: funding - hour, close: '777777.321' }],
      });
      await expect(client.suggest(bot, training, undefined, leakedPrefix)).rejects.toThrow('bots.errors.provider');
      expect(request).not.toHaveBeenCalled();

      await expect(client.suggest(bot, training, undefined, research)).resolves.toMatchObject({
        strategy: { amount: bot.strategy.amount, intervalMs: hour },
      });
      expect(request).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(request.mock.calls[0][1]!.body));
      const payload =
        provider === 'openai'
          ? JSON.parse(body.input)
          : provider === 'claude'
            ? JSON.parse(body.messages[0].content)
            : provider === 'jev'
              ? JSON.parse(body.state)
              : body.context;
      expect(payload.research).toEqual(research);
      expect(payload.candles).toEqual(training);
      expect(payload.candles).toHaveLength(117);
      expect(JSON.stringify(payload)).not.toMatch(/777777\.321|999999\.123|warmupCandles|heldOutCandles/);
      client.disconnect();
    }
  );

  it.each(['custom', 'openai', 'claude', 'jev'] as const)(
    'rejects forged costs and private or authoritative scenario extensions before any %s request',
    async (provider) => {
      const request = vi.fn();
      const client = createBotAiClient(
        provider,
        { apiKey: 'key', model: provider === 'jev' ? '' : 'test', endpoint: 'https://bot.test' },
        request,
        () => 1000
      );
      for (const fault of ['forged', 'currentPrice', 'heldOutClose', 'qualified', 'accessor']) {
        const research = researchWithCostSamples();
        const sample = research.costSamples![0];
        if (sample.status !== 'available') throw Error('Expected available synthetic sample');
        const getter = vi.fn(() => 'private');
        if (fault === 'forged') sample.finalizedAt = 999;
        else if (fault === 'accessor')
          Object.defineProperty(sample.openingFeeScenario!.opening, 'feeOnlyLossPercent', { get: getter });
        else Object.assign(sample.openingFeeScenario!.firstPossibleTrade, { [fault]: 'private' });
        await expect(
          client.suggest(botFixture(), [{ timestamp: 1000, close: '2' }], undefined, research)
        ).rejects.toThrow();
        expect(getter).not.toHaveBeenCalled();
      }
      expect(request).not.toHaveBeenCalled();
    }
  );

  it.each(['custom', 'openai', 'claude', 'jev'] as const)(
    'rejects an accessor policy impact limit before any %s request',
    async (provider) => {
      const bot = botFixture();
      const getter = vi.fn(() => '1');
      Object.defineProperty(bot.policy, 'maxPriceImpactPercent', { get: getter });
      const request = vi.fn();
      const client = createBotAiClient(
        provider,
        { apiKey: 'test-key', model: provider === 'jev' ? '' : 'test', endpoint: 'https://bot.test' },
        request,
        () => 1000
      );
      await expect(client.propose(bot, [{ timestamp: 1000, close: '2' }])).rejects.toThrow();
      expect(getter).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    }
  );

  it('enforces research cadence on provider responses without changing legacy advanced suggestions', async () => {
    const bot = botFixture();
    const strategy = { ...bot.strategy, intervalMs: 24 * 3_600_000 };
    const request = vi.fn(async () => new Response(JSON.stringify({ strategy })));
    const client = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      request,
      () => 1000
    );
    await expect(
      client.suggest(bot, [{ timestamp: 1000, close: '2' }], undefined, {
        minimumIntervalMs: 3_600_000,
        maximumIntervalMs: 12 * 3_600_000,
        minimumTrades: 5,
        trainingCandles: 117,
        validationCandles: 50,
      })
    ).rejects.toThrow('bots.errors.proposal');
  });

  it('returns deterministic suggestions with provider usage for explicit review', async () => {
    const strategy = { ...botFixture().strategy, kind: 'sma', fastWindow: 2, slowWindow: 3 };
    const client = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      async () => new Response(JSON.stringify({ strategy, usage: { input_tokens: 7, output_tokens: 9 } })),
      () => 1000
    );
    const result = await client.suggest(botFixture(), [{ timestamp: 1000, close: '2' }]);
    expect(result.strategy).toEqual(strategy);
    expect(result.usage).toEqual({ requests: 1, inputTokens: 7, outputTokens: 9 });
    await expect(client.suggest(botFixture(), [{ timestamp: 1000, close: '2' }])).rejects.toThrow(
      'bots.errors.provider'
    );
  });
  it('accepts older chronological training-only context for drafting while preserving live freshness checks', async () => {
    const strategy = { ...botFixture().strategy, kind: 'sma', fastWindow: 2, slowWindow: 3 };
    const request = vi.fn(async () => new Response(JSON.stringify({ strategy })));
    const client = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      request,
      () => 100_000_000
    );
    const training = [
      { timestamp: 1000, close: '2' },
      { timestamp: 2000, close: '3' },
    ];
    await expect(client.suggest(botFixture(), [...training].reverse())).rejects.toThrow('bots.errors.history');
    await expect(client.suggest(botFixture(), [{ timestamp: 100_000_001, close: '3' }])).rejects.toThrow(
      'bots.errors.stale'
    );
    expect(request).not.toHaveBeenCalled();
    await expect(client.suggest(botFixture(), training)).resolves.toMatchObject({ strategy });
    const options = (request.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body)).context.candles).toEqual(training);
    await expect(client.propose(botFixture(), training)).rejects.toThrow('bots.errors.stale');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('gives the model exact buy-below, sell-above and bounded compound-rule semantics', async () => {
    const strategy = { ...botFixture().strategy, kind: 'threshold', direction: 'above' };
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(strategy) }] }],
          })
        )
    );
    const client = createBotAiClient(
      'openai',
      { apiKey: 'test-key', model: 'test-model', endpoint: '' },
      request,
      () => 1000
    );
    expect((await client.suggest(botFixture(), [{ timestamp: 1000, close: '2' }])).strategy.direction).toBe('above');
    const options = (request.mock.calls[0] as unknown as [string, RequestInit])[1];
    const instructions = JSON.parse(String(options.body)).instructions;
    expect(instructions).toContain('direction below buys when price is at or below');
    expect(instructions).toContain('direction above SELLS existing assetOut');
    expect(instructions).toContain('above-only rule cannot trade when assetOut holdings are zero');
    expect(instructions).toContain('rules combines 1..4 flat conditions');
    expect(instructions).toContain('rules interval must be at least 3600000');
    expect(instructions).toContain('assetIn-equivalent sizing for sells');
    expect(JSON.parse(String(options.body)).text.format.schema).toEqual(
      openAiStrictSchema(DETERMINISTIC_STRATEGY_SCHEMA)
    );
  });

  it('accepts provider rule compositions and supplies enough observations for the longest supported lookback', async () => {
    const strategy = { ...botFixture().strategy, kind: 'rules', intervalMs: 3_600_000, rules: ruleRecipe('spring') };
    const request = vi.fn(async () => new Response(JSON.stringify({ strategy })));
    const now = 1_000_000_000;
    const client = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      request,
      () => now
    );
    const result = await client.suggest(
      botFixture(),
      Array.from({ length: 220 }, (_, index) => ({ timestamp: now - (219 - index) * 3_600_000, close: '2' }))
    );
    expect(result.strategy).toEqual(strategy);
    const options = (request.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body)).context.candles).toHaveLength(202);
    expect(JSON.parse(String(options.body)).responseSchema).toEqual(DETERMINISTIC_STRATEGY_SCHEMA);
  });
  it('preserves a suggested 36-decimal trigger price for review', async () => {
    const strategy = {
      ...botFixture().strategy,
      kind: 'threshold',
      fastWindow: 2,
      slowWindow: 3,
      threshold: '0.' + '0'.repeat(35) + '1',
    };
    const client = createBotAiClient(
      'custom',
      { apiKey: '', model: '', endpoint: 'https://bot.test' },
      async () => new Response(JSON.stringify({ strategy })),
      () => 1000
    );
    expect((await client.suggest(botFixture(), [{ timestamp: 1000, close: '2' }])).strategy.threshold).toBe(
      strategy.threshold
    );
  });
  it('aborts an in-flight provider request when disconnected', async () => {
    let captured: AbortSignal | null | undefined;
    let release!: (response: Response) => void;
    const client = createBotAiClient(
      'custom',
      { apiKey: 'test', model: '', endpoint: 'https://bot.test' },
      async (_url, options) => {
        captured = options?.signal;
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      },
      () => 1000
    );
    const result = client.propose(botFixture(), [{ timestamp: 1000, close: '2' }]);
    client.disconnect();
    expect(captured?.aborted).toBe(true);
    release(new Response(JSON.stringify({ proposal: { action: 'buy', amount: '1', reason: 'late' } })));
    await expect(result).rejects.toThrow('bots.errors.provider');
  });
});
