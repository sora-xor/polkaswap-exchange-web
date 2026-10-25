import { afterEach, describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createCounterHandler,
  openCounterStore,
  EVENT_PATH,
  HEALTH_PATH,
} from '../../../../scripts/ops/buy-xor-collector.mjs';

const event = { v: 1, step: 'quote_available', route: 'ethereum', reason: 'none' };
const date = Date.parse('2026-09-25T23:59:00Z');
const stores: ReturnType<typeof openCounterStore>[] = [];
function store(filename = ':memory:') {
  const result = openCounterStore(filename);
  stores.push(result);
  return result;
}
async function request(
  handler: ReturnType<typeof createCounterHandler>,
  input: { body?: unknown; raw?: string; headers?: Record<string, string>; url?: string; method?: string } = {}
) {
  const req = Object.assign(Readable.from([input.raw ?? JSON.stringify(input.body ?? event)]), {
    method: input.method ?? 'POST',
    url: input.url ?? EVENT_PATH,
    headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json', ...input.headers },
  });
  const response = {
    statusCode: 200,
    body: '',
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(body = '') {
      this.body = body;
    },
  };
  await handler(req, response);
  return response;
}
describe('MOF Buy XOR aggregate collector', () => {
  afterEach(() => {
    stores.splice(0).forEach((entry) => entry.close());
  });
  it('persists daily aggregate counters without individual event rows and separates transport verification', async () => {
    const counters = store();
    const handler = createCounterHandler(counters, { now: () => date });
    expect((await request(handler)).statusCode).toBe(204);
    await request(handler);
    await request(handler, { body: { v: 1, step: 'verification', route: 'unset', reason: 'none' } });
    const report = counters.report('2026-09-25', '2026-09-25');
    expect(report.verificationCount).toBe(1);
    expect(report.rows).toEqual([
      { day: '2026-09-25', step: 'quote_available', route: 'ethereum', reason: 'none', count: 2 },
    ]);
    expect(JSON.stringify(report)).not.toMatch(/address|hash|user-agent|127\.0\.0\.1/);
  });
  it('restores aggregate data after the process store closes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'buy-xor-counts-'));
    try {
      const filename = join(directory, 'counts.sqlite');
      const first = openCounterStore(filename);
      first.increment(event, date);
      first.close();
      const second = openCounterStore(filename, { readOnly: true });
      expect(second.report('2026-09-25', '2026-09-25').rows[0].count).toBe(1);
      second.close();
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
  it('prunes counts older than the bounded 90 UTC-day window', () => {
    const counters = store();
    counters.increment(event, date - 90 * 86_400_000);
    counters.increment(event, date - 89 * 86_400_000);
    counters.increment(event, date);
    expect(counters.report('2026-01-01', '2026-12-31').rows).toHaveLength(2);
    counters.prune(date + 90 * 86_400_000);
    expect(counters.report('2026-01-01', '2026-12-31').rows).toHaveLength(0);
  });
  it('reports storage failure as unavailable without pretending an event was accepted', async () => {
    const handler = createCounterHandler({
      increment() {
        throw new Error('disk unavailable');
      },
    });
    expect((await request(handler)).statusCode).toBe(503);
  });
  it.each([
    { headers: { origin: 'https://evil.example' }, status: 403 },
    { headers: { cookie: 'id=test' }, status: 400 },
    { headers: { authorization: 'Bearer test' }, status: 400 },
    { headers: { 'content-type': 'text/plain' }, status: 415 },
    { headers: { 'content-length': '1000' }, status: 413 },
    { raw: 'x'.repeat(257), status: 413 },
    { body: { ...event, amount: '10' }, status: 400 },
    { body: { ...event, hash: '0x123' }, status: 400 },
    { body: { ...event, step: 'anything' }, status: 400 },
    { raw: 'broken', status: 400 },
    { method: 'GET', status: 405 },
    { url: EVENT_PATH + '?wallet=0x123', status: 404 },
  ])('rejects unsupported inputs without storing them (%j)', async ({ status, ...input }) => {
    const counters = store();
    const response = await request(createCounterHandler(counters, { now: () => date }), input);
    expect(response.statusCode).toBe(status);
    expect(counters.report('2026-09-25', '2026-09-25').rows).toEqual([]);
  });
  it.each([{ dnt: '1' }, { 'sec-gpc': '1' }])('ignores privacy-signalled requests %j', async (headers) => {
    const counters = store();
    expect((await request(createCounterHandler(counters), { headers })).statusCode).toBe(204);
    expect(counters.report('2026-01-01', '2026-12-31').rows).toEqual([]);
  });
  it('allows only the production-origin JSON preflight and never returns a credentials header', async () => {
    const response = await request(createCounterHandler(store()), {
      method: 'OPTIONS',
      headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('https://polkaswap.io');
    expect(response.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
  it('provides a small health response and no public report endpoint', async () => {
    const handler = createCounterHandler(store());
    expect(JSON.parse((await request(handler, { method: 'GET', url: HEALTH_PATH })).body)).toEqual({
      service: 'buy-xor-aggregate',
      version: 1,
    });
    expect((await request(handler, { method: 'GET', url: '/api/buy-xor/report' })).statusCode).toBe(404);
  });
  it('bounds accepted requests globally without storing an IP or client fingerprint', async () => {
    let clock = date;
    const counters = store();
    const handler = createCounterHandler(counters, { maxPerMinute: 1, now: () => clock });
    expect((await request(handler)).statusCode).toBe(204);
    expect((await request(handler)).statusCode).toBe(429);
    clock += 60_000;
    expect((await request(handler)).statusCode).toBe(204);
  });
});
