import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  openRefundHandoff,
  refundRehearsalMiddleware,
  validateRefundHandoff,
  REFUND_HANDOFF_ENV,
} from '../../../scripts/build/storeRefundRehearsal.mjs';
import { storeRehearsalPlugin } from '../../../scripts/build/storeRehearsalPlugin.mjs';

const folders: string[] = [];
const request = () => ({
  version: 1,
  merchant: { id: 'polkaswap-community-store', name: 'Polkaswap Community Store' },
  chainGenesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  assetId: '0x0200000000000000000000000000000000000000000000000000000000000000',
  payer: 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ',
  recipient: 'cnRsfMpGQ24tCKDLBbwde6NrS9ttrXN3hjX3zMHnVDeQokoBA',
  amountCodec: '1759225000000000000',
  decimals: 18,
  denomination: '100000000000000000000000000000000000000',
  reference: 'sp_' + 'a'.repeat(32),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
});
function fixture() {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'refund-rehearsal-')));
  chmodSync(directory, 0o700);
  folders.push(directory);
  const path = join(directory, 'refund-rehearsal-test.json');
  const value = { version: 1, orderId: '01234567-89ab-4def-8123-0123456789ab', paymentRequest: request() };
  writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
  return { directory, path, value, open: () => openRefundHandoff(path, { privateRoot: directory }) };
}
function identity(journal: ReturnType<typeof openRefundHandoff>) {
  const value = journal.state();
  return { orderId: value.orderId, handoffSha256: value.handoffSha256 };
}
afterEach(() => {
  for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('private refund rehearsal journal', () => {
  it('accepts a 30-minute signing expiry and rejects a longer handoff before creating a claim', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      const allowed = fixture();
      allowed.value.paymentRequest.expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      writeFileSync(allowed.path, JSON.stringify(allowed.value));
      const journal = allowed.open();
      expect(journal.claim(identity(journal)).attemptToken).toMatch(/^[a-f0-9]{64}$/);
      const tooLong = fixture();
      tooLong.value.paymentRequest.expiresAt = new Date(Date.now() + 30 * 60 * 1000 + 1).toISOString();
      writeFileSync(tooLong.path, JSON.stringify(tooLong.value));
      expect(() => tooLong.open()).toThrow();
      expect(existsSync(tooLong.path + '.claim.json')).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });
  it('rechecks the bounded signing window at claim time and keeps expired journals inspectable', () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const f = fixture();
      const journal = f.open();
      const expected = identity(journal);
      clock.mockReturnValue(now - 30 * 60 * 1000);
      expect(() => journal.claim(expected)).toThrow();
      expect(existsSync(f.path + '.claim.json')).toBe(false);
      clock.mockReturnValue(now + 60_000);
      expect(f.open().state().state).toBe('available');
      expect(() => journal.claim(expected)).toThrow();
      expect(existsSync(f.path + '.claim.json')).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });
  it('rejects a stale tab for handoff A after the server switches to handoff B, before claiming B', () => {
    const a = fixture();
    const old = a.open();
    const expectedA = identity(old);
    old.claim(expectedA);
    const b = fixture();
    b.value.paymentRequest.amountCodec = '2000000000000000000';
    writeFileSync(b.path, JSON.stringify(b.value));
    const current = b.open();
    expect(() => current.claim(expectedA)).toThrow();
    expect(existsSync(b.path + '.claim.json')).toBe(false);
    expect(current.claim(identity(current)).attemptToken).toMatch(/^[a-f0-9]{64}$/);
  });
  it('durably claims once and retains uncertain/submitted outcomes across restarts without exposing claim tokens', () => {
    const f = fixture();
    const first = f.open();
    expect(first.state().state).toBe('available');
    const { attemptToken } = first.claim(identity(first));
    expect(JSON.parse(readFileSync(f.path + '.claim.json', 'utf8')).attemptToken).toBe(attemptToken);
    expect(() => first.claim(identity(first))).toThrow();
    expect(() => f.open().claim(identity(f.open()))).toThrow();
    first.outcome('uncertain', { attemptToken });
    expect(f.open().state().state).toBe('uncertain');
    expect(() => first.outcome('canceled', { attemptToken })).toThrow();
    const transactionHash = '0x' + 'f'.repeat(64);
    first.outcome('submitted', { attemptToken, transactionHash });
    first.outcome('submitted', { attemptToken, transactionHash });
    expect(f.open().state()).toMatchObject({ state: 'submitted', transactionHash });
    expect(JSON.stringify(f.open().state())).not.toContain(attemptToken);
    expect(() => first.outcome('submitted', { attemptToken, transactionHash: '0x' + 'e'.repeat(64) })).toThrow();
  });

  it('proven prebroadcast cancellation stays locked and rejects a different claim token', () => {
    const f = fixture();
    const journal = f.open();
    const { attemptToken } = journal.claim(identity(journal));
    expect(() => journal.outcome('canceled', { attemptToken: '0'.repeat(64) })).toThrow();
    journal.outcome('canceled', { attemptToken });
    expect(f.open().state().state).toBe('canceled');
    expect(() => f.open().claim(identity(f.open()))).toThrow();
    expect(() => journal.outcome('submitted', { attemptToken, transactionHash: '0x' + 'f'.repeat(64) })).toThrow();
  });

  it('rejects changed, linked, exposed, malformed and expired handoffs before a claim can be created', () => {
    const f = fixture();
    const journal = f.open();
    writeFileSync(f.path, JSON.stringify({ ...f.value, version: 2 }));
    expect(() => journal.claim(identity(journal))).toThrow();
    expect(existsSync(f.path + '.claim.json')).toBe(false);
    writeFileSync(f.path, JSON.stringify(f.value));
    chmodSync(f.path, 0o644);
    expect(() => f.open()).toThrow();
    chmodSync(f.path, 0o600);
    chmodSync(f.directory, 0o755);
    expect(() => f.open()).toThrow();
    chmodSync(f.directory, 0o700);
    const link = join(f.directory, 'refund-rehearsal-link.json');
    symlinkSync(f.path, link);
    expect(() => openRefundHandoff(link, { privateRoot: f.directory })).toThrow();
    f.value.paymentRequest.expiresAt = new Date(Date.now() - 1000).toISOString();
    writeFileSync(f.path, JSON.stringify(f.value));
    expect(() => f.open().claim(identity(f.open()))).toThrow();
  });

  it.each([
    'payer',
    'recipient',
    'assetId',
    'amountCodec',
    'decimals',
    'chainGenesisHash',
    'denomination',
    'reference',
  ])('rejects altered %s and all secret-bearing extra fields', (field) => {
    const f = fixture();
    const value = structuredClone(f.value) as any;
    value.paymentRequest[field] = field === 'decimals' ? 12 : 'invalid';
    expect(() => validateRefundHandoff(value)).toThrow();
    expect(() => validateRefundHandoff({ ...f.value, operatorToken: 'private' })).toThrow();
    expect(() =>
      validateRefundHandoff({ ...f.value, paymentRequest: { ...f.value.paymentRequest, recoveryToken: 'private' } })
    ).toThrow();
  });
});

describe('refund rehearsal boundary', () => {
  async function invoke(middleware: ReturnType<typeof refundRehearsalMiddleware>, options: Record<string, any> = {}) {
    const req = new PassThrough() as any;
    Object.assign(req, {
      url: '/__store-refund-rehearsal/v1',
      method: 'GET',
      socket: { remoteAddress: '127.0.0.1' },
      rawHeaders: [],
      ...options,
    });
    req.headers = {
      host: '127.0.0.1:41829',
      origin: 'http://127.0.0.1:41829',
      'sec-fetch-site': 'same-origin',
      'x-sora-pay-rehearsal': '1',
      'content-type': 'application/json',
      ...options.headers,
    };
    const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();
    const pending = middleware(req, res, next);
    req.end(options.body ?? '{}');
    await pending;
    return { res, next, value: res.end.mock.calls[0]?.[0] && JSON.parse(res.end.mock.calls[0][0]) };
  }
  it('serves a sanitized request, then one exact claim and one hash without operator access', async () => {
    const f = fixture();
    const middleware = refundRehearsalMiddleware(f.open());
    const response = await invoke(middleware);
    expect(response.res.statusCode).toBe(200);
    expect(response.value).toMatchObject({ state: 'available' });
    const claim = await invoke(middleware, {
      method: 'POST',
      url: '/__store-refund-rehearsal/v1/claim',
      body: JSON.stringify(identity(f.open())),
    });
    expect(claim.res.statusCode).toBe(200);
    const duplicate = await invoke(middleware, {
      method: 'POST',
      url: '/__store-refund-rehearsal/v1/claim',
      body: JSON.stringify(identity(f.open())),
    });
    expect(duplicate.res.statusCode).toBe(409);
    const sent = await invoke(middleware, {
      method: 'POST',
      url: '/__store-refund-rehearsal/v1/submitted',
      body: JSON.stringify({ attemptToken: claim.value.attemptToken, transactionHash: '0x' + 'c'.repeat(64) }),
    });
    expect(sent.res.statusCode).toBe(200);
    expect((await invoke(middleware, { url: '/unrelated' })).next).toHaveBeenCalledOnce();
  });
  it.each([
    { headers: { host: 'localhost:41829' } },
    { headers: { origin: 'https://evil.invalid' } },
    { headers: { 'sec-fetch-site': 'cross-site' } },
    { headers: { 'x-sora-pay-rehearsal': '' } },
    { socket: { remoteAddress: '10.0.0.1' } },
    { method: 'OPTIONS' },
    { url: '/__store-refund-rehearsal/v1?token=x' },
    { url: '/__store-refund-rehearsal/v1/operator' },
    { rawHeaders: ['Host', '127.0.0.1:41829', 'host', '127.0.0.1:41829'] },
    { method: 'POST', url: '/__store-refund-rehearsal/v1/claim', body: '{"amountCodec":"1"}' },
    { method: 'POST', url: '/__store-refund-rehearsal/v1/claim', body: 'x'.repeat(2049) },
  ])('fails closed for %j without creating a signing claim', async (options) => {
    const f = fixture();
    const result = await invoke(refundRehearsalMiddleware(f.open()), options);
    expect(result.res.statusCode).toBe(409);
    expect(existsSync(f.path + '.claim.json')).toBe(false);
  });
  it.each(['production', 'development'])('rejects refund opt-in outside explicit rehearsal mode: %s', (mode) => {
    const plugin = storeRehearsalPlugin({ environment: { [REFUND_HANDOFF_ENV]: '/must-not-read' } });
    expect(() => plugin.config({}, { mode, command: mode === 'production' ? 'build' : 'serve' })).toThrow();
  });
});
