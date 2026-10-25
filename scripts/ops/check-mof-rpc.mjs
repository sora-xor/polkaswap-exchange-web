#!/usr/bin/env node
import crypto from 'node:crypto';
import path from 'node:path';
import tls from 'node:tls';
import { URL, pathToFileURL } from 'node:url';

/**
 * Production-only health checker for the MOF SORA RPC endpoint used by Polkaswap.
 *
 * The checker intentionally verifies the live production host directly and never
 * falls back to another RPC endpoint. It probes CORS, JSON-RPC health, negative
 * JSON-RPC behavior, repeated request handling, and raw WebSocket upgrades.
 */
export const DEFAULT_MOF_RPC_ENDPOINT = 'https://ws.mof.sora.org/';
export const DEFAULT_ORIGIN = 'https://polkaswap.io';
export const DEFAULT_TIMEOUT_MS = 15_000;

/** Error type used for expected checker validation failures. */
export class MofRpcCheckError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MofRpcCheckError';
    this.details = details;
  }
}

/**
 * Build a strict JSON-RPC 2.0 request payload.
 *
 * @param {string} method JSON-RPC method name.
 * @param {unknown[]} params JSON-RPC positional parameters.
 * @param {number | string | null} id JSON-RPC request id.
 * @returns {{ jsonrpc: '2.0', id: number | string | null, method: string, params: unknown[] }}
 */
export const buildJsonRpcRequest = (method, params = [], id = 1) => {
  if (typeof method !== 'string' || method.trim() === '') {
    throw new MofRpcCheckError('JSON-RPC method must be a non-empty string');
  }
  if (!Array.isArray(params)) {
    throw new MofRpcCheckError('JSON-RPC params must be an array');
  }

  return { jsonrpc: '2.0', id, method, params };
};

/** Return true when the HTTP status means a proxy/gateway cannot reach the upstream. */
export const isBadGatewayStatus = (status) => status === 502 || status === 503 || status === 504;

/** Return true when the HTTP status would hide the real production endpoint behind a redirect. */
export const isRedirectStatus = (status) => status >= 300 && status < 400;

/** Return true when the HTTP status proves the endpoint is rate limiting clients. */
export const isRateLimitedStatus = (status) => status === 429;

/**
 * Reject endpoint statuses that are not acceptable for the production RPC.
 *
 * @param {number} status HTTP status code.
 * @param {string} context Human-readable probe name for error messages.
 */
export const assertUsableHttpStatus = (status, context) => {
  if (!Number.isInteger(status)) {
    throw new MofRpcCheckError(`${context} did not return a numeric HTTP status`, { status });
  }
  if (isRedirectStatus(status)) {
    throw new MofRpcCheckError(`${context} returned an unexpected redirect`, { status });
  }
  if (isRateLimitedStatus(status)) {
    throw new MofRpcCheckError(`${context} returned 429 Too Many Requests`, { status });
  }
  if (isBadGatewayStatus(status)) {
    throw new MofRpcCheckError(`${context} returned a gateway error`, { status });
  }
  if (status < 200 || status >= 500) {
    throw new MofRpcCheckError(`${context} returned an unusable HTTP status`, { status });
  }
};

/**
 * Parse a JSON-RPC payload and enforce protocol and id matching.
 *
 * @param {string} text Raw JSON response body.
 * @param {number | string | null} expectedId Expected JSON-RPC id.
 * @returns {Record<string, unknown>}
 */
export const parseJsonRpcPayload = (text, expectedId = 1) => {
  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new MofRpcCheckError('Response body is not valid JSON', { cause: String(error) });
  }

  if (payload?.jsonrpc !== '2.0') {
    throw new MofRpcCheckError('Response is not a JSON-RPC 2.0 payload', { payload });
  }
  if (payload.id !== expectedId) {
    throw new MofRpcCheckError('Response JSON-RPC id does not match the request id', {
      expectedId,
      actualId: payload.id,
    });
  }

  return payload;
};

/**
 * Validate `system_health` proves the node is useful for production traffic.
 *
 * @param {Record<string, unknown>} payload Parsed JSON-RPC payload.
 * @param {{ requireSynced?: boolean }} options Validation options.
 * @returns {{ peers: number, isSyncing: boolean, shouldHavePeers: boolean }}
 */
export const validateSystemHealthPayload = (payload, { requireSynced = true } = {}) => {
  const result = payload?.result;

  if (!result || typeof result !== 'object') {
    throw new MofRpcCheckError('system_health response is missing result');
  }
  if (!Number.isInteger(result.peers) || result.peers < 1) {
    throw new MofRpcCheckError('system_health response reports no connected peers', { peers: result.peers });
  }
  if (result.shouldHavePeers !== true) {
    throw new MofRpcCheckError('system_health response says the node should not have peers', {
      shouldHavePeers: result.shouldHavePeers,
    });
  }
  if (requireSynced && result.isSyncing !== false) {
    throw new MofRpcCheckError('system_health response says the node is still syncing', {
      isSyncing: result.isSyncing,
    });
  }

  return result;
};

/**
 * Validate that negative JSON-RPC probes fail as structured JSON-RPC errors.
 *
 * @param {Record<string, unknown>} payload Parsed JSON-RPC payload.
 * @returns {{ code: number, message: string }}
 */
export const validateJsonRpcErrorPayload = (payload) => {
  if (!payload?.error || typeof payload.error !== 'object') {
    throw new MofRpcCheckError('Expected a JSON-RPC error payload', { payload });
  }
  if (!Number.isInteger(payload.error.code)) {
    throw new MofRpcCheckError('JSON-RPC error payload is missing a numeric code', { error: payload.error });
  }
  if (typeof payload.error.message !== 'string' || payload.error.message.length === 0) {
    throw new MofRpcCheckError('JSON-RPC error payload is missing a message', { error: payload.error });
  }

  return payload.error;
};

/** Create a random Sec-WebSocket-Key for a raw WebSocket upgrade probe. */
export const createWebSocketKey = () => crypto.randomBytes(16).toString('base64');

/**
 * Build the expected Sec-WebSocket-Accept value for a WebSocket key.
 *
 * @param {string} key Client Sec-WebSocket-Key.
 * @returns {string}
 */
export const buildWebSocketAccept = (key) =>
  crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');

/**
 * Parse raw HTTP response headers into a status code and lower-case header map.
 *
 * @param {string} rawHeaders Raw HTTP response headers.
 * @returns {{ status: number, headers: Map<string, string>, statusLine: string }}
 */
export const parseHttpHeaders = (rawHeaders) => {
  const [statusLine = '', ...lines] = rawHeaders.split(/\r?\n/).filter(Boolean);
  const status = Number.parseInt(statusLine.split(/\s+/)[1] ?? '', 10);
  const headers = new Map();

  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }

  return { status, headers, statusLine };
};

/**
 * Validate a raw WebSocket upgrade response from the production RPC.
 *
 * @param {string} rawHeaders Raw HTTP response headers.
 * @param {string} expectedKey Client Sec-WebSocket-Key used for the request.
 */
export const validateWebSocketHandshake = (rawHeaders, expectedKey) => {
  const { status, headers } = parseHttpHeaders(rawHeaders);

  if (status !== 101) {
    assertUsableHttpStatus(status, 'WebSocket upgrade');
    throw new MofRpcCheckError('WebSocket upgrade did not switch protocols', { status });
  }
  if (headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    throw new MofRpcCheckError('WebSocket upgrade response is missing the websocket upgrade header');
  }
  if (!headers.get('connection')?.toLowerCase().includes('upgrade')) {
    throw new MofRpcCheckError('WebSocket upgrade response is missing the connection upgrade header');
  }

  const expectedAccept = buildWebSocketAccept(expectedKey);
  if (headers.get('sec-websocket-accept') !== expectedAccept) {
    throw new MofRpcCheckError('WebSocket accept key is invalid', {
      expectedAccept,
      actualAccept: headers.get('sec-websocket-accept'),
    });
  }
};

const parseHttpsUrlOption = (value, optionName) => {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new MofRpcCheckError(`${optionName} must be a valid URL`);
  }
  if (url.protocol !== 'https:') {
    throw new MofRpcCheckError(`${optionName} must use https`);
  }
  if (url.username || url.password) {
    throw new MofRpcCheckError(`${optionName} must not include credentials`);
  }

  return url;
};

/**
 * Validate and normalize checker options used by both CLI and exported calls.
 *
 * @param {{
 *   endpoint?: string,
 *   origin?: string,
 *   timeoutMs?: number,
 *   attempts?: number,
 *   requireSynced?: boolean,
 *   help?: boolean,
 * }} options Raw checker options.
 */
export const normalizeMofRpcCheckOptions = (options = {}) => {
  const normalized = {
    endpoint: DEFAULT_MOF_RPC_ENDPOINT,
    origin: DEFAULT_ORIGIN,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    attempts: 8,
    requireSynced: true,
    ...options,
  };

  if (!Number.isInteger(normalized.timeoutMs) || normalized.timeoutMs < 1_000) {
    throw new MofRpcCheckError('--timeout-ms must be an integer >= 1000');
  }
  if (!Number.isInteger(normalized.attempts) || normalized.attempts < 1 || normalized.attempts > 25) {
    throw new MofRpcCheckError('--attempts must be an integer from 1 to 25');
  }

  const endpointUrl = parseHttpsUrlOption(normalized.endpoint, '--endpoint');
  normalized.endpoint = endpointUrl.href;

  const originUrl = parseHttpsUrlOption(normalized.origin, '--origin');
  normalized.origin = originUrl.origin;

  return normalized;
};

const createTimeoutSignal = (timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const timeout = createTimeoutSignal(timeoutMs);

  try {
    return await fetch(url, { ...options, signal: timeout.signal, redirect: 'manual' });
  } finally {
    timeout.clear();
  }
};

const fetchJsonRpc = async ({ endpoint, origin, timeoutMs, method, params, body }) => {
  const requestBody = body ?? JSON.stringify(buildJsonRpcRequest(method, params));
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin,
      },
      body: requestBody,
    },
    timeoutMs
  );
  const text = await response.text();

  assertUsableHttpStatus(response.status, `JSON-RPC ${method ?? 'malformed request'}`);

  return { response, text };
};

const checkPreflight = async ({ endpoint, origin, timeoutMs }) => {
  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    },
    timeoutMs
  );

  assertUsableHttpStatus(response.status, 'CORS preflight');

  const allowOrigin = response.headers.get('access-control-allow-origin');
  if (allowOrigin !== '*' && allowOrigin !== origin) {
    throw new MofRpcCheckError('CORS preflight did not allow the production origin', { allowOrigin, origin });
  }

  return { status: response.status, allowOrigin };
};

const checkHealth = async ({ endpoint, origin, timeoutMs, requireSynced }) => {
  const { response, text } = await fetchJsonRpc({
    endpoint,
    origin,
    timeoutMs,
    method: 'system_health',
    params: [],
  });
  const payload = parseJsonRpcPayload(text);
  const health = validateSystemHealthPayload(payload, { requireSynced });

  return { status: response.status, health };
};

const checkInvalidMethod = async ({ endpoint, origin, timeoutMs }) => {
  const { response, text } = await fetchJsonRpc({
    endpoint,
    origin,
    timeoutMs,
    method: 'mof_adversarialInvalidMethod',
    params: [{ unexpected: true }],
  });
  const payload = parseJsonRpcPayload(text);
  const error = validateJsonRpcErrorPayload(payload);

  return { status: response.status, error };
};

const checkMalformedJson = async ({ endpoint, origin, timeoutMs }) => {
  const { response, text } = await fetchJsonRpc({
    endpoint,
    origin,
    timeoutMs,
    body: '{"jsonrpc":"2.0","id":1,"method":',
  });
  const payload = parseJsonRpcPayload(text, null);
  const error = validateJsonRpcErrorPayload(payload);

  return { status: response.status, error };
};

const checkRepeatedHealth = async ({ endpoint, origin, timeoutMs, attempts, requireSynced }) => {
  const results = [];

  for (let index = 0; index < attempts; index += 1) {
    results.push(await checkHealth({ endpoint, origin, timeoutMs, requireSynced }));
  }

  return results.map(({ health }) => health);
};

const checkWebSocketUpgrade = async ({ endpoint, timeoutMs }) => {
  const url = new URL(endpoint);
  const host = url.hostname;
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const path = `${url.pathname || '/'}${url.search || ''}`;
  const key = createWebSocketKey();

  const rawHeaders = await new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true,
    });
    let buffer = '';
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new MofRpcCheckError('WebSocket upgrade timed out'));
    }, timeoutMs);

    socket.once('secureConnect', () => {
      socket.write(
        [
          `GET ${path} HTTP/1.1`,
          `Host: ${host}`,
          'Connection: Upgrade',
          'Upgrade: websocket',
          `Sec-WebSocket-Key: ${key}`,
          'Sec-WebSocket-Version: 13',
          '',
          '',
        ].join('\r\n')
      );
    });
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        clearTimeout(timeout);
        socket.end();
        resolve(buffer.slice(0, headerEnd));
      }
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  validateWebSocketHandshake(rawHeaders, key);

  return { status: 101 };
};

/** Parse CLI arguments for the MOF RPC checker. */
export const parseMofRpcCheckArgs = (argv) => {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new MofRpcCheckError(`${arg} requires a value`);
      return argv[index];
    };

    if (arg === '--endpoint') {
      options.endpoint = next();
    } else if (arg === '--origin') {
      options.origin = next();
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(next());
    } else if (arg === '--attempts') {
      options.attempts = Number(next());
    } else if (arg === '--allow-syncing') {
      options.requireSynced = false;
    } else if (arg === '--help') {
      options.help = true;
    } else {
      throw new MofRpcCheckError(`Unknown argument: ${arg}`);
    }
  }

  return normalizeMofRpcCheckOptions(options);
};

const printHelp = () => {
  console.log(`Usage: node scripts/ops/check-mof-rpc.mjs [options]

Checks the production SORA MOF RPC endpoint without falling back to mof2.

Options:
  --endpoint <url>     RPC endpoint to check. Defaults to ${DEFAULT_MOF_RPC_ENDPOINT}
  --origin <url>       Origin header for CORS checks. Defaults to ${DEFAULT_ORIGIN}
  --timeout-ms <ms>    Per-request timeout. Defaults to ${DEFAULT_TIMEOUT_MS}
  --attempts <n>       Repeated health requests to catch rate limits. Defaults to 8
  --allow-syncing      Do not fail when system_health reports isSyncing=true
`);
};

/**
 * Run the full production MOF RPC probe suite.
 *
 * @param {Parameters<typeof normalizeMofRpcCheckOptions>[0]} options Checker options.
 */
export const runMofRpcCheck = async (options = {}) => {
  const normalizedOptions = normalizeMofRpcCheckOptions(options);
  const checks = {};

  checks.preflight = await checkPreflight(normalizedOptions);
  checks.health = await checkHealth(normalizedOptions);
  checks.invalidMethod = await checkInvalidMethod(normalizedOptions);
  checks.malformedJson = await checkMalformedJson(normalizedOptions);
  checks.repeatedHealth = await checkRepeatedHealth(normalizedOptions);
  checks.webSocket = await checkWebSocketUpgrade(normalizedOptions);

  return {
    endpoint: normalizedOptions.endpoint,
    origin: normalizedOptions.origin,
    requireSynced: normalizedOptions.requireSynced,
    checks,
  };
};

const isCliEntry = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCliEntry) {
  try {
    const options = parseMofRpcCheckArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await runMofRpcCheck(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('MOF RPC check failed.');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof MofRpcCheckError && Object.keys(error.details).length > 0) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}
