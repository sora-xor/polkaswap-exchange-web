#!/usr/bin/env node
/** Private durable intake/outbox. The IPFS build contains no Telegram credentials or registry read API. */
import { createServer } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { MigrationError, verifyMigrationSubmission } from './migration-protocol.ts';
import { loadMigrationCountryLookup, migrationCountryName } from './migration-country.mjs';

export const MIGRATION_PATH = '/api/migration';
export const MIGRATION_PING_PATH = `${MIGRATION_PATH}/ping`;
const ORIGIN = 'https://polkaswap.io';
const MAX_BODY_BYTES = 4096;
const CLIENT_HEADER = 'x-migration-client';
const OBSERVATION_WINDOW_MS = 7 * 86_400_000;

/** Private operator tuning affects review flags only, never request acceptance. */
export function migrationReviewThreshold(env = process.env) {
  const value = env.MIGRATION_REVIEW_ACCOUNT_THRESHOLD ?? '3';
  if (!/^(?:[2-9]|[1-9]\d|100)$/.test(value)) throw new Error('Invalid migration review account threshold');
  return Number(value);
}

/** Require exactly the documented observation fields; unknown fields are never retained. */
function hasKeys(value, keys) {
  return Boolean(
    value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys
  );
}

/** Canonicalize a single IP literal, including mapped IPv4, without accepting ports or forwarded lists. */
function canonicalIp(value) {
  if (typeof value !== 'string' || value.length > 45 || !/^[\da-f:.]+$/i.test(value)) return null;
  const family = isIP(value);
  if (family === 4) return value;
  if (family !== 6) return null;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([\da-f]+):([\da-f]+)$/.exec(normalized);
  if (!mapped) return normalized;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

/** Keep only an allowlisted browser family/major and OS family from a bounded user agent. */
function coarseUserAgent(value) {
  if (typeof value !== 'string' || value.length > 512 || !/^[\x20-\x7e]+$/.test(value)) return null;
  const browsers = [
    ['edge', /Edg(?:e|A|iOS)?\/(\d{1,3})(?:\.|\s|$)/],
    ['opera', /OPR\/(\d{1,3})(?:\.|\s|$)/],
    ['firefox', /(?:Firefox|FxiOS)\/(\d{1,3})(?:\.|\s|$)/],
    ['chrome', /(?:Chrome|CriOS)\/(\d{1,3})(?:\.|\s|$)/],
    ['safari', /Version\/(\d{1,3})(?:\.|\s|$).*Safari\//],
  ];
  let browser = 'other';
  for (const [family, pattern] of browsers) {
    const match = pattern.exec(value);
    if (match) {
      browser = `${family}/${Number(match[1])}`;
      break;
    }
  }
  const os = /Android/.test(value)
    ? 'android'
    : /iPhone|iPad|iPod/.test(value)
      ? 'ios'
      : /Windows/.test(value)
        ? 'windows'
        : /Macintosh|Mac OS X/.test(value)
          ? 'mac'
          : /Linux/.test(value)
            ? 'linux'
            : 'other';
  return `${browser};${os}`;
}

/** Parse optional, consented hints only after signature verification; malformed hints are unavailable, not rejection. */
export function migrationClientObservation(request) {
  try {
    const header = request.headers[CLIENT_HEADER];
    if (typeof header !== 'string' || header.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(header)) return null;
    const bytes = Buffer.from(header, 'base64url');
    if (bytes.toString('base64url') !== header) return null;
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      (!hasKeys(value, 'browserId,profile,version') && !hasKeys(value, 'browserId,latencyBucketMs,profile,version')) ||
      value.version !== 1 ||
      typeof value.browserId !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value.browserId) ||
      !hasKeys(value.profile, 'cores,languages,platform,screen,timezone')
    )
      return null;
    const latencyBucketMs = value.latencyBucketMs ?? null;
    if (
      latencyBucketMs !== null &&
      (!Number.isInteger(latencyBucketMs) ||
        latencyBucketMs < 0 ||
        latencyBucketMs > 3000 ||
        latencyBucketMs % 50 !== 0)
    )
      return null;
    const { platform, languages, timezone, screen, cores } = value.profile;
    const boundedString = (text, max) =>
      typeof text === 'string' && text.length <= max && !/[\x00-\x1f\x7f]/.test(text);
    if (
      !boundedString(platform, 64) ||
      !Array.isArray(languages) ||
      languages.length > 3 ||
      !languages.every((language) => boundedString(language, 32)) ||
      !boundedString(timezone, 64) ||
      !Array.isArray(screen) ||
      screen.length !== 3 ||
      !screen.every((size, index) => Number.isInteger(size) && size >= 0 && size <= (index === 2 ? 64 : 16384)) ||
      !Number.isInteger(cores) ||
      cores < 0 ||
      cores > 256
    )
      return null;
    const peer = canonicalIp(request.socket?.remoteAddress);
    const loopback = peer === '::1' || peer?.startsWith('127.');
    // nginx must overwrite this dedicated header. Forwarded/X-Forwarded-For are intentionally ignored.
    const networkIp = loopback ? canonicalIp(request.headers['x-migration-client-ip']) : peer;
    return {
      browserId: value.browserId.toLowerCase(),
      profile: JSON.stringify({ platform, languages, timezone, screen, cores }),
      networkIp,
      userAgent: coarseUserAgent(request.headers['user-agent']),
      latencyBucketMs,
    };
  } catch {
    return null;
  }
}

/** Retain immutable verified evidence and delivery state; conflicting claims never overwrite earlier requests. */
export function openMigrationStore(filename, { readOnly = false, reviewThreshold = migrationReviewThreshold() } = {}) {
  if (!Number.isInteger(reviewThreshold) || reviewThreshold < 2 || reviewThreshold > 100)
    throw new Error('Invalid migration review account threshold');
  if (!readOnly && filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename, { readOnly });
  if (!readOnly) {
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=FULL;
      PRAGMA secure_delete=ON;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, old_account TEXT NOT NULL, new_account TEXT NOT NULL,
        evidence TEXT NOT NULL, received_at TEXT NOT NULL, conflict INTEGER NOT NULL,
        telegram_status TEXT NOT NULL DEFAULT 'pending', telegram_message_id INTEGER,
        attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS requests_accounts ON requests(old_account, new_account);
      CREATE TABLE IF NOT EXISTS private_metadata (key TEXT PRIMARY KEY, value BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS observations (
        request_id TEXT PRIMARY KEY REFERENCES requests(id), observed_at INTEGER NOT NULL,
        browser_hash TEXT NOT NULL, network_profile_hash TEXT, latency_bucket_ms INTEGER, country_code TEXT
      );
      CREATE INDEX IF NOT EXISTS observations_browser ON observations(browser_hash, observed_at);
      CREATE INDEX IF NOT EXISTS observations_network ON observations(network_profile_hash, observed_at);
      CREATE INDEX IF NOT EXISTS observations_time ON observations(observed_at);
    `);
  }
  const hasObservations = Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'observations'").get()
  );
  let hasLatency =
    hasObservations &&
    db
      .prepare('PRAGMA table_info(observations)')
      .all()
      .some((column) => column.name === 'latency_bucket_ms');
  if (!readOnly && !hasLatency) {
    db.exec('ALTER TABLE observations ADD COLUMN latency_bucket_ms INTEGER');
    hasLatency = true;
  }
  let hasCountry =
    hasObservations &&
    db
      .prepare('PRAGMA table_info(observations)')
      .all()
      .some((column) => column.name === 'country_code');
  if (!readOnly && !hasCountry) {
    db.exec('ALTER TABLE observations ADD COLUMN country_code TEXT');
    hasCountry = true;
  }
  let observationKey;
  if (!readOnly) {
    db.prepare('INSERT OR IGNORE INTO private_metadata (key, value) VALUES (?, ?)').run(
      'observation_hmac_v1',
      randomBytes(32)
    );
    observationKey = db.prepare('SELECT value FROM private_metadata WHERE key = ?').get('observation_hmac_v1').value;
    if (!(observationKey instanceof Uint8Array) || observationKey.length !== 32) {
      db.close();
      throw new Error('Invalid migration observation key');
    }
  }
  /** Hash transient hints with domain tags; raw hints and the private key never enter receipts or exports. */
  const correlation = (tag, parts) =>
    `${tag}:${createHmac('sha256', observationKey)
      .update(JSON.stringify([tag, ...parts]))
      .digest('hex')}`;
  /** Derive counts and private shortened references at read time; expired anchors cannot keep affecting reviews. */
  const reviewSignals = (id, now) => {
    const unavailable = {
      available: false,
      windowDays: 7,
      sameBrowserAccounts: 0,
      similarBrowserNetworkAccounts: 0,
      browserReference: null,
      networkReference: null,
      latencyBucketMs: null,
      ipCountryCode: null,
      ipCountryName: null,
      flags: [],
    };
    if (!hasObservations) return unavailable;
    const cutoff = now - OBSERVATION_WINDOW_MS;
    const anchor = db
      .prepare(
        `SELECT browser_hash, network_profile_hash, ${hasLatency ? 'latency_bucket_ms' : 'NULL AS latency_bucket_ms'}, ${hasCountry ? 'country_code' : 'NULL AS country_code'} FROM observations WHERE request_id = ? AND observed_at >= ? AND observed_at <= ?`
      )
      .get(id, cutoff, now);
    if (!anchor) return unavailable;
    const count = (column, hash) =>
      hash
        ? db
            .prepare(
              `SELECT count(DISTINCT r.old_account) AS total FROM observations o JOIN requests r ON r.id = o.request_id WHERE o.${column} = ? AND o.observed_at >= ? AND o.observed_at <= ?`
            )
            .get(hash, cutoff, now).total
        : 0;
    const sameBrowserAccounts = count('browser_hash', anchor.browser_hash);
    const similarBrowserNetworkAccounts = count('network_profile_hash', anchor.network_profile_hash);
    const ipCountryName = migrationCountryName(anchor.country_code);
    return {
      available: true,
      windowDays: 7,
      sameBrowserAccounts,
      similarBrowserNetworkAccounts,
      browserReference: `B-${anchor.browser_hash.slice(-64, -48)}`,
      networkReference: anchor.network_profile_hash ? `N-${anchor.network_profile_hash.slice(-64, -48)}` : null,
      latencyBucketMs: anchor.latency_bucket_ms,
      ipCountryCode: ipCountryName ? anchor.country_code : null,
      ipCountryName,
      flags: [
        ...(sameBrowserAccounts >= reviewThreshold ? ['repeated_browser'] : []),
        ...(similarBrowserNetworkAccounts >= reviewThreshold ? ['similar_browser_network'] : []),
      ],
    };
  };
  return {
    /** Called only with independently verified data. One transaction commits evidence and its outbox entry. */
    accept(verified, now = Date.now(), observation = null) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM observations WHERE observed_at < ?').run(now - OBSERVATION_WINDOW_MS);
        const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(verified.requestId);
        if (existing) {
          db.exec('COMMIT');
          return existing;
        }
        const { oldAccount, newAccount } = verified.submission;
        const recent = db
          .prepare('SELECT count(*) AS total FROM requests WHERE old_account = ? AND received_at >= ?')
          .get(oldAccount, new Date(now - 86_400_000).toISOString());
        if (recent.total >= 5) throw new MigrationError('rateLimit');
        const conflict = db
          .prepare(
            `SELECT id FROM requests WHERE
          (old_account = ? AND new_account != ?) OR (new_account = ? AND old_account != ?)
          OR old_account = ? OR new_account = ? LIMIT 1`
          )
          .get(oldAccount, newAccount, newAccount, oldAccount, newAccount, oldAccount)
          ? 1
          : 0;
        if (conflict) {
          db.prepare(
            `UPDATE requests SET conflict = 1 WHERE
            old_account = ? OR new_account = ? OR old_account = ? OR new_account = ?`
          ).run(oldAccount, newAccount, newAccount, oldAccount);
        }
        db.prepare(
          'INSERT INTO requests (id, old_account, new_account, evidence, received_at, conflict) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          verified.requestId,
          oldAccount,
          newAccount,
          JSON.stringify(verified),
          new Date(now).toISOString(),
          conflict
        );
        if (observation) {
          db.prepare(
            'INSERT INTO observations (request_id, observed_at, browser_hash, network_profile_hash, latency_bucket_ms, country_code) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(
            verified.requestId,
            now,
            correlation('browser-v1', [observation.browserId]),
            observation.networkIp && observation.userAgent
              ? correlation('network-profile-v1', [observation.networkIp, observation.profile, observation.userAgent])
              : null,
            observation.latencyBucketMs ?? null,
            migrationCountryName(observation.countryCode) ? observation.countryCode : null
          );
        }
        const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(verified.requestId);
        db.exec('COMMIT');
        return row;
      } catch (cause) {
        db.exec('ROLLBACK');
        throw cause;
      }
    },
    /** The oldest ready outbox entry is retried across process restarts. */
    next(now = Date.now()) {
      const row = db
        .prepare(
          "SELECT * FROM requests WHERE telegram_status = 'pending' AND next_attempt <= ? ORDER BY received_at, id LIMIT 1"
        )
        .get(now);
      return row ? { ...row, reviewSignals: reviewSignals(row.id, now) } : undefined;
    },
    /** Reserve a retry delay before the HTTP request to avoid immediate crash loops. */
    attempted(id, now = Date.now()) {
      db.prepare('UPDATE requests SET attempts = attempts + 1, next_attempt = ? WHERE id = ?').run(now + 300_000, id);
    },
    delivered(id, messageId) {
      db.prepare("UPDATE requests SET telegram_status = 'sent', telegram_message_id = ? WHERE id = ?").run(
        messageId,
        id
      );
    },
    /** Local-only export rechecks stored signatures and labels every row as pending human review. */
    export(now = Date.now()) {
      return db
        .prepare('SELECT * FROM requests ORDER BY received_at, id')
        .all()
        .map((row) => {
          const verified = verifyMigrationSubmission(JSON.parse(row.evidence).submission);
          if (verified.requestId !== row.id) throw new Error('migration_evidence_integrity');
          return {
            ...verified,
            receivedAt: row.received_at,
            review: 'required',
            conflict: Boolean(row.conflict),
            telegram: row.telegram_status,
            telegramMessageId: row.telegram_message_id,
            reviewSignals: reviewSignals(row.id, now),
          };
        });
    },
    close: () => db.close(),
  };
}

/** Plain text carries complete reproducible evidence, with no user-supplied formatting or destination. */
export function migrationTelegramText(row) {
  const verified = verifyMigrationSubmission(JSON.parse(row.evidence).submission);
  const signals = row.reviewSignals;
  const countryName = signals?.available ? migrationCountryName(signals.ipCountryCode) : null;
  return [
    'Polkaswap · Migration request',
    `Receipt: ${verified.requestId}`,
    `Received: ${row.received_at}`,
    `Old signature: VALID (${verified.oldCrypto})`,
    verified.submission.version === 1
      ? `New signature: VALID (${verified.newCrypto})`
      : 'New account: not signed; control not verified',
    'Verification: independently checked by the migration relay',
    row.conflict
      ? 'CONFLICT: another request uses one of these accounts. Review all related receipts.'
      : 'Review: required',
    'Key control does not establish rightful ownership of a compromised account. No funds have moved.',
    'This receipt does not confirm on-chain protection or authorize ownership release.',
    'Abuse review signals (not ownership proof)',
    ...(signals?.available
      ? [
          `Browser marker reference: ${signals.browserReference ?? 'unavailable'}`,
          `Browser/network fingerprint reference: ${signals.networkReference ?? 'unavailable'}`,
          `Distinct old accounts in ${signals.windowDays} days: same browser ${signals.sameBrowserAccounts}; similar browser/network ${signals.similarBrowserNetworkAccounts}.`,
          `Review flags: ${signals.flags.length ? signals.flags.join(', ') : 'none'}. Shared devices/networks and forged hints can affect these counts.`,
          `Client-reported approximate HTTP latency: ${signals.latencyBucketMs === null || signals.latencyBucketMs === undefined ? 'unavailable' : `${signals.latencyBucketMs} ms (50 ms bucket)`}.`,
        ]
      : ['Unavailable. No identity or ownership conclusion can be drawn.']),
    `IP country (approximate): ${countryName ? `${countryName} (${signals.ipCountryCode})` : 'unknown'}`,
    'VPNs and proxies may affect the IP country result.',
    ...(countryName ? ['IP Geolocation by DB-IP: https://db-ip.com (CC BY 4.0)'] : []),
    '',
    verified.message,
    '',
    `Old signature: ${verified.submission.oldSignature}`,
    ...(verified.submission.version === 1 ? [`New signature: ${verified.submission.newSignature}`] : []),
  ].join('\n');
}

/** Only the operator configures the bot/chat; credentials and Telegram error responses never enter logs or HTTP replies. */
export function createTelegramSender({ token, chatId, threadId, fetchImpl = fetch }) {
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token ?? '') || !/^-?\d{1,20}$/.test(chatId ?? ''))
    throw new Error('Configure MIGRATION_TELEGRAM_BOT_TOKEN and MIGRATION_TELEGRAM_CHAT_ID securely');
  if (threadId !== undefined && !/^[1-9]\d{0,10}$/.test(threadId)) throw new Error('Invalid Telegram topic ID');
  return async (text) => {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(threadId ? { message_thread_id: Number(threadId) } : {}),
        link_preview_options: { is_disabled: true },
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('telegram_unavailable');
    const result = await response.json();
    if (!result?.ok || !Number.isSafeInteger(result.result?.message_id) || result.result.message_id <= 0)
      throw new Error('telegram_unconfirmed');
    return result.result.message_id;
  };
}

/** At-least-once delivery with a stable receipt ID; one process and one in-flight worker own this outbox. */
export function createMigrationDispatcher(store, send, now = Date.now) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      const row = store.next(now());
      if (!row) return;
      store.attempted(row.id, now());
      const messageId = await send(migrationTelegramText(row));
      store.delivered(row.id, messageId);
    } catch {
      // The persisted row remains pending; a lost Telegram acknowledgement may cause a duplicate receipt notification.
    } finally {
      running = false;
    }
  };
}

/** Bounded write-only intake. CORS is a browser boundary; valid signatures are mandatory authentication. */
export function createMigrationHandler(store, { now = Date.now, maxPerMinute = 60, countryLookup = null } = {}) {
  let minute = -1;
  let attempts = 0;
  let pingAttempts = 0;
  /** Bound probes separately so the optional latency measurement does not consume the intake allowance. */
  const allowAttempt = (ping = false) => {
    const currentMinute = Math.floor(now() / 60_000);
    if (currentMinute !== minute) {
      minute = currentMinute;
      attempts = 0;
      pingAttempts = 0;
    }
    return ping ? pingAttempts++ < maxPerMinute : attempts++ < maxPerMinute;
  };
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', 'application/json');
    const finish = (status, body = {}) => {
      response.statusCode = status;
      response.end(status === 204 ? '' : JSON.stringify(body));
    };
    if (request.url !== MIGRATION_PATH && request.url !== MIGRATION_PING_PATH) return finish(404);
    if (request.headers.origin !== ORIGIN) return finish(403);
    response.setHeader('Access-Control-Allow-Origin', ORIGIN);
    response.setHeader('Vary', 'Origin');
    if (request.url === MIGRATION_PING_PATH) {
      if (request.headers.cookie || request.headers.authorization) return finish(400);
      if (request.method === 'OPTIONS') {
        if (request.headers['access-control-request-method'] !== 'GET') return finish(405);
        if (String(request.headers['access-control-request-headers'] ?? '').trim()) return finish(400);
        if (!allowAttempt(true)) return finish(429);
        response.setHeader('Access-Control-Allow-Methods', 'GET');
        return finish(204);
      }
      if (request.method !== 'GET') return finish(405);
      if (!allowAttempt(true)) return finish(429);
      return finish(204);
    }
    if (request.method === 'OPTIONS') {
      if (request.headers['access-control-request-method'] !== 'POST') return finish(405);
      const headers = String(request.headers['access-control-request-headers'] ?? '')
        .toLowerCase()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (headers.some((header) => header !== 'content-type' && header !== CLIENT_HEADER)) return finish(400);
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Migration-Client');
      return finish(204);
    }
    if (request.method !== 'POST') return finish(405);
    if (request.headers.cookie || request.headers.authorization) return finish(400);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? ''))
      return finish(415);
    if (request.headers['content-encoding'] || Number(request.headers['content-length'] ?? 0) > MAX_BODY_BYTES)
      return finish(413);
    if (!allowAttempt()) return finish(429);
    let body = '';
    let bytes = 0;
    let verified;
    try {
      for await (const chunk of request) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_BODY_BYTES) return finish(413);
        body += chunk;
      }
      verified = verifyMigrationSubmission(JSON.parse(body), now());
    } catch {
      return finish(400, { error: 'invalid_request' });
    }
    try {
      const observation = migrationClientObservation(request);
      if (observation?.networkIp && typeof countryLookup === 'function') {
        try {
          const countryCode = countryLookup(observation.networkIp);
          observation.countryCode = migrationCountryName(countryCode) ? countryCode : null;
        } catch {
          // Optional local geolocation must never reject an otherwise valid signed request.
          observation.countryCode = null;
        }
      }
      const row = store.accept(verified, now(), observation);
      return finish(202, { requestId: row.id, status: 'received', telegram: row.telegram_status });
    } catch (cause) {
      return finish(cause instanceof MigrationError && cause.code === 'rateLimit' ? 429 : 503);
    }
  };
}

/** CSV is an intake review table, never an automatically approved runtime substitution map. */
export function migrationCsv(rows) {
  const header = [
    'request_id',
    'old_account',
    'new_account',
    'created_at',
    'received_at',
    'old_signature',
    'new_signature',
    'old_crypto',
    'new_crypto',
    'review',
    'conflict',
    'telegram',
    'review_signals_available',
    'review_signal_window_days',
    'same_browser_accounts',
    'similar_browser_network_accounts',
    'browser_reference',
    'browser_network_reference',
    'review_signal_flags',
    'client_reported_http_latency_bucket_ms',
    'protocol_version',
    'new_account_control',
    'ip_country_code',
    'ip_country_name',
  ];
  const values = rows.map((row) => [
    row.requestId,
    row.submission.oldAccount,
    row.submission.newAccount,
    row.submission.createdAt,
    row.receivedAt,
    row.submission.oldSignature,
    row.submission.newSignature ?? '',
    row.oldCrypto,
    row.newCrypto ?? '',
    'required',
    String(row.conflict),
    row.telegram,
    String(Boolean(row.reviewSignals?.available)),
    row.reviewSignals?.windowDays ?? 7,
    row.reviewSignals?.sameBrowserAccounts ?? 0,
    row.reviewSignals?.similarBrowserNetworkAccounts ?? 0,
    row.reviewSignals?.browserReference ?? '',
    row.reviewSignals?.networkReference ?? '',
    row.reviewSignals?.flags.join(';') ?? '',
    row.reviewSignals?.latencyBucketMs ?? '',
    row.submission.version,
    row.submission.version === 1 ? 'signature_verified' : 'not_verified',
    row.reviewSignals?.ipCountryCode ?? '',
    row.reviewSignals?.ipCountryName ?? '',
  ]);
  return (
    [header, ...values]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n') + '\n'
  );
}

/** Loopback-only process; approved nginx owns HTTPS, request limits, and log suppression. */
export function startMigrationRelay({
  filename,
  send,
  port = 5193,
  countryDatabase = process.env.MIGRATION_COUNTRY_DB,
}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid migration relay port');
  const store = openMigrationStore(filename);
  const dispatch = createMigrationDispatcher(store, send);
  const server = createServer(
    { requestTimeout: 10_000, headersTimeout: 10_000, maxHeaderSize: 4096 },
    createMigrationHandler(store, { countryLookup: loadMigrationCountryLookup(countryDatabase) })
  );
  server.maxConnections = 32;
  server.listen(port, '127.0.0.1');
  const timer = setInterval(() => {
    void dispatch();
  }, 2000);
  timer.unref();
  server.on('close', () => {
    clearInterval(timer);
    store.close();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.umask(0o077);
  await cryptoWaitReady();
  const filename = process.env.MIGRATION_DB;
  if (!filename) throw new Error('MIGRATION_DB is required');
  const command = process.argv[2];
  if (command === 'serve') {
    const send = createTelegramSender({
      token: process.env.MIGRATION_TELEGRAM_BOT_TOKEN,
      chatId: process.env.MIGRATION_TELEGRAM_CHAT_ID,
      threadId: process.env.MIGRATION_TELEGRAM_THREAD_ID,
    });
    const server = startMigrationRelay({ filename, send, port: Number(process.env.MIGRATION_PORT ?? 5193) });
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } else if (command === 'export-json' || command === 'export-csv') {
    const store = openMigrationStore(filename, { readOnly: true });
    try {
      const rows = store.export();
      process.stdout.write(command === 'export-json' ? JSON.stringify(rows, null, 2) + '\n' : migrationCsv(rows));
    } finally {
      store.close();
    }
  } else throw new Error('Usage: migration-relay.mjs serve | export-json | export-csv');
}
