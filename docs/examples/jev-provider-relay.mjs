/**
 * Optional operator-managed Jev relay for a static Polkaswap client.
 * Node 26; bind loopback behind an operator-supplied HTTPS reverse proxy.
 * TYPESAFE_API_KEY stays on this server. JEV_RELAY_TOKEN is a separate browser access token.
 * JEV_ALLOWED_ORIGIN is one exact origin, e.g. https://polkaswap.io (no wildcard).
 * Run: node docs/examples/jev-provider-relay.mjs
 * Never expose this HTTP listener directly or log Authorization/request bodies.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MAX_BYTES = 32768;
const CHOICES = {
  action: ['buy', 'hold', 'sell'],
  strategy: ['dca_daily', 'sma_12_48', 'sma_5_20'],
};

/** Consume a byte-limited body; prevent unbounded input even when Content-Length is absent. */
async function boundedBody(stream, signal) {
  if (!stream) throw new Error('Missing body');
  const reader = stream.getReader();
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error('Request timed out');
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('Body too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Limit the relay to native trade actions or fixed review recipe IDs; never accept arbitrary upstream URLs. */
function validBody(body) {
  const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
  if (
    !record(body) ||
    Object.keys(body).sort().join(',') !== 'model,questions,state' ||
    body.model !== 'jev-latest' ||
    typeof body.state !== 'string' ||
    !body.state ||
    body.state.length > 24000 ||
    !record(body.questions) ||
    !Object.hasOwn(CHOICES, Object.keys(body.questions).join(','))
  )
    return false;
  const question = Object.keys(body.questions)[0];
  const action = body.questions[question];
  return (
    record(action) &&
    Object.keys(action).sort().join(',') === 'criteria,instructions,type' &&
    action.type === 'choice' &&
    typeof action.instructions === 'string' &&
    action.instructions.length <= 2000 &&
    record(action.criteria) &&
    Object.keys(action.criteria).sort().join(',') === CHOICES[question].join(',') &&
    Object.values(action.criteria).every(
      (value) => typeof value === 'string' && value.length > 0 && value.length <= 1000
    )
  );
}

/** Build an authenticated, exact-origin handler with one request at a time and a five-second rate floor. */
export function createJevRelay({ apiKey, relayToken, allowedOrigin, request = fetch, now = Date.now }) {
  let origin;
  try {
    origin = new URL(allowedOrigin);
  } catch {
    throw new Error('Invalid JEV_ALLOWED_ORIGIN');
  }
  if (origin.protocol !== 'https:' || origin.origin !== allowedOrigin || origin.username || origin.password)
    throw new Error('JEV_ALLOWED_ORIGIN must be one exact HTTPS origin');
  if (
    typeof apiKey !== 'string' ||
    !apiKey.trim() ||
    apiKey.length > 1024 ||
    /[\r\n]/.test(apiKey) ||
    typeof relayToken !== 'string' ||
    relayToken.length < 32 ||
    relayToken.length > 512 ||
    /[\r\n]/.test(relayToken) ||
    apiKey === relayToken
  )
    throw new Error('Set separate TYPESAFE_API_KEY and JEV_RELAY_TOKEN (at least 32 characters)');
  const expected = Buffer.from(`Bearer ${relayToken}`);
  let pending = false;
  let lastRequest = -Infinity;
  return async function handle(incoming) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const reply = (status, value) => new Response(JSON.stringify(value), { status, headers });
    if (incoming.headers.get('Origin') !== allowedOrigin) return reply(403, { error: 'Origin not allowed' });
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    if (new URL(incoming.url).pathname !== '/jev') return reply(404, { error: 'Not found' });
    if (incoming.method === 'OPTIONS') {
      const requested = (incoming.headers.get('Access-Control-Request-Headers') ?? '')
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (
        incoming.headers.get('Access-Control-Request-Method') !== 'POST' ||
        requested.some((value) => !['authorization', 'content-type'].includes(value))
      )
        return reply(403, { error: 'Preflight not allowed' });
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '600',
        },
      });
    }
    if (incoming.method !== 'POST') return reply(405, { error: 'Use POST' });
    const supplied = Buffer.from(incoming.headers.get('Authorization') ?? '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      return reply(401, { error: 'Unauthorized' });
    if (incoming.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
      return reply(415, { error: 'Use JSON' });
    if (pending || now() - lastRequest < 5000) return reply(429, { error: 'Try again later' });
    pending = true;
    lastRequest = now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    incoming.signal.addEventListener('abort', abort, { once: true });
    if (incoming.signal.aborted) abort();
    const timeout = setTimeout(abort, 25000);
    try {
      let body;
      try {
        body = JSON.parse(await boundedBody(incoming.body, controller.signal));
      } catch {
        return reply(controller.signal.aborted ? 504 : 400, { error: 'Invalid request' });
      }
      if (!validBody(body)) return reply(400, { error: 'Unsupported request' });
      if (controller.signal.aborted) return reply(504, { error: 'Request timed out' });
      const upstream = await request(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: controller.signal,
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        return reply(502, { error: 'Jev unavailable' });
      }
      const result = JSON.parse(await boundedBody(upstream.body, controller.signal));
      const question = Object.keys(body.questions)[0];
      const choices = CHOICES[question];
      const action = result?.answers?.[question];
      const unit = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
      if (
        !result.answers ||
        Object.keys(result.answers).join(',') !== question ||
        action?.type !== 'choice' ||
        Object.keys(action).sort().join(',') !== 'choice,confidence,probabilities,type' ||
        !choices.includes(action.choice) ||
        !unit(action.confidence) ||
        !action.probabilities ||
        Object.keys(action.probabilities).sort().join(',') !== choices.join(',') ||
        !Object.values(action.probabilities).every(unit) ||
        Math.abs(Object.values(action.probabilities).reduce((sum, value) => sum + value, 0) - 1) > 0.000001 ||
        Object.values(action.probabilities).some((value) => value > action.probabilities[action.choice])
      )
        throw new Error('Invalid Jev response');
      const count = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
      const output = {
        answers: {
          [question]: {
            type: 'choice',
            choice: action.choice,
            confidence: action.confidence,
            probabilities: action.probabilities,
          },
        },
        usage: { input_tokens: count(result.usage?.input_tokens), output_tokens: count(result.usage?.output_tokens) },
      };
      if (controller.signal.aborted) return reply(504, { error: 'Request timed out' });
      return reply(200, output);
    } catch {
      return reply(controller.signal.aborted ? 504 : 502, { error: 'Jev unavailable' });
    } finally {
      clearTimeout(timeout);
      incoming.signal.removeEventListener('abort', abort);
      pending = false;
    }
  };
}

/** Adapt the bounded Fetch handler to a loopback listener; request and authorization data are never logged. */
export function startJevRelay(env = process.env, createServerImpl = createServer) {
  const handle = createJevRelay({
    apiKey: env.TYPESAFE_API_KEY,
    relayToken: env.JEV_RELAY_TOKEN,
    allowedOrigin: env.JEV_ALLOWED_ORIGIN,
  });
  const port = Number(env.JEV_RELAY_PORT ?? 8788);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid JEV_RELAY_PORT');
  const server = createServerImpl(async (req, res) => {
    try {
      const controller = new AbortController();
      req.on('aborted', () => controller.abort());
      res.on('close', () => {
        if (!res.writableEnded) controller.abort();
      });
      const stream = req.method === 'POST' ? Readable.toWeb(req) : undefined;
      const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: stream,
        ...(stream ? { duplex: 'half' } : {}),
        signal: controller.signal,
      });
      const response = await handle(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch {
      if (!res.headersSent) res.writeHead(400);
      res.end();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 32;
  server.listen(port, '127.0.0.1');
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startJevRelay();
