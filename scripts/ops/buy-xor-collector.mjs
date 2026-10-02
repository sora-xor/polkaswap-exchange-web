#!/usr/bin/env node
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseBuyXorFunnelEvent } from '../../src/features/misc/lib/buyXorFunnel.ts';

export const EVENT_PATH = '/api/buy-xor/events';
export const HEALTH_PATH = '/api/buy-xor/health';
const ORIGIN = 'https://polkaswap.io';
const MAX_BODY = 256;
const RETENTION_DAYS = 90;

/** Retains no event rows, request metadata, IPs, user agents, wallet data or client identifiers. */
export function openCounterStore(filename, { readOnly = false } = {}) {
  if (!readOnly && filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename, { readOnly });
  if (!readOnly) {
    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=1000;
      CREATE TABLE IF NOT EXISTS counters (
        day TEXT NOT NULL, step TEXT NOT NULL, route TEXT NOT NULL, reason TEXT NOT NULL,
        count INTEGER NOT NULL CHECK (count > 0), PRIMARY KEY (day, step, route, reason)
      ) WITHOUT ROWID;
    `);
  }
  const increment = readOnly
    ? null
    : db.prepare(`
    INSERT INTO counters (day, step, route, reason, count) VALUES (?, ?, ?, ?, 1)
    ON CONFLICT (day, step, route, reason) DO UPDATE SET count = count + 1
  `);
  const prune = readOnly ? null : db.prepare('DELETE FROM counters WHERE day < ?');
  let lastPrunedDay = '';
  return {
    /** Runs independently of new traffic so inactive counters also respect the retention window. */
    prune(now = Date.now()) {
      if (!prune) throw new Error('Read-only counter store');
      prune.run(new Date(now - (RETENTION_DAYS - 1) * 86_400_000).toISOString().slice(0, 10));
    },
    /** The server's UTC date is the sole time dimension; the client cannot choose a historical day. */
    increment(event, now = Date.now()) {
      if (!increment || !prune) throw new Error('Read-only counter store');
      const day = new Date(now).toISOString().slice(0, 10);
      db.exec('BEGIN IMMEDIATE');
      try {
        if (lastPrunedDay !== day) {
          prune.run(new Date(now - (RETENTION_DAYS - 1) * 86_400_000).toISOString().slice(0, 10));
        }
        increment.run(day, event.step, event.route, event.reason);
        db.exec('COMMIT');
        lastPrunedDay = day;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    /** Local operator report only. Verification probes are separated from purchase observations. */
    report(from, to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to)
        throw new Error('Expected ordered YYYY-MM-DD dates');
      const all = db
        .prepare(
          'SELECT day, step, route, reason, count FROM counters WHERE day >= ? AND day <= ? ORDER BY day, route, step, reason'
        )
        .all(from, to);
      return {
        version: 1,
        metric: 'anonymous-step-observations',
        from,
        to,
        verificationCount: all.filter((row) => row.step === 'verification').reduce((sum, row) => sum + row.count, 0),
        rows: all.filter((row) => row.step !== 'verification'),
        limitations: [
          'Opted-in browsers only; DNT/GPC excluded.',
          'Counts are observations, not unique people, unique transactions, conversion rates or revenue.',
          'Reloads can repeat observations. Failed/blocked requests can undercount. Public counters can be spoofed.',
        ],
      };
    },
    close: () => db.close(),
  };
}

/** A fixed probe proves transport/storage without inflating any purchase step. */
function parseCounterEvent(value) {
  if (
    value &&
    Object.keys(value).sort().join(',') === 'reason,route,step,v' &&
    value.v === 1 &&
    value.step === 'verification' &&
    value.route === 'unset' &&
    value.reason === 'none'
  )
    return { v: 1, step: 'verification', route: 'unset', reason: 'none' };
  return parseBuyXorFunnelEvent(value);
}

/** Strict public write-only endpoint, with a bounded global rate limit that never keys on client identity. */
export function createCounterHandler(store, { now = Date.now, maxPerMinute = 600 } = {}) {
  let minute = -1;
  let accepted = 0;
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const finish = (status) => {
      response.statusCode = status;
      response.end();
    };
    if (request.method === 'GET' && request.url === HEALTH_PATH) {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ service: 'buy-xor-aggregate', version: 1 }));
      return;
    }
    if (request.url !== EVENT_PATH) return finish(404);
    if (request.headers.origin !== ORIGIN) return finish(403);
    response.setHeader('Access-Control-Allow-Origin', ORIGIN);
    response.setHeader('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      if (request.headers['access-control-request-method'] !== 'POST') return finish(405);
      const headers = (request.headers['access-control-request-headers'] ?? '')
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (headers.some((value) => value !== 'content-type')) return finish(400);
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Max-Age', '600');
      return finish(204);
    }
    if (request.method !== 'POST') return finish(405);
    if (request.headers.dnt === '1' || request.headers['sec-gpc'] === '1') return finish(204);
    if (request.headers.cookie || request.headers.authorization) return finish(400);
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? ''))
      return finish(415);
    if (request.headers['content-encoding'] || Number(request.headers['content-length'] ?? 0) > MAX_BODY)
      return finish(413);
    const currentMinute = Math.floor(now() / 60_000);
    if (currentMinute !== minute) {
      minute = currentMinute;
      accepted = 0;
    }
    if (accepted >= maxPerMinute) return finish(429);
    let body = '';
    let bytes = 0;
    let event;
    try {
      for await (const chunk of request) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_BODY) return finish(413);
        body += chunk;
      }
      event = parseCounterEvent(JSON.parse(body));
      if (!event) return finish(400);
      // Recheck after body reads: simultaneous requests must not all pass the initial limit.
      if (accepted >= maxPerMinute) return finish(429);
    } catch {
      return finish(400);
    }
    try {
      store.increment(event, now());
      accepted += 1;
      return finish(204);
    } catch {
      // Neither malformed payloads nor operational errors are logged with request metadata.
      return finish(503);
    }
  };
}

/** Loopback-only service; nginx owns TLS and must suppress access/error logs for these exact locations. */
export function startCollector({ filename, port = 5188 }) {
  if (!filename) throw new Error('BUY_XOR_COUNTER_DB is required');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid collector port');
  const store = openCounterStore(filename);
  store.prune();
  const server = createServer(
    { requestTimeout: 5_000, headersTimeout: 5_000, maxHeaderSize: 4096 },
    createCounterHandler(store)
  );
  server.maxConnections = 32;
  server.listen(port, '127.0.0.1');
  const retention = setInterval(
    () => {
      try {
        store.prune();
      } catch {
        /* A later write/report can expose storage availability without request logging. */
      }
    },
    60 * 60 * 1000
  );
  retention.unref();
  server.on('close', () => {
    clearInterval(retention);
    store.close();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.umask(0o077);
  const [command, from, to] = process.argv.slice(2);
  const filename = process.env.BUY_XOR_COUNTER_DB;
  if (!filename) throw new Error('BUY_XOR_COUNTER_DB is required');
  if (command === 'report') {
    const store = openCounterStore(filename, { readOnly: true });
    try {
      console.log(JSON.stringify(store.report(from, to), null, 2));
    } finally {
      store.close();
    }
  } else if (command === 'serve') {
    const server = startCollector({ filename, port: Number(process.env.BUY_XOR_COUNTER_PORT ?? 5188) });
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } else throw new Error('Usage: buy-xor-collector.mjs serve | report YYYY-MM-DD YYYY-MM-DD');
}
