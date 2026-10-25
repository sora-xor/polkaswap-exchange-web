import { describe, expect, it, vi } from 'vitest';
import { PassThrough, Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import {
  createQuoteHandler,
  parseQuoteRequest,
  DISABLED_PROVIDERS,
  QUOTE_PATH,
  HEALTH_PATH,
  UPSTREAM,
  startQuoteRelay,
} from '../../../../scripts/ops/buy-xor-quote-relay.mjs';

const destination = '0x1111111111111111111111111111111111111111';
const eth = { address: '', chainId: 1, decimals: 18, symbol: 'ETH' };
const dai = { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', chainId: 1, decimals: 18, symbol: 'DAI' };
const usdt = { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', chainId: 1, decimals: 6, symbol: 'USDT' };
const ton = {
  address: '0x9328Eb759596C38a25f59028B146Fecdc3621Dfe',
  chainId: 85918,
  decimals: 6,
  symbol: 'USDT',
  attributes: { ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
};
const payload = {
  tokenAmountIn: { ...eth, amount: '1000000000000000' },
  tokenOut: dai,
  from: destination,
  to: destination,
  fallbackReceiver: destination,
  slippage: 100,
  disabledProviders: DISABLED_PROVIDERS,
};
function tonPayload() {
  const { disabledProviders: _unused, ...rest } = payload;
  return {
    ...rest,
    tokenAmountIn: { ...ton, amount: '1000000' },
    from: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
    tokenOut: eth,
  };
}
function jsonResponse(raw = '{"tokenAmountOut":{"amount":"1000000000000000001"}}', status = 200) {
  return new Response(raw, { status, headers: { 'Content-Type': 'application/json' } });
}
function responseMock() {
  return Object.assign(new EventEmitter(), {
    statusCode: 200,
    body: '',
    writableEnded: false,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(body = '') {
      this.body = body;
      this.writableEnded = true;
    },
  });
}
async function request(
  handler: ReturnType<typeof createQuoteHandler>,
  input: {
    body?: unknown;
    raw?: string;
    headers?: Record<string, string>;
    url?: string;
    method?: string;
  } = {}
) {
  const req = Object.assign(Readable.from([input.raw ?? JSON.stringify(input.body ?? payload)]), {
    complete: true,
    method: input.method ?? 'POST',
    url: input.url ?? QUOTE_PATH,
    headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json', ...input.headers },
  });
  const response = responseMock();
  await handler(req, response);
  return response;
}

describe('bounded Buy XOR read-only quote relay', () => {
  it('forwards only the fixed reconstructed request and JSON headers, preserving exact provider numeric lexemes', async () => {
    const raw = '{"tokenAmountOut":{"amount":10000000000000000010001},"transactionRequest":{"data":"0x1234"}}';
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(raw));
    const result = await request(createQuoteHandler({ fetcher }), {
      headers: { 'user-agent': 'private browser', referer: 'private', 'x-partner-id': 'unregistered' },
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(raw);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(UPSTREAM);
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(init).toMatchObject({
      method: 'POST',
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    expect(Object.keys(init.headers)).toHaveLength(2);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('https://polkaswap.io');
    expect(result.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
  it('supports exactly the current ETH and USDT conversion pairs and mainnet TON checksum', () => {
    expect(parseQuoteRequest(payload)).toEqual(payload);
    for (const output of [eth, dai]) {
      expect(
        parseQuoteRequest({ ...payload, tokenAmountIn: { ...usdt, amount: '1' }, tokenOut: output })
      ).not.toBeNull();
      expect(parseQuoteRequest({ ...tonPayload(), tokenOut: output })).not.toBeNull();
    }
    expect(parseQuoteRequest({ ...tonPayload(), from: '0:' + '1'.repeat(64) })).not.toBeNull();
    expect(parseQuoteRequest({ ...payload, tokenOut: eth })).toBeNull();
    expect(parseQuoteRequest({ ...tonPayload(), from: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKA' })).toBeNull();
    expect(parseQuoteRequest({ ...tonPayload(), from: 'kQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHTW' })).toBeNull();
  });
  it.each([
    { ...payload, url: 'https://evil.example' },
    { ...payload, slippage: 101 },
    { ...payload, disabledProviders: '' },
    { ...payload, from: '0x' + '0'.repeat(40) },
    { ...payload, fallbackReceiver: '0x' + '2'.repeat(40) },
    { ...payload, tokenAmountIn: { ...payload.tokenAmountIn, chainId: 56 } },
    { ...payload, tokenAmountIn: { ...payload.tokenAmountIn, address: destination } },
    { ...payload, tokenAmountIn: { ...payload.tokenAmountIn, symbol: 'DAI' } },
    { ...payload, tokenAmountIn: { ...payload.tokenAmountIn, decimals: 6 } },
    { ...payload, tokenOut: { ...dai, other: 1 } },
    { ...tonPayload(), tokenAmountIn: { ...ton, amount: '1', attributes: { ton: 'other' } } },
    { ...tonPayload(), disabledProviders: DISABLED_PROVIDERS },
    { ...tonPayload(), from: destination },
    { ...tonPayload(), from: '0:' + '0'.repeat(64) },
  ])('rejects modified route/account/schema without reaching provider (%j)', async (body) => {
    const fetcher = vi.fn();
    expect((await request(createQuoteHandler({ fetcher }), { body })).statusCode).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['0', '01', '-1', '1.1', '1e18', '1'.repeat(79), (1n << 256n).toString(), 10])(
    'rejects invalid codec amount %s',
    (amount) => {
      expect(parseQuoteRequest({ ...payload, tokenAmountIn: { ...payload.tokenAmountIn, amount } })).toBeNull();
    }
  );
  it('retains the exact uint256 amount boundary', () => {
    const amount = ((1n << 256n) - 1n).toString();
    expect(
      parseQuoteRequest({ ...payload, tokenAmountIn: { ...payload.tokenAmountIn, amount } })?.tokenAmountIn.amount
    ).toBe(amount);
  });
  it.each([
    { headers: { origin: 'https://evil.example' }, status: 403 },
    { headers: { origin: 'https://mof.sora.org' }, status: 403 },
    { headers: { origin: 'null' }, status: 403 },
    { headers: { cookie: 'id=test' }, status: 400 },
    { headers: { authorization: 'Bearer test' }, status: 400 },
    { headers: { 'content-type': 'text/plain' }, status: 415 },
    { headers: { 'content-encoding': 'gzip' }, status: 413 },
    { headers: { 'content-length': '4097' }, status: 413 },
    { raw: 'a'.repeat(4097), status: 413 },
    { raw: 'broken json', status: 400 },
    { method: 'GET', status: 405 },
    { url: QUOTE_PATH + '?url=elsewhere', status: 404 },
    { url: '/api/buy-xor/order', status: 404 },
  ])('rejects unsupported HTTP input (%j)', async ({ status, ...input }) => {
    const fetcher = vi.fn();
    expect((await request(createQuoteHandler({ fetcher }), input)).statusCode).toBe(status);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('answers production JSON preflight and rejects extra headers/methods', async () => {
    const fetcher = vi.fn();
    const handler = createQuoteHandler({ fetcher });
    const headers = { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' };
    const result = await request(handler, { method: 'OPTIONS', headers });
    expect(result.statusCode).toBe(204);
    expect(result.headers['Access-Control-Allow-Headers']).toBe('Content-Type');
    expect(result.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect(
      (
        await request(handler, {
          method: 'OPTIONS',
          headers: { ...headers, 'access-control-request-headers': 'content-type,x-partner-id' },
        })
      ).statusCode
    ).toBe(400);
    expect(
      (
        await request(handler, {
          method: 'OPTIONS',
          headers: { ...headers, 'access-control-request-method': 'DELETE' },
        })
      ).statusCode
    ).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('exposes only process health, without operational details or an upstream call', async () => {
    const fetcher = vi.fn();
    const result = await request(createQuoteHandler({ fetcher }), { method: 'GET', url: HEALTH_PATH });
    expect(JSON.parse(result.body)).toEqual({ service: 'buy-xor-quote', version: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([400, 429, 403, 500])(
    'maps provider %i safely without echoing its request-bearing error body',
    async (status) => {
      const fetcher = vi.fn().mockResolvedValue(jsonResponse('{"error":"private wallet address"}', status));
      const result = await request(createQuoteHandler({ fetcher }));
      expect(result.statusCode).toBe(status === 400 || status === 429 ? status : 502);
      expect(result.body).not.toContain('private');
    }
  );
  it.each([
    () => new Response('<html>challenge</html>', { headers: { 'Content-Type': 'text/html' } }),
    () => jsonResponse('not json'),
    () => jsonResponse('[]'),
    () => jsonResponse('{"large":"' + 'x'.repeat(128 * 1024) + '"}'),
    () =>
      new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': String(128 * 1024 + 1) } }),
  ])('rejects non-JSON or oversized provider replies', async (makeResponse) => {
    expect((await request(createQuoteHandler({ fetcher: vi.fn().mockResolvedValue(makeResponse()) }))).statusCode).toBe(
      502
    );
  });
  it('times out upstream without retries or retaining a concurrency slot', async () => {
    const fetcher = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))))
    );
    const handler = createQuoteHandler({ fetcher, timeoutMs: 10, maxConcurrent: 1 });
    expect((await request(handler)).statusCode).toBe(504);
    fetcher.mockResolvedValueOnce(jsonResponse());
    expect((await request(handler)).statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('interrupts an incomplete request stream at the absolute timeout', async () => {
    const fetcher = vi.fn();
    const handler = createQuoteHandler({ fetcher, timeoutMs: 10, maxConcurrent: 1 });
    const req = Object.assign(new PassThrough(), {
      complete: false,
      method: 'POST',
      url: QUOTE_PATH,
      headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json' },
    });
    const response = responseMock();
    req.write('{');
    await handler(req, response);
    expect(req.destroyed).toBe(true);
    expect(response.statusCode).toBe(504);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(jsonResponse());
    expect((await request(handler)).statusCode).toBe(200);
  });
  it('aborts the provider request when a client closes after sending its complete body', async () => {
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn((_url, init) => {
      signal = init.signal;
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener('abort', () => reject(new Error('aborted')))
      );
    });
    const handler = createQuoteHandler({ fetcher });
    const req = Object.assign(Readable.from([JSON.stringify(payload)]), {
      complete: true,
      method: 'POST',
      url: QUOTE_PATH,
      headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json' },
    });
    const response = responseMock();
    const pending = handler(req, response);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    response.emit('close');
    await pending;
    expect(signal?.aborted).toBe(true);
  });
  it('bounds concurrency and requests globally, without IP or session keys', async () => {
    let resolveFetch: (response: Response) => void = () => {};
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    let clock = 60000;
    const handler = createQuoteHandler({ fetcher, maxPerMinute: 1, maxConcurrent: 1, now: () => clock });
    const first = request(handler);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect((await request(handler)).statusCode).toBe(429);
    resolveFetch(jsonResponse());
    expect((await first).statusCode).toBe(200);
    expect((await request(handler)).statusCode).toBe(429);
    clock += 60000;
    fetcher.mockResolvedValueOnce(jsonResponse());
    expect((await request(handler)).statusCode).toBe(200);
  });
  it('fails closed on invalid startup limits', () => {
    expect(() => createQuoteHandler({ timeoutMs: 12001 })).toThrow();
    expect(() => createQuoteHandler({ maxConcurrent: 0 })).toThrow();
    expect(() => startQuoteRelay({ port: 80 })).toThrow();
  });
});
