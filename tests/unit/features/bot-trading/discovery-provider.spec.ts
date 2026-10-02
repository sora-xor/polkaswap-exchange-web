import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  copyDiscoveryDraftContext,
  createDiscoveryProvider,
  parseDiscoveryDraft,
  type DiscoveryDraftContext,
} from '@/features/bot-trading/discovery-provider';

const NOW = Date.UTC(2026, 8, 23, 2);
const REQUEST_ID = '48350c06-70c6-49fc-b9ce-b54e1d4f41db';
const strategy = {
  kind: 'dca',
  amount: '1',
  intervalMs: 86_400_000,
  threshold: '0',
  direction: 'below',
  fastWindow: 5,
  slowWindow: 20,
  prompt: '',
  signalTiming: null,
  rules: null,
};
const context = (): DiscoveryDraftContext => ({
  requestId: REQUEST_ID,
  idea: 'Accumulate on completed hours',
  pair: {
    assetIn: { address: '0xkusd', symbol: 'KUSD', decimals: 18 },
    assetOut: { address: '0xxor', symbol: 'XOR', decimals: 18 },
  },
  training: {
    from: NOW - 90 * 86_400_000,
    to: NOW - 14 * 86_400_000,
    candles: Array.from({ length: 202 }, (_, index) => ({
      timestamp: NOW - (14 * 24 + 202 - index) * 3_600_000,
      close: '1.25',
      feeClose: '1',
    })),
  },
  constraints: {
    capital: '20',
    maxTradeCodec: '10000000000000000000',
    feeSampleAmount: '0.2',
    minimumIntervalMs: 3_600_000,
    maximumIntervalMs: 2_592_000_000,
    slippagePercent: '1',
    feeBudgetXor: '1',
    networkFeeXor: '0.01',
    swapFeePercent: '0.3',
    sellNetworkFeeXor: '0.01',
    sellSwapFeePercent: '0.3',
    priceImpactPercent: '0.1',
    sellPriceImpactPercent: '0.1',
  },
  priorResults: [{ returnPercent: '1.2', excessReturnPercent: '-0.1', drawdownPercent: '2', trades: 11 }],
});

afterEach(() => vi.unstubAllGlobals());

describe('discovery provider boundary', () => {
  it('copies only a bounded chronological training context and rejects hidden holdout or wallet fields', () => {
    expect(copyDiscoveryDraftContext(context(), NOW)).toEqual(context());
    expect(() => copyDiscoveryDraftContext({ ...context(), holdout: ['future-price'] }, NOW)).toThrow();
    expect(() => copyDiscoveryDraftContext({ ...context(), account: 'wallet-address' }, NOW)).toThrow();
    expect(() =>
      copyDiscoveryDraftContext({ ...context(), priorResults: Array(9).fill(context().priorResults![0]) }, NOW)
    ).toThrow();
    const invalid = context();
    invalid.training.candles[201].timestamp = invalid.training.candles[200].timestamp;
    expect(() => copyDiscoveryDraftContext(invalid, NOW)).toThrow();
    const highPrecision = context();
    highPrecision.pair.assetIn.decimals = 30;
    highPrecision.constraints.maxTradeCodec = `10${'0'.repeat(30)}`;
    expect(copyDiscoveryDraftContext(highPrecision, NOW).pair.assetIn.decimals).toBe(30);
    expect(copyDiscoveryDraftContext(context(), NOW)).not.toHaveProperty('liveFeedback');
    const missingSample = context();
    delete (missingSample.constraints as Partial<typeof missingSample.constraints>).feeSampleAmount;
    expect(() => copyDiscoveryDraftContext(missingSample, NOW)).toThrow();
    const zeroSample = context();
    zeroSample.constraints.feeSampleAmount = '0';
    expect(() => copyDiscoveryDraftContext(zeroSample, NOW)).toThrow();
    const oversizedSample = context();
    oversizedSample.constraints.feeSampleAmount = '21';
    expect(() => copyDiscoveryDraftContext(oversizedSample, NOW)).toThrow();
    const inexactSample = context();
    inexactSample.constraints.feeSampleAmount = '0.0000000000000000001';
    expect(() => copyDiscoveryDraftContext(inexactSample, NOW)).toThrow();
    const consented = {
      ...context(),
      liveFeedback: {
        windowState: 'exploratory' as const,
        activeHours: 336,
        successfulSwaps: 11,
        netReturnPercent: '1.2',
        excessReturnPercent: '0.2',
        drawdownPercent: '2',
        feesPaidXor: '0.5',
      },
    };
    expect(copyDiscoveryDraftContext(consented, NOW).liveFeedback).toEqual(consented.liveFeedback);
    expect(() =>
      copyDiscoveryDraftContext({ ...consented, liveFeedback: { ...consented.liveFeedback, txHash: 'secret' } }, NOW)
    ).toThrow();
    expect(() =>
      copyDiscoveryDraftContext(
        { ...consented, liveFeedback: { ...consented.liveFeedback, windowState: 'sealed' } },
        NOW
      )
    ).toThrow();
  });

  it('binds a strict draft to its request ID', () => {
    expect(parseDiscoveryDraft({ requestId: REQUEST_ID, strategy }, REQUEST_ID)).toEqual({
      requestId: REQUEST_ID,
      strategy,
    });
    expect(() => parseDiscoveryDraft({ requestId: crypto.randomUUID(), strategy }, REQUEST_ID)).toThrow();
    expect(() =>
      parseDiscoveryDraft({ requestId: REQUEST_ID, strategy: { ...strategy, code: 'evil' } }, REQUEST_ID)
    ).toThrow();
  });

  it('sends the v2 custom HTTPS contract without a wallet or holdout and checks its version', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ version: 2, requestId: REQUEST_ID, strategy })));
    const provider = createDiscoveryProvider(
      'custom',
      { endpoint: 'https://relay.test/discover', apiKey: 'memory-only' },
      { request: fetch as typeof globalThis.fetch, now: () => NOW }
    );
    expect(await provider.suggest(context())).toEqual({ requestId: REQUEST_ID, strategy });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://relay.test/discover');
    expect(init.redirect).toBe('error');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      version: 2,
      task: 'discovery',
      context: { requestId: REQUEST_ID, constraints: { feeSampleAmount: '0.2' } },
    });
    expect(JSON.stringify(body)).not.toMatch(/wallet|account|holdout|memory-only/i);
    provider.disconnect();
    await expect(provider.suggest(context())).rejects.toThrow();
  });

  it('allows a custom HTTPS draft past 30 seconds but aborts one still pending at 245 seconds', async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      let successfulSignal: AbortSignal | undefined;
      const delayedFetch = vi.fn((_url: string, init: RequestInit) => {
        successfulSignal = init.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          setTimeout(() => resolve(new Response(JSON.stringify({ version: 2, requestId: REQUEST_ID, strategy }))), 31_000);
        });
      });
      const delayedProvider = createDiscoveryProvider(
        'custom',
        { endpoint: 'https://relay.test/discover' },
        { request: delayedFetch as typeof globalThis.fetch, now: () => NOW }
      );
      const delayedDraft = delayedProvider.suggest(context());
      await vi.advanceTimersByTimeAsync(30_001);
      expect(successfulSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(999);
      await expect(delayedDraft).resolves.toEqual({ requestId: REQUEST_ID, strategy });

      let pendingSignal: AbortSignal | undefined;
      const pendingFetch = vi.fn((_url: string, init: RequestInit) => {
        pendingSignal = init.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          pendingSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      });
      const pendingProvider = createDiscoveryProvider(
        'custom',
        { endpoint: 'https://relay.test/discover' },
        { request: pendingFetch as typeof globalThis.fetch, now: () => NOW }
      );
      const pendingDraft = pendingProvider.suggest(context());
      const rejection = expect(pendingDraft).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(244_999);
      expect(pendingSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(pendingSignal?.aborted).toBe(true);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses structured output for OpenAI and a single forced schema tool for Claude', async () => {
    const openaiFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: JSON.stringify({ requestId: REQUEST_ID, strategy }) }],
              },
            ],
          })
        )
    );
    const openai = createDiscoveryProvider(
      'openai',
      { apiKey: 'openai-secret', model: 'test-model' },
      { request: openaiFetch as typeof globalThis.fetch, now: () => NOW }
    );
    expect(await openai.suggest(context())).toEqual({ requestId: REQUEST_ID, strategy });
    const openaiBody = JSON.parse((openaiFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(openaiBody.store).toBe(false);
    expect(openaiBody.text.format.strict).toBe(true);
    expect(openaiBody.input).not.toContain('holdout');

    const claudeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: 'tool_use', name: 'discovery_draft', input: { requestId: REQUEST_ID, strategy } }],
          })
        )
    );
    const claude = createDiscoveryProvider(
      'claude',
      { apiKey: 'claude-secret', model: 'test-model' },
      { request: claudeFetch as typeof globalThis.fetch, now: () => NOW }
    );
    expect(await claude.suggest(context())).toEqual({ requestId: REQUEST_ID, strategy });
    const claudeBody = JSON.parse((claudeFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(claudeBody.tool_choice).toEqual({ type: 'tool', name: 'discovery_draft' });
    expect(claudeBody.tools).toHaveLength(1);
  });

  it('selects a discovered model before generation and enforces the per-provider cooldown after dispatch', async () => {
    let now = NOW;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'gpt-6-test', created: 1 }] })))
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: JSON.stringify({ requestId: REQUEST_ID, strategy }) }],
              },
            ],
          })
        )
      );
    const provider = createDiscoveryProvider(
      'openai',
      { apiKey: 'secret' },
      { request: fetch as typeof globalThis.fetch, now: () => now }
    );
    await expect(provider.suggest(context())).rejects.toThrow();
    expect(await provider.listModels()).toEqual([{ id: 'gpt-6-test', name: 'gpt-6-test', createdAt: 1000 }]);
    provider.selectModel('gpt-6-test');
    await expect(provider.suggest(context())).rejects.toThrow();
    await expect(provider.suggest(context())).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
    now += 60_000;
    expect(await provider.suggest(context())).toEqual({ requestId: REQUEST_ID, strategy });
  });

  it('allows Jev to choose only a fixed, confidence-gated recipe', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            answers: {
              strategy: {
                type: 'choice',
                choice: 'dca_daily',
                confidence: 0.9,
                probabilities: { dca_daily: 0.9, sma_5_20: 0.05, sma_12_48: 0.05 },
              },
            },
          })
        )
    );
    const provider = createDiscoveryProvider(
      'jev',
      { apiKey: 'jev-secret' },
      { request: fetch as typeof globalThis.fetch, now: () => NOW }
    );
    const result = await provider.suggest(context());
    expect(result).toMatchObject({ requestId: REQUEST_ID, strategy: { kind: 'dca', amount: '2' } });
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(Object.keys(body.questions.strategy.criteria)).toEqual(['dca_daily', 'sma_5_20', 'sma_12_48']);
    expect(JSON.stringify(body)).not.toMatch(/wallet|account|holdout/i);
  });

  it('pairs a local Claude Code session and sends only public discovery data on the loopback route', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'b'.repeat(64), expiresAt: NOW + 60_000 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requestId: REQUEST_ID, strategy })));
    vi.stubGlobal('fetch', fetch);
    const provider = createDiscoveryProvider('claude-code', {}, { now: () => NOW });
    await provider.pair('a'.repeat(32), new AbortController().signal);
    expect(await provider.suggest(context())).toEqual({ requestId: REQUEST_ID, strategy });
    expect(fetch.mock.calls[1][0]).toBe('http://127.0.0.1:39847/discovery/draft');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ version: 2, provider: 'claude-code' });
    provider.disconnect();
    vi.restoreAllMocks();
  });
});
