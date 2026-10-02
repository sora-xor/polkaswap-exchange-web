import { describe, expect, it, vi } from 'vitest';
import { createJevRelay, startJevRelay } from '../../../../docs/examples/jev-provider-relay.mjs';

const origin = 'https://polkaswap.io';
const token = 'relay-access-token-for-tests-only-12345';
const key = 'typesafe-server-secret';
const answer = {
  answers: {
    action: { type: 'choice', choice: 'hold', confidence: 0.9, probabilities: { buy: 0.05, sell: 0.05, hold: 0.9 } },
  },
};
const body = {
  model: 'jev-latest',
  state: '{"candles":[]}',
  questions: {
    action: {
      type: 'choice',
      instructions: 'Choose a bounded action.',
      criteria: { buy: 'Buy', sell: 'Sell', hold: 'Hold' },
    },
  },
};
const strategyBody = {
  ...body,
  questions: {
    strategy: {
      type: 'choice',
      instructions: 'Select a fixed recipe for review.',
      criteria: {
        dca_daily: 'Daily buying',
        sma_5_20: '5/20 completed-hour crossovers',
        sma_12_48: '12/48 completed-hour crossovers',
      },
    },
  },
};
const strategyAnswer = {
  answers: {
    strategy: {
      type: 'choice',
      choice: 'sma_5_20',
      confidence: 0.9,
      probabilities: { dca_daily: 0.05, sma_5_20: 0.9, sma_12_48: 0.05 },
    },
  },
};
/** Build a browser-origin request without any live HTTP listener or API calls. */
function incoming(overrides: RequestInit = {}, url = 'https://relay.example/jev') {
  return new Request(url, {
    method: 'POST',
    headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...overrides,
  });
}
/** Keep the upstream fully mocked; the production key belongs solely in its Authorization header. */
function relay(request = vi.fn(async () => new Response(JSON.stringify(answer)))) {
  return { request, handle: createJevRelay({ apiKey: key, relayToken: token, allowedOrigin: origin, request }) };
}

describe('optional operator-managed Jev relay', () => {
  it('binds only loopback with bounded HTTP timeouts', () => {
    const server = { listen: vi.fn() };
    const createServer = vi.fn(() => server);
    const env = { TYPESAFE_API_KEY: key, JEV_RELAY_TOKEN: token, JEV_ALLOWED_ORIGIN: origin };
    expect(startJevRelay(env, createServer)).toBe(server);
    expect(server.listen).toHaveBeenCalledWith(8788, '127.0.0.1');
    expect(server).toMatchObject({ requestTimeout: 30000, headersTimeout: 10000, maxHeadersCount: 32 });
    expect(() => startJevRelay({ ...env, JEV_RELAY_PORT: '80' }, createServer)).toThrow('Invalid JEV_RELAY_PORT');
    expect(createServer).toHaveBeenCalledTimes(1);
  });

  it('permits only the exact allowed origin and requested protocol headers', async () => {
    const { handle, request } = relay();
    const preflight = await handle(
      incoming({
        method: 'OPTIONS',
        body: undefined,
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      })
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect((await handle(incoming({ headers: { Origin: 'https://evil.example' } }))).status).toBe(403);
    expect(
      (
        await handle(
          incoming({
            method: 'OPTIONS',
            body: undefined,
            headers: {
              Origin: origin,
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'X-Another',
            },
          })
        )
      ).status
    ).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps separate access credentials, denies unauthorized traffic and forwards only to TypeSafe', async () => {
    const { handle, request } = relay();
    expect(
      (
        await handle(
          incoming({ headers: { Origin: origin, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } })
        )
      ).status
    ).toBe(401);
    const result = await handle(incoming());
    expect(result.status).toBe(200);
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(options).toMatchObject({ redirect: 'error', headers: { Authorization: `Bearer ${key}` } });
    expect(options.body).not.toContain(key);
    expect(options.body).not.toContain(token);
  });

  it('rejects insecure or missing deployment configuration', () => {
    for (const overrides of [
      { allowedOrigin: '*' },
      { allowedOrigin: 'http://polkaswap.io' },
      { allowedOrigin: origin + '/' },
      { apiKey: '' },
      { relayToken: 'short' },
      { apiKey: token },
    ])
      expect(() => createJevRelay({ apiKey: key, relayToken: token, allowedOrigin: origin, ...overrides })).toThrow();
  });

  it('forwards only the exact native strategy catalogue and returns a typed choice without arbitrary parameters', async () => {
    const { handle, request } = relay(
      vi.fn(async () => new Response(JSON.stringify({ ...strategyAnswer, debug: key })))
    );
    const result = await handle(incoming({ body: JSON.stringify(strategyBody) }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ...strategyAnswer, usage: { input_tokens: 0, output_tokens: 0 } });
    const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(JSON.parse(String(options.body))).toEqual(strategyBody);
  });

  it.each([
    { ...strategyBody, questions: { ...strategyBody.questions, ...body.questions } },
    {
      ...strategyBody,
      questions: { strategy: { ...strategyBody.questions.strategy, criteria: { run_code: 'Arbitrary code' } } },
    },
    {
      ...strategyBody,
      questions: {
        strategy: {
          ...strategyBody.questions.strategy,
          criteria: { ...strategyBody.questions.strategy.criteria, arbitrary: 'Anything' },
        },
      },
    },
  ])('rejects unsupported or mixed strategy request shapes %#', async (value) => {
    const { handle, request } = relay();
    expect((await handle(incoming({ body: JSON.stringify(value) }))).status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    answer,
    { answers: { ...strategyAnswer.answers, ...answer.answers } },
    { answers: { strategy: { ...strategyAnswer.answers.strategy, strategy: { amount: '999' } } } },
    { answers: { strategy: { ...strategyAnswer.answers.strategy, choice: 'unknown' } } },
    {
      answers: {
        strategy: { ...strategyAnswer.answers.strategy, probabilities: { dca_daily: 1, sma_5_20: 1, sma_12_48: 1 } },
      },
    },
    {
      answers: {
        strategy: {
          ...strategyAnswer.answers.strategy,
          probabilities: { dca_daily: 0.9, sma_5_20: 0.05, sma_12_48: 0.05 },
        },
      },
    },
  ])('rejects mismatched or malformed strategy answers %#', async (value) => {
    const { handle } = relay(vi.fn(async () => new Response(JSON.stringify(value))));
    const result = await handle(incoming({ body: JSON.stringify(strategyBody) }));
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ error: 'Jev unavailable' });
  });

  it('rejects wrong routes, methods, content types and oversized or unbounded protocol payloads', async () => {
    expect((await relay().handle(incoming({}, 'https://relay.example/other'))).status).toBe(404);
    expect((await relay().handle(incoming({ method: 'GET', body: undefined }))).status).toBe(405);
    expect(
      (
        await relay().handle(
          incoming({ headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' } })
        )
      ).status
    ).toBe(415);
    for (const invalid of [
      'x'.repeat(33000),
      '{}',
      JSON.stringify({ ...body, model: 'other' }),
      JSON.stringify({ ...body, endpoint: 'https://evil.example' }),
      JSON.stringify({ ...body, questions: { tool: { type: 'choice' } } }),
    ]) {
      const { handle, request } = relay();
      expect((await handle(incoming({ body: invalid }))).status).toBe(400);
      expect(request).not.toHaveBeenCalled();
    }
  });

  it('enforces concurrency and rate bounds and discards upstream errors', async () => {
    let complete!: (response: Response) => void;
    const request = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        })
    );
    let time = 1000;
    const handle = createJevRelay({ apiKey: key, relayToken: token, allowedOrigin: origin, request, now: () => time });
    const pending = handle(incoming());
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    time += 6000;
    expect((await handle(incoming())).status).toBe(429);
    complete(new Response('server-secret-output', { status: 401 }));
    const failed = await pending;
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain('server-secret-output');
    const fast = relay();
    await fast.handle(incoming());
    expect((await fast.handle(incoming())).status).toBe(429);
  });

  it('bounds upstream bodies and removes non-JSON errors', async () => {
    for (const data of [
      'x'.repeat(33000),
      'secret failure',
      JSON.stringify({ answers: { action: { type: 'choice', choice: 'transfer' } } }),
    ]) {
      const { handle } = relay(vi.fn(async () => new Response(data)));
      const result = await handle(incoming());
      expect(result.status).toBe(502);
      expect(await result.text()).not.toContain(data);
    }
  });

  it('projects only typed decisions and counts from upstream responses', async () => {
    const { handle } = relay(
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ...answer, debug: key, usage: { input_tokens: 4, output_tokens: -1 } }))
      )
    );
    const result = await handle(incoming());
    const text = await result.text();
    expect(text).not.toContain(key);
    expect(JSON.parse(text)).toEqual({ ...answer, usage: { input_tokens: 4, output_tokens: 0 } });
  });

  it('aborts a timed-out upstream request and redacts its error', async () => {
    vi.useFakeTimers();
    try {
      let signal;
      const { handle } = relay(
        vi.fn(async (_url, options) => {
          signal = options.signal;
          return new Promise<Response>((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(new Error(key)))
          );
        })
      );
      const result = handle(incoming());
      await vi.advanceTimersByTimeAsync(25000);
      const failed = await result;
      expect(failed.status).toBe(504);
      expect(signal.aborted).toBe(true);
      expect(await failed.text()).not.toContain(key);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels slow inbound bodies before making a paid upstream request', async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn();
      const { handle, request } = relay();
      const response = handle(incoming({ body: new ReadableStream({ cancel }), duplex: 'half' } as RequestInit));
      await vi.advanceTimersByTimeAsync(25000);
      expect((await response).status).toBe(504);
      expect(cancel).toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
