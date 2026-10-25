#!/usr/bin/env node
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const QUOTE_PATH = '/api/buy-xor/quote';
export const HEALTH_PATH = '/api/buy-xor/quote-health';
export const UPSTREAM = 'https://api.symbiosis.finance/crosschain/v2/quote';
export const DISABLED_PROVIDERS = 'open-ocean,kyber-swap,0x,bitget,uni-v4,uni-v2,uni-v3,izumi';
const ORIGIN = 'https://polkaswap.io';
const MAX_BODY = 4096;
const MAX_RESPONSE = 128 * 1024;
const MAX_AMOUNT = (1n << 256n) - 1n;
const TOKENS = {
  eth: { address: '', chainId: 1, decimals: 18, symbol: 'ETH' },
  usdtEthereum: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    decimals: 6,
    symbol: 'USDT',
  },
  usdtTon: {
    address: '0x9328Eb759596C38a25f59028B146Fecdc3621Dfe',
    chainId: 85918,
    decimals: 6,
    symbol: 'USDT',
    attributes: { ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
  },
  dai: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', chainId: 1, decimals: 18, symbol: 'DAI' },
};

function keys(value, expected) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expected].sort().join(',')
  );
}

function evmAddress(value) {
  return typeof value === 'string' && /^0x[\da-fA-F]{40}$/.test(value) && !/^0x0{40}$/.test(value);
}

/** Validates mainnet workchain-zero TON address format, including the friendly-address checksum. */
function tonAddress(value) {
  if (typeof value !== 'string') return false;
  if (/^0:[\da-fA-F]{64}$/.test(value)) return !/^0:0{64}$/.test(value);
  if (!/^[A-Za-z0-9_-]{48}$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== 36 || ![0x11, 0x51].includes(bytes[0]) || bytes[1] !== 0) return false;
  let crc = 0;
  for (const byte of bytes.subarray(0, 34)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return bytes[34] === crc >> 8 && bytes[35] === (crc & 0xff);
}

function matchesToken(value, preset, input = false) {
  if (!keys(value, [...Object.keys(preset), ...(input ? ['amount'] : [])])) return false;
  return (
    value.chainId === preset.chainId &&
    value.decimals === preset.decimals &&
    value.symbol === preset.symbol &&
    typeof value.address === 'string' &&
    value.address.toLowerCase() === preset.address.toLowerCase() &&
    (!preset.attributes || (keys(value.attributes, ['ton']) && value.attributes.ton === preset.attributes.ton))
  );
}

/** Accepts only the existing read-only conversion request and reconstructs every forwarded field. */
export function parseQuoteRequest(value) {
  const input = Object.entries(TOKENS).find(
    ([name, token]) => name !== 'dai' && matchesToken(value?.tokenAmountIn, token, true)
  );
  const output = ['eth', 'dai'].find((name) => matchesToken(value?.tokenOut, TOKENS[name]));
  if (!input || !output || (input[0] === 'eth' && output === 'eth')) return null;
  const ton = input[0] === 'usdtTon';
  if (
    !keys(value, [
      'tokenAmountIn',
      'tokenOut',
      'from',
      'to',
      'fallbackReceiver',
      'slippage',
      ...(ton ? [] : ['disabledProviders']),
    ])
  )
    return null;
  if (value.slippage !== 100 || (!ton && value.disabledProviders !== DISABLED_PROVIDERS)) return null;
  if (
    !evmAddress(value.to) ||
    !evmAddress(value.fallbackReceiver) ||
    value.to.toLowerCase() !== value.fallbackReceiver.toLowerCase()
  )
    return null;
  if (!(ton ? tonAddress(value.from) : evmAddress(value.from))) return null;
  const amount = value.tokenAmountIn.amount;
  if (typeof amount !== 'string' || !/^[1-9]\d{0,77}$/.test(amount) || BigInt(amount) > MAX_AMOUNT) return null;
  return {
    tokenAmountIn: { ...input[1], amount },
    tokenOut: { ...TOKENS[output] },
    from: value.from,
    to: value.to,
    fallbackReceiver: value.to,
    slippage: 100,
    ...(ton ? {} : { disabledProviders: DISABLED_PROVIDERS }),
  };
}

/** Bounds the decoded response stream while retaining exact JSON numeric lexemes for frontend validation. */
async function quoteText(response) {
  if (Number(response.headers.get('content-length') ?? 0) > MAX_RESPONSE) throw new Error('RESPONSE_LIMIT');
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? ''))
    throw new Error('RESPONSE_FORMAT');
  if (!response.body) throw new Error('RESPONSE_FORMAT');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_RESPONSE) throw new Error('RESPONSE_LIMIT');
      chunks.push(Buffer.from(result.value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const decoded = JSON.parse(raw);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('RESPONSE_FORMAT');
  return raw;
}

/** Public read-only relay: no identity-based limits, caching, request logs, orders, signing or persistent state. */
export function createQuoteHandler({
  fetcher = fetch,
  now = Date.now,
  maxPerMinute = 60,
  maxConcurrent = 4,
  timeoutMs = 12000,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 12000) throw new Error('Invalid timeout');
  if (!Number.isInteger(maxPerMinute) || maxPerMinute < 1 || !Number.isInteger(maxConcurrent) || maxConcurrent < 1)
    throw new Error('Invalid limits');
  let minute = -1;
  let attempts = 0;
  let inflight = 0;
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const finish = (status, error) => {
      response.statusCode = status;
      if (error) response.setHeader('Content-Type', 'application/json');
      response.end(error ? JSON.stringify({ error }) : '');
    };
    if (request.method === 'GET' && request.url === HEALTH_PATH) {
      response.setHeader('Content-Type', 'application/json');
      response.end('{"service":"buy-xor-quote","version":1}');
      return;
    }
    if (request.url !== QUOTE_PATH) return finish(404, 'NOT_FOUND');
    if (request.headers.origin !== ORIGIN) return finish(403, 'ORIGIN_NOT_ALLOWED');
    response.setHeader('Access-Control-Allow-Origin', ORIGIN);
    response.setHeader('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      if (request.headers['access-control-request-method'] !== 'POST') return finish(405, 'METHOD_NOT_ALLOWED');
      const headers = (request.headers['access-control-request-headers'] ?? '')
        .toLowerCase()
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (headers.some((item) => item !== 'content-type')) return finish(400, 'HEADERS_NOT_ALLOWED');
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Max-Age', '600');
      return finish(204);
    }
    if (request.method !== 'POST') return finish(405, 'METHOD_NOT_ALLOWED');
    if (request.headers.cookie || request.headers.authorization) return finish(400, 'HEADERS_NOT_ALLOWED');
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? ''))
      return finish(415, 'CONTENT_TYPE');
    if (request.headers['content-encoding'] || Number(request.headers['content-length'] ?? 0) > MAX_BODY)
      return finish(413, 'BODY_LIMIT');
    const currentMinute = Math.floor(now() / 60000);
    if (minute !== currentMinute) {
      minute = currentMinute;
      attempts = 0;
    }
    if (attempts >= maxPerMinute || inflight >= maxConcurrent) {
      response.setHeader('Retry-After', '60');
      return finish(429, 'QUOTE_BUSY');
    }
    attempts++;
    inflight++;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      // AbortController alone cannot interrupt an incomplete IncomingMessage iterator.
      if (!request.complete) request.destroy?.(new Error('REQUEST_TIMEOUT'));
    }, timeoutMs);
    const aborted = () => controller.abort();
    const disconnected = () => {
      if (!response.writableEnded) controller.abort();
    };
    request.once?.('aborted', aborted);
    response.once?.('close', disconnected);
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > MAX_BODY) return finish(413, 'BODY_LIMIT');
        chunks.push(Buffer.from(chunk));
      }
      let payload;
      try {
        payload = parseQuoteRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        /* Invalid JSON is never forwarded. */
      }
      if (!payload) return finish(400, 'INVALID_REQUEST');
      if (controller.signal.aborted) return finish(504, 'QUOTE_TIMEOUT');
      const upstream = await fetcher(UPSTREAM, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!upstream.ok) {
        await upstream.body?.cancel().catch(() => {});
        return finish(
          upstream.status === 400 ? 400 : upstream.status === 429 ? 429 : 502,
          upstream.status === 400 ? 'NO_ROUTE' : 'QUOTE_UNAVAILABLE'
        );
      }
      const raw = await quoteText(upstream);
      if (controller.signal.aborted) return finish(504, 'QUOTE_TIMEOUT');
      response.setHeader('Content-Type', 'application/json');
      response.end(raw);
    } catch {
      controller.abort();
      return finish(timedOut ? 504 : 502, timedOut ? 'QUOTE_TIMEOUT' : 'QUOTE_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
      request.removeListener?.('aborted', aborted);
      response.removeListener?.('close', disconnected);
      inflight--;
    }
  };
}

/** Only nginx can reach this listener; deployment must disable access/error logs for its exact paths. */
export function startQuoteRelay({ port = 5189 } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid relay port');
  const server = createServer(
    { requestTimeout: 5000, headersTimeout: 5000, connectionsCheckingInterval: 1000, maxHeaderSize: 4096 },
    createQuoteHandler()
  );
  server.maxConnections = 32;
  server.listen(port, '127.0.0.1');
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] !== 'serve') throw new Error('Usage: buy-xor-quote-relay.mjs serve');
  const server = startQuoteRelay({ port: Number(process.env.BUY_XOR_QUOTE_PORT ?? 5189) });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
