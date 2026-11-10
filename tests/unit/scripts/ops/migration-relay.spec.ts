import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openMigrationStore,
  createMigrationHandler,
  createMigrationDispatcher,
  createTelegramSender,
  migrationTelegramText,
  migrationCsv,
  startMigrationRelay,
  migrationClientObservation,
  migrationReviewThreshold,
  MIGRATION_PATH,
  MIGRATION_PING_PATH,
} from '../../../../scripts/ops/migration-relay.mjs';
import { migrationFixture } from './migration-fixture';
import {
  verifyMigrationSubmission,
  MIGRATION_MAX_AGE_MS,
  MIGRATION_GENESIS,
  MIGRATION_CHECKPOINT,
  migrationMessage,
  migrationRequestId,
  type MigrationIntent,
} from '../../../../scripts/ops/migration-protocol';

beforeAll(cryptoWaitReady);
const stores: ReturnType<typeof openMigrationStore>[] = [];
const directories: string[] = [];
afterEach(() => {
  stores.splice(0).forEach((store) => store.close());
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

function store(filename = ':memory:') {
  const result = openMigrationStore(filename);
  stores.push(result);
  return result;
}

async function request(
  handler,
  body: unknown,
  options: { raw?: string; method?: string; url?: string; headers?: Record<string, string>; peer?: string } = {}
) {
  const req = Object.assign(Readable.from([options.raw ?? JSON.stringify(body)]), {
    method: options.method ?? 'POST',
    url: options.url ?? MIGRATION_PATH,
    headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json', ...options.headers },
    socket: { remoteAddress: options.peer ?? '127.0.0.1' },
  });
  const response = {
    statusCode: 200,
    body: '',
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(value = '') {
      this.body = value;
    },
  };
  await handler(req, response);
  return response;
}

describe('private migration relay', () => {
  it('retains the exact legacy v1 signed message and receipt identity', () => {
    const { intent: original } = migrationFixture();
    const intent = { ...original, createdAt: '2026-10-27T00:00:00.000Z' };
    expect(migrationMessage(intent)).toBe(
      [
        'Polkaswap migration request v1',
        'Domain: polkaswap.io',
        'Network: SORA Nexus mainnet',
        `Genesis: ${MIGRATION_GENESIS}`,
        'Checkpoint block: 28191817',
        `Checkpoint hash: ${MIGRATION_CHECKPOINT}`,
        'Old account: cnWHXYTKQwMV96ZuTKbqTA23FuPcmWjrDyLNzCXYL92G9tmtm',
        'New account: cnUiNGP9GodVEwZQwtfsWQg8HoYbt4CStUWEf9AQf53Lv7nRs',
        'Request nonce: 16df8931-af8d-4f71-bd8f-1f684d615b34',
        'Created at: 2026-10-27T00:00:00.000Z',
        'I request review of the account replacement above.',
        'This off-chain message does not authorize a transaction or transfer funds.',
      ].join('\n')
    );
    expect(migrationRequestId(intent)).toBe('0xd8f2b950a4a88a950d4aac83ddb8309c7919344cbc07d6bf3e965dc918129856');
  });

  it('accepts only the old proof for v2 and reports the new address as unverified to reviewers', async () => {
    const registry = store();
    const { intent: legacy, old, sign } = migrationFixture();
    const intent: MigrationIntent = { ...legacy, version: 2 };
    const submission = { ...intent, oldSignature: sign(old, intent) };
    const response = await request(createMigrationHandler(registry), submission, { headers: clientHeaders() });
    expect(response.statusCode).toBe(202);
    const exported = registry.export()[0];
    expect(exported.submission).toEqual(submission);
    expect(exported.newCrypto).toBeNull();
    expect(exported.reviewSignals.available).toBe(true);
    const message = migrationTelegramText(registry.next());
    expect(message).toContain('Old signature: VALID (sr25519)');
    expect(message).toContain('New account: not signed; control not verified');
    expect(message).toContain(`New account: ${submission.newAccount}`);
    expect(message).toContain(`Old signature: ${submission.oldSignature}`);
    expect(message).not.toContain('New signature:');
    expect(message).toContain('Browser marker reference: B-');
    expect(message.length).toBeLessThan(4096);
    const csv = migrationCsv(registry.export()).trim().split('\n');
    expect(csv[0]).toContain('"old_signature","new_signature","old_crypto","new_crypto"');
    expect(csv[0]).toMatch(/,"protocol_version","new_account_control","ip_country_code","ip_country_name"$/);
    expect(csv[1]).toContain(`"${submission.oldSignature}","","sr25519",""`);
    expect(csv[1]).toMatch(/,"2","not_verified","",""$/);
    expect(csv[1]).not.toMatch(/undefined|null/);
  });

  it('rejects missing or wrong v2 old proofs, destination tampering and protocol downgrade attempts', async () => {
    const registry = store();
    const { intent: legacy, submission: dual, old, next, other, sign } = migrationFixture();
    const intent: MigrationIntent = { ...legacy, version: 2 };
    const submission = { ...intent, oldSignature: sign(old, intent) };
    const handler = createMigrationHandler(registry);
    for (const payload of [
      intent,
      { ...submission, oldSignature: sign(next, intent) },
      { ...submission, newAccount: other.address },
      { ...submission, newSignature: sign(next, intent) },
      { ...intent, oldSignature: dual.oldSignature },
      { ...dual, version: 2 },
      { ...legacy, oldSignature: dual.oldSignature },
    ])
      expect((await request(handler, payload)).statusCode).toBe(400);
    expect(registry.export()).toEqual([]);
  });

  it('preserves retained v1 evidence and resumes v2 delivery after restart without duplicating either request', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-version-compatibility-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = openMigrationStore(filename);
    const fixture = migrationFixture();
    const v1 = verifyMigrationSubmission(fixture.submission);
    const original = registry.accept(v1);
    registry.delivered(v1.requestId, 10);
    const intent: MigrationIntent = { ...fixture.intent, version: 2 };
    const submission = { ...intent, oldSignature: fixture.sign(fixture.old, intent) };
    const handler = createMigrationHandler(registry);
    const first = await request(handler, submission, { headers: clientHeaders() });
    expect(first.statusCode).toBe(202);
    registry.close();
    const reopened = store(filename);
    const restarted = createMigrationHandler(reopened);
    expect((await request(restarted, submission, { headers: clientHeaders(otherBrowserId) })).body).toBe(first.body);
    expect((await request(restarted, fixture.submission)).statusCode).toBe(202);
    const inspection = new DatabaseSync(filename, { readOnly: true });
    try {
      expect(inspection.prepare('SELECT evidence FROM requests WHERE id = ?').get(v1.requestId)?.evidence).toBe(
        original.evidence
      );
    } finally {
      inspection.close();
    }
    const rows = reopened.export();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.submission.version === 1)).toMatchObject({
      newCrypto: 'sr25519',
      telegram: 'sent',
      telegramMessageId: 10,
      submission: fixture.submission,
    });
    const pending = reopened.next();
    expect(JSON.parse(pending.evidence).submission).toEqual(submission);
    expect(pending.reviewSignals.sameBrowserAccounts).toBe(1);
    const send = vi.fn().mockResolvedValue(11);
    await createMigrationDispatcher(reopened, send)();
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toContain('New account: not signed; control not verified');
    expect(reopened.export().every((row) => row.telegram === 'sent')).toBe(true);
    expect(reopened.next()).toBeUndefined();
    expect(migrationCsv(reopened.export())).toContain('"1","signature_verified"');
  });

  it('saves independently verified evidence before acknowledgement and deduplicates retries across restarts', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-registry-'));
    directories.push(directory);
    const path = join(directory, 'registry.sqlite');
    const registry = openMigrationStore(path);
    const { submission } = migrationFixture();
    const handler = createMigrationHandler(registry);
    const response = await request(handler, submission);
    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toMatchObject({ status: 'received', telegram: 'pending' });
    expect((await request(handler, submission)).body).toBe(response.body);
    registry.close();
    const reopened = store(path);
    expect(reopened.export()).toHaveLength(1);
    expect(reopened.export()[0].submission).toEqual(submission);
    expect(reopened.next().id).toBe(JSON.parse(response.body).requestId);
  });

  it('rejects forged/tampered/expired evidence and client-supplied verification or Telegram targets', async () => {
    const registry = store();
    const { submission, other } = migrationFixture();
    const handler = createMigrationHandler(registry);
    for (const payload of [
      { ...submission, newSignature: submission.oldSignature },
      { ...submission, newAccount: other.address },
      { ...submission, verified: true },
      { ...submission, chatId: '-123' },
      { ...submission, oldSignature: '' },
    ]) {
      expect((await request(handler, payload)).statusCode).toBe(400);
    }
    const expired = createMigrationHandler(registry, {
      now: () => Date.parse(submission.createdAt) + MIGRATION_MAX_AGE_MS + 1,
    });
    expect((await request(expired, submission)).statusCode).toBe(400);
    expect(registry.export()).toEqual([]);
  });

  it('enforces exact CORS, methods, content type and bounded bodies without a public registry read endpoint', async () => {
    const handler = createMigrationHandler(store());
    const { submission } = migrationFixture();
    expect((await request(handler, submission, { headers: { origin: 'https://evil.example' } })).statusCode).toBe(403);
    expect((await request(handler, submission, { method: 'GET' })).statusCode).toBe(405);
    expect((await request(handler, submission, { url: '/api/migration/requests' })).statusCode).toBe(404);
    expect((await request(handler, submission, { headers: { cookie: 'secret' } })).statusCode).toBe(400);
    expect((await request(handler, submission, { headers: { 'content-type': 'text/plain' } })).statusCode).toBe(415);
    expect((await request(handler, submission, { raw: '{' })).statusCode).toBe(400);
    expect((await request(handler, submission, { raw: 'a'.repeat(4097) })).statusCode).toBe(413);
    expect((await request(handler, submission, { headers: { 'content-encoding': 'gzip' } })).statusCode).toBe(413);
    const preflight = await request(
      handler,
      {},
      {
        method: 'OPTIONS',
        headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
      }
    );
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['Access-Control-Allow-Origin']).toBe('https://polkaswap.io');
    expect(
      (await request(handler, {}, { method: 'OPTIONS', headers: { 'access-control-request-method': 'DELETE' } }))
        .statusCode
    ).toBe(405);
  });

  it('bounds intake attempts, including concurrent body reads and invalid submissions', async () => {
    const handler = createMigrationHandler(store(), { maxPerMinute: 1 });
    const { submission } = migrationFixture();
    const results = await Promise.all([request(handler, submission), request(handler, submission)]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([202, 429]);
  });

  it('preserves conflicting mappings and labels them for review', () => {
    const registry = store();
    const { submission, intent, old, other, sign } = migrationFixture();
    registry.accept(verifyMigrationSubmission(submission));
    const conflicting = { ...intent, newAccount: other.address };
    registry.accept(
      verifyMigrationSubmission({
        ...conflicting,
        oldSignature: sign(old, conflicting),
        newSignature: sign(other, conflicting),
      })
    );
    const rows = registry.export();
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.conflict)).toHaveLength(2);
    expect(rows.every((row) => row.review === 'required')).toBe(true);
    expect(migrationCsv(rows)).toContain('"old_account","new_account"');
    expect(migrationCsv(rows)).toContain(submission.oldSignature);
    expect(migrationTelegramText(registry.next())).toContain('Old signature: VALID (sr25519)');
    expect(migrationTelegramText(registry.next())).toContain('does not confirm on-chain protection');
    expect(migrationTelegramText(registry.next())).toContain('or authorize ownership release');
    expect(migrationTelegramText(registry.next()).length).toBeLessThan(4096);
  });

  it('keeps accepted evidence pending after Telegram failure, then retries without another intake row', async () => {
    const registry = store();
    const { submission } = migrationFixture();
    let now = Date.now();
    registry.accept(verifyMigrationSubmission(submission), now);
    const send = vi.fn().mockRejectedValueOnce(new Error('token must never be logged')).mockResolvedValueOnce(123);
    const dispatch = createMigrationDispatcher(registry, send, () => now);
    await dispatch();
    await dispatch();
    expect(send).toHaveBeenCalledOnce();
    expect(registry.export()[0].telegram).toBe('pending');
    now += 300_000;
    await dispatch();
    expect(registry.export()[0].telegram).toBe('sent');
    expect(registry.export()[0].telegramMessageId).toBe(123);
    expect(registry.export()).toHaveLength(1);
    expect(send.mock.calls[0][0]).toBe(send.mock.calls[1][0]);
  });

  it('suppresses overlapping dispatch calls and resumes reserved jobs after a restart delay', async () => {
    const registry = store();
    const { submission } = migrationFixture();
    const now = Date.now();
    registry.accept(verifyMigrationSubmission(submission), now);
    let done!: (value: number) => void;
    const send = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          done = resolve;
        })
    );
    const dispatch = createMigrationDispatcher(registry, send, () => now);
    const first = dispatch();
    await dispatch();
    expect(send).toHaveBeenCalledOnce();
    done(42);
    await first;
    expect(registry.next(now + 300_000)).toBeUndefined();
  });

  it('uses only the configured Telegram chat/topic and confirms Telegram acknowledged a message', async () => {
    const fetchMock = vi.fn(
      async (
        _url: string,
        _options: RequestInit
      ): Promise<{
        ok: boolean;
        json(): Promise<{ ok: boolean; result?: { message_id: number } }>;
      }> => ({ ok: true, json: async () => ({ ok: true, result: { message_id: 17 } }) })
    );
    const token = '12345:abcdefghijklmnopqrstuvwxyz';
    const sender = createTelegramSender({ token, chatId: '-100123456', threadId: '7', fetchImpl: fetchMock });
    expect(await sender('test')).toBe(17);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({
      chat_id: '-100123456',
      message_thread_id: 7,
      text: 'test',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.telegram.org/bot${token}/sendMessage`);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false }) });
    await expect(sender('test')).rejects.toThrow('telegram_unconfirmed');
    expect(() => createTelegramSender({ token: '', chatId: '' })).toThrow();
    expect(() => startMigrationRelay({ filename: ':memory:', send: sender, port: 0 })).toThrow('port');
  });

  it('returns no success acknowledgement when persistence fails', async () => {
    const handler = createMigrationHandler({
      accept() {
        throw new Error('disk_full');
      },
    });
    expect((await request(handler, migrationFixture().submission)).statusCode).toBe(503);
  });
});

const browserId = '6aa91c6a-74c9-4778-9610-f18a76b22520';
const otherBrowserId = 'f92f19f7-ec19-4c96-aabb-85c501651319';
const clientProfile = {
  platform: 'MacIntel',
  languages: ['en-US', 'ja-JP'],
  timezone: 'Asia/Tokyo',
  screen: [1440, 900, 24],
  cores: 8,
};
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 Chrome/144.0.1234.56 Safari/537.36';
const clientIp = '203.0.113.29';

/** Tests use only development wallets and synthetic browser/network hints. */
function claim(accountIndex = 0, nonceIndex = 0, createdAt = new Date().toISOString()) {
  const fixture = migrationFixture();
  const pairs = [fixture.old, fixture.next, fixture.other];
  const old = pairs[accountIndex];
  const next = pairs[(accountIndex + 1) % pairs.length];
  const intent = {
    ...fixture.intent,
    oldAccount: old.address,
    newAccount: next.address,
    nonce: `16df8931-af8d-4f71-bd8f-${nonceIndex.toString().padStart(12, '0')}`,
    createdAt,
  };
  return { ...intent, oldSignature: fixture.sign(old, intent), newSignature: fixture.sign(next, intent) };
}

/** Encode exactly the optional client header; arbitrary values exercise fail-soft validation. */
function encodeObservation(value: unknown = { version: 1, browserId, profile: clientProfile }) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function clientHeaders(id = browserId) {
  return {
    'x-migration-client': encodeObservation({ version: 1, browserId: id, profile: clientProfile }),
    'x-migration-client-ip': clientIp,
    'user-agent': userAgent,
  };
}

/** Inspect persisted non-secret tables; tests never select the private HMAC key. */
function storedObservations(filename: string) {
  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    return database.prepare('SELECT * FROM observations ORDER BY request_id').all();
  } finally {
    database.close();
  }
}

describe('private approximate IP country review', () => {
  it('looks up only the trusted proxy IP after valid signatures and keeps country private', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-country-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = store(filename);
    const countryLookup = vi.fn((ip: string) => (ip === clientIp ? 'JP' : null));
    const handler = createMigrationHandler(registry, { countryLookup });
    const fixture = migrationFixture();
    const intent: MigrationIntent = { ...fixture.intent, version: 2 };
    const submission = { ...intent, oldSignature: fixture.sign(fixture.old, intent) };
    const response = await request(handler, submission, {
      peer: '::ffff:127.0.0.1',
      headers: {
        ...clientHeaders(),
        'x-forwarded-for': '198.51.100.55',
        'cf-ipcountry': 'US',
        'x-migration-country': 'US',
      },
    });
    expect(response.statusCode).toBe(202);
    expect(countryLookup).toHaveBeenCalledExactlyOnceWith(clientIp);
    expect(Object.keys(JSON.parse(response.body)).sort()).toEqual(['requestId', 'status', 'telegram']);
    const row = registry.export()[0];
    expect(row.submission).toEqual(submission);
    expect(row.reviewSignals).toMatchObject({ ipCountryCode: 'JP', ipCountryName: 'Japan' });
    expect(storedObservations(filename)[0].country_code).toBe('JP');
    const telegram = migrationTelegramText(registry.next());
    expect(telegram).toContain('IP country (approximate): Japan (JP)');
    expect(telegram).toContain('VPNs and proxies may affect');
    expect(telegram).toContain('IP Geolocation by DB-IP: https://db-ip.com (CC BY 4.0)');
    expect(telegram).toContain('New account: not signed; control not verified');
    expect(migrationCsv([row])).toContain('"ip_country_code","ip_country_name"');
    expect(migrationCsv([row])).toContain('"JP","Japan"');
    const persisted = new DatabaseSync(filename, { readOnly: true });
    try {
      for (const text of [
        response.body,
        JSON.stringify(row),
        migrationCsv([row]),
        telegram,
        JSON.stringify(persisted.prepare('SELECT * FROM requests').all()),
        JSON.stringify(storedObservations(filename)),
      ])
        for (const raw of [clientIp, '198.51.100.55', browserId, userAgent]) expect(text).not.toContain(raw);
    } finally {
      persisted.close();
    }
  });

  it('ignores spoofed IP/country headers on direct peers and does not infer country from missing proxy addresses', async () => {
    const registry = store();
    const countryLookup = vi.fn((ip: string) => (ip === '198.51.100.8' ? 'DE' : 'JP'));
    const handler = createMigrationHandler(registry, { countryLookup });
    await request(handler, claim(0), {
      peer: '198.51.100.8',
      headers: { ...clientHeaders(), 'x-forwarded-for': clientIp, 'x-migration-country': 'US' },
    });
    expect(countryLookup).toHaveBeenCalledExactlyOnceWith('198.51.100.8');
    expect(registry.export()[0].reviewSignals).toMatchObject({ ipCountryCode: 'DE', ipCountryName: 'Germany' });
    await request(handler, claim(1), {
      peer: '127.0.0.1',
      headers: { 'x-migration-client': encodeObservation(), 'x-forwarded-for': clientIp, 'cf-ipcountry': 'JP' },
    });
    expect(countryLookup).toHaveBeenCalledTimes(1);
    expect(
      registry.export().find((row) => row.submission.oldAccount === claim(1).oldAccount)?.reviewSignals
    ).toMatchObject({
      ipCountryCode: null,
      ipCountryName: null,
    });
  });

  it('requires verified evidence and a valid consented observation before any country lookup', async () => {
    const registry = store();
    const countryLookup = vi.fn(() => 'JP');
    const handler = createMigrationHandler(registry, { countryLookup });
    expect((await request(handler, { ...claim(), oldSignature: '' }, { headers: clientHeaders() })).statusCode).toBe(
      400
    );
    expect(countryLookup).not.toHaveBeenCalled();
    for (const headers of [
      {},
      { ...clientHeaders(), 'x-migration-client': 'invalid!!' },
      {
        ...clientHeaders(),
        'x-migration-client': encodeObservation({ version: 1, browserId, profile: clientProfile, countryCode: 'JP' }),
      },
    ]) {
      const response = await request(handler, claim(), { headers });
      expect(response.statusCode).toBe(202);
    }
    expect(countryLookup).not.toHaveBeenCalled();
    expect(registry.export()[0].reviewSignals).toMatchObject({
      available: false,
      ipCountryCode: null,
      ipCountryName: null,
    });
  });

  it('keeps missing, unknown, invalid or failing local lookups optional', async () => {
    for (const countryLookup of [
      undefined,
      null,
      () => null,
      () => undefined,
      () => 'ZZ',
      () => 'jp',
      () => 'Japan',
      () => 'JP\nforged',
      () => {
        throw new Error('private lookup failure');
      },
    ]) {
      const registry = store();
      const response = await request(createMigrationHandler(registry, { countryLookup }), claim(), {
        headers: clientHeaders(),
      });
      expect(response.statusCode).toBe(202);
      expect(registry.export()[0].reviewSignals).toMatchObject({
        available: true,
        ipCountryCode: null,
        ipCountryName: null,
      });
      const telegram = migrationTelegramText(registry.next());
      expect(telegram).toContain('IP country (approximate): unknown');
      expect(telegram).not.toContain('IP Geolocation by DB-IP:');
      expect(telegram).not.toContain('private lookup failure');
      expect(migrationCsv(registry.export()).trim().split('\n')[1]).toMatch(/,"",""$/);
    }
  });

  it('persists the first country across restarts and ignores changed lookup results on retries', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-country-retry-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const initial = openMigrationStore(filename);
    const submission = claim();
    await request(createMigrationHandler(initial, { countryLookup: () => 'JP' }), submission, {
      headers: clientHeaders(),
    });
    const original = storedObservations(filename);
    initial.close();
    const reopened = store(filename);
    await request(createMigrationHandler(reopened, { countryLookup: () => 'DE' }), submission, {
      headers: clientHeaders(otherBrowserId),
    });
    expect(storedObservations(filename)).toEqual(original);
    expect(reopened.export()[0].reviewSignals).toMatchObject({ ipCountryCode: 'JP', ipCountryName: 'Japan' });
    expect(migrationTelegramText(reopened.next())).toContain('Japan (JP)');
    const withoutCountry = claim(1);
    await request(createMigrationHandler(reopened), withoutCountry, { headers: clientHeaders() });
    await request(createMigrationHandler(reopened, { countryLookup: () => 'JP' }), withoutCountry, {
      headers: clientHeaders(),
    });
    expect(
      reopened.export().find((row) => row.submission.oldAccount === withoutCountry.oldAccount)?.reviewSignals
        .ipCountryCode
    ).toBeNull();
  });

  it('exports older observation schemas read-only and upgrades without inventing or changing evidence', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-country-legacy-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const initial = openMigrationStore(filename);
    await request(createMigrationHandler(initial), claim(), { headers: clientHeaders() });
    const before = initial.export()[0];
    initial.close();
    const legacy = new DatabaseSync(filename);
    legacy.exec('ALTER TABLE observations DROP COLUMN country_code');
    legacy.close();
    const reader = openMigrationStore(filename, { readOnly: true });
    try {
      expect(reader.export()[0]).toEqual(before);
      expect(reader.export()[0].reviewSignals).toMatchObject({
        available: true,
        ipCountryCode: null,
        ipCountryName: null,
      });
    } finally {
      reader.close();
    }
    expect(Object.hasOwn(storedObservations(filename)[0], 'country_code')).toBe(false);
    const upgraded = store(filename);
    expect(upgraded.export()[0]).toEqual(before);
    expect(storedObservations(filename)[0].country_code).toBeNull();
    await request(createMigrationHandler(upgraded, { countryLookup: () => 'JP' }), claim(1), {
      headers: clientHeaders(),
    });
    expect(
      upgraded.export().find((row) => row.submission.oldAccount === claim(1).oldAccount)?.reviewSignals.ipCountryCode
    ).toBe('JP');
  });

  it('expires country with its observation while retaining signed evidence and preventing retry recapture', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-country-expiry-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = store(filename);
    const initialTime = Date.now();
    let now = initialTime;
    const submission = claim(0, 0, new Date(now).toISOString());
    const handler = createMigrationHandler(registry, { countryLookup: () => 'JP', now: () => now });
    await request(handler, submission, { headers: clientHeaders() });
    expect(registry.export(now)[0].reviewSignals.ipCountryCode).toBe('JP');
    now += MIGRATION_MAX_AGE_MS + 1;
    expect(registry.export(now)[0].reviewSignals).toMatchObject({
      available: false,
      ipCountryCode: null,
      ipCountryName: null,
    });
    expect(migrationTelegramText(registry.next(now))).toContain('IP country (approximate): unknown');
    expect(storedObservations(filename)[0].country_code).toBe('JP');
    await request(handler, claim(1, 0, new Date(now).toISOString()), { headers: clientHeaders() });
    registry.accept(verifyMigrationSubmission(submission), now, {
      ...migrationClientObservation({ headers: clientHeaders(), socket: { remoteAddress: '127.0.0.1' } }),
      countryCode: 'DE',
    });
    expect(storedObservations(filename)).toHaveLength(1);
    expect(registry.export(now)).toHaveLength(2);
    expect(
      registry.export(now).find((row) => row.submission.oldAccount === submission.oldAccount)?.reviewSignals
        .ipCountryCode
    ).toBeNull();
  });

  it.each(['sr25519', 'ed25519', 'ecdsa'] as const)(
    'keeps country attribution and complete %s proofs within Telegram limits',
    async (type) => {
      const fixture = migrationFixture(type);
      for (const version of [1, 2] as const) {
        const registry = store();
        const intent: MigrationIntent = { ...fixture.intent, version };
        const submission =
          version === 1 ? fixture.submission : { ...intent, oldSignature: fixture.sign(fixture.old, intent) };
        await request(createMigrationHandler(registry, { countryLookup: () => 'GS' }), submission, {
          headers: clientHeaders(),
        });
        const text = migrationTelegramText({
          ...registry.next(),
          conflict: 1,
          reviewSignals: {
            ...registry.export()[0].reviewSignals,
            sameBrowserAccounts: Number.MAX_SAFE_INTEGER,
            similarBrowserNetworkAccounts: Number.MAX_SAFE_INTEGER,
            flags: ['repeated_browser', 'similar_browser_network'],
          },
        });
        expect(text.length).toBeLessThan(4096);
        expect(text).toContain('(GS)');
        expect(text).toContain('IP Geolocation by DB-IP:');
        expect(text).toContain(`Old signature: VALID (${type})`);
        expect(text).toContain(submission.oldSignature);
        expect(text.includes('New signature: VALID')).toBe(version === 1);
      }
    }
  );
});

describe('private migration abuse review signals', () => {
  it('validates the private review threshold without requiring a service or credential', () => {
    expect(migrationReviewThreshold({})).toBe(3);
    for (const value of ['2', '3', '100'])
      expect(migrationReviewThreshold({ MIGRATION_REVIEW_ACCOUNT_THRESHOLD: value })).toBe(Number(value));
    for (const value of ['', '1', '101', '-2', '3.5', '03', ' 3', 'true'])
      expect(() => migrationReviewThreshold({ MIGRATION_REVIEW_ACCOUNT_THRESHOLD: value })).toThrow('threshold');
    expect(() => openMigrationStore(':memory:', { reviewThreshold: 1 })).toThrow('threshold');
  });

  it('persists only keyed groups across restarts and counts distinct old accounts without denying flagged claims', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-observations-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const initial = openMigrationStore(filename);
    const handler = createMigrationHandler(initial);
    const first = await request(handler, claim(0, 0), { headers: clientHeaders() });
    expect(first.statusCode).toBe(202);
    expect((await request(handler, claim(0, 1), { headers: clientHeaders() })).statusCode).toBe(202);
    expect(initial.export()[0].reviewSignals.sameBrowserAccounts).toBe(1);
    const initialReference = initial.export()[0].reviewSignals.browserReference;
    initial.close();
    const reopened = store(filename);
    const restarted = createMigrationHandler(reopened);
    expect(reopened.export()[0].reviewSignals.browserReference).toBe(initialReference);
    expect((await request(restarted, claim(1, 2), { headers: clientHeaders() })).statusCode).toBe(202);
    expect(reopened.export()[0].reviewSignals.flags).toEqual([]);
    const flagged = await request(restarted, claim(2, 3), { headers: clientHeaders() });
    expect(flagged.statusCode).toBe(202);
    expect(Object.keys(JSON.parse(flagged.body)).sort()).toEqual(['requestId', 'status', 'telegram']);
    for (const row of reopened.export())
      expect(row.reviewSignals).toEqual({
        available: true,
        windowDays: 7,
        sameBrowserAccounts: 3,
        similarBrowserNetworkAccounts: 3,
        browserReference: expect.stringMatching(/^B-[0-9a-f]{16}$/),
        networkReference: expect.stringMatching(/^N-[0-9a-f]{16}$/),
        latencyBucketMs: null,
        ipCountryCode: null,
        ipCountryName: null,
        flags: ['repeated_browser', 'similar_browser_network'],
      });
    const observations = storedObservations(filename);
    expect(observations).toHaveLength(4);
    expect(new Set(observations.map((row) => row.browser_hash)).size).toBe(1);
    expect(new Set(observations.map((row) => row.network_profile_hash)).size).toBe(1);
    expect(observations[0].browser_hash).toMatch(/^browser-v1:[0-9a-f]{64}$/);
    expect(observations[0].network_profile_hash).toMatch(/^network-profile-v1:[0-9a-f]{64}$/);
    expect(new Set(reopened.export().map((row) => row.reviewSignals.browserReference)).size).toBe(1);
    expect(new Set(reopened.export().map((row) => row.reviewSignals.networkReference)).size).toBe(1);
    expect(reopened.export()[0].reviewSignals.browserReference).toBe(
      `B-${String(observations[0].browser_hash).slice(-64, -48)}`
    );
    expect(reopened.export()[0].reviewSignals.networkReference).toBe(
      `N-${String(observations[0].network_profile_hash).slice(-64, -48)}`
    );
    expect(flagged.body).not.toContain(reopened.export()[0].reviewSignals.browserReference);
    expect(flagged.body).not.toContain(reopened.export()[0].reviewSignals.networkReference);
    expect(statSync(filename).mode & 0o777).toBe(0o600);
    const inspection = new DatabaseSync(filename, { readOnly: true });
    try {
      expect(
        inspection.prepare('SELECT count(*) AS total, length(value) AS bytes FROM private_metadata').get()
      ).toMatchObject({ total: 1, bytes: 32 });
      const persisted = JSON.stringify({
        requests: inspection.prepare('SELECT * FROM requests').all(),
        observations,
      });
      const exported = JSON.stringify(reopened.export()) + migrationCsv(reopened.export());
      const telegram = migrationTelegramText(reopened.next());
      for (const raw of [browserId, clientIp, userAgent, clientProfile.platform, clientProfile.timezone, 'en-US']) {
        expect(persisted).not.toContain(raw);
        expect(exported).not.toContain(raw);
        expect(telegram).not.toContain(raw);
      }
      for (const row of observations) {
        expect(exported).not.toContain(String(row.browser_hash));
        expect(exported).not.toContain(String(row.network_profile_hash));
        expect(telegram).not.toContain(String(row.browser_hash));
        expect(telegram).not.toContain(String(row.network_profile_hash));
      }
      expect(exported).toContain('review_signals_available');
      expect(telegram).toContain('Abuse review signals (not ownership proof)');
      expect(telegram).toContain(`Browser marker reference: ${reopened.export()[0].reviewSignals.browserReference}`);
      expect(telegram).toContain(
        `Browser/network fingerprint reference: ${reopened.export()[0].reviewSignals.networkReference}`
      );
      expect(migrationCsv(reopened.export())).toContain('browser_network_reference');
      expect(telegram).toContain('same browser 3; similar browser/network 3');
    } finally {
      inspection.close();
    }
  });

  it('keeps first observations immutable for simultaneous and later exact retries, including initially unavailable hints', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-observation-retries-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = store(filename);
    let now = Date.now();
    const handler = createMigrationHandler(registry, { now: () => now });
    const submission = claim(0, 0, new Date(now).toISOString());
    const responses = await Promise.all([
      request(handler, submission, { headers: clientHeaders() }),
      request(handler, submission, { headers: clientHeaders(otherBrowserId) }),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([202, 202]);
    const original = storedObservations(filename);
    const originalReferences = registry.export()[0].reviewSignals;
    expect(original).toHaveLength(1);
    now += 60_000;
    expect((await request(handler, submission, { headers: clientHeaders(otherBrowserId) })).statusCode).toBe(202);
    expect(storedObservations(filename)).toEqual(original);
    expect(registry.export()[0].reviewSignals.browserReference).toBe(originalReferences.browserReference);
    expect(registry.export()[0].reviewSignals.networkReference).toBe(originalReferences.networkReference);
    const legacy = claim(1, 0, new Date(now).toISOString());
    await request(handler, legacy);
    await request(handler, legacy, { headers: clientHeaders() });
    expect(storedObservations(filename)).toEqual(original);
    expect(
      registry.export(now).find((row) => row.submission.oldAccount === legacy.oldAccount)?.reviewSignals.available
    ).toBe(false);
  });

  it('canonicalizes profile key order and mapped addresses while separating independent marker/network groups', async () => {
    const registry = openMigrationStore(':memory:', { reviewThreshold: 2 });
    stores.push(registry);
    const handler = createMigrationHandler(registry);
    await request(handler, claim(0), { headers: clientHeaders() });
    const reordered = {
      cores: 8,
      timezone: 'Asia/Tokyo',
      screen: [1440, 900, 24],
      languages: ['en-US', 'ja-JP'],
      platform: 'MacIntel',
    };
    await request(handler, claim(1), {
      peer: '::ffff:127.0.0.1',
      headers: {
        ...clientHeaders(otherBrowserId),
        'x-migration-client': encodeObservation({ profile: reordered, browserId: otherBrowserId, version: 1 }),
        'x-migration-client-ip': `::ffff:${clientIp}`,
        'user-agent': userAgent.replace('1234.56', '9999.88'),
      },
    });
    let rows = registry.export();
    expect(rows[0].reviewSignals).toMatchObject({
      sameBrowserAccounts: 1,
      similarBrowserNetworkAccounts: 2,
      flags: ['similar_browser_network'],
    });
    await request(handler, claim(2), { headers: { ...clientHeaders(), 'x-migration-client-ip': '198.51.100.74' } });
    rows = registry.export();
    const third = rows.find((row) => row.submission.oldAccount === claim(2).oldAccount);
    expect(third?.reviewSignals).toMatchObject({
      sameBrowserAccounts: 2,
      similarBrowserNetworkAccounts: 1,
      flags: ['repeated_browser'],
    });
  });

  it('does not trust forwarding headers on direct connections or collapse missing proxy IPs into a network group', async () => {
    const registry = store();
    const handler = createMigrationHandler(registry);
    await request(handler, claim(0), { peer: '198.51.100.7', headers: clientHeaders() });
    await request(handler, claim(1), {
      peer: '198.51.100.8',
      headers: { ...clientHeaders(), 'x-forwarded-for': '198.51.100.7' },
    });
    expect(registry.export().every((row) => row.reviewSignals.similarBrowserNetworkAccounts === 1)).toBe(true);
    const headers = { 'x-migration-client': encodeObservation(), 'user-agent': userAgent, 'x-forwarded-for': clientIp };
    await request(handler, claim(2), { peer: '::1', headers });
    const missing = registry.export().find((row) => row.submission.oldAccount === claim(2).oldAccount);
    expect(missing?.reviewSignals).toMatchObject({
      available: true,
      sameBrowserAccounts: 3,
      similarBrowserNetworkAccounts: 0,
      networkReference: null,
    });
    for (const address of ['203.0.113.1, 203.0.113.2', '203.0.113.1:80', 'fe80::1%en0', 'not-an-ip'])
      expect(
        migrationClientObservation({
          headers: { ...clientHeaders(), 'x-migration-client-ip': address },
          socket: { remoteAddress: '127.0.0.1' },
        })?.networkIp
      ).toBeNull();
  });

  it('separates different profiles and coarse browser versions while keeping marker counts independent', async () => {
    const registry = store();
    const handler = createMigrationHandler(registry);
    await request(handler, claim(0), { headers: clientHeaders() });
    await request(handler, claim(1), {
      headers: {
        ...clientHeaders(),
        'x-migration-client': encodeObservation({ version: 1, browserId, profile: { ...clientProfile, cores: 16 } }),
      },
    });
    await request(handler, claim(2), {
      headers: { ...clientHeaders(), 'user-agent': userAgent.replace('Chrome/144.', 'Chrome/145.') },
    });
    expect(registry.export().every((row) => row.reviewSignals.sameBrowserAccounts === 3)).toBe(true);
    expect(registry.export().every((row) => row.reviewSignals.similarBrowserNetworkAccounts === 1)).toBe(true);
    expect(registry.export().every((row) => row.reviewSignals.flags.join(',') === 'repeated_browser')).toBe(true);
  });

  it('uses independent private keys for separate registries', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-private-key-'));
    directories.push(directory);
    const hashes: unknown[] = [];
    for (const name of ['first.sqlite', 'second.sqlite']) {
      const filename = join(directory, name);
      const registry = store(filename);
      await request(createMigrationHandler(registry), claim(), { headers: clientHeaders() });
      hashes.push(storedObservations(filename)[0].browser_hash);
    }
    expect(hashes[0]).not.toEqual(hashes[1]);
  });

  it('expires signals on reads and purges only observations during intake without allowing retry recapture', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-observation-retention-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = store(filename);
    const initialTime = Date.now();
    let now = initialTime;
    const handler = createMigrationHandler(registry, { now: () => now });
    const submission = claim(0, 0, new Date(now).toISOString());
    await request(handler, submission, {
      headers: {
        ...clientHeaders(),
        'x-migration-client': encodeObservation({
          version: 1,
          browserId,
          profile: clientProfile,
          latencyBucketMs: 250,
        }),
      },
    });
    now += MIGRATION_MAX_AGE_MS + 1;
    expect(registry.export(now)[0].reviewSignals.available).toBe(false);
    expect(registry.export(now)[0].reviewSignals.browserReference).toBeNull();
    expect(registry.export(now)[0].reviewSignals.networkReference).toBeNull();
    expect(registry.export(now)[0].reviewSignals.latencyBucketMs).toBeNull();
    expect(registry.next(now).reviewSignals.available).toBe(false);
    expect(storedObservations(filename)).toHaveLength(1);
    const fresh = claim(1, 0, new Date(now).toISOString());
    expect((await request(handler, fresh, { headers: clientHeaders() })).statusCode).toBe(202);
    expect(storedObservations(filename)).toHaveLength(1);
    expect(registry.export(now)).toHaveLength(2);
    expect(registry.export(now).every((row) => row.telegram === 'pending')).toBe(true);
    registry.accept(
      verifyMigrationSubmission(submission),
      now,
      migrationClientObservation({ headers: clientHeaders(), socket: { remoteAddress: '127.0.0.1' } })
    );
    expect(storedObservations(filename)).toHaveLength(1);
    expect(
      registry.export(now).find((row) => row.submission.oldAccount === fresh.oldAccount)?.reviewSignals
        .sameBrowserAccounts
    ).toBe(1);
  });

  it('accepts missing or malformed client observations with unavailable signals and verifies the signed body first', async () => {
    const malformed = [
      '',
      'a'.repeat(2049),
      'not base64',
      'e30=',
      Buffer.from([0xff]).toString('base64url'),
      encodeObservation({ version: 2, browserId, profile: clientProfile }),
      encodeObservation({ version: 1, browserId, profile: clientProfile, secret: 'extra' }),
      encodeObservation({ version: 1, browserId: 'not-a-uuid', profile: clientProfile }),
      ...[
        { ...clientProfile, platform: 'x'.repeat(65) },
        { ...clientProfile, languages: ['a', 'b', 'c', 'd'] },
        { ...clientProfile, languages: ['x'.repeat(33)] },
        { ...clientProfile, timezone: 'x'.repeat(65) },
        { ...clientProfile, screen: [16385, 900, 24] },
        { ...clientProfile, screen: [1440, -1, 24] },
        { ...clientProfile, screen: [1440, 900, 65] },
        { ...clientProfile, screen: [1440, 900] },
        { ...clientProfile, cores: 257 },
        { ...clientProfile, cores: 1.5 },
        { ...clientProfile, cores: '8' },
        { ...clientProfile, platform: 'Mac\nIntel' },
        { ...clientProfile, fingerprint: 'extra' },
      ].map((profile) => encodeObservation({ version: 1, browserId, profile })),
    ];
    const submission = claim();
    for (const header of [undefined, ...malformed]) {
      const registry = store();
      const result = await request(createMigrationHandler(registry), submission, {
        headers: header === undefined ? {} : { 'x-migration-client': header },
      });
      expect(result.statusCode).toBe(202);
      expect(registry.export()[0].reviewSignals).toMatchObject({
        available: false,
        sameBrowserAccounts: 0,
        similarBrowserNetworkAccounts: 0,
        flags: [],
      });
      expect(migrationTelegramText(registry.next())).toContain('Unavailable. No identity or ownership conclusion');
    }
    const accept = vi.fn();
    const invalidRequest = Object.assign(Readable.from([JSON.stringify({ ...submission, oldSignature: '' })]), {
      method: 'POST',
      url: MIGRATION_PATH,
      headers: { origin: 'https://polkaswap.io', 'content-type': 'application/json' },
    });
    Object.defineProperty(invalidRequest.headers, 'x-migration-client', {
      get() {
        throw new Error('observations read before proofs');
      },
    });
    const response = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
    await createMigrationHandler({ accept })(invalidRequest, response);
    expect(response.statusCode).toBe(400);
    expect(accept).not.toHaveBeenCalled();
  });

  it('bounds user agents and narrowly allows only the optional client CORS header', async () => {
    for (const ua of ['x'.repeat(513), 'invalid\nagent'])
      expect(
        migrationClientObservation({
          headers: { ...clientHeaders(), 'user-agent': ua },
          socket: { remoteAddress: '127.0.0.1' },
        })?.userAgent
      ).toBeNull();
    const handler = createMigrationHandler(store());
    const good = await request(
      handler,
      {},
      {
        method: 'OPTIONS',
        headers: {
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type, x-migration-client',
        },
      }
    );
    expect(good.statusCode).toBe(204);
    expect(good.headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-Migration-Client');
    for (const header of ['x-migration-client-ip', 'x-forwarded-for', 'x-migration-challenge'])
      expect(
        (
          await request(
            handler,
            {},
            {
              method: 'OPTIONS',
              headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': header },
            }
          )
        ).statusCode
      ).toBe(400);
  });

  it('exports legacy databases read-only without inventing observations', () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-legacy-export-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const initial = openMigrationStore(filename);
    initial.accept(verifyMigrationSubmission(claim()));
    initial.close();
    const legacy = new DatabaseSync(filename);
    legacy.exec('DROP TABLE observations; DROP TABLE private_metadata;');
    legacy.close();
    const reader = openMigrationStore(filename, { readOnly: true });
    stores.push(reader);
    expect(reader.export()[0].reviewSignals.available).toBe(false);
  });

  it('stores coarse optional latency privately without changing stable browser or network correlation groups', async () => {
    const registry = store();
    const handler = createMigrationHandler(registry);
    for (const [index, latencyBucketMs] of [0, 150, 3000].entries()) {
      const result = await request(handler, claim(index), {
        headers: {
          ...clientHeaders(),
          'x-migration-client': encodeObservation({ version: 1, browserId, profile: clientProfile, latencyBucketMs }),
        },
      });
      expect(result.statusCode).toBe(202);
      expect(Object.keys(JSON.parse(result.body)).sort()).toEqual(['requestId', 'status', 'telegram']);
    }
    expect(
      registry
        .export()
        .map((row) => row.reviewSignals.latencyBucketMs)
        .sort((a, b) => a - b)
    ).toEqual([0, 150, 3000]);
    expect(
      registry
        .export()
        .every(
          (row) => row.reviewSignals.sameBrowserAccounts === 3 && row.reviewSignals.similarBrowserNetworkAccounts === 3
        )
    ).toBe(true);
    expect(migrationCsv(registry.export())).toContain('client_reported_http_latency_bucket_ms');
    expect(migrationTelegramText(registry.next())).toContain('Client-reported approximate HTTP latency:');
    expect(migrationTelegramText(registry.next())).toContain('ms (50 ms bucket)');
    for (const latencyBucketMs of [null, undefined]) {
      const observation = migrationClientObservation({
        headers: {
          ...clientHeaders(),
          'x-migration-client': encodeObservation({ version: 1, browserId, profile: clientProfile, latencyBucketMs }),
        },
        socket: { remoteAddress: '127.0.0.1' },
      });
      expect(observation?.latencyBucketMs).toBeNull();
    }
    for (const latencyBucketMs of [-50, 1, 49, 50.5, 3001, 3050, '100', {}, []]) {
      const other = store();
      const response = await request(createMigrationHandler(other), claim(), {
        headers: {
          ...clientHeaders(),
          'x-migration-client': encodeObservation({ version: 1, browserId, profile: clientProfile, latencyBucketMs }),
        },
      });
      expect(response.statusCode).toBe(202);
      expect(other.export()[0].reviewSignals.available).toBe(false);
      expect(other.export()[0].reviewSignals.latencyBucketMs).toBeNull();
    }
  });

  it('serves a rate-bounded no-store 204 ping only for the exact origin and never touches the registry', async () => {
    const accept = vi.fn();
    let now = Date.now();
    const handler = createMigrationHandler({ accept }, { now: () => now, maxPerMinute: 2 });
    const options = { method: 'GET', url: MIGRATION_PING_PATH };
    const first = await request(handler, {}, options);
    expect(first.statusCode).toBe(204);
    expect(first.body).toBe('');
    expect(first.headers['Cache-Control']).toBe('no-store');
    expect(first.headers['Access-Control-Allow-Origin']).toBe('https://polkaswap.io');
    expect((await request(handler, {}, options)).statusCode).toBe(204);
    expect((await request(handler, {}, options)).statusCode).toBe(429);
    now += 60_000;
    expect((await request(handler, {}, options)).statusCode).toBe(204);
    expect((await request(handler, {}, { ...options, headers: { origin: 'https://other.example' } })).statusCode).toBe(
      403
    );
    expect((await request(handler, {}, { ...options, headers: { origin: '' } })).statusCode).toBe(403);
    expect((await request(handler, {}, { ...options, method: 'POST' })).statusCode).toBe(405);
    expect((await request(handler, {}, { ...options, headers: { cookie: 'secret' } })).statusCode).toBe(400);
    expect((await request(handler, {}, { ...options, url: `${MIGRATION_PING_PATH}?extra=1` })).statusCode).toBe(404);
    const preflight = await request(
      handler,
      {},
      { ...options, method: 'OPTIONS', headers: { 'access-control-request-method': 'GET' } }
    );
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['Access-Control-Allow-Methods']).toBe('GET');
    expect(
      (
        await request(
          handler,
          {},
          { ...options, method: 'OPTIONS', headers: { 'access-control-request-method': 'POST' } }
        )
      ).statusCode
    ).toBe(405);
    expect(
      (
        await request(
          handler,
          {},
          {
            ...options,
            method: 'OPTIONS',
            headers: { 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-migration-client' },
          }
        )
      ).statusCode
    ).toBe(400);
    expect(accept).not.toHaveBeenCalled();
    const registry = store();
    const realHandler = createMigrationHandler(registry, { maxPerMinute: 1 });
    await request(realHandler, {}, options);
    expect((await request(realHandler, claim())).statusCode).toBe(202);
    expect(registry.export()).toHaveLength(1);
    expect(registry.export()[0].reviewSignals.available).toBe(false);
  });

  it('rolls back signed evidence and outbox state when observation persistence fails', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'migration-observation-atomic-'));
    directories.push(directory);
    const filename = join(directory, 'registry.sqlite');
    const registry = store(filename);
    const database = new DatabaseSync(filename);
    database.exec(
      "CREATE TRIGGER fail_observation BEFORE INSERT ON observations BEGIN SELECT RAISE(ABORT, 'test_write_failure'); END;"
    );
    database.close();
    const response = await request(createMigrationHandler(registry), claim(), { headers: clientHeaders() });
    expect(response.statusCode).toBe(503);
    expect(registry.export()).toEqual([]);
    expect(registry.next()).toBeUndefined();
    expect(storedObservations(filename)).toEqual([]);
  });

  it.each(['sr25519', 'ed25519', 'ecdsa'] as const)(
    'keeps complete %s proofs and soft review flags below the Telegram size limit',
    (type) => {
      const registry = store();
      registry.accept(verifyMigrationSubmission(migrationFixture(type).submission));
      const text = migrationTelegramText({
        ...registry.next(),
        conflict: 1,
        reviewSignals: {
          available: true,
          windowDays: 7,
          sameBrowserAccounts: Number.MAX_SAFE_INTEGER,
          similarBrowserNetworkAccounts: Number.MAX_SAFE_INTEGER,
          browserReference: 'B-0123456789abcdef',
          networkReference: 'N-0123456789abcdef',
          flags: ['repeated_browser', 'similar_browser_network'],
        },
      });
      expect(text.length).toBeLessThan(4096);
      expect(text).toContain(`Old signature: VALID (${type})`);
      expect(text).toContain('does not confirm on-chain protection');
      expect(text).toContain('repeated_browser, similar_browser_network');
    }
  );
});
